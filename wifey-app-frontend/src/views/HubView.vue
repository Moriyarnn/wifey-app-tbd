<template>
  <v-app>
    <v-main>
      <div class="hub-root">

        <!-- Desktop left panel -->
        <div class="hub-left" aria-hidden="true">
          <div class="hub-left-inner">

            <div class="hub-brand">
              <div class="hub-brand-icon">
                <v-icon size="28" color="#D4537E">mdi-home-heart</v-icon>
              </div>
              <h1 class="hub-brand-title">House App</h1>
              <p class="hub-brand-sub">Good morning, my love</p>
              <p class="hub-brand-date">{{ todayLabel }}</p>
            </div>

            <div class="hub-status-list">
              <div
                v-for="card in stripCards"
                :key="card.label"
                class="hub-status-card"
                :style="{ background: card.bg, borderColor: card.border }"
              >
                <p class="hub-status-label" :style="{ color: card.labelColor }">{{ card.label }}</p>
                <p class="hub-status-msg" :style="{ color: card.messageColor }">{{ card.message }}</p>
              </div>
            </div>

            <div class="hub-left-footer">
              <div class="hub-user-info">
                <v-icon size="12" color="#bbb">mdi-account-circle-outline</v-icon>
                <span>{{ currentUser?.username }}<span v-if="currentUser?.role === 'owner'"> · owner</span></span>
              </div>
              <button class="hub-logout-btn" @click="logout">Sign out</button>
            </div>

          </div>
        </div>

        <!-- Main panel -->
        <div class="hub-main">

          <!-- Mobile-only header -->
          <div class="hub-header mobile-only">
            <div>
              <p class="hub-date">{{ todayLabel }}</p>
              <h1 class="hub-title">House App</h1>
              <p class="hub-subtitle">Good morning, my love</p>
            </div>
            <div class="header-actions">
              <div v-if="currentUser" class="user-avatar-wrap">
                <div
                  class="user-avatar"
                  :class="{ 'user-avatar--dev': isDev }"
                  :title="currentUser.username"
                  @click="isDev && (showSwitcher = !showSwitcher)"
                >
                  {{ currentUser.username[0].toUpperCase() }}
                </div>
                <div v-if="isDev && showSwitcher" class="dev-switcher">
                  <p class="dev-switcher-label">Switch user</p>
                  <div class="dev-switcher-btns">
                    <button
                      class="dev-switch-btn"
                      :class="{ 'dev-switch-btn--pressed': currentUser.role === 'owner' }"
                      @click="switchUser('owner')"
                    >owner</button>
                    <button
                      class="dev-switch-btn"
                      :class="{ 'dev-switch-btn--pressed': currentUser.role === 'partner' }"
                      @click="switchUser('partner')"
                    >partner</button>
                  </div>
                </div>
              </div>
              <button class="settings-icon-btn" @click="settingsOpen = true">
                <v-icon size="18" color="grey-darken-1">mdi-cog-outline</v-icon>
              </button>
            </div>
          </div>

          <!-- Mobile-only status strip -->
          <div class="strip-wrapper mobile-only">
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

          <!-- Desktop-only mini-header -->
          <div class="hub-desktop-header desktop-only">
            <p class="section-label-top">Your apps</p>
            <div class="header-actions">
              <div v-if="currentUser" class="user-avatar-wrap">
                <div
                  class="user-avatar"
                  :class="{ 'user-avatar--dev': isDev }"
                  :title="currentUser.username"
                  @click="isDev && (showSwitcher = !showSwitcher)"
                >
                  {{ currentUser.username[0].toUpperCase() }}
                </div>
                <div v-if="isDev && showSwitcher" class="dev-switcher">
                  <p class="dev-switcher-label">Switch user</p>
                  <div class="dev-switcher-btns">
                    <button
                      class="dev-switch-btn"
                      :class="{ 'dev-switch-btn--pressed': currentUser.role === 'owner' }"
                      @click="switchUser('owner')"
                    >owner</button>
                    <button
                      class="dev-switch-btn"
                      :class="{ 'dev-switch-btn--pressed': currentUser.role === 'partner' }"
                      @click="switchUser('partner')"
                    >partner</button>
                  </div>
                </div>
              </div>
              <button class="settings-icon-btn" @click="settingsOpen = true">
                <v-icon size="18" color="grey-darken-1">mdi-cog-outline</v-icon>
              </button>
            </div>
          </div>

          <!-- App grid -->
          <p class="section-label mobile-only">Your apps</p>
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

          <p class="hub-privacy-note desktop-only">
            <v-icon size="12" color="#ccc">mdi-lock-outline</v-icon>
            No telemetry. Your data stays on your server.
          </p>

        </div>
      </div>
    </v-main>

    <SettingsSheet v-model="settingsOpen" />
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import SettingsSheet from '../components/SettingsSheet.vue'
import { API, apiFetch, getUser, clearToken, clearUser, setToken, setUser } from '../api'
import { usePreferences } from '../composables/usePreferences'

const router = useRouter()
const { fetchPreferences, resetCache: resetPreferences } = usePreferences()
const settingsOpen = ref(false)
const current = ref(0)
const currentUser = ref(getUser())
const isDev = import.meta.env.DEV
const showSwitcher = ref(false)
let timer = null
let startX = 0

const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

function logout() {
  clearToken()
  clearUser()
  resetPreferences()
  router.push('/login')
}

async function switchUser(role) {
  try {
    const res = await fetch(`${API}/auth/dev-switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    if (!res.ok) return
    const data = await res.json()
    setToken(data.token)
    setUser({ username: data.username, role: data.role })
    currentUser.value = getUser()
    showSwitcher.value = false
    resetPreferences()
    await fetchPreferences()
  } catch {}
}

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
    const res = await apiFetch(`${API}/period/calculations/summary`)
    const s = await res.json()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

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
/* ── Root layout ──────────────────────────────────────────────── */
.hub-root {
  display: flex;
  min-height: 100vh;
  background: #fafafa;
}

/* ── Show/hide helpers ────────────────────────────────────────── */
.mobile-only { display: block; }

@media (max-width: 767px) {
  .desktop-only { display: none !important; }
}

@media (min-width: 768px) {
  .mobile-only { display: none !important; }
}

/* ── Left panel (desktop only) ────────────────────────────────── */
.hub-left {
  display: none;
}

@media (min-width: 768px) {
  .hub-left {
    display: flex;
    flex: 1;
    background: linear-gradient(160deg, #fff5f8 0%, #fdf0f5 40%, #f5f0fe 100%);
    border-right: 1px solid #f0e0e8;
    padding: 3rem;
    align-items: flex-start;
    justify-content: center;
  }
}

.hub-left-inner {
  display: flex;
  flex-direction: column;
  max-width: 360px;
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 6rem);
  justify-content: space-between;
}

/* Brand block */
.hub-brand {
  margin-bottom: 2rem;
}

.hub-brand-icon {
  width: 52px;
  height: 52px;
  background: #fff;
  border: 1.5px solid #F4C0D1;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.1rem;
  box-shadow: 0 2px 8px rgba(212, 83, 126, 0.08);
}

.hub-brand-title {
  font-size: 26px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.hub-brand-sub {
  font-size: 15px;
  color: #888;
  margin: 0 0 4px;
  font-style: italic;
}

.hub-brand-date {
  font-size: 12px;
  color: #bbb;
  margin: 0;
}

/* Status cards */
.hub-status-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  padding: 0.25rem 0;
}

.hub-status-card {
  border: 2px solid;
  border-radius: 12px;
  padding: 12px 14px;
}

.hub-status-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 3px;
}

.hub-status-msg {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
}

/* Footer */
.hub-left-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1.5rem;
  border-top: 1px solid #f0e0e8;
  margin-top: 1.5rem;
}

.hub-user-info {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #bbb;
}

.hub-logout-btn {
  font-size: 12px;
  color: #bbb;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}

.hub-logout-btn:hover {
  color: #D4537E;
}

/* ── Main panel ───────────────────────────────────────────────── */
.hub-main {
  flex: 1;
  min-width: 0;
  padding: 1.25rem;
  box-sizing: border-box;
}

@media (min-width: 768px) {
  .hub-main {
    flex: 0 0 460px;
    padding: 2rem 2.5rem;
    overflow-y: auto;
    max-height: 100vh;
  }
}

/* Desktop mini-header */
.hub-desktop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.section-label-top {
  font-size: 10px;
  font-weight: 600;
  color: #bbb;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin: 0;
}

/* ── Mobile header ────────────────────────────────────────────── */
.hub-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.hub-date { font-size: 12px; color: #888; margin: 0 0 2px; }
.hub-title { font-size: 22px; font-weight: 500; margin: 0 0 2px; }
.hub-subtitle { font-size: 13px; color: #aaa; margin: 0; }
.settings-icon-btn { width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e0e0e0; background: #f5f5f5; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.user-avatar-wrap { position: relative; flex-shrink: 0; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; background: #FBEAF0; border: 1.5px solid #F4C0D1; color: #993556; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
.user-avatar--dev { cursor: pointer; }
.user-avatar--dev:hover { background: #f7dae6; }

.dev-switcher {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #fff;
  border: 1px solid #f0e0e8;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 4px 16px rgba(153, 53, 86, 0.12);
  z-index: 100;
  min-width: 140px;
}
.dev-switcher-label { font-size: 10px; font-weight: 600; color: #bbb; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 8px; }
.dev-switcher-btns { display: flex; gap: 6px; }
.dev-switch-btn {
  flex: 1; padding: 6px 0; font-size: 12px; font-weight: 600;
  color: #993556; background: #FBEAF0; border: 1.5px solid #F4C0D1;
  border-radius: 8px; cursor: pointer;
  box-shadow: 0 2px 0 #F4C0D1;
  transform: translateY(0);
  transition: box-shadow 0.1s, transform 0.1s, background 0.1s;
}
.dev-switch-btn:hover:not(.dev-switch-btn--pressed) { background: #f7dae6; }
.dev-switch-btn--pressed { background: #f0c8d8; box-shadow: inset 0 2px 3px rgba(153, 53, 86, 0.2); transform: translateY(1px); }

/* ── Strip (mobile) ───────────────────────────────────────────── */
.strip-wrapper { margin-bottom: 1.25rem; }
.strip-track { overflow: hidden; border-radius: 14px; cursor: grab; }
.strip-inner { display: flex; transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
.strip-card { min-width: 100%; padding: 12px 14px; box-sizing: border-box; border: 3px solid; border-radius: 12px; }
.strip-label { font-size: 10px; font-weight: 600; margin: 0 0 3px; letter-spacing: 0.06em; text-transform: uppercase; }
.strip-message { font-size: 15px; font-weight: 500; margin: 0; }
.strip-dots { display: flex; justify-content: center; gap: 5px; margin-top: 8px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #ddd; cursor: pointer; display: inline-block; transition: background 0.2s; }
.dot.active { background: #D4537E; }

/* ── App grid ─────────────────────────────────────────────────── */
.section-label { font-size: 10px; font-weight: 600; color: #bbb; letter-spacing: 0.07em; text-transform: uppercase; margin: 0 0 10px; }
.app-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 1rem; }
.app-card { border: 1px solid; border-radius: 12px; padding: 14px 12px; cursor: pointer; position: relative; transition: opacity 0.2s; }
.app-card.inactive { opacity: 0.55; cursor: default; }
.app-badge { position: absolute; top: 10px; right: 10px; border-radius: 20px; padding: 2px 7px; font-size: 9px; font-weight: 600; }
.app-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.app-name { font-size: 13px; font-weight: 500; margin: 0 0 2px; }
.app-sub { font-size: 11px; margin: 0; }

/* ── Privacy note (desktop) ───────────────────────────────────── */
.hub-privacy-note {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #ccc;
  margin: 1rem 0 0;
}
</style>
