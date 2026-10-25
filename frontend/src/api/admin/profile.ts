import { get, put } from '../http'
import type { AdminProfileInfo } from './types'

export function fetchAdminProfile() {
  return get<AdminProfileInfo>('/api/profile/info', { auth: 'admin' })
}

export function updateAdminProfile(body: { realName?: string; email?: string; phone?: string }) {
  return put<unknown>('/api/profile/update', body, { auth: 'admin' })
}

export function changeAdminPassword(body: {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}) {
  return put<unknown>('/api/profile/password/change', body, { auth: 'admin' })
}