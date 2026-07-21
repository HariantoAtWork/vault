export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, restoreSession } = useBitwardenAuth()

  if (import.meta.client) {
    restoreSession()
  }

  if (to.path.startsWith('/vault') && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (to.path === '/login' && isAuthenticated.value) {
    return navigateTo('/vault')
  }
})
