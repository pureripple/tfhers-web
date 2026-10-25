import { del, get, patch } from '../http'
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