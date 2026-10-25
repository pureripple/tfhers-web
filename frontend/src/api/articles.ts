import { get, post, del } from './http'
import type { Article } from './types'

/** Prefer user Bearer when logged in (optional for public list/detail). */
export function fetchArticles() {
  return get<Article[]>('/api/articles/all', { auth: 'user' })
}

export function fetchArticle(id: number | string) {
  return get<Article>(`/api/articles/${id}`, { auth: 'user' })
}

export function fetchMyArticles() {
  return get<Article[]>('/api/articles/mine', { auth: 'user' })
}

export function createArticle(payload: {
  title: string
  summary?: string
  content: string
  coverUrl?: string
  author?: string
  viewCount?: number
}) {
  return post<Article>('/api/articles', payload, { auth: 'user' })
}

export function deleteArticle(id: number | string) {
  return del<unknown>(`/api/articles/${id}`, { auth: 'user' })
}

export function likeArticle(id: number | string) {
  return post<unknown>(`/api/articles/${id}/like`, undefined, { auth: 'user' })
}

export function fetchArticleComments(id: number | string) {
  return get<unknown[]>(`/api/articles/${id}/comments`, { auth: 'user' })
}

export function postArticleComment(id: number | string, content: string) {
  return post<unknown>(`/api/articles/${id}/comments`, { content }, { auth: 'user' })
}

export function reportArticle(id: number | string, reason?: string) {
  return post<unknown>(`/api/articles/${id}/report`, { reason: reason || '' }, { auth: 'user' })
}
