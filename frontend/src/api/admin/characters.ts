import { del, get, post, put } from '../http'
import type { GameCharacter } from '../types'

export function fetchAdminCharacters() {
  return get<GameCharacter[]>('/api/admin/characters', { auth: 'admin' })
}

export function deleteAdminCharacter(id: number) {
  return del<unknown>(`/api/admin/characters/${id}`, { auth: 'admin' })
}
export function createAdminCharacter(payload: Record<string, unknown>) {
  return post<GameCharacter>('/api/admin/characters', payload, { auth: 'admin' })
}

export function updateAdminCharacter(id: number, payload: Record<string, unknown>) {
  return put<GameCharacter>(`/api/admin/characters/${id}`, payload, { auth: 'admin' })
}
