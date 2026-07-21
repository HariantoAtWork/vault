<script setup lang="ts">
definePageMeta({
  layout: 'vault',
})

const {
  activeVault,
  filteredCiphers,
  cipherCount,
  isSyncing,
  syncError,
  syncVault,
  searchQuery,
  typeFilter,
} = useVaultContext()

const { isUnlocked } = useBitwardenAuth()

onMounted(async () => {
  if (!isUnlocked.value) return
  try {
    await syncVault()
  }
  catch {
    // syncError handled in composable
  }
})

async function handleRefresh() {
  await syncVault()
}
</script>

<template>
  <UDashboardPanel id="vault-main">
    <template #header>
      <VaultContextBar />
      <VaultSearchBar
        v-model:search="searchQuery"
        v-model:type-filter="typeFilter"
        :count="cipherCount"
        :loading="isSyncing"
        @refresh="handleRefresh"
      />
    </template>

    <template #body>
      <UAlert
        v-if="syncError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="syncError"
        class="mx-4 mt-4 sm:mx-6"
      />

      <VaultCipherList
        :ciphers="filteredCiphers"
        :loading="isSyncing"
        :vault-name="activeVault?.name ?? 'Vault'"
      />
    </template>
  </UDashboardPanel>
</template>
