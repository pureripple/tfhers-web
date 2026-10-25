import { get } from '../http'
import type { Article } from '../types'
import type { AdminCombo, AdminComment, AdminReport, PageResult, SteamAchievementsSiteData, SteamPlaytimeData } from './types'

export async function fetchDashboardKpis() {
  const [articles, pendingCombos, reports, comments] = await Promise.all([
    get<Article[]>('/api/articles/all', { auth: 'admin' }).catch(() => [] as Article[]),
    get<AdminCombo[]>('/api/admin/combos/list?status=pending', { auth: 'admin' }).catch(() => [] as AdminCombo[]),
    get<PageResult<AdminReport>>('/api/admin/reports/list?page=1&size=1&status=0', { auth: 'admin' }).catch(
      () => ({ list: [], total: 0 }),
    ),
    get<PageResult<AdminComment>>('/api/admin/article-comments/list?page=1&size=1&status=0', { auth: 'admin' }).catch(
      () => ({ list: [], total: 0 }),
    ),
  ])

  return {
    articleCount: Array.isArray(articles) ? articles.length : 0,
    pendingCombos: Array.isArray(pendingCombos) ? pendingCombos.length : 0,
    reportsOpen: reports?.total != null ? Number(reports.total) : 0,
    commentsPending: comments?.total != null ? Number(comments.total) : 0,
  }
}

export function fetchSteamPlaytime() {
  return get<SteamPlaytimeData>('/api/admin/statistics/steam-playtime', { auth: 'admin' })
}

export function fetchSteamAchievementsSite() {
  return get<SteamAchievementsSiteData>('/api/admin/statistics/steam-achievements-site', { auth: 'admin' })
}