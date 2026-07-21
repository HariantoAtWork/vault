<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { restoreSession } = useBitwardenAuth()

onMounted(() => {
  restoreSession()
})
</script>
