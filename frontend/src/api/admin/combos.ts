import { del, get, put } from '../http'
import type { AdminCombo } from './types'

export function fetchAdminCombos(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : ''
  return get<AdminCombo[]>(`/api/admin/combos/list${q}`, { auth: 'admin' })
}

export function updateComboStatus(id: number, status: 'approved' | 'rejected' | string) {
  return put<unknown>(`/api/admin/combos/${id}/status`, { status }, { auth: 'admin' })
}

export function deleteAdminCombo(id: number) {
  return del<unknown>(`/api/admin/combos/${id}`, { auth: 'admin' })
}