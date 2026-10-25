import { del, get, post, put } from '../http'
import type { Tournament } from '../types'

export interface TournamentRegistration {
  userId?: number
  nickname?: string
  username?: string
  rating?: number
  seed?: number
  finalPlacement?: number
  wins?: number
  losses?: number
  checkedIn?: number | boolean
  [key: string]: unknown
}

export interface TournamentMatch {
  id?: number
  matchId?: number
  round?: number
  roundLabel?: string
  matchIndex?: number
  bracketSide?: string
  status?: string
  player1UserId?: number
  player2UserId?: number
  player1Nickname?: string
  player2Nickname?: string
  score1?: number
  score2?: number
  [key: string]: unknown
}

export interface TournamentBracket {
  matches?: TournamentMatch[]
  [key: string]: unknown
}

export interface TournamentDetailPayload {
  tournament?: Tournament
  registrations?: TournamentRegistration[]
  bracket?: TournamentBracket
  [key: string]: unknown
}

export function fetchAdminTournaments() {
  return get<Tournament[]>('/api/admin/tournaments', { auth: 'admin' })
}

export function fetchAdminTournamentDetail(id: number) {
  return get<TournamentDetailPayload>(`/api/admin/tournaments/${id}`, { auth: 'admin' })
}

export function createAdminTournament(payload: Record<string, unknown>) {
  return post<Tournament>('/api/admin/tournaments', payload, { auth: 'admin' })
}

export function updateAdminTournament(id: number, payload: Record<string, unknown>) {
  return put<Tournament>(`/api/admin/tournaments/${id}`, payload, { auth: 'admin' })
}

export function updateTournamentStatus(id: number, status: string) {
  return put<unknown>(`/api/admin/tournaments/${id}/status`, { status }, { auth: 'admin' })
}

export function deleteAdminTournament(id: number) {
  return del<unknown>(`/api/admin/tournaments/${id}`, { auth: 'admin' })
}

export function generateTournamentBracket(id: number, shuffle = true) {
  return post<unknown>(`/api/admin/tournaments/${id}/generate-bracket`, { shuffle }, { auth: 'admin' })
}

export function submitMatchResult(matchId: number, score1: number, score2: number) {
  return put<unknown>(`/api/admin/tournaments/matches/${matchId}/result`, { score1, score2 }, { auth: 'admin' })
}

export function adminForceCheckIn(tournamentId: number, userId: number) {
  return post<unknown>(`/api/admin/tournaments/${tournamentId}/check-in`, { userId }, { auth: 'admin' })
}
