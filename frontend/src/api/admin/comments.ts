import { get, put } from '../http'
import type { AdminComment, PageResult } from './types'

export function fetchAdminComments(
  params: { page?: number; size?: number; status?: string | number; articleId?: string | number } = {},
) {
  const q = new URLSearchParams()
  q.set('page', String(params.page ?? 1))
  q.set('size', String(params.size ?? 10))
  if (params.status !== undefined && params.status !== '') q.set('status', String(params.status))
  if (params.articleId !== undefined && params.articleId !== '') q.set('articleId', String(params.articleId))
  return get<PageResult<AdminComment>>(`/api/admin/article-comments/list?${q}`, { auth: 'admin' })
}

export function updateCommentStatus(id: number, status: number, adminRemark?: string) {
  const body: Record<string, unknown> = { status }
  if (adminRemark) body.adminRemark = adminRemark
  return put<unknown>(`/api/admin/article-comments/${id}/status`, body, { auth: 'admin' })
}