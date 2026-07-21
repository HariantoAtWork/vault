<script setup lang="ts">
definePageMeta({
  layout: 'vault',
})

const { credentials, restoreCredentials, listMembers, listCollections, listGroups, listEvents, listPolicies } = useOrgApi()

const activeCredId = ref<string | null>(null)
const activeCred = computed(() =>
  credentials.value.find(c => c.clientId === activeCredId.value) ?? credentials.value[0] ?? null,
)
const activeTab = ref('members')
const loading = ref(false)
const error = ref<string | null>(null)
const members = ref<Array<Record<string, unknown>>>([])
const collections = ref<Array<Record<string, unknown>>>([])
const groups = ref<Array<Record<string, unknown>>>([])
const events = ref<Array<Record<string, unknown>>>([])
const policies = ref<Array<Record<string, unknown>>>([])

const tabs = [
  { value: 'members', label: 'Members', icon: 'i-lucide-users' },
  { value: 'collections', label: 'Collections', icon: 'i-lucide-folder-lock' },
  { value: 'groups', label: 'Groups', icon: 'i-lucide-users-round' },
  { value: 'events', label: 'Events', icon: 'i-lucide-scroll-text' },
  { value: 'policies', label: 'Policies', icon: 'i-lucide-shield' },
]

onMounted(() => {
  restoreCredentials()
  if (credentials.value.length) {
    activeCredId.value = credentials.value[0]!.clientId
    loadTabData()
  }
})

watch(activeTab, () => loadTabData())
watch(activeCred, () => loadTabData())

async function loadTabData() {
  if (!activeCred.value) return

  loading.value = true
  error.value = null

  try {
    if (activeTab.value === 'members') {
      const result = await listMembers(activeCred.value) as { data?: Array<Record<string, unknown>> }
      members.value = Array.isArray(result) ? result : (result.data ?? [])
    }
    else if (activeTab.value === 'collections') {
      const result = await listCollections(activeCred.value) as { data?: Array<Record<string, unknown>> }
      collections.value = Array.isArray(result) ? result : (result.data ?? [])
    }
    else if (activeTab.value === 'groups') {
      const result = await listGroups(activeCred.value) as { data?: Array<Record<string, unknown>> }
      groups.value = Array.isArray(result) ? result : (result.data ?? [])
    }
    else if (activeTab.value === 'events') {
      const result = await listEvents(activeCred.value) as { data?: Array<Record<string, unknown>> }
      events.value = Array.isArray(result) ? result : (result.data ?? [])
    }
    else if (activeTab.value === 'policies') {
      const result = await listPolicies(activeCred.value) as { data?: Array<Record<string, unknown>> }
      policies.value = Array.isArray(result) ? result : (result.data ?? [])
    }
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load organisation data'
  }
  finally {
    loading.value = false
  }
}

const activeItems = computed(() => {
  switch (activeTab.value) {
    case 'members': return members.value
    case 'collections': return collections.value
    case 'groups': return groups.value
    case 'events': return events.value
    case 'policies': return policies.value
    default: return []
  }
})
</script>

<template>
  <UDashboardPanel id="vault-admin">
    <template #header>
      <UDashboardNavbar title="Organisation admin">
        <template #leading>
          <UDashboardSidebarCollapse class="lg:hidden" />
        </template>
        <template #right>
          <USelectMenu
            v-if="credentials.length"
            v-model="activeCredId"
            :items="credentials"
            label-key="label"
            value-key="clientId"
            class="w-48"
            placeholder="Select API key"
          />
        </template>
      </UDashboardNavbar>
      <UDashboardToolbar>
        <template #left>
          <div class="flex gap-1 overflow-x-auto">
            <UButton
              v-for="tab in tabs"
              :key="tab.value"
              :icon="tab.icon"
              :label="tab.label"
              size="sm"
              :variant="activeTab === tab.value ? 'solid' : 'ghost'"
              :color="activeTab === tab.value ? 'primary' : 'neutral'"
              @click="activeTab = tab.value"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="p-6">
        <UEmpty
          v-if="!credentials.length"
          icon="i-lucide-key-round"
          title="No organisation API keys"
          description="Add an API key in Settings to manage your organisation."
        >
          <template #actions>
            <UButton to="/vault/settings" label="Go to settings" icon="i-lucide-settings" />
          </template>
        </UEmpty>

        <UAlert
          v-else-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="error"
          class="mb-4"
        />

        <div v-else-if="loading" class="flex justify-center py-16">
          <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
        </div>

        <div v-else-if="!activeItems.length" class="py-16 text-center text-muted">
          No {{ activeTab }} found.
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="(item, index) in activeItems"
            :key="String(item.id ?? index)"
          >
            <UCard :ui="{ body: 'p-4' }">
              <pre class="overflow-x-auto text-xs text-muted">{{ JSON.stringify(item, null, 2) }}</pre>
            </UCard>
          </li>
        </ul>

        <div class="mt-8">
          <UButton to="/vault/settings" color="neutral" variant="ghost" icon="i-lucide-settings" label="Manage API keys" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>

<style scoped>
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
