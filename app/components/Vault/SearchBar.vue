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

const searchInput = useTemplateRef<{ inputRef: HTMLInputElement | null }>('searchInput')

const types = [
  { value: null, label: 'All' },
  { value: 1, label: 'Logins' },
  { value: 2, label: 'Notes' },
  { value: 3, label: 'Cards' },
  { value: 4, label: 'Identities' },
]

function focusSearch() {
  searchInput.value?.inputRef?.focus()
}

function onGlobalKeyDown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusSearch()
  }
}

onMounted(() => {
  focusSearch()
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <UDashboardToolbar>
    <template #left>
      <div class="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <UInput
          ref="searchInput"
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search names, usernames, URLs…"
          size="md"
          class="min-w-0 flex-1 sm:max-w-xl"
          :ui="{ trailing: 'pe-1 gap-0.5' }"
        >
          <template #trailing>
            <UKbd value="meta" />
            <UKbd>K</UKbd>
          </template>
        </UInput>

        <div
          class="flex gap-1 overflow-x-auto rounded-lg border border-default bg-elevated p-1"
          role="group"
          aria-label="Filter by item type"
        >
          <UButton
            v-for="type in types"
            :key="String(type.value)"
            size="xs"
            :variant="typeFilter === type.value ? 'solid' : 'ghost'"
            :color="typeFilter === type.value ? 'primary' : 'neutral'"
            class="shrink-0"
            @click="typeFilter = type.value"
          >
            {{ type.label }}
          </UButton>
        </div>
      </div>
    </template>

    <template #right>
      <UButton
        icon="i-lucide-refresh-cw"
        :label="loading ? 'Syncing…' : 'Sync'"
        color="neutral"
        variant="outline"
        :loading="loading"
        class="shrink-0"
        @click="emit('refresh')"
      />
    </template>
  </UDashboardToolbar>
</template>
