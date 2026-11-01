import { ApiError } from './types'
import { resolveAuthHeader, type AuthMode } from './http'

/** AI endpoints use { success, message, data } (not the usual code/msg envelope).
 *  Also chat uses application/x-www-form-urlencoded — so we cannot reuse http.post/get
 *  (those JSON-stringify body and expect code===200). We still reuse resolveAuthHeader
 *  so Bearer tokens match the rest of the app.
 */

export interface AiStatusData {
  status?: string
  model?: string
  timestamp?: number
  error?: string
}

interface AiEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
}

async function parseAi<T>(res: Response): Promise<T> {
  let payload: AiEnvelope<T>
  try {
    payload = (await res.json()) as AiEnvelope<T>
  } catch {
    throw new ApiError(res.status, res.statusText || 'Invalid JSON response')
  }
  if (!payload.success) {
    throw new ApiError(res.ok ? 500 : res.status, payload.message || 'AI 服务异常')
  }
  return payload.data as T
}

function authHeaders(auth: AuthMode, extra?: HeadersInit): Headers {
  const headers = new Headers(extra || {})
  const token = resolveAuthHeader(auth)
  if (token) {
    headers.set('Authorization', 'Bearer ' + token)
  }
  return headers
}

export async function fetchAiStatus(auth: AuthMode = 'user'): Promise<AiStatusData> {
  const res = await fetch('/api/ai/status', {
    headers: authHeaders(auth),
  })
  return parseAi<AiStatusData>(res)
}

export async function postAiChat(question: string, auth: AuthMode = 'user'): Promise<string> {
  const token = resolveAuthHeader(auth)
  if (!token) {
    throw new ApiError(401, '请先登录')
  }
  const body = new URLSearchParams()
  body.set('question', question)
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Bearer ' + token,
    },
    body,
  })
  const data = await parseAi<string>(res)
  return typeof data === 'string' ? data : String(data ?? '')
}
