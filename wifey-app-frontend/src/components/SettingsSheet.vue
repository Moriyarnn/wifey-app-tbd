<template>
  <teleport to="body">
    <transition name="sheet">
      <div v-if="modelValue" class="overlay" @click.self="$emit('update:modelValue', false)">
        <div class="sheet">
          <div class="handle" />
          <h2 class="sheet-title">Settings</h2>

          <p class="sheet-section-label">Theme</p>
          <div class="theme-grid">
            <div
              v-for="theme in themes"
              :key="theme.name"
              class="theme-swatch"
              :class="{ selected: activeTheme === theme.name }"
              @click="activeTheme = theme.name"
            >
              <div class="swatch-circle" :style="{ background: theme.light, borderColor: activeTheme === theme.name ? theme.accent : '#e0e0e0' }">
                <div class="swatch-dot" :style="{ background: theme.accent }" />
              </div>
              <p class="swatch-label" :style="{ color: activeTheme === theme.name ? theme.accent : '#bbb' }">{{ theme.name }}</p>
            </div>
          </div>

          <p class="sheet-section-label">Preferences</p>
          <div class="prefs-list">
            <div class="pref-row">
              <span class="pref-label">Push notifications</span>
              <div class="toggle on"><div class="toggle-knob" /></div>
            </div>
            <div class="pref-row">
              <span class="pref-label">Partner name</span>
              <span class="pref-action">Edit</span>
            </div>
            <div class="pref-row">
              <span class="pref-label">Cycle reminder (days before)</span>
              <span class="pref-action">3 days</span>
            </div>
          </div>

          <p class="sheet-note">Theme customization and more preferences coming soon.</p>

          <button class="close-btn" @click="$emit('update:modelValue', false)">Close</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref } from 'vue'

defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])

const activeTheme = ref('Rose')

const themes = [
  { name: 'Rose',     light: '#FBEAF0', accent: '#D4537E' },
  { name: 'Lavender', light: '#EEEDFE', accent: '#7F77DD' },
  { name: 'Sage',     light: '#E1F5EE', accent: '#1D9E75' },
  { name: 'Honey',    light: '#FAEEDA', accent: '#BA7517' }
]
</script>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
.sheet { background: white; border-radius: 20px 20px 0 0; width: 100%; max-width: 480px; padding: 1.25rem 1.25rem 2.5rem; }
.handle { width: 36px; height: 4px; background: #e0e0e0; border-radius: 2px; margin: 0 auto 1.25rem; }
.sheet-title { font-size: 18px; font-weight: 500; margin: 0 0 1.25rem; }
.sheet-section-label { font-size: 10px; font-weight: 600; color: #bbb; letter-spacing: 0.07em; text-transform: uppercase; margin: 0 0 10px; }

.theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 1.25rem; }
.theme-swatch { text-align: center; cursor: pointer; }
.swatch-circle { width: 44px; height: 44px; border-radius: 50%; border: 2px solid; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; transition: border-color 0.2s; }
.swatch-dot { width: 20px; height: 20px; border-radius: 50%; }
.swatch-label { font-size: 10px; margin: 0; transition: color 0.2s; }

.prefs-list { border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; margin-bottom: 1rem; }
.pref-row { padding: 13px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; }
.pref-row:last-child { border-bottom: none; }
.pref-label { font-size: 13px; color: #333; }
.pref-action { font-size: 13px; color: #bbb; }
.toggle { width: 36px; height: 20px; background: #D4537E; border-radius: 10px; position: relative; cursor: pointer; }
.toggle-knob { width: 16px; height: 16px; background: white; border-radius: 50%; position: absolute; top: 2px; right: 2px; }

.sheet-note { font-size: 11px; color: #ccc; margin: 0 0 1rem; }
.close-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e0e0e0; background: #f5f5f5; font-size: 14px; color: #555; cursor: pointer; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.3s cubic-bezier(.4,0,.2,1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>