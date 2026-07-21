<script setup lang="ts">
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
  testConnection,
} = useBitwardenAuth()

const { syncVault } = useVaultContext()

const email = ref(rememberedEmail.value)
const password = ref('')
const showPassword = ref(false)
const localError = ref<string | null>(null)
const connectionStatus = ref<{ ok: boolean, message: string } | null>(null)
const testingConnection = ref(false)

const showSelfHostInput = computed(() => serverPreset.value === 'self')

watch(rememberedEmail, (value) => {
  if (value && !email.value) email.value = value
}, { immediate: true })

watch(serverPreset, () => {
  connectionStatus.value = null
})

async function handleTestConnection() {
  localError.value = null
  connectionStatus.value = null

  if (serverPreset.value === 'self' && !selfHostUrl.value.trim()) {
    localError.value = 'Enter your self-hosted server address.'
    return
  }

  testingConnection.value = true
  try {
    const result = await testConnection()
    connectionStatus.value = { ok: result.ok, message: result.message }
  }
  catch (err) {
    connectionStatus.value = {
      ok: false,
      message: err instanceof Error ? err.message : 'Connection test failed',
    }
  }
  finally {
    testingConnection.value = false
  }
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
  <div class="login-page grid min-h-dvh lg:grid-cols-2">
    <section class="login-hero relative flex flex-col justify-between overflow-hidden p-8 text-white sm:p-10 lg:p-14">
      <div class="hero-grid absolute inset-0 opacity-20" aria-hidden="true" />
      <div class="relative z-10 animate-fade-rise">
        <div class="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide opacity-80">
          <span class="vault-beam vault-beam--personal h-5" />
          Bitwarden vault
        </div>
        <h1 class="mt-8 max-w-md text-4xl font-bold leading-tight lg:text-5xl">
          Know exactly where you are
        </h1>
        <p class="mt-4 max-w-sm text-lg leading-relaxed opacity-85">
          One glance tells you whether you're in My Vault or an organisation. Find passwords without the hunt.
        </p>
      </div>

      <ol class="relative z-10 mt-12 space-y-4 animate-fade-rise" style="animation-delay: 0.1s">
        <li class="flex items-center gap-3 text-sm opacity-90">
          <span class="flex size-8 items-center justify-center rounded-full bg-white/10 font-display font-semibold">1</span>
          Pick your server once
        </li>
        <li class="flex items-center gap-3 text-sm opacity-90">
          <span class="flex size-8 items-center justify-center rounded-full bg-white/10 font-display font-semibold">2</span>
          Sign in with your Bitwarden account
        </li>
        <li class="flex items-center gap-3 text-sm opacity-90">
          <span class="flex size-8 items-center justify-center rounded-full bg-white/10 font-display font-semibold">3</span>
          Switch vaults from the sidebar
        </li>
      </ol>
    </section>

    <section class="flex items-center justify-center bg-[var(--bw-off-white)] p-6 lg:p-12">
      <UCard
        class="w-full max-w-md animate-fade-rise"
        style="animation-delay: 0.05s"
        :ui="{
          root: 'bg-white ring-[var(--bw-light-grey)]',
          header: 'bg-white',
          body: 'space-y-6 bg-white',
        }"
      >
        <template #header>
          <div>
            <h2 class="text-2xl font-bold text-[var(--bw-deep-blue)]">
              Sign in
            </h2>
            <p class="mt-1 text-sm text-[var(--bw-medium-grey)]">
              Connected to {{ serverConfig.label }}
            </p>
          </div>
        </template>

        <form class="flex w-full flex-col gap-6" @submit.prevent="handleSubmit">
          <AuthServerSelector
            v-model="serverPreset"
            v-model:self-host-url="selfHostUrl"
          />

          <div v-if="showSelfHostInput" class="flex items-center gap-2">
            <UButton
              type="button"
              color="neutral"
              variant="outline"
              icon="i-lucide-plug"
              label="Test connection"
              :loading="testingConnection"
              @click="handleTestConnection"
            />
          </div>

          <UAlert
            v-if="connectionStatus"
            :color="connectionStatus.ok ? 'success' : 'error'"
            variant="subtle"
            :icon="connectionStatus.ok ? 'i-lucide-check-circle' : 'i-lucide-circle-alert'"
            :title="connectionStatus.message"
          />

          <UFormField label="Email address" class="w-full">
            <UInput
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="you@company.com"
              icon="i-lucide-mail"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Master password" class="w-full">
            <UInput
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="Your master password"
              icon="i-lucide-lock-keyhole"
              required
              class="w-full"
              :ui="{ root: 'w-full', base: 'w-full', trailing: 'pe-1' }"
            >
              <template #trailing>
                <UButton
                  type="button"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Hide master password' : 'Show master password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UCheckbox
            v-model="rememberEmail"
            label="Remember email"
            :ui="{ label: 'text-[var(--bw-deep-blue)]' }"
          />

          <UAlert
            v-if="displayError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="displayError"
          />

          <UButton
            type="submit"
            block
            size="lg"
            color="primary"
            :loading="isLoading"
            icon="i-lucide-unlock"
            label="Unlock vault"
            class="text-white"
          />
        </form>
      </UCard>
    </section>
  </div>
</template>
