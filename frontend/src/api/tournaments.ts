import { del, get, post } from './http'
import type { Tournament } from './types'

export function fetchTournaments() {
  return get<Tournament[]>('/api/tournaments', { auth: 'user' })
}

export function fetchTournament(id: number | string) {
  return get<{
    tournament?: Tournament
    registrations?: unknown[]
    bracket?: unknown
    [key: string]: unknown
  }>(`/api/tournaments/${id}`, { auth: 'user' })
}

export function fetchTournamentBracket(id: number | string) {
  return get<unknown>(`/api/tournaments/${id}/bracket`, { auth: 'user' })
}

export function registerTournament(id: number | string) {
  return post<unknown>(`/api/tournaments/${id}/register`, undefined, { auth: 'user' })
}

export function unregisterTournament(id: number | string) {
  return del<unknown>(`/api/tournaments/${id}/register`, { auth: 'user' })
}

export function checkInTournament(id: number | string) {
  return post<unknown>(`/api/tournaments/${id}/check-in`, undefined, { auth: 'user' })
}

export function fetchMyTournamentHistory() {
  return get<unknown[]>('/api/tournaments/my-history', { auth: 'user' })
}
