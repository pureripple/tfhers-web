import type { ApiResult } from './types'
import { ApiError } from './types'

export type AuthMode = 'user' | 'admin' | 'none' | 'optional'

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  auth?: AuthMode
  body?: unknown
}

const USER_KEY = 'user'
const ADMIN_TOKEN_KEY = 'admin_token'

function readUserToken(): string | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    const user = JSON.parse(raw) as { token?: string }
    return user?.token || null
  } catch {
    return null
  }
}

function readAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY)
}

/** Resolve JWT for Authorization header; shared by non-JSON / alternate-envelope clients (e.g. AI). */
export function resolveAuthHeader(auth: AuthMode = 'none'): string | null {
  if (auth === 'user' || auth === 'optional') return readUserToken()
  if (auth === 'admin') return readAdminToken()
  return null
}

let handling401 = false

function isAuthEndpoint(path: string): boolean {
  const p = path.split('?')[0]
  return (
    p.endsWith('/api/user/login') ||
    p.endsWith('/api/user/register') ||
    p.endsWith('/api/admin/login')
  )
}

function clearUserSession() {
  try {
    localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('tfhers:user-session-cleared'))
  } catch {
    /* ignore */
  }
}

function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('tfhers:admin-session-cleared'))
  } catch {
    /* ignore */
  }
}

/** Global 401: clear session, tip, redirect to login (keep redirect). Skip login APIs / loops. */
function handleUnauthorized(path: string, auth: AuthMode) {
  if (auth !== 'user' && auth !== 'admin') return
  if (isAuthEndpoint(path)) return
  if (handling401) return
  handling401 = true
  try {
    const here = typeof window !== 'undefined' ? window.location.pathname + window.location.search + window.location.hash : '/'
    if (auth === 'admin') {
      clearAdminSession()
      if (!here.startsWith('/admin/login')) {
        window.alert('登录已过期')
        const q = encodeURIComponent(here.startsWith('/admin') ? here : '/admin')
        window.location.assign('/admin/login?redirect=' + q)
      }
      return
    }
    // user (and default for authenticated calls)
    clearUserSession()
    if (!here.startsWith('/login') && !here.startsWith('/admin')) {
      window.alert('登录已过期')
      const q = encodeURIComponent(here || '/')
      window.location.assign('/login?redirect=' + q)
    } else if (here.startsWith('/login')) {
      // already on login; just clear
    }
  } finally {
    window.setTimeout(() => {
      handling401 = false
    }, 1500)
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = 'none', body, headers, ...rest } = options
  const finalHeaders = new Headers(headers || {})

  if (body !== undefined && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  const token = resolveAuthHeader(auth)
  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const rawText = await res.text()
  let payload: ApiResult<T> & { message?: string; error?: string; status?: number }
  try {
    payload = (rawText ? JSON.parse(rawText) : {}) as ApiResult<T> & { message?: string; error?: string; status?: number }
  } catch {
    throw new ApiError(res.status, (rawText && rawText.trim()) || res.statusText || ('HTTP ' + res.status))
  }

  const code = typeof payload.code === 'number' ? payload.code : res.status
  if (code !== 200) {
    const springMsg = payload.message && String(payload.message).trim()
    const apiMsg = payload.msg && String(payload.msg).trim()
    const errLabel = payload.error && String(payload.error).trim()
    // Prefer concrete message; avoid bare Spring "Bad Request" when message exists
    const msg =
      apiMsg ||
      springMsg ||
      (errLabel && errLabel.toLowerCase() !== 'bad request' ? errLabel : '') ||
      errLabel ||
      ('HTTP ' + code)
    if (code === 401) {
      handleUnauthorized(path, auth)
    }
    throw new ApiError(code, msg)
  }
  return payload.data
}

export function get<T>(path: string, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'GET' })
}

export function post<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'POST', body })
}

export function put<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'PUT', body })
}

export function patch<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'PATCH', body })
}

export function del<T>(path: string, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'DELETE' })
}