import { get, post } from './http'
import { ApiError, type Room } from './types'

export interface RoomDetailPayload {
  room?: Room & {
    hostUserId?: number
    hostNickname?: string
    hostIsAdmin?: boolean
    passwordPlain?: string
    isHost?: boolean
    joinedByMe?: boolean
  }
  members?: Array<{
    userId?: number
    nickname?: string
    username?: string
    avatarUrl?: string
    role?: string
    isHost?: boolean
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface RoomMessage {
  id?: number
  content?: string
  msgType?: string
  type?: string
  userId?: number
  nickname?: string
  avatarUrl?: string
  createdAt?: string
  [key: string]: unknown
}

export function fetchRooms() {
  return get<Room[]>('/api/rooms', { auth: 'user' })
}

export function fetchRoomDetail(id: number) {
  return get<RoomDetailPayload>(`/api/rooms/${id}`, { auth: 'user' })
}

export function createRoom(payload: { title: string; maxPlayers?: number; password?: string }) {
  return post<Room>('/api/rooms', payload, { auth: 'user' })
}

export function joinRoom(id: number, password = '') {
  return post<Room>(`/api/rooms/${id}/join`, { password }, { auth: 'user' })
}

export function leaveRoom(id: number) {
  return post<unknown>(`/api/rooms/${id}/leave`, {}, { auth: 'user' })
}

export function closeRoom(id: number) {
  return post<unknown>(`/api/rooms/${id}/close`, {}, { auth: 'user' })
}

export function fetchRoomMembers(id: number) {
  return get<unknown[]>(`/api/rooms/${id}/members`, { auth: 'user' })
}

export type RoomMessagesPayload = {
  messages?: RoomMessage[]
  roomStatus?: string
  [key: string]: unknown
}

/** Backend returns { messages, roomStatus } (not a bare array). */
export function fetchRoomMessages(id: number, afterId = 0) {
  const q = afterId ? `?afterId=${afterId}` : ''
  return get<RoomMessagesPayload | RoomMessage[]>(`/api/rooms/${id}/messages${q}`, { auth: 'user' })
}

export function unwrapRoomMessages(data: RoomMessagesPayload | RoomMessage[] | null | undefined): {
  messages: RoomMessage[]
  roomStatus?: string
} {
  if (Array.isArray(data)) return { messages: data }
  if (data && typeof data === 'object') {
    const msgs = Array.isArray(data.messages) ? data.messages : []
    return { messages: msgs, roomStatus: data.roomStatus != null ? String(data.roomStatus) : undefined }
  }
  return { messages: [] }
}

export function postRoomMessage(id: number, content: string, msgType = 'text') {
  return post<RoomMessage>(`/api/rooms/${id}/messages`, { content, msgType }, { auth: 'user' })
}

export async function uploadRoomChatImage(file: File): Promise<string> {
  const raw = localStorage.getItem('user')
  let token = ''
  try {
    token = raw ? (JSON.parse(raw) as { token?: string }).token || '' : ''
  } catch {
    token = ''
  }
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', 'rooms/chat')
  const res = await fetch('/api/file/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })
  let payload: { code?: number; msg?: string; message?: string; data?: { url?: string } | string }
  try {
    payload = await res.json()
  } catch {
    throw new ApiError(res.status, res.statusText || 'Invalid JSON response')
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || payload?.message || '图片上传失败')
  }
  const data = payload.data
  if (typeof data === 'string') return data
  const url = data && typeof data === 'object' ? data.url : ''
  if (!url) throw new ApiError(500, '图片上传失败')
  return String(url)
}
