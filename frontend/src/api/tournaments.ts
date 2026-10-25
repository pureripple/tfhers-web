import { get } from './http'
import type { Tournament } from './types'

export function fetchTournaments() {
  return get<Tournament[]>('/api/tournaments', { auth: 'user' })
}

export function fetchTournament(id: number | string) {
  return get<Tournament>(`/api/tournaments/${id}`, { auth: 'user' })
}
