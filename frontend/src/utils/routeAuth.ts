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
