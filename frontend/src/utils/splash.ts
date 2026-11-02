/** sessionStorage flag: guest already dismissed the login splash this tab. */
export const SPLASH_SEEN_KEY = 'tfhers_splash_seen'

export function hasSeenSplash(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

/** Paths that require a logged-in user (mirror router meta.requiresAuth). */
export function pathRequiresUserAuth(pathname: string): boolean {
  const p = (pathname || '/').split('?')[0].split('#')[0]
  if (p === '/lobby' || p.startsWith('/lobby/')) return true
  if (p === '/ai-chat' || p.startsWith('/ai-chat/')) return true
  if (p === '/data' || p.startsWith('/data/')) return true
  if (p === '/manuscripts' || p.startsWith('/manuscripts/')) return true
  if (p === '/settings' || p.startsWith('/settings/')) return true
  // Exact /profile is self; /profile/:userId is public
  if (p === '/profile') return true
  return false
}
