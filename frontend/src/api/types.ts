/** Unified API envelope used by both user and admin backends. */
export interface ApiResult<T = unknown> {
  code: number
  msg: string
  data: T
}

export interface UserInfo {
  token: string
  username?: string
  nickname?: string
  avatarUrl?: string
  role?: string | number
  isAdmin?: boolean
  [key: string]: unknown
}

export interface AdminUserInfo {
  username?: string
  nickname?: string
  avatarUrl?: string
  role?: string | number
  [key: string]: unknown
}

export interface AdminLoginData {
  token: string
  userInfo?: AdminUserInfo
}

export class ApiError extends Error {
  code: number
  constructor(code: number, msg: string) {
    super(msg || `API error ${code}`)
    this.name = 'ApiError'
    this.code = code
  }
}

/** Article list/detail fields (backend mixes camelCase / snake_case). */
export interface Article {
  id: number
  title?: string
  content?: string
  summary?: string
  author?: string
  coverUrl?: string
  cover_url?: string
  createdAt?: string
  created_at?: string
  viewCount?: number
  view_count?: number
  isPinned?: number
  is_pinned?: number
  [key: string]: unknown
}

export interface GameCharacter {
  id: number
  nameEn?: string
  nameZh?: string
  avatarUrl?: string
  intro?: string
  background?: string
  difficultyLevel?: number
  officialVideoUrl?: string
  moveListImageUrl?: string
  [key: string]: unknown
}

export interface CharacterDetail {
  character: GameCharacter
  moves?: unknown[]
  officialVideoUrl?: string
  officialCombos?: unknown[]
  userCombos?: unknown[]
}

export interface RankingRow {
  userId?: number
  rank?: number
  nickname?: string
  username?: string
  avatarUrl?: string
  rating?: number
  tier?: string
  wins?: number
  losses?: number
  matchesPlayed?: number
  [key: string]: unknown
}

export interface RankingsPayload {
  list: RankingRow[]
  tiers?: Record<string, string>
  description?: string
}

export interface Tournament {
  id: number
  title?: string
  description?: string
  status?: string
  maxSlots?: number
  bracketType?: string
  registrationOpensAt?: string
  registrationClosesAt?: string
  startsAt?: string
  registrationCount?: number
  registeredByMe?: boolean
  [key: string]: unknown
}

export interface Room {
  id: number
  title?: string
  status?: string
  maxPlayers?: number
  memberCount?: number
  hasPassword?: boolean
  hostNickname?: string
  hostAvatarUrl?: string
  joinedByMe?: boolean
  isHost?: boolean
  createdAt?: string
  [key: string]: unknown
}
