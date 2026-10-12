/** Public, non-personalized Next route shells only. Data is loaded separately. */
export const OFFLINE_ROUTES = ['/dashboard', '/occupational', '/alerts', '/about', '/login', '/officer', '/authority'] as const

export function offlineShellUrl(pathname: string): string {
  const path = pathname === '/' ? '/dashboard' : pathname.replace(/\/$/, '')
  return OFFLINE_ROUTES.some((route) => route === path)
    ? `${path}?__tapas_shell=1`
    : '/offline.html'
}
