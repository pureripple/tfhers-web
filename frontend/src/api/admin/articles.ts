import { del, get, patch, post, put } from '../http'
import type { Article } from '../types'

export function fetchAdminArticles() {
  return get<Article[]>('/api/articles/all', { auth: 'admin' })
}

export function searchAdminArticles(keyword: string) {
  return get<Article[]>(`/api/articles/search?keyword=${encodeURIComponent(keyword)}`, { auth: 'admin' })
}

export function setArticlePinned(id: number, pinned: boolean) {
  return patch<unknown>(`/api/articles/${id}/pinned`, { pinned }, { auth: 'admin' })
}

export function deleteAdminArticle(id: number) {
  return del<unknown>(`/api/articles/${id}`, { auth: 'admin' })
}

export function createAdminArticle(payload: {
  title: string
  summary?: string
  content: string
  coverUrl?: string
  author?: string
  isPinned?: number
  viewCount?: number
}) {
  return post<Article>('/api/articles', payload, { auth: 'admin' })
}

export function updateAdminArticle(payload: {
  id: number
  title: string
  summary?: string
  content: string
  coverUrl?: string
  author?: string
  isPinned?: number
}) {
  return put<Article>('/api/articles', payload, { auth: 'admin' })
}
