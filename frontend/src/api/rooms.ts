import { get, post } from './http'
import type { Room } from './types'

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
  return post<unknown>(`/api/rooms/${id}/join`, { password }, { auth: 'user' })
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

export function fetchRoomMessages(id: number, afterId = 0) {
  const q = afterId ? `?afterId=${afterId}` : ''
  return get<RoomMessage[]>(`/api/rooms/${id}/messages${q}`, { auth: 'user' })
}

export function postRoomMessage(id: number, content: string, msgType = 'text') {
  return post<RoomMessage>(`/api/rooms/${id}/messages`, { content, msgType }, { auth: 'user' })
}
