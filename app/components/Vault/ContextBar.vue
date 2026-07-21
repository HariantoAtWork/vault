<script setup lang="ts">
const { activeVault, cipherCount, isSyncing } = useVaultContext()
</script>

<template>
  <header class="context-bar flex items-center gap-4 px-6 py-4 bg-white border-b border-[var(--bw-light-grey)]">
    <span
      class="vault-beam h-12 shrink-0"
      :class="activeVault?.type === 'personal' ? 'vault-beam--personal' : 'vault-beam--organization'"
    />

    <div class="flex-1 min-w-0">
      <p class="text-xs font-semibold uppercase tracking-wider text-[var(--bw-medium-grey)]">
        {{ activeVault?.type === 'personal' ? 'Personal vault' : 'Organisation vault' }}
      </p>
      <h1 class="text-xl font-bold text-[var(--bw-deep-blue)] truncate">
        {{ activeVault?.name ?? 'Vault' }}
      </h1>
    </div>

    <div class="text-right shrink-0">
      <p class="text-2xl font-display font-bold text-[var(--bw-blue)] tabular-nums">
        {{ cipherCount }}
      </p>
      <p class="text-xs text-[var(--bw-medium-grey)]">
        {{ isSyncing ? 'Syncing…' : 'passwords' }}
      </p>
    </div>
  </header>
</template>
