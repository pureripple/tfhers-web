/** Match legacy main.js isAdminUser / adminNameClass (users.role=ADMIN). */
export function isAdminUser(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  const flag =
    o.isAdmin != null
      ? o.isAdmin
      : o.authorIsAdmin != null
        ? o.authorIsAdmin
        : o.hostIsAdmin != null
          ? o.hostIsAdmin
          : o.author_is_admin != null
            ? o.author_is_admin
            : o.host_is_admin != null
              ? o.host_is_admin
              : null
  if (flag === true || flag === 1 || flag === '1') return true
  if (flag === false || flag === 0 || flag === '0') return false
  if (o.authorAdminId != null || o.author_admin_id != null) return true
  const role = o.role ?? o.userRole ?? o.authorRole
  return String(role || '').toUpperCase() === 'ADMIN'
}

export function adminNameClass(obj: unknown): string {
  return isAdminUser(obj) ? 'user-name--admin' : ''
}
