export default defineNuxtRouteMiddleware(async (to) => {
  // Session lives in sessionStorage — unavailable during SSR.
  if (import.meta.server) return

  const { isAuthenticated, restoreSession } = useBitwardenAuth()
  await restoreSession()

  if (to.path.startsWith('/vault') && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (to.path === '/login' && isAuthenticated.value) {
    return navigateTo('/vault')
  }
})
