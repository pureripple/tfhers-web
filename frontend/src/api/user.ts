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

export async function uploadArticleCover(file: File) {
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
  let payload: { code: number; msg: string; data: string }
  try {
    payload = (await res.json()) as { code: number; msg: string; data: string }
  } catch {
    throw new ApiError(res.status, res.statusText || 'Invalid JSON response')
  }
  if (payload.code !== 200) {
    throw new ApiError(payload.code, payload.msg || 'upload failed')
  }
  return payload.data
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

export function fetchSteamPlaytime() {
  return get<unknown>('/api/user/steam/playtime', { auth: 'user' })
}

export function fetchSteamAchievements() {
  return get<unknown>('/api/user/steam/achievements', { auth: 'user' })
}

export async function uploadComboVideo(file: File): Promise<string> {
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
  const payload = await res.json()
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || '上传失败')
  }
  const data = payload.data
  if (typeof data === 'string') return data
  return String(data?.url || data?.fileUrl || data?.path || '')
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
