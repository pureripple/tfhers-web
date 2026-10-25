import { del, get } from '../http'
import type { GameCharacter } from '../types'

export function fetchAdminCharacters() {
  return get<GameCharacter[]>('/api/admin/characters', { auth: 'admin' })
}

export function deleteAdminCharacter(id: number) {
  return del<unknown>(`/api/admin/characters/${id}`, { auth: 'admin' })
}