const express = require('express')
const router = express.Router()
const { logPeriodCalculation } = require('../../logger')

module.exports = (db) => {

  const MIN_CYCLE_GAP = 21 // days — gaps shorter than this are biologically unlikely (minimum normal cycle)

  // Helper: get all completed cycles (past only, start_date <= today)
  // Uses last logged cycle_day as effective end when end_date is not set
  const getCompletedCycles = () => {
    return db.prepare(`
      SELECT c.*,
        CAST(julianday(COALESCE(c.end_date, MAX(cd.date))) - julianday(c.start_date) + 1 AS INTEGER) as period_length
      FROM cycles c
      LEFT JOIN cycle_days cd ON cd.cycle_id = c.id
      WHERE c.start_date IS NOT NULL
        AND c.start_date <= date('now')
      GROUP BY c.id
      HAVING COALESCE(c.end_date, MAX(cd.date)) IS NOT NULL
        AND COALESCE(c.end_date, MAX(cd.date)) < date('now')
      ORDER BY c.start_date ASC
    `).all()
  }

  // Helper: get cycle lengths (start to start) — past cycles only, skips short gaps
  // Returns { lengths, skippedGaps } where skippedGaps holds warning details
  const getCycleLengths = () => {
    const cycles = db.prepare(`
      SELECT c.* FROM cycles c
      WHERE c.start_date IS NOT NULL
        AND c.start_date <= date('now')
        AND (c.end_date IS NOT NULL OR EXISTS (SELECT 1 FROM cycle_days cd WHERE cd.cycle_id = c.id))
      ORDER BY c.start_date ASC
    `).all()

    const lengths = []
    const skippedGaps = []
    for (let i = 1; i < cycles.length; i++) {
      const diff = Math.round(
        (new Date(cycles[i].start_date) - new Date(cycles[i - 1].start_date))
        / (1000 * 60 * 60 * 24)
      )
      if (diff < MIN_CYCLE_GAP) {
        skippedGaps.push({ from: cycles[i - 1].start_date, to: cycles[i].start_date, gap: diff })
      } else {
        lengths.push(diff)
      }
    }
    return { lengths, skippedGaps }
  }

  // GET /api/calculations/summary
  // Returns everything the frontend needs in one call
  router.get('/summary', (req, res) => {
    const today = new Date().toISOString().split('T')[0]
    const dataWarnings = []

    // Detect future cycles (start_date > today), one warning per cycle
    const futureCycles = db.prepare(`
      SELECT * FROM cycles WHERE start_date > date('now') ORDER BY start_date ASC
    `).all()
    futureCycles.forEach(c => {
      dataWarnings.push({
        code: 'FUTURE_CYCLE',
        message: `Cycle starting on ${c.start_date} is in the future, so it was excluded from predictions. Remove it or correct the date.`,
        targetDate: c.start_date,
        affectedDates: [c.start_date]
      })
    })

    const completedCycles = getCompletedCycles()
    const { lengths: cycleLengths, skippedGaps } = getCycleLengths()

    // Warn about impossibly short gaps
    skippedGaps.forEach(({ from, to, gap }) => {
      dataWarnings.push({
        code: 'SHORT_CYCLE_GAP',
        message: `Cycles on ${from} and ${to} are only ${gap} day(s) apart (minimum expected is 21). This looks like a data entry mistake, so the gap was excluded from predictions.`,
        targetDate: from,
        affectedDates: [from, to]
      })
    })

    // Average cycle length (start to start) — exponential smoothing (α=0.3)
    // Recent cycles get more weight: est = α * latest + (1-α) * past_estimate
    // With 1 cycle it equals that cycle; with more cycles it adapts toward recent data
    const ALPHA = 0.3
    const avgCycleLength = cycleLengths.length > 0
      ? Math.round(
          cycleLengths.slice(1).reduce(
            (est, len) => ALPHA * len + (1 - ALPHA) * est,
            cycleLengths[0]
          )
        )
      : 28 // default assumption

    // Cycle variability — standard deviation of cycle lengths
    const cycleStdDev = cycleLengths.length >= 2
      ? Math.round(Math.sqrt(
          cycleLengths.reduce((sum, l) => sum + Math.pow(l - avgCycleLength, 2), 0) / cycleLengths.length
        ))
      : null

    // Confidence window: ±stdDev days, minimum ±2 when we have enough data
    const confidenceWindow = cycleStdDev !== null && cycleLengths.length >= 3
      ? Math.max(2, cycleStdDev)
      : null

    // Irregular cycles: std dev > 7 days is considered irregular
    const isIrregular = cycleStdDev !== null && cycleStdDev > 7

    const MAX_PERIOD_LENGTH = 10 // days — longer than this is medically unusual

    // Warn about and exclude abnormally long period entries
    const validPeriodCycles = []
    completedCycles.forEach(c => {
      if (c.period_length > MAX_PERIOD_LENGTH) {
        dataWarnings.push({
          code: 'LONG_PERIOD',
          message: `The entry starting on ${c.start_date} spans ${c.period_length} day(s). A period longer than ${MAX_PERIOD_LENGTH} days looks like a data entry mistake (e.g. the end date was set to the end of the cycle instead of the end of the bleeding). It was excluded from the period length average.`,
          targetDate: c.start_date,
          affectedDates: [c.start_date, c.end_date].filter(Boolean)
        })
      } else {
        validPeriodCycles.push(c)
      }
    })

    // Average period length (start to end), using only valid entries
    const avgPeriodLength = validPeriodCycles.length > 0
      ? Math.round(validPeriodCycles.reduce((a, b) => a + b.period_length, 0) / validPeriodCycles.length)
      : 5 // default assumption

    // Last cycle — past only, exclude orphaned cycles (no days, no explicit end_date)
    const allCycles = db.prepare(`
      SELECT c.* FROM cycles c
      WHERE c.start_date <= date('now')
        AND (c.end_date IS NOT NULL
         OR EXISTS (SELECT 1 FROM cycle_days cd WHERE cd.cycle_id = c.id))
      ORDER BY c.start_date DESC
    `).all()
    const lastCycle = allCycles[0] || null

    // Personalised luteal phase — days between ovulation_date and the next cycle's start
    // Falls back to the clinical default of 14 if no ovulation days have been marked
    const ovulationRows = db.prepare(`
      SELECT
        c.ovulation_date,
        CAST(julianday(next_c.start_date) - julianday(c.ovulation_date) AS INTEGER) AS luteal_length
      FROM cycles c
      JOIN cycles next_c ON next_c.start_date = (
        SELECT MIN(start_date) FROM cycles WHERE start_date > c.start_date
      )
      WHERE c.ovulation_date IS NOT NULL
        AND c.start_date <= date('now')
      ORDER BY c.start_date ASC
    `).all().filter(r => r.luteal_length >= 7 && r.luteal_length <= 20)

    const lutealLengths = ovulationRows.map(r => r.luteal_length)
    const avgLutealPhase = lutealLengths.length > 0
      ? Math.round(
          lutealLengths.slice(1).reduce(
            (est, l) => ALPHA * l + (1 - ALPHA) * est,
            lutealLengths[0]
          )
        )
      : 14 // clinical default

    // Prediction accuracy correction — compare stored predictions to actual start dates
    // Only use pairs that are within 14 days of each other to filter out historical backdated entries
    const predictionErrors = db.prepare(`
      SELECT CAST(julianday(start_date) - julianday(predicted_start_date) AS INTEGER) AS error_days
      FROM cycles
      WHERE predicted_start_date IS NOT NULL
        AND start_date IS NOT NULL
        AND start_date <= date('now')
        AND ABS(julianday(start_date) - julianday(predicted_start_date)) <= 14
      ORDER BY start_date ASC
    `).all().map(r => r.error_days)

    const avgPredictionError = predictionErrors.length >= 2
      ? predictionErrors.slice(1).reduce(
          (est, e) => ALPHA * e + (1 - ALPHA) * est,
          predictionErrors[0]
        )
      : 0

    // Next period prediction
    let nextPeriodDate = null
    if (lastCycle) {
      const lastStart = new Date(lastCycle.start_date)
      const predicted = new Date(lastStart)
      predicted.setDate(predicted.getDate() + avgCycleLength + Math.round(avgPredictionError))
      nextPeriodDate = predicted.toISOString().split('T')[0]
    }

    // Fertile window and ovulation (based on next predicted period + personalised luteal phase)
    let fertileWindow = null
    let ovulationDate = null
    if (nextPeriodDate) {
      const nextPeriod = new Date(nextPeriodDate)

      // Ovulation is avgLutealPhase days before next period
      const ovulation = new Date(nextPeriod)
      ovulation.setDate(ovulation.getDate() - avgLutealPhase)
      ovulationDate = ovulation.toISOString().split('T')[0]

      // Fertile window is 5 days before ovulation and 1 day after
      const fertileStart = new Date(ovulation)
      fertileStart.setDate(fertileStart.getDate() - 5)
      const fertileEnd = new Date(ovulation)
      fertileEnd.setDate(fertileEnd.getDate() + 1)

      fertileWindow = {
        start: fertileStart.toISOString().split('T')[0],
        end: fertileEnd.toISOString().split('T')[0]
      }
    }

    // Is she currently on her period?
    // A cycle is active if end_date is today or yesterday (end_date is always kept at MAX logged day via #36)
    const currentCycle = db.prepare(`
      SELECT c.*
      FROM cycles c
      WHERE c.start_date <= ?
        AND c.end_date >= date('now', '-1 day')
      ORDER BY c.start_date DESC
      LIMIT 1
    `).get(today)

    logPeriodCalculation(db, {
      source: 'api',
      avg_cycle_length: avgCycleLength,
      avg_period_length: avgPeriodLength,
      next_period_date: nextPeriodDate,
      ovulation_date: ovulationDate,
      fertile_window_start: fertileWindow?.start ?? null,
      fertile_window_end: fertileWindow?.end ?? null,
      is_irregular: isIrregular,
      cycle_std_dev: cycleStdDev,
      data_warnings_count: dataWarnings.length,
      total_cycles_tracked: allCycles.length
    })

    res.json({
      avgCycleLength,
      avgPeriodLength,
      nextPeriodDate,
      ovulationDate,
      fertileWindow,
      confidenceWindow,
      isIrregular,
      currentCycle: currentCycle || null,
      totalCyclesTracked: allCycles.length,
      dataWarnings,
      note: cycleLengths.length < 3
        ? 'Predictions will improve after tracking 3 or more cycles'
        : null
    })
  })

  return router
}