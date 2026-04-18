<template>
  <Teleport to="body">
    <Transition name="tutorial-fade">
      <div v-if="visible" class="tutorial-backdrop">
        <div class="tutorial-card">

          <!-- Close button -->
          <button class="btn-close-x" @click="quickClose" aria-label="Close">
            <v-icon size="18" color="#c0899b">mdi-close</v-icon>
          </button>

          <!-- Slide dots -->
          <div class="tutorial-dots">
            <span v-for="i in 3" :key="i" class="dot" :class="{ active: slide === i }" />
          </div>

          <!-- Slide content -->
          <Transition name="slide-fx" mode="out-in">
            <div :key="slide" class="slide-content">

              <!-- Slide 1: drag to log -->
              <template v-if="slide === 1">
                <div class="anim-area">
                  <div class="cal-wrap">
                    <div class="mini-cal">
                      <div
                        v-for="i in 7" :key="i"
                        class="mc-cell"
                        :class="{
                          'drag-filled': dragFilled.has(i),
                          'drag-anchor': dragAnchorFirst === i || dragAnchorLast === i
                        }"
                      >
                        <span class="mc-num">{{ i }}</span>
                      </div>
                    </div>
                    <!-- Finger pointer -->
                    <div
                      class="finger-wrap"
                      :class="{ 'finger-wrap--dragging': pointerDragging }"
                      :style="{ left: pointerX + 'px', top: pointerY + 'px', opacity: pointerVisible ? 1 : 0 }"
                    >
                      <div class="finger-dot" :class="{ pressing: pointerPressing }" />
                    </div>
                  </div>
                </div>
                <p class="slide-title">Log a past period</p>
                <p class="slide-body">
                  Drag across the calendar to mark the days of a completed period.
                </p>
              </template>

              <!-- Slide 2: adjust cycle — two-row grid, extend both ends -->
              <template v-else-if="slide === 2">
                <div class="anim-area">
                  <div class="cal-wrap">
                    <div class="mini-cal mini-cal--grid">
                      <div
                        v-for="i in 14" :key="i"
                        class="mc-cell"
                        :class="getAdjCellClass(i)"
                      >
                        <span class="mc-num">{{ ((i - 1) % 7) + 1 }}</span>
                      </div>
                    </div>
                    <!-- Finger pointer -->
                    <div
                      class="finger-wrap"
                      :class="{ 'finger-wrap--slow': pointerSlow }"
                      :style="{ left: pointerX + 'px', top: pointerY + 'px', opacity: pointerVisible ? 1 : 0 }"
                    >
                      <div class="finger-dot" :class="{ pressing: pointerPressing }" />
                      <div v-if="pointerHolding" class="hold-ring" />
                    </div>
                  </div>
                </div>
                <p class="slide-title">Adjust a cycle</p>
                <p class="slide-body">
                  Hold any period day to enter adjust mode, then drag either edge handle to extend or shrink the cycle.
                </p>
              </template>

              <!-- Slide 3: symptoms -->
              <template v-else>
                <div class="anim-area">
                  <div class="symptom-demo">
                    <div class="demo-day" :class="{ pulse: dayPulse }">
                      <span class="demo-day-num">14</span>
                    </div>
                    <TransitionGroup name="chip-in" tag="div" class="demo-chips">
                      <span v-for="chip in visibleChips" :key="chip" class="demo-chip">{{ chip }}</span>
                    </TransitionGroup>
                  </div>
                </div>
                <p class="slide-title">Make predictions smarter</p>
                <p class="slide-body">
                  Tap any logged day to record symptoms, flow, and notes.
                  The more you track, the more accurate your predictions become.
                </p>
              </template>

            </div>
          </Transition>

          <!-- Actions -->
          <div class="tutorial-actions">
            <button v-if="slide < 3" class="btn-skip" @click="dismiss">Skip</button>
            <button class="btn-next" @click="next">
              {{ slide < 3 ? 'Next' : 'Got it' }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({ forceOpen: { type: Boolean, default: false } })
const emit  = defineEmits(['close'])

const STORAGE_KEY = 'wifey_onboarding_done'

const visible = ref(!localStorage.getItem(STORAGE_KEY))
const slide   = ref(1)

// Calendar animation state
const dragFilled      = ref(new Set())
const dragAnchorFirst = ref(null)
const dragAnchorLast  = ref(null)
const tapFilled       = ref(new Set())  // kept for resetState compat
const adjustHandles   = ref(new Set())

// Adjust cycle state (slide 2)
const adjCycleStart = ref(0)
const adjCycleEnd   = ref(0)

// Pointer state
const pointerX        = ref(0)
const pointerY        = ref(0)
const pointerVisible  = ref(false)
const pointerPressing = ref(false)
const pointerDragging = ref(false)
const pointerTapping  = ref(false)
const pointerSlow     = ref(false)
const pointerHolding  = ref(false)

// Symptom animation state
const dayPulse     = ref(false)
const visibleChips = ref([])

const timers = []
const s = (fn, ms) => timers.push(setTimeout(fn, ms))

function clearTimers() {
  timers.forEach(clearTimeout)
  timers.length = 0
}

// ── Cell geometry ─────────────────────────────────────────────────
// Mirrors the CSS clamp() formula so JS positions always match rendered cells.
// card = min(90vw, 480px), inner = card - 92px, 7 cells + 6 gaps of 6px
function getCS() {
  const cardWidth = Math.min(window.innerWidth * 0.9, 480)
  return Math.min(52, Math.max(24, (cardWidth - 92) / 7))
}

// Slide 1: cell i (1–7) x-center
function cx(i) {
  const cs = getCS()
  return (i - 1) * (cs + 6) + cs / 2
}

// Slide 1: single-row pointer y (cell center minus dot half-height)
function slide1Cy() {
  return getCS() / 2 - 10
}

// Slide 2: cell i (1–14) x-center — column wraps every 7
function cxAdj(i) {
  const cs = getCS()
  return ((i - 1) % 7) * (cs + 6) + cs / 2
}

// Slide 2: cell i (1–14) pointer y
function cyAdj(i) {
  const cs = getCS()
  const row = Math.floor((i - 1) / 7)
  return row * (cs + 6) + cs / 2 - 10
}

// Compute CSS classes for each cell in slide 2's two-row mini calendar
function getAdjCellClass(i) {
  const classes = []
  const start = adjCycleStart.value
  const end   = adjCycleEnd.value
  if (i < start || i > end) return classes

  const col = ((i - 1) % 7) + 1   // 1–7
  classes.push('band-filled')
  if (i === start || col === 1) classes.push('band-left')
  if (i === end   || col === 7) classes.push('band-right')
  if (adjustHandles.value.has(i)) classes.push('adjust-handle')
  return classes
}

// ── Slide 1: drag to log ─────────────────────────────────────────
function startDrag() {
  function loop() {
    dragFilled.value      = new Set()
    dragAnchorFirst.value = null
    dragAnchorLast.value  = null
    pointerVisible.value  = false
    pointerPressing.value = false
    pointerDragging.value = false
    pointerX.value        = cx(2)
    pointerY.value        = slide1Cy()

    // Appear and press at cell 2 — hold for ~500ms so the gesture reads clearly
    s(() => { pointerVisible.value = true }, 500)
    s(() => {
      pointerPressing.value = true
      dragFilled.value      = new Set([2])
      dragAnchorFirst.value = 2
      dragAnchorLast.value  = 2
    }, 700)

    // Asymmetric sweep: slow ramp-up covers 75% of distance, then decelerates into cell 6
    // cubic-bezier(0.9, 0, 0.8, 1) — peak velocity at y≈0.75 (analytically derived)
    // Sweep duration: 1600ms (1200→2800ms). Cell x-fractions from bezier curve:
    //   cell 3 → 0.602 → 1200+963 = 2163ms
    //   cell 4 → 0.762 → 1200+1219 = 2419ms
    //   cell 5 → 0.857 → 1200+1371 = 2571ms
    //   cell 6 → 1.000 → 1200+1600 = 2800ms
    s(() => { pointerDragging.value = true; pointerX.value = cx(6) }, 1200)
    s(() => { dragFilled.value = new Set([2, 3]);           dragAnchorLast.value = 3 }, 2163)
    s(() => { dragFilled.value = new Set([2, 3, 4]);        dragAnchorLast.value = 4 }, 2419)
    s(() => { dragFilled.value = new Set([2, 3, 4, 5]);     dragAnchorLast.value = 5 }, 2571)
    s(() => { dragFilled.value = new Set([2, 3, 4, 5, 6]);  dragAnchorLast.value = 6 }, 2800)

    // Lift finger after pointer has settled at cx(6)
    s(() => { pointerPressing.value = false; pointerDragging.value = false }, 2950)
    s(() => { pointerVisible.value = false }, 3150)

    // Pause, then clear and loop
    s(() => { dragFilled.value = new Set(); dragAnchorFirst.value = null; dragAnchorLast.value = null }, 4200)
    s(loop, 4800)
  }
  loop()
}

// ── Slide 2: adjust cycle — hold to enter mode, then drag handle ─
function startAdjust() {
  function loop() {
    // Cycle pre-fills cells 3–10 (row 1: days 3–7, row 2: days 8–10)
    adjCycleStart.value   = 3
    adjCycleEnd.value     = 10
    adjustHandles.value   = new Set()
    pointerVisible.value  = false
    pointerPressing.value = false
    pointerSlow.value     = false
    pointerHolding.value  = false
    pointerX.value        = cxAdj(6)   // interior period cell — hold target
    pointerY.value        = cyAdj(6)

    // ── Phase A: hold an interior cell → adjust mode activates ───
    // Finger lands on a middle period cell, holds 800ms, then mode fires:
    // handles appear on both caps and finger lifts — mode is now active.
    s(() => { pointerVisible.value = true },                                        400)
    s(() => { pointerPressing.value = true; pointerHolding.value = true },          650)
    s(() => {
      pointerHolding.value  = false
      pointerPressing.value = false
      adjustHandles.value   = new Set([3, 10])   // mode activates
    },                                                                             1450)
    s(() => { pointerVisible.value = false },                                      1650)

    // Jump to end handle while invisible; transition finishes before re-show
    s(() => { pointerX.value = cxAdj(10); pointerY.value = cyAdj(10) },           2000)

    // ── Phase B: drag end handle cell 10 → 12 ───────────────────
    // A separate gesture now: press the handle, drag 2 cells, release.
    s(() => { pointerVisible.value = true },                                        2400)
    s(() => { pointerPressing.value = true },                                       2650)
    s(() => { pointerSlow.value = true; pointerX.value = cxAdj(12) },              2900)
    s(() => { adjCycleEnd.value = 11; adjustHandles.value = new Set([3, 11]) },    3550)
    s(() => { adjCycleEnd.value = 12; adjustHandles.value = new Set([3, 12]) },    4200)
    s(() => { pointerPressing.value = false; pointerSlow.value = false },           4450)
    s(() => { pointerVisible.value = false; adjustHandles.value = new Set() },      4650)

    // Show extended cycle briefly, then reset and loop
    s(() => { adjCycleStart.value = 3; adjCycleEnd.value = 10 },                   5500)
    s(loop,                                                                          6000)
  }
  loop()
}

// ── Slide 3: symptom logging ─────────────────────────────────────
function startSymptom() {
  const chips = ['Cramps', 'Fatigue', 'Mood swings']
  function loop() {
    dayPulse.value     = false
    visibleChips.value = []
    s(() => { dayPulse.value = true },                      700)
    s(() => { dayPulse.value = false },                     1100)
    s(() => { visibleChips.value = [chips[0]] },            1400)
    s(() => { visibleChips.value = chips.slice(0, 2) },     2400)
    s(() => { visibleChips.value = [...chips] },             3400)
    s(() => { visibleChips.value = [] },                    5800)
    s(loop,                                                  6400)
  }
  loop()
}

function resetState() {
  dragFilled.value      = new Set()
  dragAnchorFirst.value = null
  dragAnchorLast.value  = null
  tapFilled.value       = new Set()
  adjustHandles.value   = new Set()
  adjCycleStart.value   = 0
  adjCycleEnd.value     = 0
  pointerX.value        = 0
  pointerY.value        = 0
  pointerVisible.value  = false
  pointerPressing.value = false
  pointerDragging.value = false
  pointerTapping.value  = false
  pointerSlow.value     = false
  pointerHolding.value  = false
  dayPulse.value        = false
  visibleChips.value    = []
}

function startSlideAnim() {
  clearTimers()
  resetState()
  if (slide.value === 1)      startDrag()
  else if (slide.value === 2) startAdjust()
  else                        startSymptom()
}

watch(slide, startSlideAnim)
onMounted(() => { if (visible.value) startSlideAnim() })
onUnmounted(clearTimers)

watch(() => props.forceOpen, (val) => {
  if (val) {
    visible.value = true
    slide.value = 1
    startSlideAnim()
  }
})

// ── Navigation ───────────────────────────────────────────────────
function next() {
  if (slide.value < 3) slide.value++
  else dismiss()
}

function dismiss() {
  visible.value = false
  localStorage.setItem(STORAGE_KEY, '1')
  clearTimers()
  emit('close')
}

// Quick close — user accidentally opened it, no localStorage side-effect
function quickClose() {
  visible.value = false
  clearTimers()
  emit('close')
}
</script>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────── */
.tutorial-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(30, 8, 16, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}

.tutorial-fade-enter-active,
.tutorial-fade-leave-active { transition: opacity 0.35s ease; }
.tutorial-fade-enter-from,
.tutorial-fade-leave-to     { opacity: 0; }

/* ── Card ─────────────────────────────────────────────────────── */
.tutorial-card {
  position: relative;
  background: #fff;
  border-radius: 26px;
  width: 100%;
  max-width: min(90vw, 480px);
  padding: clamp(30px, 5vh, 52px) clamp(24px, 6vw, 36px) clamp(24px, 4vh, 40px);
  box-shadow: 0 12px 44px rgba(180, 40, 80, 0.22);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(20px, 3vh, 34px);
}

.btn-close-x {
  position: absolute;
  top: 14px;
  right: 16px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-close-x:hover { background: #f5e8ed; }

/* ── Dots ─────────────────────────────────────────────────────── */
.tutorial-dots {
  display: flex;
  gap: 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f0d0dc;
  transition: background 0.25s, transform 0.25s;
}
.dot.active {
  background: #D4537E;
  transform: scale(1.3);
}

/* ── Slide transition ─────────────────────────────────────────── */
.slide-fx-enter-active { transition: all 0.28s ease; }
.slide-fx-leave-active { transition: all 0.22s ease; }
.slide-fx-enter-from   { opacity: 0; transform: translateX(22px); }
.slide-fx-leave-to     { opacity: 0; transform: translateX(-22px); }

/* ── Slide content ────────────────────────────────────────────── */
.slide-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
}

/* ── Animation area ───────────────────────────────────────────── */
.anim-area {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  height: clamp(120px, 22vh, 220px);
  padding-top: 10px;
}

/* ── Calendar wrapper (positions the pointer absolutely inside) ── */
.cal-wrap {
  position: relative;
}

/* ── Mini calendar ────────────────────────────────────────────── */
.mini-cal {
  display: flex;
  gap: 6px;
  /* --cell defined here so grid container and cells share the same value */
  --cell: clamp(24px, calc((min(90vw, 480px) - 92px) / 7), 52px);
}

/* Two-row grid layout for slide 2 */
.mini-cal--grid {
  display: grid;
  grid-template-columns: repeat(7, var(--cell));
  gap: 6px;
}

.mc-cell {
  width: var(--cell);
  height: var(--cell);
  border-radius: clamp(6px, calc(var(--cell) * 0.22), 12px);
  border: 1.5px solid #e8c8d4;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.22s ease, border-color 0.22s ease;
}

.mc-num {
  font-size: clamp(9px, calc((min(90vw, 480px) - 92px) / 7 * 0.33), 17px);
  color: #c0899b;
  line-height: 1;
  user-select: none;
  transition: color 0.22s ease;
}

/* ── Slide 1 fill styles ──────────────────────────────────────── */
.mc-cell.drag-filled {
  background: #F9D0DE;
  border-color: #D4537E;
}
.mc-cell.drag-filled .mc-num { color: #993556; }

.mc-cell.drag-anchor {
  transform: scale(1.22);
  z-index: 2;
  transition: transform 0.12s cubic-bezier(.4, 0, .2, 1);
}

/* ── Slide 2 band styles ──────────────────────────────────────── */
@keyframes band-pop {
  0%   { transform: scale(0.82); }
  60%  { transform: scale(1.10); }
  100% { transform: scale(1); }
}

.mc-cell.band-filled {
  background: #F5A0BC;
  border-color: #D4537E;
  border-radius: 0;
  animation: band-pop 0.22s ease-out;
}
.mc-cell.band-filled .mc-num { color: #993556; }

/* Left cap: cycle start OR first cell of a new row */
.mc-cell.band-left {
  border-top-left-radius: clamp(6px, calc(var(--cell) * 0.22), 12px);
  border-bottom-left-radius: clamp(6px, calc(var(--cell) * 0.22), 12px);
}

/* Right cap: cycle end OR last cell of a row */
.mc-cell.band-right {
  border-top-right-radius: clamp(6px, calc(var(--cell) * 0.22), 12px);
  border-bottom-right-radius: clamp(6px, calc(var(--cell) * 0.22), 12px);
}

/* Handle outline — pulses to signal drag targets */
@keyframes handle-pulse {
  0%, 100% { outline-color: #993556; outline-offset: 2px; }
  50%       { outline-color: #D4537E; outline-offset: 4px; }
}
.mc-cell.adjust-handle {
  outline: 2.5px solid #993556;
  outline-offset: 2px;
  animation: handle-pulse 1s ease-in-out infinite;
}

/* ── Finger pointer ───────────────────────────────────────────── */

/* Outer wrapper: top + left driven by :style binding */
.finger-wrap {
  position: absolute;
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 3;
  /* Default: fast hop between cells */
  transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.30s ease;
}

/* Slide 1 sweep — asymmetric curve: slow ramp-up, peak velocity ~75%, then decelerate */
.finger-wrap--dragging {
  transition: left 1.6s cubic-bezier(0.9, 0, 0.8, 1), opacity 0.30s ease;
}

/* Slide 2 drag — slow deliberate glide across 2 cells */
.finger-wrap--slow {
  transition: left 1.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
}

/* The visible dot */
.finger-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(212, 83, 126, 0.82);
  border: 2px solid #D4537E;
  box-shadow: 0 2px 12px rgba(212, 83, 126, 0.50);
  transition: transform 0.28s ease;
}

/* Pressed state: scales down while dragging */
.finger-dot.pressing {
  transform: scale(0.78);
}

/* Hold ripple ring — expands outward to signal a long-press */
@keyframes hold-expand {
  0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
  70%  { opacity: 0.6; }
  100% { transform: translate(-50%, -50%) scale(3.2); opacity: 0; }
}
.hold-ring {
  position: absolute;
  top: 10px;
  left: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2.5px solid #D4537E;
  animation: hold-expand 0.72s ease-out forwards;
  pointer-events: none;
}

/* Tap animation: quick press-and-release */
@keyframes tap-down {
  0%   { transform: scale(1); }
  38%  { transform: scale(0.66); }
  100% { transform: scale(1); }
}
.finger-dot.tapping {
  animation: tap-down 0.38s ease-out;
}

/* ── Symptom demo (slide 3) ───────────────────────────────────── */
.symptom-demo {
  display: flex;
  align-items: center;
  gap: 14px;
}

@keyframes day-pulse {
  0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(212, 83, 126, 0.4); }
  40%  { transform: scale(1.24); box-shadow: 0 0 0 9px rgba(212, 83, 126, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(212, 83, 126, 0); }
}

.demo-day {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  background: #F5A0BC;
  border: 1.5px solid #D4537E;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.demo-day.pulse {
  animation: day-pulse 0.45s ease-out;
}
.demo-day-num {
  font-size: 18px;
  color: #993556;
  font-weight: 600;
  user-select: none;
}

.demo-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 200px;
}
.demo-chip {
  font-size: 12px;
  background: #FBEAF0;
  color: #993556;
  border: 1px solid #f0c0d0;
  border-radius: 20px;
  padding: 4px 11px;
  white-space: nowrap;
}

.chip-in-enter-active { transition: all 0.28s ease; }
.chip-in-enter-from   { opacity: 0; transform: scale(0.7) translateY(5px); }

/* ── Text ─────────────────────────────────────────────────────── */
.slide-title {
  font-size: 20px;
  font-weight: 700;
  color: #72243E;
  margin: 0;
  text-align: center;
}
.slide-body {
  font-size: 14.5px;
  color: #a06070;
  margin: 0;
  text-align: center;
  line-height: 1.65;
}

/* ── Actions ──────────────────────────────────────────────────── */
.tutorial-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
  margin-top: 2px;
}
.btn-skip {
  font-size: 14px;
  color: #c0899b;
  background: none;
  border: none;
  cursor: pointer;
  padding: 9px 6px;
}
.btn-next {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: #D4537E;
  border: none;
  border-radius: 22px;
  padding: 10px 28px;
  cursor: pointer;
  transition: background 0.18s;
}
.btn-next:active { background: #b83d68; }
</style>
