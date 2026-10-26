import { get, post, put, del } from './http'
import { ApiError } from './types'

export interface UserProfile {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  signature?: string
  avatarUrl?: string
  coverUrl?: string
  gender?: string
  birthday?: string
  steamId?: string
  steamName?: string
  role?: string | number
  isAdmin?: boolean
  [key: string]: unknown
}

export interface FeedbackItem {
  id?: number
  category?: string
  title?: string
  content?: string
  contact?: string
  status?: number
  adminReply?: string
  admin_reply?: string
  createdAt?: string
  created_at?: string
  repliedAt?: string
  replied_at?: string
  unread?: boolean | number | string
  [key: string]: unknown
}

export interface FeedbackMinePage {
  list: FeedbackItem[]
  total: number
  page?: number
  size?: number
}

export interface ComboItem {
  id: number
  title?: string
  characterId?: number
  characterName?: string
  createdAt?: string
  created_at?: string
  [key: string]: unknown
}

export function fetchUserProfile() {
  return get<UserProfile>('/api/user/profile', { auth: 'user' })
}

export function updateUserProfile(payload: Partial<UserProfile>) {
  return put<UserProfile>('/api/user/profile', payload, { auth: 'user' })
}

export function changeUserPassword(payload: {
  oldPassword: string
  newPassword: string
}) {
  return post<unknown>('/api/user/password', payload, { auth: 'user' })
}

export function fetchMyCombos() {
  return get<ComboItem[]>('/api/combos/mine', { auth: 'user' })
}

export function deleteMyCombo(id: number | string) {
  return del<unknown>(`/api/combos/${id}`, { auth: 'user' })
}

export function submitFeedback(payload: {
  category: string
  title: string
  content: string
  contact?: string | null
}) {
  return post<unknown>('/api/feedback', payload, { auth: 'user' })
}

export function fetchMyFeedback(page = 1, size = 8) {
  return get<FeedbackMinePage>(`/api/feedback/mine?page=${page}&size=${size}`, { auth: 'user' })
}

export function fetchFeedbackUnreadCount() {
  return get<{ count: number }>('/api/feedback/unread-count', { auth: 'user' })
}

export function markFeedbackRead() {
  return post<unknown>('/api/feedback/mark-read', undefined, { auth: 'user' })
}

export async function uploadArticleCover(file: File): Promise<string> {
  const raw = localStorage.getItem('user')
  let token = ''
  try {
    token = raw ? (JSON.parse(raw) as { token?: string }).token || '' : ''
  } catch {
    token = ''
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/file/upload/article-cover', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  const rawText = await res.text()
  let payload: {
    code?: number
    msg?: string
    data?: { url?: string; fileUrl?: string; path?: string } | string
  }
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    throw new ApiError(res.status, (rawText && rawText.trim().slice(0, 200)) || res.statusText || '封面上传失败')
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || '封面上传失败')
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  const url = data && typeof data === 'object' ? data.url || data.fileUrl || data.path : ''
  if (!url) throw new ApiError(500, '上传成功但未返回封面地址')
  return String(url)
}

export function createCombo(payload: {
  characterId: number
  title: string
  description?: string | null
  damageTotal?: number
  videoUrl: string
  comboFileUrl?: string | null
}) {
  return post<unknown>('/api/combos', payload, { auth: 'user' })
}

export function fetchSteamLoginUrl() {
  return get<{ url?: string }>('/api/user/steam/login-url', { auth: 'user' })
}

export function unbindSteam() {
  return post<unknown>('/api/user/steam/unbind', undefined, { auth: 'user' })
}

export function fetchSteamPlaytime(force = false) {
  const q = force ? '?force=1' : ''
  return get<unknown>('/api/user/steam/playtime' + q, { auth: 'user' })
}

export function fetchSteamAchievements(force = false) {
  const q = force ? '?force=1' : ''
  return get<unknown>('/api/user/steam/achievements' + q, { auth: 'user' })
}

/** Max combo video size (must match backend FileUploadController). */
export const COMBO_VIDEO_MAX_BYTES = 2048 * 1024 * 1024

export async function uploadComboVideo(file: File): Promise<string> {
  if (file.size > COMBO_VIDEO_MAX_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    throw new ApiError(400, `视频过大（${mb}MB），最大允许 2048MB（2GB），请压缩后再上传`)
  }
  const raw = localStorage.getItem('user')
  let token = ''
  try {
    token = raw ? String((JSON.parse(raw) as { token?: string }).token || '') : ''
  } catch {
    token = ''
  }
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/file/upload/combo-video', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })
  const rawText = await res.text()
  let payload: {
    code?: number
    msg?: string
    message?: string
    error?: string
    data?: { url?: string; fileUrl?: string; path?: string } | string
  }
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    throw new ApiError(res.status, (rawText && rawText.trim().slice(0, 200)) || res.statusText || '视频上传失败')
  }
  if (!payload || payload.code !== 200) {
    const msg =
      (payload.msg && String(payload.msg).trim()) ||
      (payload.message && String(payload.message).trim()) ||
      (payload.error && String(payload.error).trim()) ||
      ('视频上传失败 HTTP ' + (payload.code || res.status))
    throw new ApiError(payload.code || res.status, msg)
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  const url = data && typeof data === 'object' ? data.url || data.fileUrl || data.path : ''
  if (!url) throw new ApiError(500, '上传成功但未返回视频地址')
  return String(url)
}
export async function uploadComboFile(file: File): Promise<string> {
  const raw = localStorage.getItem('user')
  let token = ''
  try {
    token = raw ? String((JSON.parse(raw) as { token?: string }).token || '') : ''
  } catch {
    token = ''
  }
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/file/upload/combo-file', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })
  const payload = await res.json()
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || '上传失败')
  }
  const data = payload.data
  if (typeof data === 'string') return data
  return String(data?.url || data?.fileUrl || data?.path || '')
}

export function fetchPublicProfile(userId: number | string) {
  return get<UserProfile>(`/api/user/${userId}/public`, { auth: 'user' })
}

export function fetchCombosByUser(userId: number | string) {
  return get<ComboItem[]>(`/api/combos/by-user/${userId}`, { auth: 'user' })
}

async function uploadUserImage(
  path: string,
  blob: Blob,
  filename: string,
  failMsg: string,
): Promise<string> {
  const raw = localStorage.getItem('user')
  let token = ''
  try {
    token = raw ? String((JSON.parse(raw) as { token?: string }).token || '') : ''
  } catch {
    token = ''
  }
  const form = new FormData()
  form.append('file', blob, filename)
  const res = await fetch(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  const rawText = await res.text()
  let payload: {
    code?: number
    msg?: string
    data?: { avatarUrl?: string; coverUrl?: string; url?: string } | string
  }
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    throw new ApiError(res.status, (rawText && rawText.trim().slice(0, 200)) || failMsg)
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || failMsg)
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  if (data && typeof data === 'object') {
    const url = data.avatarUrl || data.coverUrl || data.url
    if (url) return String(url)
  }
  throw new ApiError(500, failMsg)
}

export function uploadAvatar(blob: Blob) {
  return uploadUserImage('/api/user/upload-avatar', blob, 'avatar.jpg', '头像上传失败')
}

export function uploadCover(blob: Blob) {
  return uploadUserImage('/api/user/upload-cover', blob, 'cover.jpg', '封面上传失败')
}

