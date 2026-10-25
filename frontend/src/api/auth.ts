import { post, get } from './http'
import type { AdminLoginData, AdminUserInfo, UserInfo } from './types'
import { ApiError } from './types'

export function loginUser(username: string, password: string) {
  return post<UserInfo>('/api/user/login', { username, password }, { auth: 'none' })
}

export async function registerUser(payload: {
  username: string
  nickname: string
  password: string
  email?: string
}) {
  const form = new FormData()
  form.append('username', payload.username)
  form.append('nickname', payload.nickname)
  form.append('password', payload.password)
  form.append('email', payload.email || '')

  const res = await fetch('/api/user/register', {
    method: 'POST',
    body: form,
  })

  let payloadJson: { code: number; msg: string; data: unknown }
  try {
    payloadJson = (await res.json()) as { code: number; msg: string; data: unknown }
  } catch {
    throw new ApiError(res.status, res.statusText || 'Invalid JSON response')
  }

  if (payloadJson.code !== 200) {
    throw new ApiError(payloadJson.code, payloadJson.msg || '注册失败')
  }

  return payloadJson.data
}

export function loginAdmin(username: string, password: string) {
  return post<AdminLoginData>('/api/admin/login', { username, password }, { auth: 'none' })
}

export function fetchAdminUserInfo() {
  return get<AdminUserInfo>('/api/admin/userinfo', { auth: 'admin' })
}

export function logoutAdminRemote() {
  return post<unknown>('/api/admin/logout', undefined, { auth: 'admin' }).catch(() => undefined)
}
