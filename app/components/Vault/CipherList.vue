<script setup lang="ts">
import type { CipherItem } from '~/types/bitwarden'
import { getCipherInitial, getCipherTypeLabel } from '~/utils/cipher-filter'

defineProps<{
  ciphers: CipherItem[]
  loading?: boolean
  vaultName: string
}>()

const expandedId = ref<string | null>(null)
const copiedField = ref<string | null>(null)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

async function copyToClipboard(text: string, fieldKey: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = fieldKey
    setTimeout(() => {
      copiedField.value = null
    }, 2000)
  }
  catch {
    // clipboard unavailable
  }
}

function primaryUri(cipher: CipherItem): string | undefined {
  return cipher.login?.uris?.[0]?.uri ?? undefined
}
</script>

<template>
  <div class="cipher-list flex-1 overflow-y-auto p-6">
    <div v-if="loading && !ciphers.length" class="flex flex-col items-center justify-center py-20 text-[var(--bw-medium-grey)]">
      <div class="w-8 h-8 border-2 border-[var(--bw-blue)] border-t-transparent rounded-full animate-spin mb-4" />
      <p>Loading {{ vaultName }}…</p>
    </div>

    <div
      v-else-if="!ciphers.length"
      class="empty-state flex flex-col items-center justify-center py-20 text-center"
    >
      <div class="w-16 h-16 rounded-2xl bg-[var(--bw-off-white)] flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-[var(--bw-medium-grey)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </div>
      <h3 class="font-display font-semibold text-lg text-[var(--bw-deep-blue)]">
        No items here
      </h3>
      <p class="mt-1 text-sm text-[var(--bw-medium-grey)] max-w-xs">
        {{ vaultName }} has no matching passwords. Try another vault or clear your search.
      </p>
    </div>

    <ul v-else class="space-y-2" role="list">
      <li
        v-for="(cipher, index) in ciphers"
        :key="cipher.id"
        class="animate-fade-rise"
        :style="{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }"
      >
        <article
          class="cipher-card rounded-xl border border-[var(--bw-light-grey)] bg-white overflow-hidden transition-shadow hover:shadow-md"
          :class="{ 'ring-2 ring-[var(--bw-blue)]/20': expandedId === cipher.id }"
        >
          <button
            type="button"
            class="w-full flex items-center gap-4 p-4 text-left"
            @click="toggleExpand(cipher.id)"
          >
            <span
              class="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-white shrink-0"
              :class="cipher.favorite ? 'bg-[var(--bw-yellow)] text-[var(--bw-deep-blue)]' : 'bg-[var(--bw-blue)]'"
            >
              {{ getCipherInitial(cipher.name) }}
            </span>

            <span class="flex-1 min-w-0">
              <span class="flex items-center gap-2">
                <span class="font-semibold text-[var(--bw-deep-blue)] truncate">{{ cipher.name }}</span>
                <span
                  v-if="cipher.favorite"
                  class="text-[var(--bw-yellow)] text-xs"
                  aria-label="Favourite"
                >★</span>
              </span>
              <span class="block text-sm text-[var(--bw-medium-grey)] truncate mt-0.5">
                {{ cipher.login?.username || primaryUri(cipher) || getCipherTypeLabel(cipher.type) }}
              </span>
            </span>

            <span class="text-xs font-medium text-[var(--bw-medium-grey)] uppercase tracking-wide shrink-0 hidden sm:block">
              {{ getCipherTypeLabel(cipher.type) }}
            </span>

            <svg
              class="w-5 h-5 text-[var(--bw-medium-grey)] shrink-0 transition-transform"
              :class="{ 'rotate-180': expandedId === cipher.id }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            v-if="expandedId === cipher.id"
            class="border-t border-[var(--bw-light-grey)] bg-[var(--bw-off-white)]/50 px-4 py-3 space-y-2"
          >
            <div v-if="cipher.login?.username" class="flex items-center justify-between gap-2">
              <span class="text-xs text-[var(--bw-medium-grey)]">Username</span>
              <div class="flex items-center gap-2">
                <code class="text-sm text-[var(--bw-deep-blue)]">{{ cipher.login.username }}</code>
                <button
                  type="button"
                  class="text-xs text-[var(--bw-blue)] hover:underline"
                  @click.stop="copyToClipboard(cipher.login!.username!, `${cipher.id}-user`)"
                >
                  {{ copiedField === `${cipher.id}-user` ? 'Copied' : 'Copy' }}
                </button>
              </div>
            </div>

            <div v-if="cipher.login?.password" class="flex items-center justify-between gap-2">
              <span class="text-xs text-[var(--bw-medium-grey)]">Password</span>
              <div class="flex items-center gap-2">
                <code class="text-sm text-[var(--bw-deep-blue)]">••••••••</code>
                <button
                  type="button"
                  class="text-xs text-[var(--bw-blue)] hover:underline"
                  @click.stop="copyToClipboard(cipher.login!.password!, `${cipher.id}-pass`)"
                >
                  {{ copiedField === `${cipher.id}-pass` ? 'Copied' : 'Copy' }}
                </button>
              </div>
            </div>

            <div v-if="primaryUri(cipher)" class="flex items-center justify-between gap-2">
              <span class="text-xs text-[var(--bw-medium-grey)]">URL</span>
              <a
                :href="primaryUri(cipher)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-[var(--bw-blue)] hover:underline truncate max-w-[200px]"
                @click.stop
              >
                {{ primaryUri(cipher) }}
              </a>
            </div>
          </div>
        </article>
      </li>
    </ul>
  </div>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
