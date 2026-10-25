import { del, get, post, put } from '../http'
import type { GameCharacter } from '../types'

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
  return post<OfficialCombo>(`/api/admin/characters/${characterId}/official-combos`, payload, { auth: 'admin' })
}

export function updateOfficialCombo(id: number, payload: Record<string, unknown>) {
  return put<OfficialCombo>(`/api/admin/official-combos/${id}`, payload, { auth: 'admin' })
}

export function deleteOfficialCombo(id: number) {
  return del<unknown>(`/api/admin/official-combos/${id}`, { auth: 'admin' })
}
