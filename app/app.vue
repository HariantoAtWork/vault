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
const { restoreCredentials } = useOrgApi()

onMounted(() => {
  restoreSession()
  restoreCredentials()
})
</script>
