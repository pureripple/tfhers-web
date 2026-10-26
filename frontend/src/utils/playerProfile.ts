/** Match legacy resolveCommunityUserId / openPlayerProfile. */
import type { Router } from 'vue-router'
import { useUserAuthStore } from '@/stores/auth'

export function resolveCommunityUserId(obj: unknown, explicitId?: unknown): number | null {
  if (explicitId != null && explicitId !== '') {
    const n = Number(explicitId)
    if (!Number.isNaN(n) && n > 0) return n
  }
  if (!obj || typeof obj !== 'object') return null
  const o = obj as Record<string, unknown>
  const raw =
    o.userId ??
    o.user_id ??
    o.authorId ??
    o.author_id ??
    o.createdBy ??
    o.created_by ??
    o.hostUserId ??
    o.host_user_id ??
    o.id
  if (raw == null || raw === '') return null
  // Prefer author/user ids over article id — if only `id` and also has title/content, skip
  if (raw === o.id && (o.title != null || o.content != null) && o.userId == null && o.authorId == null && o.author_id == null && o.user_id == null) {
    return null
  }
  const n = Number(raw)
  return !Number.isNaN(n) && n > 0 ? n : null
}

export function getSelfUserId(): number | null {
  try {
    const auth = useUserAuthStore()
    const u = auth.user as Record<string, unknown> | null
    if (!u) return null
    const raw = u.id ?? u.userId ?? u.user_id
    const n = Number(raw)
    return !Number.isNaN(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function goPlayerProfile(router: Router, userId: unknown, obj?: unknown) {
  const id = resolveCommunityUserId(obj ?? null, userId)
  if (id == null) return
  const self = getSelfUserId()
  if (self != null && String(self) === String(id)) {
    router.push({ name: 'profile' })
    return
  }
  router.push({ name: 'profile-user', params: { userId: String(id) } })
}
