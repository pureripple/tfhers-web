import { del, get, patch, post, put } from '../http'
import { ApiError, type Article } from '../types'

const ADMIN_TOKEN_KEY = 'admin_token'

export function fetchAdminArticles() {
  return get<Article[]>('/api/articles/all', { auth: 'admin' })
}

export function searchAdminArticles(keyword: string) {
  return get<Article[]>(`/api/articles/search?keyword=${encodeURIComponent(keyword)}`, {
    auth: 'admin',
  })
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

async function uploadAdminImage(file: File, path: string, failMsg: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ApiError(400, '请选择图片文件')
  }
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new ApiError(400, '图片大小不能超过5MB')
  }
  const token = localStorage.getItem(ADMIN_TOKEN_KEY) || ''
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  })
  const rawText = await res.text()
  let payload: {
    code?: number
    msg?: string
    data?: { url?: string; fileUrl?: string; path?: string } | string
  }
  try {
    payload = rawText ? JSON.parse(rawText) : {}
  } catch {
    throw new ApiError(res.status, (rawText && rawText.trim().slice(0, 200)) || res.statusText || failMsg)
  }
  if (!payload || payload.code !== 200) {
    throw new ApiError(payload?.code || res.status, payload?.msg || failMsg)
  }
  const data = payload.data
  if (typeof data === 'string' && data) return data
  const url = data && typeof data === 'object' ? data.url || data.fileUrl || data.path : ''
  if (!url) throw new ApiError(500, '上传成功但未返回访问地址')
  return String(url)
}

/** Admin cover upload — same endpoint as legacy SPA. */
export function uploadAdminArticleCover(file: File) {
  return uploadAdminImage(file, '/api/file/upload/article-cover', '封面上传失败')
}

/** Admin in-article image upload — inserts via caller. */
export function uploadAdminArticleContentImage(file: File) {
  return uploadAdminImage(file, '/api/file/upload/article-content', '正文图片上传失败')
}
