<script setup lang="ts">
import type { ServerPreset } from '~/types/bitwarden'

const props = defineProps<{
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
  <fieldset class="space-y-2">
    <legend class="text-sm font-medium text-[var(--bw-deep-blue)] mb-2">
      Server
    </legend>
    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="server in servers"
        :key="server.id"
        type="button"
        class="server-option rounded-lg border px-3 py-2.5 text-left transition-all"
        :class="modelValue === server.id
          ? 'border-[var(--bw-blue)] bg-[var(--bw-blue)]/5 ring-2 ring-[var(--bw-blue)]/20'
          : 'border-[var(--bw-light-grey)] bg-white hover:border-[var(--bw-medium-grey)]'"
        @click="select(server.id)"
      >
        <span class="block text-sm font-semibold text-[var(--bw-deep-blue)]">
          {{ server.label }}
        </span>
        <span class="block text-xs text-[var(--bw-medium-grey)] mt-0.5">
          {{ server.hint }}
        </span>
      </button>
    </div>

    <div v-if="showSelfHostInput" class="mt-3 animate-fade-rise">
      <label class="block">
        <span class="text-sm font-medium text-[var(--bw-deep-blue)]">Self-host address</span>
        <input
          :value="selfHostUrl"
          type="url"
          placeholder="vault.example.com"
          class="mt-1.5 w-full rounded-lg border border-[var(--bw-light-grey)] bg-white px-4 py-3 text-[var(--bw-deep-blue)] placeholder:text-[var(--bw-medium-grey)] focus:border-[var(--bw-blue)] focus:ring-2 focus:ring-[var(--bw-blue)]/20 transition"
          @input="emit('update:selfHostUrl', ($event.target as HTMLInputElement).value)"
        >
      </label>
      <p class="mt-1 text-xs text-[var(--bw-medium-grey)]">
        All requests use this base URL when selected.
      </p>
    </div>
  </fieldset>
</template>
