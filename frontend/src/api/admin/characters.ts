import { del, get, post, put } from '../http'
import { ApiError, type GameCharacter } from '../types'

const ADMIN_TOKEN_KEY = 'admin_token'

export interface OfficialCombo {
  id: number
  characterId?: number
  title?: string
  description?: string
  videoUrl?: string
  orderIndex?: number
  [key: string]: unknown
}

export function fetchAdminCharacters() {
  return get<GameCharacter[]>('/api/admin/characters', { auth: 'admin' })
}

export function createAdminCharacter(payload: Record<string, unknown>) {
  return post<GameCharacter>('/api/admin/characters', payload, { auth: 'admin' })
}

export function updateAdminCharacter(id: number, payload: Record<string, unknown>) {
  return put<GameCharacter>(`/api/admin/characters/${id}`, payload, { auth: 'admin' })
}

export function deleteAdminCharacter(id: number) {
  return del<unknown>(`/api/admin/characters/${id}`, { auth: 'admin' })
}

export function fetchOfficialCombos(characterId: number) {
  return get<OfficialCombo[]>(`/api/admin/characters/${characterId}/official-combos`, { auth: 'admin' })
}

export function createOfficialCombo(characterId: number, payload: Record<string, unknown>) {
  return post<OfficialCombo>(`/api/admin/characters/${characterId}/official-combos`, payload, {
    auth: 'admin',
  })
}

export function updateOfficialCombo(id: number, payload: Record<string, unknown>) {
  return put<OfficialCombo>(`/api/admin/official-combos/${id}`, payload, { auth: 'admin' })
}

export function deleteOfficialCombo(id: number) {
  return del<unknown>(`/api/admin/official-combos/${id}`, { auth: 'admin' })
}

async function uploadAdminFile(
  file: File,
  path: string,
  failMsg: string,
  opts?: { maxBytes?: number; imageOnly?: boolean },
): Promise<string> {
  const imageOnly = opts?.imageOnly !== false
  if (imageOnly && !file.type.startsWith('image/')) {
    throw new ApiError(400, '请选择图片文件')
  }
  const maxBytes = opts?.maxBytes ?? 5 * 1024 * 1024
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024))
    throw new ApiError(400, `图片大小不能超过${mb}MB`)
  }
  const token = localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(path, {
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
    throw new ApiError(res.status, (rawText && rawText.trim().slice(0, 200)) || res.statusText || failMsg)
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || failMsg)
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  const url = data && typeof data === 'object' ? data.url || data.fileUrl || data.path : ''
  if (!url) throw new ApiError(500, '上传成功但未返回访问地址')
  return String(url)
}

/** Character avatar — legacy `/api/file/upload/avatar`, max 5MB. */
export function uploadAdminCharacterAvatar(file: File) {
  return uploadAdminFile(file, '/api/file/upload/avatar', '头像上传失败', { maxBytes: 5 * 1024 * 1024 })
}

/** Official move-list image — legacy `/api/file/upload/character-move-list`, max 10MB. */
export function uploadAdminCharacterMoveList(file: File) {
  return uploadAdminFile(file, '/api/file/upload/character-move-list', '出招表图上传失败', {
    maxBytes: 10 * 1024 * 1024,
  })
}
