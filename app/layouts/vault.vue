<script setup lang="ts">
const { isLocked, isUnlocked, restoreSession } = useBitwardenAuth()
const { clearDecryptedData } = useVaultContext()

/** Avoid SSR/client mismatch — session + keys live in sessionStorage. */
const ready = ref(false)

onMounted(async () => {
  await restoreSession()
  ready.value = true
})

watch(isUnlocked, (unlocked, wasUnlocked) => {
  if (!unlocked && wasUnlocked) {
    clearDecryptedData()
  }
})
</script>

<template>
  <div
    v-if="!ready"
    class="flex min-h-dvh items-center justify-center bg-[var(--bw-off-white)]"
  >
    <div class="flex flex-col items-center gap-3 text-[var(--bw-deep-blue)]">
      <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      <p class="text-sm text-[var(--bw-medium-grey)]">
        Restoring session…
      </p>
    </div>
  </div>

  <VaultUnlockScreen v-else-if="isLocked" />

  <UDashboardGroup
    v-else
    storage-key="vault"
    unit="rem"
  >
    <VaultSidebar />
    <slot />
  </UDashboardGroup>
</template>
