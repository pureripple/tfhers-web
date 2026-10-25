import { get, put } from '../http'
import type { AdminFeedback, PageResult } from './types'

export function fetchAdminFeedback(
  params: { page?: number; size?: number; status?: string | number; category?: string } = {},
) {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 1))
  q.set('size', String(params.size ?? 10))
  if (params.status !== undefined && params.status !== '') q.set('status', String(params.status))
  if (params.category) q.set('category', params.category)
  return get<PageResult<AdminFeedback>>(`/api/admin/feedback/list?${q}`, { auth: 'admin' })
}

export function updateFeedbackStatus(id: number, status: number, adminReply?: string) {
  return put<unknown>(
    `/api/admin/feedback/${id}/status`,
    { status, adminReply: adminReply || null },
    { auth: 'admin' },
  )
}