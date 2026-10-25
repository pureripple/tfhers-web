import { get, post } from './http'
import type { Tournament } from './types'

export function fetchTournaments() {
  return get<Tournament[]>('/api/tournaments', { auth: 'user' })
}

export function fetchTournament(id: number | string) {
  return get<Tournament>(`/api/tournaments/${id}`, { auth: 'user' })
}

export function registerTournament(id: number | string) {
  return post<unknown>(`/api/tournaments/${id}/register`, undefined, { auth: 'user' })
}

export function unregisterTournament(id: number | string) {
  return post<unknown>(`/api/tournaments/${id}/unregister`, undefined, { auth: 'user' })
}
