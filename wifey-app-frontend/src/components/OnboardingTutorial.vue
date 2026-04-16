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
                          'drag-anchor-first': dragAnchorFirst === i,
                          'drag-anchor-last': dragAnchorLast === i
                        }"
                      >
                        <span class="mc-num">{{ i }}</span>
                      </div>
                    </div>
                    <!-- Finger pointer -->
                    <div
                      class="finger-wrap"
                      :class="{ 'finger-wrap--dragging': pointerDragging }"
                      :style="{ left: pointerX + 'px', opacity: pointerVisible ? 1 : 0 }"
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

              <!-- Slide 2: tap days + bookend -->
              <template v-else-if="slide === 2">
                <div class="anim-area">
                  <div class="cal-wrap">
                    <div class="mini-cal">
                      <div
                        v-for="i in 7" :key="i"
                        class="mc-cell"
                        :class="{
                          'tap-filled': tapFilled.has(i),
                          'gap-filled': gapFilled.has(i)
                        }"
                      >
                        <span class="mc-num">{{ i }}</span>
                      </div>
                    </div>
                    <!-- Finger pointer -->
                    <div
                      class="finger-wrap"
                      :class="{ 'finger-wrap--slow': pointerSlow }"
                      :style="{ left: pointerX + 'px', opacity: pointerVisible ? 1 : 0 }"
                    >
                      <div class="finger-dot" :class="{ tapping: pointerTapping }" />
                    </div>
                  </div>
                </div>
                <p class="slide-title">Track as it happens</p>
                <p class="slide-body">
                  Tap each day as your period goes on, then set an end date —
                  missed days fill in automatically.
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
const tapFilled  = ref(new Set())
const gapFilled  = ref(new Set())

// Pointer state
const pointerX        = ref(0)
const pointerVisible  = ref(false)
const pointerPressing = ref(false)
const pointerDragging = ref(false)
const pointerTapping  = ref(false)
const pointerSlow     = ref(false)

// Symptom animation state
const dayPulse     = ref(false)
const visibleChips = ref([])

const timers = []
const s = (fn, ms) => timers.push(setTimeout(fn, ms))

function clearTimers() {
  timers.forEach(clearTimeout)
  timers.length = 0
}

// Cell center x-positions — mirrors the CSS clamp() formula so JS always matches rendered size
// card = min(90vw, 480px), card inner = card - 56px, 7 cells + 6 gaps of 6px
function cx(i) {
  const cardWidth = Math.min(window.innerWidth * 0.9, 480)
  const cellSize  = Math.min(52, Math.max(24, (cardWidth - 92) / 7))
  return (i - 1) * (cellSize + 6) + cellSize / 2
}

// ── Drag animation ───────────────────────────────────────────────
function startDrag() {
  function loop() {
    dragFilled.value      = new Set()
    dragAnchorFirst.value = null
    dragAnchorLast.value  = null
    pointerVisible.value  = false
    pointerPressing.value = false
    pointerDragging.value = false
    pointerX.value        = cx(2)

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

// ── Tap + bookend animation ──────────────────────────────────────
function startTap() {
  // Moves pointer to a cell (fast hop) and triggers tap animation
  function tapCell(cellIdx, arrivalDelay, onFill) {
    s(() => { pointerX.value = cx(cellIdx); pointerVisible.value = true }, arrivalDelay)
    s(() => { pointerTapping.value = true },                               arrivalDelay + 180)
    s(() => { pointerTapping.value = false; onFill() },                    arrivalDelay + 420)
  }

  function loop() {
    tapFilled.value       = new Set()
    gapFilled.value       = new Set()
    pointerVisible.value  = false
    pointerTapping.value  = false
    pointerSlow.value     = false

    tapCell(1,  500,  () => { tapFilled.value = new Set([1]) })
    tapCell(2, 1300,  () => { tapFilled.value = new Set([1, 2]) })
    tapCell(3, 2100,  () => { tapFilled.value = new Set([1, 2, 3]) })

    // Switch to slow transition and glide to cell 6 (end date — skipping 4 & 5)
    s(() => { pointerSlow.value = true; pointerX.value = cx(6) }, 2900)
    // Tap after the slow 0.60s glide arrives (~2900 + 600 = 3500ms)
    s(() => { pointerTapping.value = true },                       3600)
    s(() => { pointerTapping.value = false; tapFilled.value = new Set([1, 2, 3, 6]) }, 3840)
    s(() => { pointerSlow.value = false },                         3900)

    // Pointer lifts, gap fill appears automatically
    s(() => { pointerVisible.value = false },           4400)
    s(() => { gapFilled.value = new Set([4, 5]) },      4700)

    // Reset and loop
    s(() => { tapFilled.value = new Set(); gapFilled.value = new Set() }, 6600)
    s(loop,                                                                7200)
  }
  loop()
}

// ── Symptom animation ────────────────────────────────────────────
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
  gapFilled.value       = new Set()
  pointerVisible.value  = false
  pointerPressing.value = false
  pointerDragging.value = false
  pointerTapping.value  = false
  pointerSlow.value     = false
  dayPulse.value        = false
  visibleChips.value    = []
}

function startSlideAnim() {
  clearTimers()
  resetState()
  if (slide.value === 1)      startDrag()
  else if (slide.value === 2) startTap()
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
  height: clamp(100px, 20vh, 200px);
  padding-top: 10px;
}

/* ── Calendar wrapper (positions the pointer inside) ─────────── */
.cal-wrap {
  position: relative;
}

/* ── Mini calendar ────────────────────────────────────────────── */
.mini-cal {
  display: flex;
  gap: 6px;
}

.mc-cell {
  /* mirrors JS cx(): card = min(90vw,480px), inner = card-56px, 7 cells + 6 gaps of 6px */
  --cell: clamp(24px, calc((min(90vw, 480px) - 92px) / 7), 52px);
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

.mc-cell.drag-filled {
  background: #D4537E;
  border-color: #993556;
  border-radius: 0;
}
.mc-cell.drag-filled .mc-num { color: #fff; }

.mc-cell.drag-anchor-first {
  background: #b83464;
  border-color: #993556;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.mc-cell.drag-anchor-first .mc-num { color: #fff; }

.mc-cell.drag-anchor-last {
  background: #b83464;
  border-color: #993556;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.mc-cell.drag-anchor-last .mc-num { color: #fff; }

/* Single-cell selection: both anchors on same cell — restore full pill */
.mc-cell.drag-anchor-first.drag-anchor-last {
  border-radius: clamp(6px, calc(var(--cell) * 0.22), 12px);
}

@keyframes tap-pulse {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.28); }
  100% { transform: scale(1); }
}
.mc-cell.tap-filled {
  background: #F5A0BC;
  border-color: #D4537E;
  animation: tap-pulse 0.34s ease-out;
}
.mc-cell.tap-filled .mc-num { color: #993556; }

@keyframes gap-appear {
  0%   { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}
.mc-cell.gap-filled {
  background: #F5A0BC;
  border-color: #D4537E;
  animation: gap-appear 0.18s ease-out;
}
.mc-cell.gap-filled .mc-num { color: #993556; }

/* ── Finger pointer ───────────────────────────────────────────── */

/* Outer wrapper: handles left position + opacity transitions */
.finger-wrap {
  position: absolute;
  top: calc(clamp(24px, calc((min(90vw, 480px) - 92px) / 7), 52px) / 2 - 10px);
  pointer-events: none;
  /* Center the dot on the left value */
  transform: translateX(-50%);
  z-index: 3;
  /* Fast by default (drag slide 1 + tap hops slide 2) */
  transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.30s ease;
}

/* Continuous drag sweep — asymmetric curve: slow ramp-up, peak velocity at ~75% of distance, then decelerate */
.finger-wrap--dragging {
  transition: left 1.6s cubic-bezier(0.9, 0, 0.8, 1), opacity 0.30s ease;
}

/* Slow glide — only for the 3→6 bookend jump in slide 2 */
.finger-wrap--slow {
  transition: left 0.60s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease;
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
