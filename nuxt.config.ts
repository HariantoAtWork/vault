// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  // Keep light mode for Bitwarden's off-white brand surface.
  // System dark preference was flipping Nuxt UI tokens to light text on light cards.
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  app: {
    head: {
      title: 'Vault',
      meta: [
        { name: 'description', content: 'Bitwarden vault management — redesigned for clarity' },
      ],
    },
  },
})
