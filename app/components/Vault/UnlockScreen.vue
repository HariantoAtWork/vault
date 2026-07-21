<script setup lang="ts">
const { session, unlock, logout, isLoading, error } = useBitwardenAuth()

const password = ref('')
const showPassword = ref(false)
const localError = ref<string | null>(null)

const displayError = computed(() => localError.value || error.value)

async function handleUnlock() {
  localError.value = null
  if (!password.value) {
    localError.value = 'Enter your master password to unlock.'
    return
  }

  try {
    await unlock(password.value)
    password.value = ''
  }
  catch {
    // error via composable
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-[var(--bw-off-white)] p-6">
    <UCard
      class="w-full max-w-md"
      :ui="{
        root: 'bg-white shadow-lg ring-1 ring-[var(--bw-light-grey)]',
        body: 'space-y-6 p-8 sm:p-10',
      }"
    >
      <div class="space-y-2 text-center">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[var(--bw-deep-blue)]">
          <UIcon name="i-lucide-lock-keyhole" class="size-7 text-white" />
        </div>
        <h1 class="font-display text-2xl font-bold text-[var(--bw-deep-blue)]">
          Vault locked
        </h1>
        <p class="text-sm text-[var(--bw-medium-grey)]">
          Enter your master password to decrypt
          <span v-if="session?.email" class="font-medium text-[var(--bw-deep-blue)]">
            {{ session.email }}
          </span>
        </p>
      </div>

      <form class="flex flex-col gap-5" @submit.prevent="handleUnlock">
        <UFormField label="Master password" class="w-full">
          <UInput
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="Your master password"
            icon="i-lucide-lock-keyhole"
            autofocus
            required
            class="w-full"
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

        <UButton
          type="button"
          block
          color="neutral"
          variant="ghost"
          label="Sign out"
          @click="logout"
        />
      </form>
    </UCard>
  </div>
</template>
