<script setup lang="ts">
definePageMeta({
  layout: 'vault',
})

const { serverConfig } = useBitwardenAuth()
const { credentials, restoreCredentials, addCredentials, removeCredentials } = useOrgApi()

const form = reactive({
  label: '',
  clientId: '',
  clientSecret: '',
})

onMounted(() => {
  restoreCredentials()
})

function saveApiKey() {
  if (!form.clientId.trim() || !form.clientSecret.trim()) return

  addCredentials({
    label: form.label.trim() || form.clientId.trim(),
    clientId: form.clientId.trim(),
    clientSecret: form.clientSecret.trim(),
  })

  form.label = ''
  form.clientId = ''
  form.clientSecret = ''
}
</script>

<template>
  <UDashboardPanel id="vault-settings">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading>
          <UDashboardSidebarCollapse class="lg:hidden" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="mx-auto max-w-2xl space-y-8 p-6">
        <UCard>
          <template #header>
            <h2 class="font-display text-lg font-semibold">
              Server connection
            </h2>
          </template>
          <dl class="space-y-3 text-sm">
            <div class="flex justify-between gap-4">
              <dt class="text-muted">Server</dt>
              <dd class="font-medium">{{ serverConfig.label }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">API URL</dt>
              <dd class="truncate font-mono text-xs">{{ serverConfig.apiUrl }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-muted">Identity URL</dt>
              <dd class="truncate font-mono text-xs">{{ serverConfig.identityUrl }}</dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-display text-lg font-semibold">
                Organisation API keys
              </h2>
              <p class="mt-1 text-sm text-muted">
                Add API keys from your organisation Settings to use admin features.
              </p>
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="saveApiKey">
            <UFormField label="Label">
              <UInput v-model="form.label" placeholder="My organisation" />
            </UFormField>
            <UFormField label="Client ID">
              <UInput v-model="form.clientId" placeholder="organization.xxxxx" required />
            </UFormField>
            <UFormField label="Client secret">
              <UInput v-model="form.clientSecret" type="password" placeholder="Client secret" required />
            </UFormField>
            <UButton type="submit" icon="i-lucide-plus" label="Add API key" />
          </form>

          <ul v-if="credentials.length" class="mt-6 space-y-2 border-t border-default pt-4">
            <li
              v-for="cred in credentials"
              :key="cred.clientId"
              class="flex items-center justify-between rounded-lg border border-default px-4 py-3"
            >
              <div>
                <p class="font-medium">{{ cred.label || cred.clientId }}</p>
                <p class="text-xs text-muted">{{ cred.clientId }}</p>
              </div>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                aria-label="Remove API key"
                @click="removeCredentials(cred.clientId)"
              />
            </li>
          </ul>
        </UCard>

        <div class="flex gap-3">
          <UButton to="/vault" color="neutral" variant="outline" icon="i-lucide-arrow-left" label="Back to vault" />
          <UButton to="/vault/admin" icon="i-lucide-building-2" label="Organisation admin" :disabled="!credentials.length" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
