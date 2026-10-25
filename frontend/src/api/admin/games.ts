import { post } from '../http'
import type { SteamSyncResult } from './types'

export function syncSteamAchievements() {
  return post<SteamSyncResult>('/api/admin/games/steam/achievements/sync', undefined, { auth: 'admin' })
}