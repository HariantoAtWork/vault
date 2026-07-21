<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const colorMode = useColorMode()
colorMode.preference = 'light'

const { restoreSession } = useBitwardenAuth()
const { restoreCredentials } = useOrgApi()

onMounted(() => {
  colorMode.preference = 'light'
  restoreSession()
  restoreCredentials()
})
</script>
