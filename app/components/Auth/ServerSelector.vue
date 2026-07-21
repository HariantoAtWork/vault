<script setup lang="ts">
import type { ServerPreset } from '~/types/bitwarden'

defineProps<{
  modelValue: ServerPreset
  selfHostUrl: string
  showSelfHostInput: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ServerPreset]
  'update:selfHostUrl': [value: string]
}>()

const servers: Array<{ id: ServerPreset, label: string, hint: string }> = [
  { id: 'us', label: 'bitwarden.com', hint: 'US cloud' },
  { id: 'eu', label: 'bitwarden.eu', hint: 'EU cloud' },
  { id: 'self', label: 'Self-hosted', hint: 'Your server' },
]

function select(id: ServerPreset) {
  emit('update:modelValue', id)
}
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="mb-1 text-sm font-medium text-highlighted">
      Server
    </legend>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <UButton
        v-for="server in servers"
        :key="server.id"
        type="button"
        block
        :variant="modelValue === server.id ? 'soft' : 'outline'"
        :color="modelValue === server.id ? 'primary' : 'neutral'"
        class="h-auto flex-col items-start px-3 py-3 text-left"
        @click="select(server.id)"
      >
        <span class="text-sm font-semibold">{{ server.label }}</span>
        <span class="mt-0.5 text-xs font-normal text-muted">{{ server.hint }}</span>
      </UButton>
    </div>

    <div v-if="showSelfHostInput" class="animate-fade-rise">
      <UFormField label="Self-host address" hint="All requests use this base URL when selected.">
        <UInput
          :model-value="selfHostUrl"
          type="url"
          placeholder="vault.example.com"
          icon="i-lucide-server"
          @update:model-value="emit('update:selfHostUrl', $event)"
        />
      </UFormField>
    </div>
  </fieldset>
</template>
