import { get } from './http'
import type { Room } from './types'

export function fetchRooms() {
  return get<Room[]>('/api/rooms', { auth: 'user' })
}
