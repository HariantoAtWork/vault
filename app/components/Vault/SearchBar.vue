<script setup lang="ts">
const search = defineModel<string>('search', { default: '' })
const typeFilter = defineModel<number | null>('typeFilter', { default: null })

defineProps<{
  count: number
  loading?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const types = [
  { value: null, label: 'All' },
  { value: 1, label: 'Logins' },
  { value: 2, label: 'Notes' },
  { value: 3, label: 'Cards' },
  { value: 4, label: 'Identities' },
]
</script>

<template>
  <div class="search-bar flex flex-wrap items-center gap-3 px-6 py-4 border-b border-[var(--bw-light-grey)] bg-[var(--bw-off-white)]/50">
    <div class="relative flex-1 min-w-[200px]">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--bw-medium-grey)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="search"
        type="search"
        placeholder="Search names, usernames, URLs…"
        class="w-full rounded-lg border border-[var(--bw-light-grey)] bg-white pl-10 pr-4 py-2.5 text-sm text-[var(--bw-deep-blue)] placeholder:text-[var(--bw-medium-grey)] focus:border-[var(--bw-blue)] focus:ring-2 focus:ring-[var(--bw-blue)]/20 transition"
      >
    </div>

    <div class="flex gap-1 p-1 rounded-lg bg-white border border-[var(--bw-light-grey)]">
      <button
        v-for="type in types"
        :key="String(type.value)"
        type="button"
        class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
        :class="typeFilter === type.value
          ? 'bg-[var(--bw-blue)] text-white'
          : 'text-[var(--bw-medium-grey)] hover:text-[var(--bw-deep-blue)]'"
        @click="typeFilter = type.value"
      >
        {{ type.label }}
      </button>
    </div>

    <button
      type="button"
      :disabled="loading"
      class="rounded-lg border border-[var(--bw-light-grey)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--bw-deep-blue)] hover:border-[var(--bw-blue)] disabled:opacity-50 transition-colors"
      @click="emit('refresh')"
    >
      {{ loading ? 'Syncing…' : 'Sync' }}
    </button>
  </div>
</template>
