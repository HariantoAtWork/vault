<script setup lang="ts">
import type { CipherItem } from '~/types/bitwarden'
import { getCipherInitial, getCipherTypeLabel } from '~/utils/cipher-filter'

defineProps<{
  ciphers: CipherItem[]
  loading?: boolean
  vaultName: string
}>()

const toast = useToast()

const expandedId = ref<string | null>(null)
const revealedPasswords = ref<Set<string>>(new Set())

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function togglePasswordReveal(id: string) {
  const next = new Set(revealedPasswords.value)
  if (next.has(id)) {
    next.delete(id)
  }
  else {
    next.add(id)
  }
  revealedPasswords.value = next
}

function isPasswordRevealed(id: string): boolean {
  return revealedPasswords.value.has(id)
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: `${label} copied`,
      icon: 'i-lucide-check',
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: 'Could not copy to clipboard',
      description: 'Check your browser permissions and try again.',
      icon: 'i-lucide-circle-alert',
      color: 'error',
    })
  }
}

function primaryUri(cipher: CipherItem): string | undefined {
  return cipher.login?.uris?.[0]?.uri ?? undefined
}

function typeBadgeColor(type: number): 'primary' | 'neutral' | 'info' | 'warning' {
  switch (type) {
    case 1: return 'primary'
    case 2: return 'neutral'
    case 3: return 'warning'
    default: return 'info'
  }
}
</script>

<template>
  <div class="cipher-list flex-1 overflow-y-auto p-4 sm:p-6">
    <UEmpty
      v-if="loading && !ciphers.length"
      icon="i-lucide-loader-circle"
      :loading="true"
      title="Loading vault"
      :description="`Fetching items from ${vaultName}…`"
      class="py-16"
    />

    <UEmpty
      v-else-if="!ciphers.length"
      icon="i-lucide-key-round"
      title="No items here"
      :description="`${vaultName} has no matching passwords. Try another vault or clear your search.`"
      class="py-16"
    />

    <ul v-else class="space-y-2" role="list">
      <li
        v-for="(cipher, index) in ciphers"
        :key="cipher.id"
        class="animate-fade-rise"
        :style="{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }"
      >
        <UCard
          :ui="{
            root: expandedId === cipher.id ? 'ring-2 ring-primary/20' : '',
            body: 'p-0 sm:p-0',
          }"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40 sm:gap-4"
            :aria-expanded="expandedId === cipher.id"
            @click="toggleExpand(cipher.id)"
          >
            <UAvatar
              :text="getCipherInitial(cipher.name)"
              :ui="{
                root: cipher.favorite
                  ? 'bg-[var(--bw-yellow)] text-[var(--bw-deep-blue)] font-display font-bold'
                  : 'bg-primary text-white font-display font-bold',
              }"
              size="md"
            />

            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2">
                <span class="truncate font-semibold text-highlighted">{{ cipher.name }}</span>
                <UIcon
                  v-if="cipher.favorite"
                  name="i-lucide-star"
                  class="size-3.5 shrink-0 text-[var(--bw-yellow)]"
                  aria-label="Favourite"
                />
              </span>
              <span class="mt-0.5 block truncate text-sm text-muted">
                {{ cipher.login?.username || primaryUri(cipher) || getCipherTypeLabel(cipher.type) }}
              </span>
            </span>

            <UBadge
              :color="typeBadgeColor(cipher.type)"
              variant="subtle"
              size="sm"
              class="hidden shrink-0 uppercase sm:inline-flex"
            >
              {{ getCipherTypeLabel(cipher.type) }}
            </UBadge>

            <UIcon
              name="i-lucide-chevron-down"
              class="size-5 shrink-0 text-muted transition-transform"
              :class="{ 'rotate-180': expandedId === cipher.id }"
            />
          </button>

          <div
            v-if="expandedId === cipher.id"
            class="space-y-3 border-t border-default bg-muted/30 px-4 py-4"
          >
            <div
              v-if="cipher.login?.username"
              class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Username</span>
              <div class="flex min-w-0 items-center gap-2">
                <code class="truncate text-sm text-highlighted">{{ cipher.login.username }}</code>
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  aria-label="Copy username"
                  @click.stop="copyToClipboard(cipher.login!.username!, 'Username')"
                />
              </div>
            </div>

            <div
              v-if="cipher.login?.password"
              class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-muted">Password</span>
              <div class="flex min-w-0 items-center gap-2">
                <code class="text-sm text-highlighted">
                  {{ isPasswordRevealed(cipher.id) ? cipher.login.password : '••••••••' }}
                </code>
                <UButton
                  :icon="isPasswordRevealed(cipher.id) ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :aria-label="isPasswordRevealed(cipher.id) ? 'Hide password' : 'Show password'"
                  @click.stop="togglePasswordReveal(cipher.id)"
                />
                <UButton
                  icon="i-lucide-copy"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  aria-label="Copy password"
                  @click.stop="copyToClipboard(cipher.login!.password!, 'Password')"
                />
              </div>
            </div>

            <div
              v-if="primaryUri(cipher)"
              class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-xs font-medium uppercase tracking-wide text-muted">URL</span>
              <a
                :href="primaryUri(cipher)"
                target="_blank"
                rel="noopener noreferrer"
                class="truncate text-sm text-primary hover:underline"
                @click.stop
              >
                {{ primaryUri(cipher) }}
              </a>
            </div>
          </div>
        </UCard>
      </li>
    </ul>
  </div>
</template>
