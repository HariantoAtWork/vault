<script setup lang="ts">
const { activeVault, cipherCount, isSyncing } = useVaultContext()

const vaultTypeLabel = computed(() =>
  activeVault.value?.type === 'personal' ? 'Personal vault' : 'Organisation vault',
)

const beamClass = computed(() =>
  activeVault.value?.type === 'personal' ? 'vault-beam--personal' : 'vault-beam--organization',
)
</script>

<template>
  <UDashboardNavbar :title="activeVault?.name ?? 'Vault'">
    <template #leading>
      <UDashboardSidebarCollapse class="lg:hidden" />
    </template>

    <template #title>
      <div class="flex min-w-0 items-center gap-3">
        <span class="vault-beam h-10 shrink-0" :class="beamClass" aria-hidden="true" />
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted">
            {{ vaultTypeLabel }}
          </p>
          <p class="truncate font-display text-lg font-bold text-highlighted">
            {{ activeVault?.name ?? 'Vault' }}
          </p>
        </div>
      </div>
    </template>

    <template #right>
      <div class="text-right">
        <p class="font-display text-2xl font-bold tabular-nums text-primary">
          {{ cipherCount }}
        </p>
        <p class="text-xs text-muted">
          {{ isSyncing ? 'Syncing…' : 'items' }}
        </p>
      </div>
    </template>
  </UDashboardNavbar>
</template>
