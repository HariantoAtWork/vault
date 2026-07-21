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
  <UDashboardSidebar
    id="vault-nav"
    collapsible
    resizable
    :default-size="18"
    :min-size="14"
    :max-size="26"
    :collapsed-size="0"
    :ui="{
      body: 'gap-1 p-3',
    }"
  >
    <template #header="{ collapsed }">
      <div class="flex items-center gap-3" :class="collapsed ? 'justify-center' : ''">
        <svg
          class="shrink-0 text-white"
          :class="collapsed ? 'size-8' : 'size-9'"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <rect width="32" height="32" rx="8" fill="var(--bw-blue)" />
          <path d="M16 8l8 4v6c0 4.4-3.6 8-8 8s-8-3.6-8-8v-6l8-4z" stroke="white" stroke-width="1.5" fill="none" />
          <circle cx="16" cy="15" r="2" fill="var(--bw-teal)" />
        </svg>
        <div v-if="!collapsed" class="min-w-0">
          <p class="font-display text-lg font-bold leading-tight">
            Vault
          </p>
          <p class="truncate text-xs text-white/60">
            {{ session?.email }}
          </p>
        </div>
      </div>
    </template>

    <template #default="{ collapsed }">
      <p
        v-if="!collapsed"
        class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50"
      >
        Your vaults
      </p>

      <nav :aria-label="collapsed ? 'Vault switcher' : undefined">
        <ul class="space-y-1" role="list">
          <li v-for="vault in vaultContexts" :key="vault.id ?? 'personal'">
            <button
              type="button"
              class="vault-switch flex w-full items-center rounded-lg text-left transition-all"
              :class="[
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-3',
                activeVaultId === vault.id
                  ? 'bg-white/15 ring-1 ring-white/20'
                  : 'hover:bg-white/8',
              ]"
              :title="collapsed ? vault.name : undefined"
              :aria-current="activeVaultId === vault.id ? 'page' : undefined"
              @click="selectVault(vault.id)"
            >
              <span
                class="vault-beam shrink-0"
                :class="[
                  collapsed ? 'h-8' : 'h-10 beam-pulse',
                  vault.type === 'personal' ? 'vault-beam--personal' : 'vault-beam--organization',
                ]"
              />
              <span v-if="!collapsed" class="min-w-0 flex-1">
                <span class="block truncate font-semibold">{{ vault.name }}</span>
                <span class="mt-0.5 block text-xs text-white/60">
                  {{ vault.type === 'personal' ? 'Personal' : 'Organisation' }}
                  · {{ getVaultCount(vault) }} items
                </span>
              </span>
              <span
                v-if="!collapsed && activeVaultId === vault.id"
                class="size-2 shrink-0 rounded-full bg-[var(--bw-teal)]"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>
      </nav>

      <div v-if="!collapsed" class="mt-4 space-y-1 border-t border-white/10 pt-4">
        <UButton
          to="/vault/settings"
          icon="i-lucide-settings"
          label="Settings"
          color="neutral"
          variant="ghost"
          block
          class="text-white/80 hover:text-white"
        />
        <UButton
          to="/vault/admin"
          icon="i-lucide-building-2"
          label="Org admin"
          color="neutral"
          variant="ghost"
          block
          class="text-white/80 hover:text-white"
        />
      </div>
      <div v-else class="mt-4 space-y-1 border-t border-white/10 pt-4">
        <UButton to="/vault/settings" icon="i-lucide-settings" color="neutral" variant="ghost" block class="text-white/80" />
        <UButton to="/vault/admin" icon="i-lucide-building-2" color="neutral" variant="ghost" block class="text-white/80" />
      </div>
    </template>

    <template #footer="{ collapsed }">
      <UButton
        :icon="collapsed ? 'i-lucide-lock' : undefined"
        :label="collapsed ? undefined : 'Lock vault'"
        color="neutral"
        variant="outline"
        block
        class="border-white/20 text-white hover:bg-white/10"
        @click="logout"
      />
    </template>
  </UDashboardSidebar>
</template>
