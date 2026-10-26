import { get, put } from '../http'
import { ApiError } from '../types'
import type { AdminProfileInfo } from './types'

const ADMIN_TOKEN_KEY = 'admin_token'

export function fetchAdminProfile() {
  return get<AdminProfileInfo>('/api/profile/info', { auth: 'admin' })
}

export function updateAdminProfile(body: { realName?: string; email?: string; phone?: string }) {
  return put<unknown>('/api/profile/update', body, { auth: 'admin' })
}

export function changeAdminPassword(body: {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}) {
  return put<unknown>('/api/profile/password/change', body, { auth: 'admin' })
}

/** Admin avatar upload — legacy `/api/profile/avatar/upload`. */
export async function uploadAdminAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError(400, '请选择图片文件')
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(400, '图片大小不能超过5MB')
  }
  const token = localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/profile/avatar/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  const rawText = await res.text()
  let payload: {
    code?: number
    msg?: string
    data?: { url?: string; avatarUrl?: string; fileUrl?: string; path?: string } | string
  }
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    throw new ApiError(res.status, (rawText && rawText.trim().slice(0, 200)) || res.statusText || '头像上传失败')
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || '头像上传失败')
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  const url =
    data && typeof data === 'object' ? data.url || data.avatarUrl || data.fileUrl || data.path : ''
  if (!url) throw new ApiError(500, '上传成功但未返回访问地址')
  return String(url)
}
