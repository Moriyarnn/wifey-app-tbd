<template>
  <div class="app-layout" :style="cssVars">
    <div class="app-main-panel">
      <slot />
    </div>
    <div class="app-side-panel" v-if="$slots.col2">
      <slot name="col2" />
    </div>
    <div class="app-side-panel app-side-panel--third" v-if="$slots.col3">
      <slot name="col3" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  panelBg:     { type: String, default: '#fdf5f8' },
  panelBorder: { type: String, default: '#f0e8ec' },
})

const cssVars = computed(() => ({
  '--panel-bg':     props.panelBg,
  '--panel-border': props.panelBorder,
}))
</script>

<style scoped>
.app-layout {
  /* transparent wrapper on mobile — feature view controls its own layout */
}

.app-side-panel {
  display: none;
}

@media (min-width: 1280px) {
  .app-layout {
    display: grid;
    grid-template-columns: minmax(0, 560px) 1fr;
    gap: 1rem;
    align-items: start;
    min-height: 100vh;
    padding: 0 1.25rem;
    box-sizing: border-box;
  }

  .app-main-panel {
    background: var(--panel-bg, #fdf5f8);
    border-radius: 16px;
    border: 1px solid var(--panel-border, #f0e8ec);
    min-height: 200px;
    margin-top: 1.25rem;
  }

  .app-side-panel {
    display: block;
    background: var(--panel-bg, #fdf5f8);
    border-radius: 16px;
    border: 1px solid var(--panel-border, #f0e8ec);
    min-height: 200px;
    margin-top: 1.25rem;
  }
}

@media (min-width: 1600px) {
  .app-layout {
    grid-template-columns: minmax(0, 560px) 1fr 1fr;
  }

  .app-side-panel--third {
    display: block;
  }
}
</style>
