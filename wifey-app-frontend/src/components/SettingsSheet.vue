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

          <p class="sheet-section-label">Flow Color</p>
          <div class="flow-color-section">
            <div class="flow-swatches-row">
              <div v-for="s in flowSwatches" :key="s.label" class="flow-swatch-item">
                <div class="flow-swatch-dot" :style="{ background: s.bg }">
                  <span class="flow-swatch-letter" :style="{ color: s.textColor }">{{ s.label[0] }}</span>
                </div>
                <span class="flow-swatch-label">{{ s.label }}</span>
              </div>
            </div>
            <div class="hue-slider-wrap">
              <div class="hue-track-gradient" />
              <input type="range" class="hue-slider" min="290" max="380" v-model.number="flowHue" />
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
import { ref, computed, watch, onMounted } from 'vue'

defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])

const activeTheme = ref('Rose')

const themes = [
  { name: 'Rose',     light: '#FBEAF0', accent: '#D4537E' },
  { name: 'Lavender', light: '#EEEDFE', accent: '#7F77DD' },
  { name: 'Sage',     light: '#E1F5EE', accent: '#1D9E75' },
  { name: 'Honey',    light: '#FAEEDA', accent: '#BA7517' }
]

const FLOW_HUE_KEY = 'flow-hue'
const flowHue = ref(parseInt(localStorage.getItem(FLOW_HUE_KEY) ?? '340', 10))

const flowSwatches = computed(() => [
  { label: 'Spotting', bg: `hsl(${flowHue.value}, 50%, 80%)`,  textColor: '#fff' },
  { label: 'Light',    bg: `hsl(${flowHue.value}, 55%, 74%)`,  textColor: '#fff' },
  { label: 'Medium',   bg: `hsl(${flowHue.value}, 65%, 58%)`,  textColor: '#fff' },
  { label: 'Heavy',    bg: `hsl(${flowHue.value}, 80%, 42%)`,  textColor: '#fff' },
])

onMounted(() => document.documentElement.style.setProperty('--flow-hue', flowHue.value))
watch(flowHue, v => {
  document.documentElement.style.setProperty('--flow-hue', v)
  localStorage.setItem(FLOW_HUE_KEY, v)
})
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

/* Flow color section */
.flow-color-section { margin-bottom: 1.25rem; }
.flow-swatches-row { display: flex; gap: 8px; margin-bottom: 12px; }
.flow-swatch-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.flow-swatch-dot {
  width: 100%; aspect-ratio: 1; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.1s;
}
.flow-swatch-letter { font-size: 12px; font-weight: 700; line-height: 1; }
.flow-swatch-label { font-size: 9px; color: #aaa; text-transform: capitalize; letter-spacing: 0.03em; }

.hue-slider-wrap { position: relative; height: 28px; display: flex; align-items: center; }
.hue-track-gradient {
  position: absolute; left: 0; right: 0; height: 6px; border-radius: 3px; pointer-events: none;
  background: linear-gradient(to right,
    hsl(290, 65%, 58%), hsl(310, 65%, 58%), hsl(330, 65%, 58%),
    hsl(350, 65%, 58%), hsl(370, 65%, 50%), hsl(380, 70%, 44%)
  );
}
.hue-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 100%; background: transparent; cursor: pointer; position: relative; z-index: 1; margin: 0;
}
.hue-slider::-webkit-slider-runnable-track { height: 6px; background: transparent; border-radius: 3px; }
.hue-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: #fff; border: 2px solid #ddd;
  box-shadow: 0 1px 5px rgba(0,0,0,0.18);
  margin-top: -8px; cursor: pointer;
}
.hue-slider::-moz-range-track { height: 6px; background: transparent; border-radius: 3px; }
.hue-slider::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: #fff; border: 2px solid #ddd;
  box-shadow: 0 1px 5px rgba(0,0,0,0.18);
  cursor: pointer;
}

.sheet-note { font-size: 11px; color: #ccc; margin: 0 0 1rem; }
.close-btn { width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #e0e0e0; background: #f5f5f5; font-size: 14px; color: #555; cursor: pointer; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.3s cubic-bezier(.4,0,.2,1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>