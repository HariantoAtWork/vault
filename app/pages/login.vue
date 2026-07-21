<script setup lang="ts">
import { TWO_FACTOR_LABELS, type TwoFactorProviderType } from '~/types/bitwarden'

definePageMeta({
  layout: 'default',
})

const {
  login,
  completeTwoFactor,
  sendTwoFactorEmail,
  cancelTwoFactor,
  isLoading,
  error,
  serverPreset,
  selfHostUrl,
  rememberEmail,
  rememberedEmail,
  serverConfig,
  testConnection,
  needsTwoFactor,
  twoFactorChallenge,
  twoFactorProvider,
} = useBitwardenAuth()

const { syncVault } = useVaultContext()

const email = ref(rememberedEmail.value)
const password = ref('')
const showPassword = ref(false)
const twoFactorCode = ref('')
const rememberTwoFactor = ref(false)
const localError = ref<string | null>(null)
const connectionStatus = ref<{ ok: boolean, message: string } | null>(null)
const testingConnection = ref(false)
const resendingEmail = ref(false)
const emailSentNotice = ref<string | null>(null)

const showSelfHostInput = computed(() => serverPreset.value === 'self')

const availableProviders = computed(() => {
  const providers = twoFactorChallenge.value?.twoFactorProviders ?? []
  // Prefer providers we can complete in the UI today
  return providers.filter(p => [0, 1, 8].includes(p))
})

const twoFactorHint = computed(() => {
  const provider = twoFactorProvider.value
  if (provider === 0) return 'Enter the 6-digit code from your authenticator app.'
  if (provider === 1) {
    const emailHint = twoFactorChallenge.value?.twoFactorProviders2?.['1']?.Email
    return emailHint
      ? `Enter the code sent to ${emailHint}.`
      : 'Enter the code sent to your email.'
  }
  if (provider === 8) return 'Enter one of your recovery codes.'
  return 'Enter your two-factor authentication code.'
})

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

async function finishLogin() {
  await syncVault()
  await navigateTo('/vault')
}

async function handleSubmit() {
  localError.value = null

  if (needsTwoFactor.value) {
    if (!twoFactorCode.value.trim()) {
      localError.value = 'Enter your two-factor code.'
      return
    }

    try {
      await completeTwoFactor(twoFactorCode.value.trim(), rememberTwoFactor.value)
      await finishLogin()
    }
    catch {
      // error surfaced via composable
    }
    return
  }

  if (!email.value.trim() || !password.value) {
    localError.value = 'Enter your email and master password.'
    return
  }

  if (serverPreset.value === 'self' && !selfHostUrl.value.trim()) {
    localError.value = 'Enter your self-hosted server address.'
    return
  }

  try {
    const result = await login(email.value.trim(), password.value)
    if (result && 'twoFactorRequired' in result && result.twoFactorRequired) {
      twoFactorCode.value = ''
      emailSentNotice.value = twoFactorProvider.value === 1 && !error.value
        ? 'A code has been sent to your email.'
        : null
      return
    }
    await finishLogin()
  }
  catch {
    // error surfaced via composable
  }
}

function handleCancelTwoFactor() {
  cancelTwoFactor()
  twoFactorCode.value = ''
  localError.value = null
  emailSentNotice.value = null
}

async function selectTwoFactorProvider(provider: TwoFactorProviderType) {
  twoFactorProvider.value = provider
  emailSentNotice.value = null
  localError.value = null
  if (provider === 1) {
    await handleResendTwoFactorEmail()
  }
}

async function handleResendTwoFactorEmail() {
  resendingEmail.value = true
  localError.value = null
  emailSentNotice.value = null
  try {
    await sendTwoFactorEmail()
    emailSentNotice.value = 'A new code has been sent to your email.'
  }
  catch {
    // error surfaced via composable
  }
  finally {
    resendingEmail.value = false
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
              {{ needsTwoFactor ? 'Two-factor authentication' : 'Sign in' }}
            </h2>
            <p class="mt-1 text-sm text-[var(--bw-medium-grey)]">
              {{ needsTwoFactor ? twoFactorHint : `Connected to ${serverConfig.label}` }}
            </p>
          </div>
        </template>

        <form class="flex w-full flex-col gap-6" @submit.prevent="handleSubmit">
          <template v-if="!needsTwoFactor">
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
          </template>

          <template v-else>
            <div
              v-if="availableProviders.length > 1"
              class="flex flex-wrap gap-2"
              role="group"
              aria-label="Two-factor method"
            >
              <UButton
                v-for="provider in availableProviders"
                :key="provider"
                type="button"
                size="sm"
                :variant="twoFactorProvider === provider ? 'solid' : 'outline'"
                :color="twoFactorProvider === provider ? 'primary' : 'neutral'"
                :label="TWO_FACTOR_LABELS[provider] || `Method ${provider}`"
                @click="selectTwoFactorProvider(provider as TwoFactorProviderType)"
              />
            </div>

            <UFormField
              :label="TWO_FACTOR_LABELS[twoFactorProvider ?? 0] || 'Verification code'"
              class="w-full"
            >
              <UInput
                v-model="twoFactorCode"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                placeholder="123456"
                icon="i-lucide-shield-check"
                required
                autofocus
                class="w-full"
              />
            </UFormField>

            <UButton
              v-if="twoFactorProvider === 1"
              type="button"
              color="neutral"
              variant="ghost"
              size="sm"
              class="self-start"
              :loading="resendingEmail"
              label="Resend email code"
              icon="i-lucide-mail"
              @click="handleResendTwoFactorEmail"
            />

            <UCheckbox
              v-model="rememberTwoFactor"
              label="Remember this device"
              :ui="{ label: 'text-[var(--bw-deep-blue)]' }"
            />
          </template>

          <UAlert
            v-if="emailSentNotice && !displayError"
            color="success"
            variant="subtle"
            icon="i-lucide-mail-check"
            :title="emailSentNotice"
          />

          <UAlert
            v-if="displayError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :title="displayError"
          />

          <div class="flex flex-col gap-3">
            <UButton
              type="submit"
              block
              size="lg"
              color="primary"
              :loading="isLoading"
              :icon="needsTwoFactor ? 'i-lucide-shield-check' : 'i-lucide-unlock'"
              :label="needsTwoFactor ? 'Verify and unlock' : 'Unlock vault'"
              class="text-white"
            />

            <UButton
              v-if="needsTwoFactor"
              type="button"
              block
              color="neutral"
              variant="ghost"
              label="Back to sign in"
              @click="handleCancelTwoFactor"
            />
          </div>
        </form>
      </UCard>
    </section>
  </div>
</template>
