<script setup lang="ts">
import type { ServerPreset } from '~/types/bitwarden'

const preset = defineModel<ServerPreset>('modelValue', { required: true })
const selfHostUrl = defineModel<string>('selfHostUrl', { default: '' })

const servers: Array<{ id: ServerPreset, label: string, hint: string }> = [
  { id: 'us', label: 'bitwarden.com', hint: 'US cloud' },
  { id: 'eu', label: 'bitwarden.eu', hint: 'EU cloud' },
  { id: 'self', label: 'Self-hosted', hint: 'Your server' },
]

function select(id: ServerPreset) {
  preset.value = id
}
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-1 text-sm font-medium text-highlighted">
      Server
    </legend>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Server">
      <button
        v-for="server in servers"
        :key="server.id"
        type="button"
        class="rounded-lg border px-3 py-3 text-left transition-colors"
        :class="preset === server.id
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-default bg-elevated hover:border-accented'"
        role="radio"
        :aria-checked="preset === server.id"
        @click="select(server.id)"
      >
        <span class="block text-sm font-semibold text-highlighted">{{ server.label }}</span>
        <span class="mt-0.5 block text-xs text-muted">{{ server.hint }}</span>
      </button>
    </div>

    <div v-if="preset === 'self'" class="animate-fade-rise">
      <UFormField label="Self-host address" hint="Enter your server base URL, for example https://vault.sylo.space">
        <UInput
          v-model="selfHostUrl"
          type="text"
          inputmode="url"
          autocomplete="url"
          placeholder="https://vault.example.com"
          icon="i-lucide-server"
        />
      </UFormField>
    </div>
  </fieldset>
</template>
