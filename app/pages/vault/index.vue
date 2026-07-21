<script setup lang="ts">
definePageMeta({
  layout: 'vault',
})

const { session, logout } = useBitwardenAuth()
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

onMounted(async () => {
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
  <div class="vault-page flex flex-col h-full">
    <VaultSearchBar
      v-model:search="searchQuery"
      v-model:type-filter="typeFilter"
      :count="cipherCount"
      :loading="isSyncing"
      @refresh="handleRefresh"
    />

    <div
      v-if="syncError"
      class="mx-6 mt-4 rounded-lg bg-[var(--bw-red)]/10 border border-[var(--bw-red)]/30 px-4 py-3 text-sm"
      role="alert"
    >
      {{ syncError }}
    </div>

    <VaultCipherList
      :ciphers="filteredCiphers"
      :loading="isSyncing"
      :vault-name="activeVault?.name ?? 'Vault'"
    />

    <footer class="shrink-0 px-6 py-3 border-t border-[var(--bw-light-grey)] flex items-center justify-between text-xs text-[var(--bw-medium-grey)]">
      <span>{{ session?.email }}</span>
      <button
        type="button"
        class="hover:text-[var(--bw-blue)] transition-colors"
        @click="logout"
      >
        Lock vault
      </button>
    </footer>
  </div>
</template>

<style scoped>
.vault-page {
  background: var(--bw-white);
  min-height: calc(100dvh - 4.5rem);
}
</style>
