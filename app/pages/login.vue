<script setup lang="ts">
import type { ServerPreset } from '~/types/bitwarden'

definePageMeta({
  layout: 'default',
})

const {
  login,
  isLoading,
  error,
  serverPreset,
  selfHostUrl,
  rememberEmail,
  rememberedEmail,
  serverConfig,
} = useBitwardenAuth()

const { syncVault } = useVaultContext()

const email = ref(rememberedEmail.value)
const password = ref('')
const showSelfHostInput = ref(serverPreset.value === 'self')
const localError = ref<string | null>(null)

watch(rememberedEmail, (value) => {
  if (value && !email.value) email.value = value
}, { immediate: true })

function selectServer(preset: ServerPreset) {
  serverPreset.value = preset
  showSelfHostInput.value = preset === 'self'
}

async function handleSubmit() {
  localError.value = null

  if (!email.value.trim() || !password.value) {
    localError.value = 'Enter your email and master password.'
    return
  }

  if (serverPreset.value === 'self' && !selfHostUrl.value.trim()) {
    localError.value = 'Enter your self-hosted server address.'
    return
  }

  try {
    await login(email.value.trim(), password.value)
    await syncVault()
    await navigateTo('/vault')
  }
  catch {
    // error surfaced via composable
  }
}

const displayError = computed(() => localError.value || error.value)
</script>

<template>
  <div class="login-page min-h-dvh grid lg:grid-cols-2">
    <section class="login-hero relative overflow-hidden flex flex-col justify-between p-10 lg:p-14 text-white">
      <div class="hero-grid absolute inset-0 opacity-20" aria-hidden="true" />
      <div class="relative z-10 animate-fade-rise">
        <div class="inline-flex items-center gap-2 text-sm font-medium tracking-wide uppercase opacity-80">
          <span class="vault-beam vault-beam--personal h-5" />
          Vault redesign
        </div>
        <h1 class="mt-8 text-4xl lg:text-5xl font-bold leading-tight max-w-md">
          Know exactly where you are
        </h1>
        <p class="mt-4 text-lg opacity-85 max-w-sm leading-relaxed">
          One glance tells you whether you're in My Vault or an organisation. Find passwords without the hunt.
        </p>
      </div>

      <div class="relative z-10 mt-12 space-y-4 animate-fade-rise" style="animation-delay: 0.1s">
        <div class="flex items-center gap-3 text-sm opacity-90">
          <span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display font-semibold">1</span>
          Pick your server once
        </div>
        <div class="flex items-center gap-3 text-sm opacity-90">
          <span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display font-semibold">2</span>
          Sign in with your Bitwarden account
        </div>
        <div class="flex items-center gap-3 text-sm opacity-90">
          <span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display font-semibold">3</span>
          Switch vaults from the sidebar
        </div>
      </div>
    </section>

    <section class="flex items-center justify-center p-6 lg:p-12 bg-[var(--bw-off-white)]">
      <form
        class="w-full max-w-md animate-fade-rise"
        style="animation-delay: 0.05s"
        @submit.prevent="handleSubmit"
      >
        <header class="mb-8">
          <h2 class="text-2xl font-bold text-[var(--bw-deep-blue)]">
            Sign in
          </h2>
          <p class="mt-1 text-[var(--bw-medium-grey)]">
            Connected to {{ serverConfig.label }}
          </p>
        </header>

        <AuthServerSelector
          :model-value="serverPreset"
          :self-host-url="selfHostUrl"
          :show-self-host-input="showSelfHostInput"
          @update:model-value="selectServer"
          @update:self-host-url="selfHostUrl = $event"
        />

        <div class="mt-6 space-y-4">
          <label class="block">
            <span class="text-sm font-medium text-[var(--bw-deep-blue)]">Email address</span>
            <input
              v-model="email"
              type="email"
              autocomplete="username"
              required
              class="mt-1.5 w-full rounded-lg border border-[var(--bw-light-grey)] bg-white px-4 py-3 text-[var(--bw-deep-blue)] placeholder:text-[var(--bw-medium-grey)] focus:border-[var(--bw-blue)] focus:ring-2 focus:ring-[var(--bw-blue)]/20 transition"
              placeholder="you@company.com"
            >
          </label>

          <label class="block">
            <span class="text-sm font-medium text-[var(--bw-deep-blue)]">Master password</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              required
              class="mt-1.5 w-full rounded-lg border border-[var(--bw-light-grey)] bg-white px-4 py-3 text-[var(--bw-deep-blue)] placeholder:text-[var(--bw-medium-grey)] focus:border-[var(--bw-blue)] focus:ring-2 focus:ring-[var(--bw-blue)]/20 transition"
              placeholder="Your master password"
            >
          </label>

          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              v-model="rememberEmail"
              type="checkbox"
              class="w-4 h-4 rounded border-[var(--bw-light-grey)] text-[var(--bw-blue)] focus:ring-[var(--bw-blue)]"
            >
            <span class="text-sm text-[var(--bw-deep-blue)]">Remember email</span>
          </label>
        </div>

        <div
          v-if="displayError"
          class="mt-4 rounded-lg bg-[var(--bw-red)]/10 border border-[var(--bw-red)]/30 px-4 py-3 text-sm text-[var(--bw-deep-blue)]"
          role="alert"
        >
          {{ displayError }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-6 w-full rounded-lg bg-[var(--bw-blue)] hover:bg-[var(--bw-deep-blue)] disabled:opacity-60 text-white font-semibold py-3.5 transition-colors"
        >
          {{ isLoading ? 'Signing in…' : 'Unlock vault' }}
        </button>
      </form>
    </section>
  </div>
</template>

<style scoped>
.login-hero {
  background: linear-gradient(145deg, var(--bw-deep-blue) 0%, #0a2860 50%, var(--bw-blue) 100%);
}

.hero-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 32px 32px;
}
</style>
