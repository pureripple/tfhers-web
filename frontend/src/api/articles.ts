import { get, post, del } from './http'
import { ApiError, type Article } from './types'

/** Prefer user Bearer when logged in (optional for public list/detail). */
export function fetchArticles() {
  return get<Article[]>('/api/articles/all', { auth: 'user' })
}

export type ArticleDetailPayload = Article & {
  likeCount?: number
  liked?: boolean
}

/** Detail API returns { article, likeCount, liked }; list endpoints return Article directly. */
export async function fetchArticle(id: number | string): Promise<ArticleDetailPayload> {
  const data = await get<
    Article | { article?: Article; likeCount?: number; like_count?: number; liked?: boolean }
  >(`/api/articles/${id}`, { auth: 'user' })
  if (data && typeof data === 'object' && 'article' in data && (data as { article?: Article }).article) {
    const wrap = data as {
      article: Article
      likeCount?: number
      like_count?: number
      liked?: boolean
    }
    return {
      ...wrap.article,
      likeCount: wrap.likeCount ?? wrap.like_count,
      liked: wrap.liked,
    }
  }
  return data as ArticleDetailPayload
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
  // Match legacy submitCreateArticle body exactly (extra snake_case keys break Jackson on articles).
  const coverRaw = payload.coverUrl as unknown
  let coverUrl = ''
  if (typeof coverRaw === 'string') coverUrl = coverRaw
  else if (coverRaw && typeof coverRaw === 'object') {
    const o = coverRaw as { url?: string; fileUrl?: string; path?: string }
    coverUrl = o.url || o.fileUrl || o.path || ''
  }
  const body = {
    title: payload.title,
    author: payload.author || '',
    summary: payload.summary ?? '',
    coverUrl,
    content: payload.content,
    viewCount: payload.viewCount ?? 0,
  }
  return post<Article>('/api/articles', body, { auth: 'user' })
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

export function postArticleComment(
  id: number | string,
  content: string,
  parentId?: number | null,
) {
  const body: { content: string; parentId?: number } = { content }
  if (parentId != null && Number.isFinite(Number(parentId))) {
    body.parentId = Number(parentId)
  }
  return post<unknown>(`/api/articles/${id}/comments`, body, { auth: 'user' })
}

export function reportArticle(id: number | string, reason?: string) {
  return post<unknown>(`/api/articles/${id}/report`, { reason: reason || '' }, { auth: 'user' })
}

/** Legacy: POST /api/articles/comments/{id}/report */
export function reportComment(commentId: number | string, reason?: string, content?: string) {
  return post<unknown>(
    `/api/articles/comments/${commentId}/report`,
    { reason: reason || '', content: content || '' },
    { auth: 'user' },
  )
}

/** Legacy uploadUserContentImageAndInsert → /api/file/upload/article-content */
export async function uploadArticleContentImage(file: File): Promise<string> {
  const raw = localStorage.getItem('user')
  let token = ''
  try {
    token = raw ? (JSON.parse(raw) as { token?: string }).token || '' : ''
  } catch {
    token = ''
  }
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/file/upload/article-content', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  })
  let payload: {
    code?: number
    msg?: string
    data?: { url?: string; fileUrl?: string; path?: string } | string
  }
  try {
    payload = await res.json()
  } catch {
    throw new ApiError(res.status, res.statusText || '图片上传失败')
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || '图片上传失败')
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  const url = data && typeof data === 'object' ? data.url || data.fileUrl || data.path : ''
  if (!url) throw new ApiError(500, '上传成功但未返回地址')
  return String(url)
}
