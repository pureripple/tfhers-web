/** Shared admin list / entity shapes (backend mixes camelCase). */

export interface PageResult<T> {
  list?: T[]
  total?: number
  [key: string]: unknown
}

export interface AdminCombo {
  id: number
  characterId?: number
  title?: string
  description?: string
  damageTotal?: number
  videoUrl?: string
  comboFileUrl?: string
  status?: string
  createdAt?: string
  [key: string]: unknown
}

export interface AdminReport {
  id: number
  userId?: number
  user_id?: number
  targetType?: string
  target_type?: string
  targetId?: number
  target_id?: number
  reason?: string
  content?: string
  status?: number
  createdAt?: string
  created_at?: string
  adminRemark?: string
  admin_remark?: string
  [key: string]: unknown
}

export interface AdminComment {
  id: number
  articleId?: number
  article_id?: number
  userId?: number
  user_id?: number
  authorName?: string
  author_name?: string
  content?: string
  status?: number
  createdAt?: string
  created_at?: string
  adminRemark?: string
  admin_remark?: string
  [key: string]: unknown
}

export interface AdminFeedback {
  id: number
  userId?: number
  user_id?: number
  username?: string
  category?: string
  title?: string
  content?: string
  status?: number
  createdAt?: string
  created_at?: string
  adminReply?: string
  admin_reply?: string
  [key: string]: unknown
}

export interface ManagedUser {
  id: number
  username?: string
  nickname?: string
  email?: string
  phone?: string
  avatarUrl?: string
  role?: string
  status?: number
  lastLoginTime?: string
  createdAt?: string
  [key: string]: unknown
}

export interface ManagedUserListData {
  users?: ManagedUser[]
  total?: number
  totalPages?: number
  [key: string]: unknown
}

export interface AdminProfileInfo {
  username?: string
  realName?: string
  nickname?: string
  email?: string
  phone?: string
  avatarUrl?: string
  role?: string
  [key: string]: unknown
}

export interface SteamPlaytimeData {
  top10?: Array<{
    nickname?: string
    username?: string
    playtimeHours?: number
    playtimeMinutes?: number
    [key: string]: unknown
  }>
  histogram?: unknown
  sampleSize?: number
  [key: string]: unknown
}

export interface SteamAchievementsSiteData {
  achievements?: Array<{
    apiName?: string
    displayName?: string
    unlockCount?: number
    unlockRate?: number
    [key: string]: unknown
  }>
  sampleSize?: number
  [key: string]: unknown
}

export interface SteamSyncResult {
  appId?: number
  total?: number
  upserted?: number
  uploadedAny?: number
  failedAny?: number
  updatedAt?: string
  [key: string]: unknown
}