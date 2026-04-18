<template>
  <v-app>
    <v-main>
      <div class="hub-wrapper">

        <!-- Header -->
        <div class="hub-header">
          <div>
            <p class="hub-date">{{ todayLabel }}</p>
            <h1 class="hub-title">Wifey App</h1>
            <p class="hub-subtitle">Good morning, my love</p>
          </div>
          <button class="settings-icon-btn" @click="settingsOpen = true">
            <v-icon size="18" color="grey-darken-1">mdi-cog-outline</v-icon>
          </button>
        </div>

        <!-- Scrollable status strip -->
        <div class="strip-wrapper">
          <div
            class="strip-track"
            @mousedown="dragStart"
            @mouseup="dragEnd"
            @touchstart.passive="touchStart"
            @touchend.passive="touchEnd"
          >
            <div class="strip-inner" :style="{ transform: `translateX(-${current * 100}%)` }">
              <div
                v-for="(card, i) in stripCards"
                :key="i"
                class="strip-card"
                :style="{ background: card.bg, borderColor: card.border }"
              >
                <p class="strip-label" :style="{ color: card.labelColor }">{{ card.label }}</p>
                <p class="strip-message" :style="{ color: card.messageColor }">{{ card.message }}</p>
              </div>
            </div>
          </div>
          <div class="strip-dots">
            <span
              v-for="(_, i) in stripCards"
              :key="i"
              class="dot"
              :class="{ active: i === current }"
              @click="goTo(i)"
            />
          </div>
        </div>

        <!-- App grid -->
        <p class="section-label">Your apps</p>
        <div class="app-grid">
          <div
            v-for="app in apps"
            :key="app.name"
            class="app-card"
            :class="{ inactive: !app.active }"
            :style="{ background: app.bg, borderColor: app.border }"
            @click="app.active ? $router.push(app.route) : null"
          >
            <span class="app-badge" :style="{ background: app.border, color: app.badgeText }">
              {{ app.active ? 'Active' : 'Soon' }}
            </span>
            <div class="app-icon" :style="{ background: app.border }">
              <v-icon size="18" :color="app.iconColor">{{ app.icon }}</v-icon>
            </div>
            <p class="app-name" :style="{ color: app.titleColor }">{{ app.name }}</p>
            <p class="app-sub" :style="{ color: app.subColor }">
              {{ app.sub ?? (app.active ? 'Tap to open' : 'Coming soon') }}
            </p>
          </div>
        </div>

      </div>
    </v-main>

    <!-- Settings sheet -->
    <SettingsSheet v-model="settingsOpen" />

  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SettingsSheet from '../components/SettingsSheet.vue'
import { API } from '../api'

const settingsOpen = ref(false)
const current = ref(0)
let timer = null
let startX = 0

const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

const stripCards = ref([
  {
    label: 'Period tracker',
    message: 'Loading...',
    bg: '#FBEAF0', border: '#F4C0D1',
    labelColor: '#993556', messageColor: '#72243E'
  },
  {
    label: 'Event',
    message: 'Wedding anniversary in 8 days — April 8',
    bg: '#FAEEDA', border: '#FAC775',
    labelColor: '#854F0B', messageColor: '#633806'
  },
  {
    label: 'Reminder',
    message: 'Doctor appointment tomorrow at 10am',
    bg: '#EEEDFE', border: '#CECBF6',
    labelColor: '#534AB7', messageColor: '#3C3489'
  }
])

const apps = [
  {
    name: 'Period tracker', icon: 'mdi-heart-pulse', active: true, route: '/period',
    bg: '#FBEAF0', border: '#F4C0D1', iconColor: '#993556',
    titleColor: '#72243E', subColor: '#993556', badgeText: '#72243E'
  },
  {
    name: 'Sleep tracker', icon: 'mdi-sleep', active: false, route: '',
    bg: '#EDF0FB', border: '#B8C2F0', iconColor: '#3D52A0',
    titleColor: '#2B3A7A', subColor: '#3D52A0', badgeText: '#2B3A7A'
  },
  {
    name: 'Exercise', icon: 'mdi-run', active: false, route: '',
    bg: '#FEF0E6', border: '#F5C19A', iconColor: '#C45B1A',
    titleColor: '#9A3D0E', subColor: '#C45B1A', badgeText: '#9A3D0E'
  },
  {
    name: 'Shopping list', icon: 'mdi-format-list-checks', active: false, route: '',
    bg: '#E1F5EE', border: '#9FE1CB', iconColor: '#0F6E56',
    titleColor: '#085041', subColor: '#0F6E56', badgeText: '#085041'
  },
  {
    name: 'Recipes', icon: 'mdi-silverware-fork-knife', active: false, route: '',
    bg: '#EAF3DE', border: '#C0DD97', iconColor: '#3B6D11',
    titleColor: '#27500A', subColor: '#3B6D11', badgeText: '#27500A'
  },
  {
    name: 'Events', icon: 'mdi-star-four-points', active: false, route: '',
    bg: '#FAEEDA', border: '#FAC775', iconColor: '#854F0B',
    titleColor: '#633806', subColor: '#854F0B', badgeText: '#633806'
  },
  {
    name: 'Notion sync', icon: 'mdi-note-multiple-outline', active: false, route: '',
    bg: '#E6F1FB', border: '#B5D4F4', iconColor: '#185FA5',
    titleColor: '#0C447C', subColor: '#185FA5', badgeText: '#0C447C'
  },
  {
    name: 'And more...', icon: 'mdi-dots-horizontal-circle-outline', active: false, route: '',
    bg: '#F7F7F7', border: '#DCDCDC', iconColor: '#AAAAAA',
    titleColor: '#888888', subColor: '#AAAAAA', badgeText: '#888888',
    sub: 'Made with love, just for you ♡'
  }
]

function goTo(i) {
  current.value = (i + stripCards.value.length) % stripCards.value.length
}
function dragStart(e) { startX = e.clientX }
function dragEnd(e) {
  const diff = startX - e.clientX
  if (Math.abs(diff) > 30) goTo(current.value + (diff > 0 ? 1 : -1))
}
function touchStart(e) { startX = e.touches[0].clientX }
function touchEnd(e) {
  const diff = startX - e.changedTouches[0].clientX
  if (Math.abs(diff) > 30) goTo(current.value + (diff > 0 ? 1 : -1))
}

onMounted(async () => {
  timer = setInterval(() => goTo(current.value + 1), 4000)
  try {
    const res = await fetch(`${API}/period/calculations/summary`)
    const s = await res.json()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // ── Period card ────────────────────────────────���─────────────
    let periodMsg = 'Start logging to see predictions'
    if (s.currentCycle) {
      const start = new Date(s.currentCycle.start_date + 'T00:00:00')
      const dayNum = Math.floor((today - start) / 86400000) + 1
      periodMsg = `Period is active — Day ${dayNum}`
    } else if (s.nextPeriodDate) {
      const days = Math.round((new Date(s.nextPeriodDate + 'T00:00:00') - today) / 86400000)
      const w = s.confidenceWindow ? ` ±${s.confidenceWindow}d` : ''
      if (days < 0)      periodMsg = `Period is ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} late${w}`
      else if (days === 0) periodMsg = `Period is due today${w}`
      else if (days === 1) periodMsg = `Period due tomorrow${w}`
      else               periodMsg = `Next period in ${days} days${w}`
    }
    stripCards.value[0].message = periodMsg

    // ── Fertile window card (insert after period card if relevant) ─
    if (!s.currentCycle && s.fertileWindow) {
      const fStart = new Date(s.fertileWindow.start + 'T00:00:00')
      const fEnd   = new Date(s.fertileWindow.end   + 'T00:00:00')
      let fertileMsg = null

      if (s.ovulationDate === todayStr) {
        fertileMsg = 'Today is your predicted ovulation day'
      } else if (today >= fStart && today <= fEnd) {
        fertileMsg = `Fertile window active — ends ${fEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      } else if (today < fStart) {
        const daysUntil = Math.round((fStart - today) / 86400000)
        if (daysUntil <= 5)
          fertileMsg = `Fertile window starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
      }

      if (fertileMsg) {
        stripCards.value.splice(1, 0, {
          label: 'Fertile window',
          message: fertileMsg,
          bg: '#E8F8F4', border: '#7ED4BC',
          labelColor: '#0F6E56', messageColor: '#085041'
        })
      }
    }

    // ── Irregular warning card ───────────────────────────────────
    if (s.isIrregular) {
      stripCards.value.splice(1, 0, {
        label: 'Cycle alert',
        message: 'Your recent cycles have been irregular',
        bg: '#FFFBEB', border: '#FAC775',
        labelColor: '#854F0B', messageColor: '#633806'
      })
    }
  } catch {
    stripCards.value[0].message = 'Could not load cycle data'
  }
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.hub-wrapper { 
  padding: 1.25rem; 
  max-width: 480px; 
  margin: 0 auto;
}

/* Scale up on larger screens for better visibility */
@media (min-width: 769px) {
  .hub-wrapper {
    max-width: 540px;
    transform: scale(1.12);
    transform-origin: top center;
  }
}

.hub-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.hub-date { font-size: 12px; color: #888; margin: 0 0 2px; }
.hub-title { font-size: 22px; font-weight: 500; margin: 0 0 2px; }
.hub-subtitle { font-size: 13px; color: #aaa; margin: 0; }
.settings-icon-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e0e0e0; background: #f5f5f5; display: flex; align-items: center; justify-content: center; cursor: pointer; }

.strip-wrapper { margin-bottom: 1.25rem; }
.strip-track { overflow: hidden; border-radius: 14px; cursor: grab; }
.strip-inner { display: flex; transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
.strip-card { min-width: 100%; padding: 12px 14px; box-sizing: border-box; border: 3px solid; border-radius: 12px; }
.strip-label { font-size: 10px; font-weight: 600; margin: 0 0 3px; letter-spacing: 0.06em; text-transform: uppercase; }
.strip-message { font-size: 15px; font-weight: 500; margin: 0; }
.strip-dots { display: flex; justify-content: center; gap: 5px; margin-top: 8px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #ddd; cursor: pointer; display: inline-block; transition: background 0.2s; }
.dot.active { background: #D4537E; }

.section-label { font-size: 10px; font-weight: 600; color: #bbb; letter-spacing: 0.07em; text-transform: uppercase; margin: 0 0 10px; }
.app-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 1rem; }
.app-card { border: 1px solid; border-radius: 12px; padding: 14px 12px; cursor: pointer; position: relative; transition: opacity 0.2s; }
.app-card.inactive { opacity: 0.55; cursor: default; }
.app-badge { position: absolute; top: 10px; right: 10px; border-radius: 20px; padding: 2px 7px; font-size: 9px; font-weight: 600; }
.app-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.app-name { font-size: 13px; font-weight: 500; margin: 0 0 2px; }
.app-sub { font-size: 11px; margin: 0; }

.bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-around; padding: 10px 0 16px; z-index: 50; }
.nav-item { text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.nav-label { font-size: 10px; color: #bbb; }
.active-label { color: #D4537E; font-weight: 500; }
</style>