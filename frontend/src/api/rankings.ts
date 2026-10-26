import { get } from './http'
import type { RankingsPayload } from './types'

export function fetchRankings(limit = 50) {
  return get<RankingsPayload>(`/api/rankings?limit=${limit}`)
}

export type MyRatingView = {
  rating?: number
  tier?: string
  tierLabel?: string
  rank?: number | null
  siteRank?: number | null
  matchesPlayed?: number
  wins?: number
  losses?: number
  [key: string]: unknown
}

/** Current user's Elo / tier / site rank for avatar dropdown. */
export function fetchMyRating() {
  return get<MyRatingView>('/api/user/rating', { auth: 'user' })
}

