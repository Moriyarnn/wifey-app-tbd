<template>
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
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { API, apiFetch } from '../api'

const current = ref(0)
let timer = null
let startX = 0

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
      if (days < 0)        periodMsg = `Period is ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} late${w}`
      else if (days === 0) periodMsg = `Period is due today${w}`
      else if (days === 1) periodMsg = `Period due tomorrow${w}`
      else                 periodMsg = `Next period in ${days} days${w}`
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
.strip-wrapper { margin-bottom: 1.25rem; }
.strip-track { overflow: hidden; border-radius: 14px; cursor: grab; }
.strip-inner { display: flex; transition: transform 0.35s cubic-bezier(.4,0,.2,1); }
.strip-card { min-width: 100%; padding: 12px 14px; box-sizing: border-box; border: 3px solid; border-radius: 12px; }
.strip-label { font-size: 10px; font-weight: 600; margin: 0 0 3px; letter-spacing: 0.06em; text-transform: uppercase; }
.strip-message { font-size: 15px; font-weight: 500; margin: 0; }
.strip-dots { display: flex; justify-content: center; gap: 5px; margin-top: 8px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: #ddd; cursor: pointer; display: inline-block; transition: background 0.2s; }
.dot.active { background: #D4537E; }
</style>
