<script setup lang="ts">
import type { VaultContext } from '~/types/bitwarden'

const { session, logout } = useBitwardenAuth()
const { vaultContexts, activeVaultId, selectVault, ciphers } = useVaultContext()

function getVaultCount(vault: VaultContext): number {
  return ciphers.value.filter(c =>
    vault.id === null ? !c.organizationId : c.organizationId === vault.id,
  ).length
}
</script>

<template>
  <aside class="sidebar w-72 shrink-0 flex flex-col border-r border-[var(--bw-light-grey)] bg-[var(--bw-deep-blue)] text-white">
    <header class="p-5 border-b border-white/10">
      <div class="flex items-center gap-3">
        <svg class="w-8 h-8" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="var(--bw-blue)" />
          <path d="M16 8l8 4v6c0 4.4-3.6 8-8 8s-8-3.6-8-8v-6l8-4z" stroke="white" stroke-width="1.5" fill="none" />
          <circle cx="16" cy="15" r="2" fill="var(--bw-teal)" />
        </svg>
        <div>
          <p class="font-display font-bold text-lg leading-tight">Vault</p>
          <p class="text-xs text-white/60 truncate max-w-[160px]">{{ session?.email }}</p>
        </div>
      </div>
    </header>

    <nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Vault switcher">
      <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
        Your vaults
      </p>

      <button
        v-for="vault in vaultContexts"
        :key="vault.id ?? 'personal'"
        type="button"
        class="vault-switch w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all"
        :class="activeVaultId === vault.id
          ? 'bg-white/15 ring-1 ring-white/20'
          : 'hover:bg-white/8'"
        @click="selectVault(vault.id)"
      >
        <span
          class="vault-beam h-10 shrink-0 beam-pulse"
          :class="vault.type === 'personal' ? 'vault-beam--personal' : 'vault-beam--organization'"
        />
        <span class="flex-1 min-w-0">
          <span class="block font-semibold truncate">{{ vault.name }}</span>
          <span class="block text-xs text-white/60 mt-0.5">
            {{ vault.type === 'personal' ? 'Personal' : 'Organisation' }}
            · {{ getVaultCount(vault) }} items
          </span>
        </span>
        <span
          v-if="activeVaultId === vault.id"
          class="w-2 h-2 rounded-full bg-[var(--bw-teal)] shrink-0"
          aria-hidden="true"
        />
      </button>
    </nav>

    <footer class="p-4 border-t border-white/10">
      <button
        type="button"
        class="w-full rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
        @click="logout"
      >
        Lock vault
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.sidebar {
  min-height: 100dvh;
}
</style>
