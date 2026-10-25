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
