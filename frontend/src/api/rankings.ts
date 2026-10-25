import { get } from './http'
import type { RankingsPayload } from './types'

export function fetchRankings(limit = 50) {
  return get<RankingsPayload>(`/api/rankings?limit=${limit}`)
}
