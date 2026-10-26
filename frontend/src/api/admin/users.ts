import { del, get, put, post } from '../http'
import type { ManagedUser, ManagedUserListData } from './types'

export function fetchManagedUsers(
  params: {
    page?: number
    size?: number
    keyword?: string
    role?: string
    status?: string | number
  } = {},
) {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 1))
  q.set('size', String(params.size ?? 10))
  if (params.keyword) q.set('keyword', params.keyword)
  if (params.role) q.set('role', params.role)
  if (params.status !== undefined && params.status !== '') q.set('status', String(params.status))
  return get<ManagedUserListData>(`/api/user-management/list?${q}`, { auth: 'admin' })
}

export function fetchManagedUser(id: number) {
  return get<ManagedUser>(`/api/user-management/${id}`, { auth: 'admin' })
}

export function createManagedUser(payload: {
  username: string
  nickname?: string
  password: string
  email?: string | null
  phone?: string | null
  role?: string
}) {
  return post<ManagedUser>('/api/user-management/create', payload, { auth: 'admin' })
}

export function updateManagedUser(
  id: number,
  payload: { nickname?: string; email?: string | null; phone?: string | null },
) {
  return put<ManagedUser>(`/api/user-management/${id}`, payload, { auth: 'admin' })
}

export function updateManagedUserStatus(id: number, status: number) {
  return put<unknown>(`/api/user-management/${id}/status`, { status }, { auth: 'admin' })
}

export function updateManagedUserRole(id: number, role: string) {
  return put<unknown>(`/api/user-management/${id}/role`, { role }, { auth: 'admin' })
}

export function deleteManagedUser(id: number) {
  return del<unknown>(`/api/user-management/${id}`, { auth: 'admin' })
}

export function resetManagedUserPassword(id: number, newPassword: string) {
  return put<unknown>(`/api/user-management/${id}/password`, { newPassword }, { auth: 'admin' })
}

export type { ManagedUser }
