<template>
  <div class="vault-layout min-h-dvh flex">
    <VaultSidebar />
    <main class="flex-1 flex flex-col min-w-0">
      <VaultContextBar />
      <div class="flex-1 overflow-hidden">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.vault-layout {
  background: var(--bw-off-white);
}
</style>
