import { get, put } from '../http'
import type { AdminReport, PageResult } from './types'

export function fetchAdminReports(
  params: { page?: number; size?: number; status?: string | number; targetType?: string } = {},
) {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 1))
  q.set('size', String(params.size ?? 10))
  if (params.status !== undefined && params.status !== '') q.set('status', String(params.status))
  if (params.targetType) q.set('targetType', params.targetType)
  return get<PageResult<AdminReport>>(`/api/admin/reports/list?${q}`, { auth: 'admin' })
}

export function updateReportStatus(id: number, status: number, adminRemark?: string) {
  const body: Record<string, unknown> = { status }
  if (adminRemark) body.adminRemark = adminRemark
  return put<unknown>(`/api/admin/reports/${id}/status`, body, { auth: 'admin' })
}