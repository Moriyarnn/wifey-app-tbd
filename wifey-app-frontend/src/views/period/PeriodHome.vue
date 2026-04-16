<template>
  <v-app>
    <v-main style="padding-bottom: 70px;">
      <div class="period-wrapper">

        <!-- Header -->
        <div class="period-header">
          <button class="back-btn" @click="$router.push('/')">
            <v-icon size="18" color="#993556">mdi-arrow-left</v-icon>
          </button>
          <div>
            <p class="period-date">{{ todayLabel }}</p>
            <h1 class="period-title">Period Tracker</h1>
          </div>
          <div class="header-actions">
            <button class="settings-icon-btn" @click="tutorialOpen = true" aria-label="Help">
              <v-icon size="17" color="grey-darken-1">mdi-help-circle-outline</v-icon>
            </button>
            <button class="settings-icon-btn" @click="settingsOpen = true" aria-label="Settings">
              <v-icon size="18" color="grey-darken-1">mdi-cog-outline</v-icon>
            </button>
          </div>
        </div>

        <!-- Status strip -->
        <div class="status-card">
          <div class="status-row">
            <div class="status-item">
              <p class="status-label">Next period</p>
              <p class="status-value">{{ summaryLabels.nextPeriod }}</p>
            </div>
            <div class="status-divider" />
            <div class="status-item">
              <p class="status-label">Cycle day</p>
              <p class="status-value">{{ summaryLabels.cycleDay }}</p>
            </div>
            <div class="status-divider" />
            <div class="status-item">
              <p class="status-label">Fertile window</p>
              <p class="status-value">{{ summaryLabels.fertileWindow }}</p>
            </div>
          </div>
        </div>

        <!-- Month navigation -->
        <div class="month-nav">
          <button class="month-btn" @click="prevMonth">
            <v-icon size="18" color="#993556">mdi-chevron-left</v-icon>
          </button>
          <p class="month-label">{{ monthLabel }}</p>
          <button class="month-btn" @click="nextMonth">
            <v-icon size="18" color="#993556">mdi-chevron-right</v-icon>
          </button>
        </div>

        <!-- Calendar -->
        <div class="calendar">
          <!-- Day of week headers -->
          <div class="cal-header-row">
            <span v-for="d in ['Su','Mo','Tu','We','Th','Fr','Sa']" :key="d" class="cal-dow">{{ d }}</span>
          </div>

          <!-- Day cells -->
          <div class="cal-grid-wrap">
          <Transition :name="slideDirection">
          <div
            :key="viewYear + '-' + viewMonth"
            class="cal-grid"
            :class="{ 'cal-grid-dragging': isDragging }"
            @touchstart.prevent="onTouchStart"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
          >
            <div
              v-for="(cell, i) in calendarCells"
              :key="i"
              class="cal-cell"
              :class="getCellClass(cell, i)"
              :data-date="cell.dateStr"
              @mousedown="cell.day ? onCellMouseDown(cell, $event) : null"
              @mouseenter="onCellMouseEnter(cell)"
            >
              <span v-if="cell.day" class="cal-day-num">{{ cell.day }}</span>
              <span v-if="cell.day && getDayDot(cell)" class="cal-dot" :class="getDayDot(cell)" />
              <span v-if="cell.dateStr && justSaved.has(cell.dateStr)" class="cal-saved-check">✓</span>
              <span v-if="cell.day && (hasNote(cell) || hasDataWarning(cell))" class="cal-cell-badges">
                <span v-if="hasDataWarning(cell)" class="cal-cell-badge cal-cell-badge-warn">
                  <v-icon size="18" color="#f59e0b">mdi-alert</v-icon>
                </span>
                <span v-if="hasNote(cell)" class="cal-cell-badge cal-cell-badge-note">
                  <v-icon size="18" color="#94a3b8">mdi-note-text</v-icon>
                </span>
              </span>
            </div>
          </div>
          </Transition>
          </div>
        </div>

        <!-- Drag hint -->
        <p class="drag-hint">
          <v-icon size="12" color="#D4537E">mdi-gesture-swipe-horizontal</v-icon>
          Drag to log a completed period
        </p>
        <p class="drag-hint">
          <v-icon size="12" color="#D4537E">mdi-gesture-tap</v-icon>
          Tap a day to log your period as it happens
        </p>
        <p class="drag-hint">
          <v-icon size="12" color="#D4537E">mdi-egg-outline</v-icon>
          Tap between cycles to mark ovulation (optional)
        </p>

        <!-- Legend -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot period-dot" />
            <span class="legend-text">Period</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot predicted-dot" />
            <span class="legend-text">Predicted</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot fertile-dot" />
            <span class="legend-text">Fertile</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot ovulation-dot" />
            <span class="legend-text">Ovulation</span>
          </div>
        </div>

        <!-- Irregular cycle notice -->
        <div v-if="summary?.isIrregular" class="irregular-card">
          <v-icon size="14" color="#993556">mdi-chart-bell-curve</v-icon>
          <span class="irregular-text">Your cycles are irregular — predictions may shift as more data is recorded</span>
        </div>

        <!-- Data warnings -->
        <div v-if="summary?.dataWarnings?.length" class="warnings-card">
          <button class="warnings-header" @click="warningsOpen = !warningsOpen">
            <v-icon size="14" color="#b45309">mdi-alert-outline</v-icon>
            <span class="warnings-title">{{ summary.dataWarnings.length }} data issue{{ summary.dataWarnings.length > 1 ? 's' : '' }} affecting predictions</span>
            <v-icon size="14" color="#b45309" :style="{ transform: warningsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }">mdi-chevron-down</v-icon>
          </button>
          <ul v-if="warningsOpen" class="warnings-list">
            <li v-for="(w, i) in summary.dataWarnings" :key="i" class="warning-item" @click="goToWarning(w)">
              {{ w.message }}
            </li>
          </ul>
        </div>

      </div>
    </v-main>

    <!-- Settings sheet -->
    <SettingsSheet v-model="settingsOpen" />

    <!-- First-launch tutorial (also triggered by ? button) -->
    <OnboardingTutorial :force-open="tutorialOpen" @close="tutorialOpen = false" />

    <!-- Delete cycle dialog -->
    <div class="confirm-backdrop" :class="{ visible: showDeleteCycleDialog }" @click="showDeleteCycleDialog = false" />
    <div class="confirm-modal" :class="{ open: showDeleteCycleDialog }">
      <div class="confirm-inner">
        <div class="confirm-icon">
          <v-icon size="28" color="#c0392b">mdi-calendar-remove-outline</v-icon>
        </div>
        <p class="confirm-title">Delete this cycle?</p>
        <p class="confirm-desc">{{ selectedCycleLabel }}<br><span style="font-size:11px;color:#c0392b;">All logged data for this cycle will be removed.</span></p>
        <div class="confirm-actions">
          <button class="confirm-cancel" @click="showDeleteCycleDialog = false">Cancel</button>
          <button class="confirm-delete" @click="deleteCycle" :disabled="deletingCycle">
            {{ deletingCycle ? 'Deleting...' : 'Yes, delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Adjacency dialog — tapped date sits right next to an existing cycle -->
    <div class="confirm-backdrop" :class="{ visible: adjacencyDialog.show }" @click="!adjacencyDialog.working && (adjacencyDialog.show = false)" />
    <div class="confirm-modal" :class="{ open: adjacencyDialog.show }">
      <div class="confirm-inner">
        <div class="confirm-icon">
          <v-icon size="28" color="#D4537E">mdi-calendar-arrow-right</v-icon>
        </div>
        <p class="confirm-title">Adjacent to an existing period</p>
        <p class="confirm-desc">This day is right next to a logged cycle. What would you like to do?</p>
        <div class="adj-actions">
          <button
            v-if="adjacencyDialog.prevCycle"
            class="adj-btn adj-btn-extend"
            :disabled="adjacencyDialog.working"
            @click="onAdjacencyExtendPrev"
          >
            <v-icon size="15" style="margin-right:5px">mdi-arrow-expand-right</v-icon>
            Extend {{ cycleRangeLabel(adjacencyDialog.prevCycle) }} to include this day
          </button>
          <button
            v-if="adjacencyDialog.nextCycle"
            class="adj-btn adj-btn-extend"
            :disabled="adjacencyDialog.working"
            @click="onAdjacencyExtendNext"
          >
            <v-icon size="15" style="margin-right:5px">mdi-arrow-expand-left</v-icon>
            Move start of {{ cycleRangeLabel(adjacencyDialog.nextCycle) }} to this day
          </button>
          <button
            class="adj-btn adj-btn-new"
            :disabled="adjacencyDialog.working"
            @click="onAdjacencyNewPeriod"
          >
            Start a new period on this day
          </button>
        </div>
      </div>
    </div>

    <!-- Day panel bottom sheet -->
    <div class="sheet-backdrop" :class="{ visible: !!selectedCell }" @click="closePanel" />
    <div class="day-sheet" :class="{ open: !!selectedCell }">
      <div v-if="selectedCell" class="sheet-inner">

        <!-- Sheet handle -->
        <div class="sheet-handle" />

        <!-- Sheet header -->
        <div class="sheet-header">
          <div>
            <p class="sheet-date-label">{{ selectedDateLabel }}</p>
            <p class="sheet-day-type">{{ selectedDayType }}</p>
          </div>
          <button class="sheet-close" @click="closePanel">
            <v-icon size="18" color="#993556">mdi-close</v-icon>
          </button>
        </div>

        <!-- VIEW mode content -->
        <template v-if="mode === 'view'">
          <div v-if="selectedLoggedDay" class="view-content">
            <!-- Flow intensity -->
            <div class="view-section">
              <p class="view-section-label">Flow</p>
              <div class="flow-chips">
                <span
                  v-for="level in ['light','medium','heavy']"
                  :key="level"
                  class="flow-chip"
                  :class="{ 'flow-chip-active': selectedLoggedDay.flow_intensity === level }"
                >{{ level }}</span>
              </div>
            </div>

            <!-- Symptoms -->
            <div class="view-section" v-if="selectedSymptoms.length">
              <p class="view-section-label">Symptoms</p>
              <div class="symptom-chips">
                <span v-for="s in selectedSymptoms" :key="s" class="symptom-chip">{{ s }}</span>
              </div>
            </div>

            <!-- Notes -->
            <div class="view-section" v-if="selectedLoggedDay.notes">
              <p class="view-section-label">Notes</p>
              <p class="view-notes">{{ selectedLoggedDay.notes }}</p>
            </div>

            <div class="view-actions">
              <button class="edit-btn" @click="switchToEdit">
                <v-icon size="14" color="#993556">mdi-pencil-outline</v-icon>
                Edit this day
              </button>
            </div>
            <div v-if="selectedCycle" class="cycle-action-row">
              <button v-if="!selectedCycle.end_date" class="end-period-btn" @click="endActivePeriod" :disabled="endingPeriod">
                <v-icon size="14" color="#993556">mdi-calendar-check-outline</v-icon>
                {{ endingPeriod ? 'Ending...' : 'End period on this day' }}
              </button>
              <button class="delete-cycle-btn" @click="showDeleteCycleDialog = true">
                <v-icon size="12" color="#c0392b">mdi-calendar-remove-outline</v-icon>
                Delete entire cycle
              </button>
            </div>
          </div>

          <div v-else class="view-empty">
            <v-icon size="36" color="#F4C0D1">mdi-calendar-blank-outline</v-icon>
            <template v-if="selectedCycle">
              <p>No data logged for this day.</p>
              <button class="log-prompt-btn" @click="mode = 'log'">Add entry</button>
              <button v-if="!selectedCycle.end_date" class="end-period-btn" @click="endActivePeriod" :disabled="endingPeriod">
                <v-icon size="14" color="#993556">mdi-calendar-check-outline</v-icon>
                {{ endingPeriod ? 'Ending...' : 'End period on this day' }}
              </button>
              <button class="delete-cycle-btn delete-cycle-btn-solo" @click="showDeleteCycleDialog = true">
                <v-icon size="12" color="#c0392b">mdi-calendar-remove-outline</v-icon>
                Delete entire cycle
              </button>
            </template>
            <template v-else>
              <template v-if="ovulationCycle">
                <p class="view-ovulation-label">
                  {{ isMarkedOvulation ? 'Ovulation day marked' : 'Between cycles' }}
                </p>
                <button class="ovulation-btn" @click="markOvulation" :disabled="markingOvulation">
                  <v-icon size="14" color="#993556">mdi-egg-outline</v-icon>
                  {{ markingOvulation ? 'Saving...' : isMarkedOvulation ? 'Remove ovulation mark' : 'Mark as ovulation day' }}
                </button>
              </template>
              <template v-else>
                <p>Not part of a cycle.</p>
                <p class="view-empty-hint">Drag on the calendar to log a completed period</p>
              </template>
            </template>
          </div>
        </template>

        <!-- LOG mode content -->
        <template v-else>
          <div class="log-form">
            <!-- Gap fill notice -->
            <div v-if="tapContext === 'small-gap' && gapFillLabel" class="gap-fill-notice">
              <v-icon size="14" color="#D4537E">mdi-information-outline</v-icon>
              {{ gapFillLabel }}
            </div>

            <!-- Flow intensity -->
            <div class="form-section">
              <p class="form-label">Flow intensity</p>
              <div class="flow-chips">
                <button
                  v-for="level in ['light','medium','heavy']"
                  :key="level"
                  class="flow-chip flow-chip-btn"
                  :class="{ 'flow-chip-active': form.flow_intensity === level }"
                  @click="form.flow_intensity = form.flow_intensity === level ? '' : level"
                >{{ level }}</button>
              </div>
            </div>

            <!-- Symptoms -->
            <div class="form-section">
              <p class="form-label">Symptoms</p>
              <div class="symptom-chips">
                <button
                  v-for="s in symptomOptions"
                  :key="s"
                  class="symptom-chip symptom-chip-btn"
                  :class="{ 'symptom-chip-active': form.symptoms.includes(s) }"
                  @click="toggleSymptom(s)"
                >{{ s }}</button>
              </div>
            </div>

            <!-- Notes -->
            <div class="form-section">
              <p class="form-label">Notes</p>
              <textarea
                class="notes-input"
                v-model="form.notes"
                placeholder="How are you feeling today?"
                rows="3"
              />
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button class="btn-cancel" @click="closePanel">Cancel</button>
              <button class="btn-save" @click="saveDay" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save' }}
              </button>
            </div>

            <!-- End period from log form (open cycles only) -->
            <div v-if="relevantActiveCycle && ['consecutive', 'small-gap', 'open-cycle-day'].includes(tapContext)" class="form-end-period-row">
              <button class="end-period-btn" @click="saveAndEndPeriod" :disabled="saving">
                <v-icon size="14" color="#993556">mdi-calendar-check-outline</v-icon>
                {{ saving ? 'Saving...' : 'End period on this day' }}
              </button>
            </div>

            <!-- Delete cycle from log form -->
            <div v-if="selectedCycle" class="form-delete-cycle-row">
              <button class="delete-cycle-btn delete-cycle-btn-solo" @click="showDeleteCycleDialog = true">
                <v-icon size="12" color="#c0392b">mdi-calendar-remove-outline</v-icon>
                Delete entire cycle
              </button>
            </div>
          </div>
        </template>

      </div>
    </div>

    <!-- Future-date speech bubble -->
    <Transition name="hint-bubble-fade">
      <div
        v-if="hintBubble.visible"
        class="hint-bubble"
        :class="{ 'hint-bubble-success': hintBubble.variant === 'green' }"
        :style="{ left: hintBubble.x + 'px', top: hintBubble.y + 'px' }"
      >
        {{ hintBubble.message }}
      </div>
    </Transition>

  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SettingsSheet from '../../components/SettingsSheet.vue'
import OnboardingTutorial from '../../components/OnboardingTutorial.vue'
import { API } from '../../api'

const settingsOpen = ref(false)
const tutorialOpen = ref(false)
const warningsOpen = ref(true)
const pulseDates = ref(new Set())
const mode = ref('view') // set automatically on day click
const saving = ref(false)
const justSaved = ref(new Set())

// Month slide animation
const slideDirection = ref('left')

// Drag-to-select state
const isDragging = ref(false)
const dragStart = ref(null)
const dragEnd = ref(null)
const dragMoved = ref(false)

// Future-date speech bubble
const hintBubble = ref({ visible: false, x: 0, y: 0, message: '', variant: 'dark' })
let hintBubbleTimer = null
function showHintBubble(x, date, message = "Can't log future dates", variant = 'dark') {
  if (hintBubbleTimer) clearTimeout(hintBubbleTimer)
  const cellEl = document.querySelector(`[data-date="${date}"]`)
  const y = cellEl ? cellEl.getBoundingClientRect().top : hintBubble.value.y
  hintBubble.value = { visible: true, x, y, message, variant }
  hintBubbleTimer = setTimeout(() => { hintBubble.value.visible = false }, 1500)
}

// Swipe-to-create state
const dragRange = ref(null)
const creating = ref(false)

// Delete cycle dialog
const showDeleteCycleDialog = ref(false)
const deletingCycle = ref(false)

// Adjacency dialog — shown when a tapped date sits immediately next to an existing cycle
const adjacencyDialog = ref({ show: false, prevCycle: null, nextCycle: null, pendingCell: null, working: false })

function getAdjacentCycles(ds) {
  const prevDate = new Date(ds + 'T00:00:00')
  prevDate.setDate(prevDate.getDate() - 1)
  const prevDayStr = prevDate.toISOString().split('T')[0]

  const nextDate = new Date(ds + 'T00:00:00')
  nextDate.setDate(nextDate.getDate() + 1)
  const nextDayStr = nextDate.toISOString().split('T')[0]

  // prevCycle: a closed cycle whose end_date is the day before ds
  const prevCycle = allCycles.value.find(c => c.end_date === prevDayStr) ?? null
  // nextCycle: any cycle whose start_date is the day after ds
  const nextCycle = allCycles.value.find(c => c.start_date === nextDayStr) ?? null

  return { prevCycle, nextCycle }
}

function cycleRangeLabel(cycle) {
  if (!cycle) return ''
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const end = cycle.end_date || cycle.last_logged_day
  if (!end || end === cycle.start_date) return fmt(cycle.start_date)
  return `${fmt(cycle.start_date)} – ${fmt(end)}`
}

// Ovulation marking
const markingOvulation = ref(false)

// Day-by-day logging
const tapContext = ref(null) // 'no-cycle' | 'consecutive' | 'small-gap' | 'large-gap' | 'closed-cycle' | 'open-cycle-day'
const endingPeriod = ref(false)

// Data from API
const allCycleDays = ref([])   // { id, cycle_id, date, flow_intensity, notes, symptoms (csv), cycle_start, cycle_end }
const allCycles = ref([])      // { id, start_date, end_date, last_logged_day }
const summary = ref(null)

// Calendar state
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth()) // 0-indexed

// Selected cell state
const selectedCell = ref(null)

// Form state
const form = ref({ flow_intensity: '', symptoms: [], notes: '' })

const symptomOptions = ['Cramps', 'Headache', 'Bloating', 'Mood swings', 'Fatigue', 'Back pain', 'Nausea', 'Tender breasts']

// ── Computed labels ──────────────────────────────────────────
const todayLabel = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

const monthLabel = computed(() => {
  return new Date(viewYear.value, viewMonth.value, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const summaryLabels = computed(() => {
  if (!summary.value) return { nextPeriod: '—', cycleDay: '—', fertileWindow: '—' }
  const s = summary.value

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  // ── Next Period ──────────────────────────────────────────────
  let nextPeriod = '—'
  if (s.currentCycle) {
    nextPeriod = 'Active'
  } else if (s.nextPeriodDate) {
    const next = new Date(s.nextPeriodDate + 'T00:00:00')
    const days = Math.round((next - today) / 86400000)
    const window = s.confidenceWindow ? ` ±${s.confidenceWindow}d` : ''
    if (days < 0)      nextPeriod = '—'
    else if (days === 0) nextPeriod = `Today${window}`
    else if (days === 1) nextPeriod = `Tomorrow${window}`
    else               nextPeriod = `In ${days}d${window}`
  }

  // ── Cycle Day ────────────────────────────────────────────────
  // Always count from the last known period start so the number
  // is meaningful whether she's on her period or between cycles.
  let cycleDay = '—'
  let lastStart = null
  if (s.currentCycle) {
    lastStart = new Date(s.currentCycle.start_date + 'T00:00:00')
  } else if (s.nextPeriodDate && s.avgCycleLength) {
    lastStart = new Date(s.nextPeriodDate + 'T00:00:00')
    lastStart.setDate(lastStart.getDate() - s.avgCycleLength)
  }
  if (lastStart) {
    const dayNum = Math.floor((today - lastStart) / 86400000) + 1
    const maxDay = (s.avgCycleLength || 35) + 14
    if (dayNum >= 1 && dayNum <= maxDay) cycleDay = `Day ${dayNum}`
  }

  // ── Fertile Window ───────────────────────────────────────────
  let fertileWindow = '—'
  if (!s.currentCycle && s.fertileWindow) {
    const fStart = new Date(s.fertileWindow.start + 'T00:00:00')
    const fEnd   = new Date(s.fertileWindow.end   + 'T00:00:00')

    if (s.ovulationDate === todayStr) {
      fertileWindow = 'Ovulation'
    } else if (today >= fStart && today <= fEnd) {
      fertileWindow = 'Active'
    } else if (today < fStart) {
      const daysUntil = Math.round((fStart - today) / 86400000)
      fertileWindow = daysUntil <= 3
        ? `In ${daysUntil}d`
        : `${fStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${fEnd.toLocaleDateString('en-US', { day: 'numeric' })}`
    } else {
      fertileWindow = 'Passed'
    }
  }

  return { nextPeriod, cycleDay, fertileWindow }
})

// ── Calendar cells ───────────────────────────────────────────
const calendarCells = computed(() => {
  const year = viewYear.value
  const month = viewMonth.value
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []

  // Leading days from previous month
  for (let i = 0; i < firstDay; i++) {
    const d = daysInPrevMonth - firstDay + 1 + i
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, faded: true })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr })
  }

  // Trailing days from next month to fill 42 cells
  let nextDay = 1
  while (cells.length < 42) {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
    cells.push({ day: nextDay, dateStr, faded: true })
    nextDay++
  }

  return cells
})

// Build a quick lookup map: dateStr → logged day
const loggedDayMap = computed(() => {
  const map = {}
  allCycleDays.value.forEach(d => { map[d.date] = d })
  return map
})

// Sets of dates for coloring
// Fill the full range of each cycle (start → end_date or last_logged_day)
const periodDates = computed(() => {
  const set = new Set()
  allCycles.value.forEach(cycle => {
    const end = cycle.end_date || cycle.last_logged_day
    if (!cycle.start_date || !end) return
    let d = new Date(cycle.start_date + 'T00:00:00')
    const endDate = new Date(end + 'T00:00:00')
    while (d <= endDate) {
      set.add(d.toISOString().split('T')[0])
      d.setDate(d.getDate() + 1)
    }
  })
  return set
})

// Map each period date to its cycle ID so band logic can detect cycle boundaries
const dateToCycleId = computed(() => {
  const map = new Map()
  allCycles.value.forEach(cycle => {
    const end = cycle.end_date || cycle.last_logged_day
    if (!cycle.start_date || !end) return
    let d = new Date(cycle.start_date + 'T00:00:00')
    const endDate = new Date(end + 'T00:00:00')
    while (d <= endDate) {
      map.set(d.toISOString().split('T')[0], cycle.id)
      d.setDate(d.getDate() + 1)
    }
  })
  return map
})

// Dates highlighted during an active drag
const dragDates = computed(() => {
  if (!dragStart.value || !dragEnd.value) return new Set()
  const s = dragStart.value <= dragEnd.value ? dragStart.value : dragEnd.value
  const e = dragStart.value <= dragEnd.value ? dragEnd.value : dragStart.value
  const set = new Set()
  let d = new Date(s + 'T00:00:00')
  const endDate = new Date(e + 'T00:00:00')
  while (d <= endDate) {
    set.add(d.toISOString().split('T')[0])
    d.setDate(d.getDate() + 1)
  }
  return set
})

const dragRangeLabel = computed(() => {
  if (!dragRange.value) return ''
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  if (dragRange.value.start === dragRange.value.end) return fmt(dragRange.value.start)
  return `${fmt(dragRange.value.start)} → ${fmt(dragRange.value.end)}`
})

const PREDICT_CYCLES = 6

// Normalize nextPeriodDate to the most recent predicted cycle start <= today,
// so projections are always anchored near the present regardless of how old
// the last logged cycle is.
const normalizedCycleBase = computed(() => {
  const s = summary.value
  if (!s?.nextPeriodDate || !s?.avgCycleLength) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = new Date(s.nextPeriodDate + 'T00:00:00')
  if (base < today) {
    const n = Math.floor((today - base) / (s.avgCycleLength * 86400000))
    base.setDate(base.getDate() + n * s.avgCycleLength)
  }
  return base
})

const predictedDates = computed(() => {
  const set = new Set()
  const s = summary.value
  const base = normalizedCycleBase.value
  if (!base || !s?.avgCycleLength || !s?.avgPeriodLength) return set
  // Only show the single next predicted period
  for (let d = 0; d < s.avgPeriodLength; d++) {
    const day = new Date(base)
    day.setDate(day.getDate() + d)
    set.add(day.toISOString().split('T')[0])
  }
  return set
})

const fertileDates = computed(() => {
  const set = new Set()
  const s = summary.value
  if (!s?.avgCycleLength || !s?.fertileWindow || !s?.nextPeriodDate) return set

  const rawBase   = new Date(s.nextPeriodDate    + 'T00:00:00')
  const fStart    = new Date(s.fertileWindow.start + 'T00:00:00')
  const fEnd      = new Date(s.fertileWindow.end   + 'T00:00:00')
  const offsetStart = Math.round((fStart - rawBase) / 86400000)
  const offsetEnd   = Math.round((fEnd   - rawBase) / 86400000)

  const warnedDates = new Set(s.dataWarnings?.flatMap(w => w.affectedDates ?? []) ?? [])

  // Past + present: one fertile window per logged cycle
  allCycles.value.forEach(cycle => {
    if (warnedDates.has(cycle.start_date)) return
    const nextPeriodForCycle = new Date(cycle.start_date + 'T00:00:00')
    nextPeriodForCycle.setDate(nextPeriodForCycle.getDate() + s.avgCycleLength)
    for (let d = offsetStart; d <= offsetEnd; d++) {
      const day = new Date(nextPeriodForCycle)
      day.setDate(day.getDate() + d)
      set.add(day.toISOString().split('T')[0])
    }
  })

  // Future: only the single next fertile window not yet covered by a logged cycle
  const base = normalizedCycleBase.value
  if (base) {
    for (let d = offsetStart; d <= offsetEnd; d++) {
      const day = new Date(base)
      day.setDate(day.getDate() + s.avgCycleLength + d)
      set.add(day.toISOString().split('T')[0])
    }
  }
  return set
})

const predictedOvulationDates = computed(() => {
  const set = new Set()
  const s = summary.value
  if (!s?.avgCycleLength || !s?.ovulationDate || !s?.nextPeriodDate) return set

  const rawBase = new Date(s.nextPeriodDate + 'T00:00:00')
  const ovul    = new Date(s.ovulationDate   + 'T00:00:00')
  const offset  = Math.round((ovul - rawBase) / 86400000)

  const warnedDates = new Set(s.dataWarnings?.flatMap(w => w.affectedDates ?? []) ?? [])

  // Past + present: one ovulation per logged cycle
  allCycles.value.forEach(cycle => {
    if (warnedDates.has(cycle.start_date)) return
    const nextPeriodForCycle = new Date(cycle.start_date + 'T00:00:00')
    nextPeriodForCycle.setDate(nextPeriodForCycle.getDate() + s.avgCycleLength)
    const day = new Date(nextPeriodForCycle)
    day.setDate(day.getDate() + offset)
    set.add(day.toISOString().split('T')[0])
  })

  // Future: only the single next ovulation not yet covered by a logged cycle
  const base = normalizedCycleBase.value
  if (base) {
    const day = new Date(base)
    day.setDate(day.getDate() + s.avgCycleLength + offset)
    set.add(day.toISOString().split('T')[0])
  }
  return set
})

// Marked ovulation dates from actual cycle data (distinct from the predicted ovulationDate above)
const markedOvulationDates = computed(() => {
  const set = new Set()
  allCycles.value.forEach(c => { if (c.ovulation_date) set.add(c.ovulation_date) })
  return set
})

// The cycle a between-cycle day belongs to (last cycle that started before this day)
const ovulationCycle = computed(() => {
  if (!selectedCell.value || selectedCycle.value) return null
  const ds = selectedCell.value.dateStr
  return allCycles.value
    .filter(c => c.start_date <= ds)
    .sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null
})

const isMarkedOvulation = computed(() =>
  !!(selectedCell.value && ovulationCycle.value?.ovulation_date === selectedCell.value.dateStr)
)

const warningDateSet = computed(() => {
  const set = new Set()
  summary.value?.dataWarnings?.forEach(w => w.affectedDates?.forEach(d => set.add(d)))
  return set
})

// True first day of each cycle (for drop marker)
const periodStartSet = computed(() => {
  const set = new Set()
  allCycles.value.forEach(c => { if (c.start_date) set.add(c.start_date) })
  return set
})

// True last day of completed cycles (for end marker)
const periodEndSet = computed(() => {
  const set = new Set()
  allCycles.value.forEach(c => { if (c.end_date) set.add(c.end_date) })
  return set
})

// Last logged day of active (open) cycles (for pulse indicator)
const periodOpenSet = computed(() => {
  const set = new Set()
  allCycles.value.forEach(c => {
    if (!c.end_date && c.last_logged_day) set.add(c.last_logged_day)
  })
  return set
})

// The single cycle with no end_date (day-by-day active period)
// Returns the open cycle most relevant to a given date:
// the open cycle whose last_logged_day (or start_date) is the latest value still <= ds.
// This lets multiple open cycles coexist — each tap resolves to the cycle it belongs to.
function findRelevantOpenCycle(ds) {
  return allCycles.value
    .filter(c => !c.end_date && (c.last_logged_day || c.start_date) <= ds)
    .sort((a, b) => (b.last_logged_day || b.start_date).localeCompare(a.last_logged_day || a.start_date))[0] ?? null
}

// Reactive version for template and computed use (depends on selectedCell)
const relevantActiveCycle = computed(() => {
  const ds = selectedCell.value?.dateStr
  if (!ds) return null
  return findRelevantOpenCycle(ds)
})

const gapFillLabel = computed(() => {
  if (tapContext.value !== 'small-gap') return ''
  const active = relevantActiveCycle.value
  if (!active || !selectedCell.value?.dateStr) return ''
  const fromStr = active.last_logged_day || active.start_date
  const toStr = selectedCell.value.dateStr
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const fillStart = new Date(fromStr + 'T00:00:00')
  fillStart.setDate(fillStart.getDate() + 1)
  const fillEnd = new Date(toStr + 'T00:00:00')
  fillEnd.setDate(fillEnd.getDate() - 1)
  const fillStartStr = fillStart.toISOString().split('T')[0]
  const fillEndStr = fillEnd.toISOString().split('T')[0]
  if (fillStartStr === fillEndStr) return `This will also fill ${fmt(fillStartStr)}`
  return `This will also fill ${fmt(fillStartStr)} through ${fmt(fillEndStr)}`
})

function hasNote(cell) {
  return !!(cell.dateStr && loggedDayMap.value[cell.dateStr]?.notes)
}

function hasDataWarning(cell) {
  return !!(cell.dateStr && warningDateSet.value.has(cell.dateStr))
}

function goToWarning(w) {
  if (!w.targetDate) return
  const d = new Date(w.targetDate + 'T00:00:00')
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()

  const cycle = allCycles.value.find(c => c.start_date === w.targetDate)
  const dates = new Set()
  if (cycle) {
    const end = cycle.end_date || cycle.last_logged_day
    if (end) {
      const cur = new Date(cycle.start_date + 'T00:00:00')
      const endD = new Date(end + 'T00:00:00')
      while (cur <= endD) {
        dates.add(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }
    } else {
      dates.add(cycle.start_date)
    }
  } else {
    ;(w.affectedDates ?? [w.targetDate]).forEach(d => dates.add(d))
  }
  pulseDates.value = dates
  setTimeout(() => { pulseDates.value = new Set() }, 1600)
}

const todayStr = new Date().toISOString().split('T')[0]

function getCellClass(cell, i) {
  if (!cell.dateStr) return ['cal-cell-empty']
  const classes = []

  // Drag anchor: scale up the first and last cell of the current drag range
  if (dragStart.value && dragEnd.value) {
    const ds = dragStart.value <= dragEnd.value ? dragStart.value : dragEnd.value
    const de = dragStart.value <= dragEnd.value ? dragEnd.value : dragStart.value
    if (cell.dateStr === ds || cell.dateStr === de) classes.push('cal-drag-anchor')
  }

  if (cell.faded) {
    classes.push('cal-cell-faded')
    if (dragDates.value.has(cell.dateStr)) classes.push('cal-dragging')
    else if (periodDates.value.has(cell.dateStr)) {
      classes.push('cal-period')
      const cells = calendarCells.value
      const thisCycleId = dateToCycleId.value.get(cell.dateStr)
      const prevIsPeriod = i > 0 && periodDates.value.has(cells[i - 1].dateStr) && dateToCycleId.value.get(cells[i - 1].dateStr) === thisCycleId
      const nextIsPeriod = i < cells.length - 1 && periodDates.value.has(cells[i + 1].dateStr) && dateToCycleId.value.get(cells[i + 1].dateStr) === thisCycleId
      if (!prevIsPeriod) classes.push('cal-period-row-start')
      if (!nextIsPeriod) classes.push('cal-period-row-end')
    }
    else if (predictedDates.value.has(cell.dateStr)) classes.push('cal-predicted')
    else if (markedOvulationDates.value.has(cell.dateStr)) classes.push('cal-ovulation')
    else if (predictedOvulationDates.value.has(cell.dateStr)) classes.push('cal-ovulation')
    else if (fertileDates.value.has(cell.dateStr)) classes.push('cal-fertile')
    return classes
  }
  if (cell.dateStr === todayStr) classes.push('cal-today')
  if (dragDates.value.has(cell.dateStr)) classes.push('cal-dragging')
  else if (periodDates.value.has(cell.dateStr)) {
    classes.push('cal-period')
    // Determine continuous-band shape: round the visual start/end of each period run
    const cells = calendarCells.value
    const prevIsPeriod = i > 0 && periodDates.value.has(cells[i - 1].dateStr)
    const nextIsPeriod = i < cells.length - 1 && periodDates.value.has(cells[i + 1].dateStr)
    if (!prevIsPeriod) classes.push('cal-period-row-start')
    if (!nextIsPeriod) classes.push('cal-period-row-end')
    // True period boundaries (pseudo-element markers)
    if (periodStartSet.value.has(cell.dateStr)) classes.push('cal-period-start')
    if (periodEndSet.value.has(cell.dateStr)) classes.push('cal-period-end')
    if (periodOpenSet.value.has(cell.dateStr)) classes.push('cal-period-open')
  }
  else if (predictedDates.value.has(cell.dateStr)) classes.push('cal-predicted')
  else if (markedOvulationDates.value.has(cell.dateStr)) classes.push('cal-ovulation')
  else if (predictedOvulationDates.value.has(cell.dateStr)) classes.push('cal-ovulation')
  else if (fertileDates.value.has(cell.dateStr)) classes.push('cal-fertile')
  if (cell.day) classes.push('cal-cell-day')
  if (pulseDates.value.has(cell.dateStr)) classes.push('cal-cell-pulse')
  return classes
}

function getDayDot(cell) {
  if (!cell.dateStr) return null
  if (periodDates.value.has(cell.dateStr)) return 'dot-period'
  if (markedOvulationDates.value.has(cell.dateStr)) return 'dot-ovulation'
  if (predictedOvulationDates.value.has(cell.dateStr)) return 'dot-ovulation'
  if (fertileDates.value.has(cell.dateStr)) return 'dot-fertile'
  if (predictedDates.value.has(cell.dateStr)) return 'dot-predicted'
  return null
}

// ── Month nav ────────────────────────────────────────────────
function prevMonth() {
  slideDirection.value = 'right'
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  slideDirection.value = 'left'
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

// ── Day panel ────────────────────────────────────────────────
function onDayClick(cell) {
  const ds = cell.dateStr
  const logged = loggedDayMap.value[ds]
  const hasMeaningfulData = !!(logged?.flow_intensity || logged?.notes || logged?.symptoms)

  // Future dates: view mode only (predictions)
  if (ds > todayStr) {
    tapContext.value = null
    selectedCell.value = cell
    mode.value = 'view'
    form.value = { flow_intensity: '', symptoms: [], notes: '' }
    return
  }

  // Already has meaningful data: view mode first, edit via button
  if (hasMeaningfulData) {
    tapContext.value = null
    selectedCell.value = cell
    mode.value = 'view'
    form.value = {
      flow_intensity: logged.flow_intensity ?? '',
      symptoms: logged.symptoms ? logged.symptoms.split(',').map(s => s.trim()).filter(Boolean) : [],
      notes: logged.notes ?? ''
    }
    return
  }

  const active = findRelevantOpenCycle(ds)
  let context = null

  if (active) {
    if (periodDates.value.has(ds)) {
      context = 'open-cycle-day'
    } else {
      const lastDay = active.last_logged_day || active.start_date
      const diff = Math.round(
        (new Date(ds + 'T00:00:00') - new Date(lastDay + 'T00:00:00')) / 86400000
      )
      if (diff === 1)                  context = 'consecutive'
      else if (diff >= 2 && diff <= 14) context = 'small-gap'
      else if (diff > 14)              context = 'large-gap'
      else {
        // Tapping before the active cycle or in an unrelated inter-cycle gap
        // Fall through to between-cycles / no-cycle handling below
      }
    }
  }

  if (!context) {
    if (periodDates.value.has(ds)) {
      context = 'closed-cycle'
    } else {
      context = 'no-cycle'
    }
  }

  // Quick-log: immediately save new period days without opening a form
  if (['no-cycle', 'consecutive', 'small-gap', 'large-gap'].includes(context)) {
    tapContext.value = context
    form.value = { flow_intensity: '', symptoms: [], notes: '' }

    // For no-cycle: check if this date is immediately adjacent to an existing cycle
    // and silently extend rather than create a new one (except when both sides are adjacent)
    if (context === 'no-cycle') {
      const adj = getAdjacentCycles(ds)
      if (adj.prevCycle || adj.nextCycle) {
        // If only one side is adjacent, automatically extend that cycle
        if (adj.prevCycle && !adj.nextCycle) {
          // Extend previous cycle
          onAdjacencyExtendPrevSilent(adj.prevCycle, cell)
        } else if (adj.nextCycle && !adj.prevCycle) {
          // Extend next cycle
          onAdjacencyExtendNextSilent(adj.nextCycle, cell)
        } else {
          // Both sides adjacent - show dialog for user choice
          adjacencyDialog.value = { show: true, prevCycle: adj.prevCycle, nextCycle: adj.nextCycle, pendingCell: cell, working: false }
        }
        return
      }
    }

    quickLogDay(cell)
    return
  }

  // Already-logged day (open-cycle-day, closed-cycle): open view panel for details/editing
  tapContext.value = context
  selectedCell.value = cell
  mode.value = 'view'
  form.value = {
    flow_intensity: logged?.flow_intensity ?? '',
    symptoms: logged?.symptoms ? logged.symptoms.split(',').map(s => s.trim()).filter(Boolean) : [],
    notes: logged?.notes ?? ''
  }
}

async function quickLogDay(cell) {
  const ds = cell.dateStr
  saving.value = true
  try {
    const ok = await _saveCycleDayCore(ds)
    if (!ok) return
    justSaved.value = new Set([...justSaved.value, ds])
    setTimeout(() => {
      const next = new Set(justSaved.value)
      next.delete(ds)
      justSaved.value = next
    }, 1500)
    await loadData()
    const cellEl = document.querySelector(`[data-date="${ds}"]`)
    const x = cellEl
      ? cellEl.getBoundingClientRect().left + cellEl.getBoundingClientRect().width / 2
      : window.innerWidth / 2
    const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    const isNew = tapContext.value === 'no-cycle' || tapContext.value === 'large-gap'
    showHintBubble(x, ds, isNew ? `Period started: ${fmt(ds)}` : `Period day logged: ${fmt(ds)}`, 'green')
  } finally {
    saving.value = false
  }
}

function closePanel() {
  selectedCell.value = null
}

function switchToEdit() {
  mode.value = 'log'
}

// ── Drag-to-select ───────────────────────────────────────────
function onCellMouseDown(cell, ev) {
  isDragging.value = true
  dragMoved.value = false
  dragStart.value = cell.dateStr
  dragEnd.value = cell.dateStr
}

function onCellMouseEnter(cell) {
  if (!isDragging.value || !cell.dateStr) return
  dragEnd.value = cell.dateStr
  if (cell.dateStr !== dragStart.value) dragMoved.value = true
}

function onDocumentMouseUp(ev = {}) {
  if (!isDragging.value) return
  isDragging.value = false

  if (!dragMoved.value) {
    // Single cell: treat as a tap/click
    const startDate = dragStart.value
    const cell = calendarCells.value.find(c => c.dateStr === startDate)
    dragStart.value = null
    dragEnd.value = null
    if (startDate > todayStr && !periodDates.value.has(startDate)) {
      if (ev.clientX != null) showHintBubble(ev.clientX, startDate)
      return
    }
    if (cell && cell.day && !cell.faded) onDayClick(cell)
    return
  }

  const s = dragStart.value <= dragEnd.value ? dragStart.value : dragEnd.value
  const e = dragStart.value <= dragEnd.value ? dragEnd.value : dragStart.value
  dragMoved.value = false

  if (e > todayStr) {
    dragStart.value = null
    dragEnd.value = null
    if (ev.clientX != null) showHintBubble(ev.clientX, e)
    return
  }

  if (hasOverlap(s, e)) {
    dragStart.value = null
    dragEnd.value = null
    if (ev.clientX != null) showHintBubble(ev.clientX, e, 'Overlaps an existing cycle')
    return
  }

  doSwipeCreate(ev.clientX ?? window.innerWidth / 2, s, e)
}

function hasOverlap(start, end) {
  return allCycles.value.some(cycle => {
    const cEnd = cycle.end_date || cycle.last_logged_day
    if (!cEnd) return start <= cycle.start_date && end >= cycle.start_date
    return start <= cEnd && end >= cycle.start_date
  })
}

// Touch equivalents
function onTouchStart(e) {
  const touch = e.touches[0]
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const cellEl = el?.closest('[data-date]')
  if (!cellEl) return
  isDragging.value = true
  dragMoved.value = false
  dragStart.value = cellEl.dataset.date
  dragEnd.value = cellEl.dataset.date
}

function onTouchMove(e) {
  if (!isDragging.value) return
  const touch = e.touches[0]
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const cellEl = el?.closest('[data-date]')
  if (!cellEl) return
  const dateStr = cellEl.dataset.date
  if (dateStr !== dragEnd.value) {
    dragEnd.value = dateStr
    if (dateStr !== dragStart.value) dragMoved.value = true
  }
}

function onTouchEnd(e) {
  const touch = e.changedTouches[0]
  onDocumentMouseUp(touch ? { clientX: touch.clientX, clientY: touch.clientY } : {})
}

async function markOvulation() {
  if (!ovulationCycle.value || !selectedCell.value) return
  markingOvulation.value = true
  try {
    const newDate = isMarkedOvulation.value ? null : selectedCell.value.dateStr
    await fetch(`${API}/period/cycles/${ovulationCycle.value.id}/ovulation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ovulation_date: newDate })
    })
    await loadData()
  } finally {
    markingOvulation.value = false
  }
}

async function doSwipeCreate(x, s, e) {
  dragRange.value = { start: s, end: e }
  creating.value = true
  try {
    const label = dragRangeLabel.value
    const startRes = await fetch(`${API}/period/cycles/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: s,
        predicted_start_date: summary.value?.nextPeriodDate ?? null
      })
    })
    const { id } = await startRes.json()
    await fetch(`${API}/period/cycles/${id}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: e })
    })
    dragRange.value = null
    dragStart.value = null
    dragEnd.value = null
    await loadData()
    showHintBubble(x, s, `Period logged: ${label}`, 'green')
  } finally {
    creating.value = false
  }
}

const selectedLoggedDay = computed(() => {
  if (!selectedCell.value) return null
  return loggedDayMap.value[selectedCell.value.dateStr] ?? null
})

const selectedCycle = computed(() => {
  if (!selectedCell.value) return null
  const ds = selectedCell.value.dateStr
  return allCycles.value.find(c => {
    const end = c.end_date || c.last_logged_day
    return c.start_date <= ds && (!end || end >= ds)
  }) ?? null
})

const selectedCycleLabel = computed(() => {
  if (!selectedCycle.value) return ''
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const c = selectedCycle.value
  const end = c.end_date || c.last_logged_day
  if (!end || end === c.start_date) return fmt(c.start_date)
  return `${fmt(c.start_date)} → ${fmt(end)}`
})

const selectedSymptoms = computed(() => {
  if (!selectedLoggedDay.value?.symptoms) return []
  return selectedLoggedDay.value.symptoms.split(',').map(s => s.trim()).filter(Boolean)
})

const selectedDateLabel = computed(() => {
  if (!selectedCell.value?.dateStr) return ''
  return new Date(selectedCell.value.dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
})

const selectedDayType = computed(() => {
  if (!selectedCell.value?.dateStr) return ''
  const ds = selectedCell.value.dateStr
  switch (tapContext.value) {
    case 'no-cycle':      return 'Starting period'
    case 'consecutive':   return 'Period day'
    case 'small-gap':     return 'Period day'
    case 'large-gap':     return 'Start new period?'
    case 'closed-cycle':  return 'Log details'
    case 'open-cycle-day': return 'Period day'
  }
  // View-mode fallback (future dates, ovulation zone, existing data)
  if (periodDates.value.has(ds)) return 'Period day'
  if (markedOvulationDates.value.has(ds)) return 'Ovulation day'
  if (predictedOvulationDates.value.has(ds)) return 'Predicted ovulation'
  if (fertileDates.value.has(ds)) return 'Fertile window'
  if (predictedDates.value.has(ds)) return 'Predicted period'
  return 'No cycle data'
})

// ── Form helpers ─────────────────────────────────────────────
function toggleSymptom(s) {
  const idx = form.value.symptoms.indexOf(s)
  if (idx === -1) form.value.symptoms.push(s)
  else form.value.symptoms.splice(idx, 1)
}

async function saveDay() {
  if (!selectedCell.value) return
  saving.value = true
  const ds = selectedCell.value.dateStr
  try {
    const ok = await _saveCycleDayCore(ds)
    if (!ok) return
    justSaved.value = new Set([...justSaved.value, ds])
    setTimeout(() => {
      const next = new Set(justSaved.value)
      next.delete(ds)
      justSaved.value = next
    }, 1500)
    closePanel()
    await loadData()
  } finally {
    saving.value = false
  }
}

async function onAdjacencyExtendPrevSilent(prevCycle, cell) {
  try {
    await fetch(`${API}/period/cycles/${prevCycle.id}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: cell.dateStr })
    })
    await loadData()
    const cellEl = document.querySelector(`[data-date="${cell.dateStr}"]`)
    const x = cellEl ? cellEl.getBoundingClientRect().left + cellEl.getBoundingClientRect().width / 2 : window.innerWidth / 2
    showHintBubble(x, cell.dateStr, 'Period extended', 'green')
  } catch (err) {
    console.error('Failed to extend previous cycle:', err)
  }
}

async function onAdjacencyExtendNextSilent(nextCycle, cell) {
  try {
    await fetch(`${API}/period/cycles/${nextCycle.id}/start`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: cell.dateStr })
    })
    await loadData()
    const cellEl = document.querySelector(`[data-date="${cell.dateStr}"]`)
    const x = cellEl ? cellEl.getBoundingClientRect().left + cellEl.getBoundingClientRect().width / 2 : window.innerWidth / 2
    showHintBubble(x, cell.dateStr, 'Period start moved', 'green')
  } catch (err) {
    console.error('Failed to move next cycle start:', err)
  }
}

async function onAdjacencyExtendPrev() {
  const { prevCycle, pendingCell } = adjacencyDialog.value
  adjacencyDialog.value.working = true
  try {
    await fetch(`${API}/period/cycles/${prevCycle.id}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: pendingCell.dateStr })
    })
    adjacencyDialog.value.show = false
    await loadData()
    const cellEl = document.querySelector(`[data-date="${pendingCell.dateStr}"]`)
    const x = cellEl ? cellEl.getBoundingClientRect().left + cellEl.getBoundingClientRect().width / 2 : window.innerWidth / 2
    showHintBubble(x, pendingCell.dateStr, 'Period extended', 'green')
  } finally {
    adjacencyDialog.value.working = false
  }
}

async function onAdjacencyExtendNext() {
  const { nextCycle, pendingCell } = adjacencyDialog.value
  adjacencyDialog.value.working = true
  try {
    await fetch(`${API}/period/cycles/${nextCycle.id}/start`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: pendingCell.dateStr })
    })
    adjacencyDialog.value.show = false
    await loadData()
    const cellEl = document.querySelector(`[data-date="${pendingCell.dateStr}"]`)
    const x = cellEl ? cellEl.getBoundingClientRect().left + cellEl.getBoundingClientRect().width / 2 : window.innerWidth / 2
    showHintBubble(x, pendingCell.dateStr, 'Period start moved', 'green')
  } finally {
    adjacencyDialog.value.working = false
  }
}

function onAdjacencyNewPeriod() {
  const { pendingCell } = adjacencyDialog.value
  adjacencyDialog.value.show = false
  quickLogDay(pendingCell)
}

async function deleteCycle() {
  const cycle = selectedCycle.value
  if (!cycle) return
  deletingCycle.value = true
  try {
    await fetch(`${API}/period/cycles/${cycle.id}`, { method: 'DELETE' })
    showDeleteCycleDialog.value = false
    closePanel()
    await loadData()
  } finally {
    deletingCycle.value = false
  }
}

// ── Day-by-day logging ───────────────────────────────────────
async function endActivePeriod() {
  const active = relevantActiveCycle.value
  const ds = selectedCell.value?.dateStr
  if (!active || !ds) return
  endingPeriod.value = true
  try {
    await fetch(`${API}/period/cycles/${active.id}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: ds })
    })
    closePanel()
    await loadData()
  } finally {
    endingPeriod.value = false
  }
}

async function fillGapDays(cycleId, fromDate, toDate) {
  const cur = new Date(fromDate + 'T00:00:00')
  cur.setDate(cur.getDate() + 1)
  const end = new Date(toDate + 'T00:00:00')
  while (cur <= end) {
    const dateStr = cur.toISOString().split('T')[0]
    if (!loggedDayMap.value[dateStr]) {
      await fetch(`${API}/period/cycle-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId, date: dateStr, flow_intensity: null, notes: null, symptoms: [] })
      })
    }
    cur.setDate(cur.getDate() + 1)
  }
}

// Core: resolves cycleId, fills gaps if needed, saves the cycle-day record.
// Returns the cycleId on success, null on failure.
async function _saveCycleDayCore(ds) {
  const existing = loggedDayMap.value[ds]
  const ctx = tapContext.value
  let cycleId = existing?.cycle_id ?? null

  if (!cycleId) {
    if (ctx === 'no-cycle') {
      const res = await fetch(`${API}/period/cycles/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: ds, predicted_start_date: summary.value?.nextPeriodDate ?? null })
      })
      const data = await res.json()
      cycleId = data.id
    } else if (ctx === 'large-gap') {
      const active = findRelevantOpenCycle(ds)
      if (active) {
        await fetch(`${API}/period/cycles/${active.id}/end`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ end_date: active.last_logged_day || active.start_date })
        })
      }
      const res = await fetch(`${API}/period/cycles/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: ds, predicted_start_date: summary.value?.nextPeriodDate ?? null })
      })
      const data = await res.json()
      cycleId = data.id
    } else if (ctx === 'consecutive' || ctx === 'small-gap') {
      const active = findRelevantOpenCycle(ds)
      if (!active) return null
      if (ctx === 'small-gap') {
        const fromDate = active.last_logged_day || active.start_date
        const fillEnd = new Date(ds + 'T00:00:00')
        fillEnd.setDate(fillEnd.getDate() - 1)
        await fillGapDays(active.id, fromDate, fillEnd.toISOString().split('T')[0])
      }
      cycleId = active.id
    } else if (ctx === 'closed-cycle' || ctx === 'open-cycle-day') {
      const match = allCycles.value.find(c => {
        const end = c.end_date || c.last_logged_day
        return c.start_date <= ds && (!end || end >= ds)
      })
      if (!match) return null
      cycleId = match.id
    }
  }

  if (!cycleId) return null

  if (existing) {
    await fetch(`${API}/period/cycle-days/${existing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        flow_intensity: form.value.flow_intensity || null,
        notes: form.value.notes || null,
        symptoms: form.value.symptoms
      })
    })
  } else {
    await fetch(`${API}/period/cycle-days`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycle_id: cycleId,
        date: ds,
        flow_intensity: form.value.flow_intensity || null,
        notes: form.value.notes || null,
        symptoms: form.value.symptoms
      })
    })
  }

  return cycleId
}

async function saveAndEndPeriod() {
  if (!selectedCell.value) return
  saving.value = true
  const ds = selectedCell.value.dateStr
  try {
    const cycleId = await _saveCycleDayCore(ds)
    if (!cycleId) return
    await fetch(`${API}/period/cycles/${cycleId}/end`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: ds })
    })
    justSaved.value = new Set([...justSaved.value, ds])
    setTimeout(() => {
      const next = new Set(justSaved.value)
      next.delete(ds)
      justSaved.value = next
    }, 1500)
    closePanel()
    await loadData()
  } finally {
    saving.value = false
  }
}

// ── Data loading ─────────────────────────────────────────────
async function loadData() {
  const [daysRes, summaryRes, cyclesRes] = await Promise.all([
    fetch(`${API}/period/cycle-days/all`),
    fetch(`${API}/period/calculations/summary`),
    fetch(`${API}/period/cycles`)
  ])
  allCycleDays.value = await daysRes.json()
  summary.value = await summaryRes.json()
  allCycles.value = await cyclesRes.json()
}

onMounted(() => {
  loadData()
  document.addEventListener('mouseup', onDocumentMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', onDocumentMouseUp)
  if (hintBubbleTimer) clearTimeout(hintBubbleTimer)
})
</script>

<style scoped>
.period-wrapper {
  padding: 1.25rem;
  max-width: 480px;
  margin: 0 auto;
}

@media (min-width: 769px) {
  .period-wrapper {
    max-width: 540px;
    transform: scale(1.12);
    transform-origin: top center;
  }
}

/* Header */
.period-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #F4C0D1;
  background: #FBEAF0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.period-date { font-size: 12px; color: #888; margin: 0 0 2px; }
.period-title { font-size: 22px; font-weight: 500; margin: 0; color: #72243E; }
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.settings-icon-btn {
  width: 34px; height: 34px; border-radius: 50%;
  border: 1px solid #e0e0e0; background: #f5f5f5;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}

/* Warnings card */
.warnings-card {
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 12px;
  margin-top: 1rem;
  overflow: hidden;
}
.warnings-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}
.warnings-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #b45309;
}
.warnings-list {
  margin: 0;
  padding: 0 12px 10px 12px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.warning-item {
  font-size: 11px;
  color: #92400e;
  line-height: 1.5;
  padding: 6px 8px;
  border-left: 2px solid #fcd34d;
  cursor: pointer;
  border-radius: 0 4px 4px 0;
  transition: background 0.15s;
}
.warning-item:hover {
  background: #fef3c7;
}

/* Calendar cell badges (bottom-right icons) */
.cal-cell-badges {
  position: absolute;
  bottom: 2px;
  right: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-end;
  pointer-events: none;
}
.cal-cell-badge {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  position: relative;
}
.cal-cell-badge .v-icon {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  -webkit-transform: translate(-50%, -50%) !important;
  font-size: 16px !important;
  line-height: 1 !important;
  margin: 0 !important;
  padding: 0 !important;
  width: auto !important;
  height: auto !important;
}
@media (max-width: 600px) {
  .cal-cell-badge {
    width: 13px;
    height: 13px;
  }
  .cal-cell-badge .v-icon {
    font-size: 11px !important;
  }
}
.cal-cell-badge-warn { background: rgba(254, 243, 199, 0.9); }
.cal-cell-badge-note { background: rgba(226, 232, 240, 0.9); }

/* Status card */
.status-card {
  background: #FBEAF0;
  border: 1px solid #F4C0D1;
  border-radius: 14px;
  padding: 12px 14px;
  margin-bottom: 1rem;
}
.status-row { display: flex; align-items: center; }
.status-item { flex: 1; text-align: center; }
.status-divider { width: 1px; height: 32px; background: #F4C0D1; }
.status-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #993556; margin: 0 0 2px; }
.status-value { font-size: 13px; font-weight: 500; color: #72243E; margin: 0; }

/* Month nav */
.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}
.month-label { font-size: 15px; font-weight: 500; color: #72243E; margin: 0; }
.month-btn {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1px solid #F4C0D1; background: #FBEAF0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}

/* Calendar */
.calendar {
  background: #FBEAF0;
  border: 1px solid #F4C0D1;
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 0.75rem;
}
.cal-header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 6px;
}
.cal-dow {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: #993556;
  letter-spacing: 0.04em;
  padding: 4px 0;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.cal-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: default;
  position: relative;
  gap: 2px;
}
.cal-cell-day { cursor: pointer; }
.cal-cell-day:hover { background: #F4C0D1; }
.cal-cell-empty { cursor: default; }
.cal-cell-faded { cursor: default; }
.cal-cell-faded .cal-day-num { color: #D4A8B8; font-size: 13px; line-height: 1; }

.cal-saved-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #D4537E;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  z-index: 10;
  animation: check-pulse 1.2s ease forwards;
}

@keyframes check-pulse {
  0%   { opacity: 0; transform: scale(0.6); }
  20%  { opacity: 1; transform: scale(1.15); }
  40%  { transform: scale(1); }
  75%  { opacity: 1; }
  100% { opacity: 0; transform: scale(1); }
}
@keyframes warning-pulse {
  0%   { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); }
  25%  { box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.9); }
  60%  { box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.5); }
  100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); }
}
.cal-cell-pulse {
  animation: warning-pulse 1.6s ease forwards;
  border-radius: 6px;
  position: relative;
  z-index: 2;
}

.cal-day-num { font-size: 13px; color: #72243E; line-height: 1; }

/* Drag hint */
.drag-hint {
  font-size: 11px;
  color: #c0899b;
  text-align: center;
  margin: -2px 0 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  letter-spacing: 0.02em;
}

/* Future-date speech bubble */
.hint-bubble {
  position: fixed;
  transform: translate(-50%, calc(-100% - 26px));
  background: rgba(94, 28, 52, 0.92);
  color: #FBEAF0;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 11px;
  border-radius: 14px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 9999;
  letter-spacing: 0.01em;
}
.hint-bubble::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(94, 28, 52, 0.92);
  border-bottom: none;
}
.hint-bubble-success {
  background: rgba(21, 128, 61, 0.92);
  color: #dcfce7;
}
.hint-bubble-success::after {
  border-top-color: rgba(21, 128, 61, 0.92);
}

.hint-bubble-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
.hint-bubble-fade-leave-active { transition: opacity 0.2s ease 0.75s; }
.hint-bubble-fade-enter-from { opacity: 0; transform: translate(-50%, calc(-100% - 14px)) scale(0.9); }
.hint-bubble-fade-enter-to   { opacity: 1; transform: translate(-50%, calc(-100% - 26px)) scale(1); }
.hint-bubble-fade-leave-from { opacity: 1; }
.hint-bubble-fade-leave-to   { opacity: 0; }

/* Drag-to-select highlight */
.cal-dragging {
  background: #F9D0DE !important;
  border: 1.5px solid #D4537E !important;
}
.cal-dragging .cal-day-num { color: #993556 !important; }
.cal-cell-faded.cal-dragging .cal-day-num { color: #993556 !important; }
.cal-cell-faded.cal-period,
.cal-cell-faded.cal-fertile,
.cal-cell-faded.cal-predicted,
.cal-cell-faded.cal-ovulation { opacity: 0.5; }

/* Scale up the start/end anchor cells during drag */
.cal-drag-anchor {
  transform: scale(1.22);
  z-index: 2;
  transition: transform 0.12s cubic-bezier(.4,0,.2,1);
}

/* Disable text selection while dragging */
.cal-grid-dragging {
  user-select: none;
  -webkit-user-select: none;
}

/* Month slide transitions */
.cal-grid-wrap {
  position: relative;
  overflow: hidden;
}
.left-enter-active,
.left-leave-active,
.right-enter-active,
.right-leave-active {
  transition: transform 220ms ease, opacity 220ms ease;
}
.left-leave-active,
.right-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
.left-enter-from  { transform: translateX(100%); opacity: 0; }
.left-leave-to    { transform: translateX(-100%); opacity: 0; }
.right-enter-from { transform: translateX(-100%); opacity: 0; }
.right-leave-to   { transform: translateX(100%); opacity: 0; }

/* Period day — continuous band */
.cal-period {
  background: #D4537E;
  border-radius: 0;
  border-top: 1.5px solid #993556;
  border-bottom: 1.5px solid #993556;
}
.cal-period .cal-day-num { color: #fff; font-weight: 600; }
.cal-period:hover { background: #bf3d6a; }
.cal-period-row-start {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
  border-left: 1.5px solid #993556;
}
.cal-period-row-end {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  border-right: 1.5px solid #993556;
}

/* Predicted period — soft pink */
.cal-predicted {
  background: #F9D0DE;
  border: 1.5px dashed #D4537E;
}
.cal-predicted .cal-day-num { color: #993556; }

/* Fertile window — soft teal, dashed to match predicted visual language */
.cal-fertile {
  background: #D4F0E8;
  border: 1.5px dashed #7ED4BC;
}
.cal-fertile .cal-day-num { color: #0F6E56; }

/* Ovulation */
.cal-ovulation {
  background: #FFE4B5;
  border: 1.5px solid #FAC775;
}
.cal-ovulation .cal-day-num { color: #854F0B; font-weight: 600; }

/* Today ring */
.cal-today:not(.cal-period):not(.cal-predicted):not(.cal-fertile):not(.cal-ovulation) {
  border: 2px solid #D4537E;
}
.cal-today .cal-day-num { font-weight: 700; }

/* Dots */
.cal-dot {
  width: 4px; height: 4px;
  border-radius: 50%;
  display: block;
}
.dot-period { background: #fff; }
.dot-predicted { background: #D4537E; }
.dot-fertile { background: #0F6E56; }
.dot-ovulation { background: #854F0B; }

/* Legend */
.legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 1rem;
  padding: 0 2px;
}
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-dot {
  width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0;
}
.period-dot { background: #D4537E; }
.predicted-dot { background: #F9D0DE; border: 1.5px dashed #D4537E; }
.fertile-dot { background: #D4F0E8; border: 1px solid #7ED4BC; }
.ovulation-dot { background: #FFE4B5; border: 1.5px solid #FAC775; }
.legend-text { font-size: 10px; color: #993556; font-weight: 500; }


/* Bottom nav */
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: white; border-top: 1px solid #f0f0f0;
  display: flex; justify-content: space-around;
  padding: 10px 0 16px; z-index: 50;
}
.nav-item { text-align: center; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.nav-label { font-size: 10px; color: #bbb; }
.active-label { color: #D4537E; font-weight: 500; }

/* Backdrop */
.sheet-backdrop {
  position: fixed; inset: 0;
  background: rgba(114,36,62,0.18);
  z-index: 100;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s;
}
.sheet-backdrop.visible { opacity: 1; pointer-events: all; }

/* Day sheet */
.day-sheet {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-radius: 20px 20px 0 0;
  z-index: 101;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(.4,0,.2,1);
  max-height: 85vh;
  overflow-y: auto;
}
.day-sheet.open { transform: translateY(0); }
.sheet-inner { padding: 0 1.25rem 2rem; }
.sheet-handle {
  width: 36px; height: 4px;
  background: #F4C0D1; border-radius: 2px;
  margin: 12px auto 16px;
}
.sheet-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 1.25rem;
}
.sheet-date-label { font-size: 15px; font-weight: 500; color: #72243E; margin: 0 0 2px; }
.sheet-day-type { font-size: 11px; color: #993556; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.sheet-close {
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid #F4C0D1; background: #FBEAF0;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}

/* View content */
.view-content { display: flex; flex-direction: column; gap: 1rem; }
.view-section {}
.view-section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #993556; margin: 0 0 6px; }
.view-notes { font-size: 13px; color: #72243E; background: #FBEAF0; border-radius: 10px; padding: 10px 12px; margin: 0; }
.view-empty { text-align: center; padding: 2rem 0; color: #bbb; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.view-empty p { font-size: 13px; margin: 0; }
.view-empty-hint { font-size: 11px !important; color: #c0899b !important; }
.view-ovulation-label { font-size: 13px; color: #72243E; margin: 0; }

.ovulation-btn {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #993556;
  background: #FBEAF0; border: 1px solid #F4C0D1;
  border-radius: 20px; padding: 6px 16px;
  cursor: pointer; margin-top: 4px;
}
.ovulation-btn:disabled { opacity: 0.6; cursor: default; }

.irregular-card {
  display: flex; align-items: center; gap: 8px;
  background: #FDF2F5; border: 1px solid #F4C0D1;
  border-radius: 12px; padding: 10px 12px;
  margin-top: 1rem;
}
.irregular-text { font-size: 12px; color: #72243E; line-height: 1.4; }

.log-prompt-btn {
  font-size: 12px; color: #D4537E; background: #FBEAF0;
  border: 1px solid #F4C0D1; border-radius: 20px;
  padding: 6px 14px; cursor: pointer;
}
.view-actions { display: flex; gap: 8px; align-items: center; }
.edit-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #993556;
  background: #FBEAF0; border: 1px solid #F4C0D1;
  border-radius: 20px; padding: 6px 14px;
  cursor: pointer;
}
.cycle-action-row { margin-top: 6px; }
.delete-cycle-btn {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: #c0392b;
  background: transparent; border: none;
  padding: 4px 0; cursor: pointer; opacity: 0.75;
  letter-spacing: 0.01em;
}
.delete-cycle-btn:hover { opacity: 1; }
.delete-cycle-btn-solo { margin-top: 4px; }

/* Confirm modal */
.confirm-backdrop {
  position: fixed; inset: 0;
  background: rgba(114,36,62,0.25);
  z-index: 200;
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s;
}
.confirm-backdrop.visible { opacity: 1; pointer-events: all; }

.confirm-modal {
  position: fixed;
  inset: 0;
  z-index: 201;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: 1.5rem;
}
.confirm-modal.open { pointer-events: all; }

.confirm-inner {
  background: #fff;
  border-radius: 20px;
  padding: 2rem 1.5rem 1.5rem;
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 8px 40px rgba(114,36,62,0.18);
  transform: scale(0.92);
  opacity: 0;
  transition: transform 0.22s cubic-bezier(.4,0,.2,1), opacity 0.22s;
}
.confirm-modal.open .confirm-inner {
  transform: scale(1);
  opacity: 1;
}

.confirm-icon {
  width: 52px; height: 52px;
  background: #fff0ee;
  border: 1px solid #f5c6c0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 0.25rem;
}
.confirm-title {
  font-size: 16px; font-weight: 600; color: #72243E;
  margin: 0; text-align: center;
}
.confirm-desc {
  font-size: 13px; color: #a0667a;
  margin: 0; text-align: center; line-height: 1.5;
}
.confirm-actions {
  display: flex; gap: 8px; margin-top: 0.75rem; width: 100%;
}
.confirm-cancel {
  flex: 1; padding: 10px;
  border-radius: 20px; border: 1px solid #F4C0D1;
  background: #fff; font-size: 13px; color: #993556;
  cursor: pointer; font-weight: 500;
}
.confirm-delete {
  flex: 1; padding: 10px;
  border-radius: 20px; border: none;
  background: #c0392b; font-size: 13px; color: #fff;
  cursor: pointer; font-weight: 500;
}
.confirm-delete:disabled { opacity: 0.6; cursor: default; }
.confirm-save {
  flex: 1; padding: 10px;
  border-radius: 20px; border: none;
  background: #D4537E; font-size: 13px; color: #fff;
  cursor: pointer; font-weight: 500;
}
.confirm-save:disabled { opacity: 0.6; cursor: default; }

/* Adjacency dialog action buttons */
.adj-actions {
  display: flex; flex-direction: column; gap: 8px;
  margin-top: 0.75rem; width: 100%;
}
.adj-btn {
  width: 100%; padding: 11px 14px;
  border-radius: 20px; font-size: 13px; font-weight: 500;
  cursor: pointer; text-align: left; display: flex; align-items: center;
  transition: opacity 0.15s;
}
.adj-btn:disabled { opacity: 0.6; cursor: default; }
.adj-btn-extend {
  background: #FBE8EF; border: 1px solid #F4C0D1; color: #72243E;
}
.adj-btn-new {
  background: #fff; border: 1px solid #e8e0e4; color: #9b7a89;
  justify-content: center; font-size: 12px;
}

/* Flow chips */
.flow-chips { display: flex; gap: 6px; }
.flow-chip {
  padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  background: #F4C0D1; color: #993556;
  border: none; text-transform: capitalize;
}
.flow-chip-btn { cursor: pointer; transition: background 0.15s; }
.flow-chip-active { background: #D4537E; color: #fff; }

/* Symptom chips */
.symptom-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.symptom-chip {
  padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 500;
  background: #FBEAF0; color: #993556;
  border: 1px solid #F4C0D1;
}
.symptom-chip-btn { cursor: pointer; transition: background 0.15s; border: none; }
.symptom-chip-active { background: #D4537E; color: #fff; border-color: #D4537E; }

/* Log form */
.log-form { display: flex; flex-direction: column; gap: 1.1rem; }
.form-section {}
.form-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #993556; margin: 0 0 8px; }
.notes-input {
  width: 100%; border: 1px solid #F4C0D1; border-radius: 12px;
  background: #FBEAF0; padding: 10px 12px;
  font-size: 13px; color: #72243E; resize: none;
  outline: none; font-family: inherit; box-sizing: border-box;
}
.notes-input::placeholder { color: #cca7b8; }
.notes-input:focus { border-color: #D4537E; }

/* Form actions */
.form-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.btn-cancel {
  padding: 8px 18px; border-radius: 20px;
  border: 1px solid #F4C0D1; background: #fff;
  font-size: 13px; color: #993556; cursor: pointer;
}
.btn-save {
  padding: 8px 22px; border-radius: 20px;
  border: none; background: #D4537E;
  font-size: 13px; font-weight: 500; color: #fff; cursor: pointer;
}
.btn-save:disabled { opacity: 0.6; cursor: default; }

/* True period start — darker accent, always left-capped regardless of row position */
.cal-period-start {
  background: #b83464;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
  border-left: 1.5px solid #993556;
}
.cal-period-start:hover { background: #a02d58; }

/* True period end — darker accent, always right-capped regardless of row position */
.cal-period-end {
  background: #b83464;
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  border-right: 1.5px solid #993556;
}
.cal-period-end:hover { background: #a02d58; }

/* Active/open period last day — dashed right edge with pulsing dot */
.cal-period-open {
  border-right: 2px dashed rgba(255, 255, 255, 0.55) !important;
}
.cal-period-open::after {
  content: '';
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
  animation: period-open-pulse 1.6s ease-in-out infinite;
  z-index: 3;
  pointer-events: none;
}

@keyframes period-open-pulse {
  0%, 100% { opacity: 0.4; transform: translateY(-50%) scale(0.8); }
  50% { opacity: 1; transform: translateY(-50%) scale(1.25); }
}

/* Day-by-day action buttons */
.end-period-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #993556;
  background: #FBEAF0; border: 1px solid #F4C0D1;
  border-radius: 20px; padding: 6px 14px;
  cursor: pointer; margin-top: 4px;
}
.end-period-btn:disabled { opacity: 0.6; cursor: default; }
.form-end-period-row {
  margin-top: 8px;
  display: flex;
  justify-content: center;
}
.form-delete-cycle-row {
  margin-top: 6px;
  display: flex;
  justify-content: center;
}
.gap-fill-notice {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #D4537E;
  background: #FBEAF0; border: 1px solid #F4C0D1;
  border-radius: 8px; padding: 8px 12px;
  margin-bottom: 12px;
}
</style>
