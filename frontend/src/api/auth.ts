import { post, get } from './http'
import type { AdminLoginData, AdminUserInfo, UserInfo } from './types'

export function loginUser(username: string, password: string) {
  return post<UserInfo>('/api/user/login', { username, password }, { auth: 'none' })
}

export function loginAdmin(username: string, password: string) {
  return post<AdminLoginData>('/api/admin/login', { username, password }, { auth: 'none' })
}

export function fetchAdminUserInfo() {
  return get<AdminUserInfo>('/api/admin/userinfo', { auth: 'admin' })
}

export function logoutAdminRemote() {
  return post<unknown>('/api/admin/logout', undefined, { auth: 'admin' }).catch(() => undefined)
}
