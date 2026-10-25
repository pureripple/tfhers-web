import { del, get, put } from '../http'
import type { Tournament } from '../types'

export function fetchAdminTournaments() {
  return get<Tournament[]>('/api/admin/tournaments', { auth: 'admin' })
}

export function fetchAdminTournamentDetail(id: number) {
  return get<{
    tournament?: Tournament
    registrations?: unknown[]
    bracket?: unknown
    [key: string]: unknown
  }>(`/api/admin/tournaments/${id}`, { auth: 'admin' })
}

export function updateTournamentStatus(id: number, status: string) {
  return put<unknown>(`/api/admin/tournaments/${id}/status`, { status }, { auth: 'admin' })
}

export function deleteAdminTournament(id: number) {
  return del<unknown>(`/api/admin/tournaments/${id}`, { auth: 'admin' })
}