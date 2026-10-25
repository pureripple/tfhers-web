import { get } from './http'
import type { Article } from './types'

/** Prefer user Bearer when logged in (optional for public list/detail). */
export function fetchArticles() {
  return get<Article[]>('/api/articles/all', { auth: 'user' })
}

export function fetchArticle(id: number | string) {
  return get<Article>(`/api/articles/${id}`, { auth: 'user' })
}
