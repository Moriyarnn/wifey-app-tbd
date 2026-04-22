<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <Teleport to="body">
      <div v-if="envLabel" class="env-badge">{{ envLabel }}</div>
    </Teleport>
  </v-app>
</template>

<script setup lang="ts">
const env = import.meta.env.VITE_ENV
const envLabel = env === 'dev' ? 'DEV' : env === 'uat' ? 'UAT' : null
</script>

<style>
:root { --flow-hue: 340; }
html, body {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
</style>

<style>
.env-badge {
  position: fixed;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 999px;
  pointer-events: none;
  z-index: 9999;
}
</style>
