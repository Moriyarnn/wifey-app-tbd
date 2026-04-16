const express = require('express')
const router = express.Router()
const { logPeriodEvent } = require('../../logger')

module.exports = (db) => {
  // Get all cycle days with cycle info (for calendar population)
  router.get('/all', (req, res) => {
    const days = db.prepare(`
      SELECT cd.*, GROUP_CONCAT(s.symptom) as symptoms,
             c.start_date as cycle_start, c.end_date as cycle_end
      FROM cycle_days cd
      LEFT JOIN symptoms s ON s.cycle_day_id = cd.id
      LEFT JOIN cycles c ON c.id = cd.cycle_id
      GROUP BY cd.id
      ORDER BY cd.date ASC
    `).all()
    res.json(days)
  })

  // Get all days for a cycle
  router.get('/cycle/:cycle_id', (req, res) => {
    const days = db.prepare(`
      SELECT cd.*, GROUP_CONCAT(s.symptom) as symptoms
      FROM cycle_days cd
      LEFT JOIN symptoms s ON s.cycle_day_id = cd.id
      WHERE cd.cycle_id = ?
      GROUP BY cd.id
      ORDER BY cd.date ASC
    `).all(req.params.cycle_id)
    res.json(days)
  })

  // Get a single day
  router.get('/:id', (req, res) => {
    const day = db.prepare(`
      SELECT cd.*, GROUP_CONCAT(s.symptom) as symptoms
      FROM cycle_days cd
      LEFT JOIN symptoms s ON s.cycle_day_id = cd.id
      WHERE cd.id = ?
      GROUP BY cd.id
    `).get(req.params.id)
    if (!day) return res.status(404).json({ error: 'Day not found' })
    res.json(day)
  })

  // Log a day
  router.post('/', (req, res) => {
    const { cycle_id, date, flow_intensity, notes, symptoms } = req.body
    if (!cycle_id || !date) return res.status(400).json({ error: 'cycle_id and date are required' })

    // Insert the day
    const result = db.prepare(`
      INSERT INTO cycle_days (cycle_id, date, flow_intensity, notes)
      VALUES (?, ?, ?, ?)
    `).run(cycle_id, date, flow_intensity || null, notes || null)

    const cycle_day_id = result.lastInsertRowid

    // Insert symptoms if any
    if (symptoms && symptoms.length > 0) {
      const insertSymptom = db.prepare('INSERT INTO symptoms (cycle_day_id, symptom) VALUES (?, ?)')
      symptoms.forEach(symptom => insertSymptom.run(cycle_day_id, symptom))
    }

    logPeriodEvent(db, { entity: 'cycle_day', entity_id: cycle_day_id, action: 'create', cycle_id, date })
    res.json({ id: cycle_day_id, cycle_id, date })
  })

  // Update a day
  router.patch('/:id', (req, res) => {
    const { flow_intensity, notes, symptoms } = req.body
    const id = Number(req.params.id)

    db.prepare(`
      UPDATE cycle_days SET flow_intensity = ?, notes = ? WHERE id = ?
    `).run(flow_intensity || null, notes || null, id)

    // Replace symptoms
    if (symptoms) {
      db.prepare('DELETE FROM symptoms WHERE cycle_day_id = ?').run(id)
      const insertSymptom = db.prepare('INSERT INTO symptoms (cycle_day_id, symptom) VALUES (?, ?)')
      symptoms.forEach(symptom => insertSymptom.run(id, symptom))
    }

    const updated = db.prepare('SELECT cycle_id, date FROM cycle_days WHERE id = ?').get(id)
    if (updated) logPeriodEvent(db, { entity: 'cycle_day', entity_id: id, action: 'update', cycle_id: updated.cycle_id, date: updated.date })

    res.json({ success: true })
  })

  // Delete a day
  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id)
    const day = db.prepare(`
      SELECT cd.cycle_id, cd.date, c.start_date
      FROM cycle_days cd
      JOIN cycles c ON c.id = cd.cycle_id
      WHERE cd.id = ?
    `).get(id)
    if (!day) return res.status(404).json({ error: 'Day not found' })

    db.prepare('DELETE FROM symptoms WHERE cycle_day_id = ?').run(id)
    db.prepare('DELETE FROM cycle_days WHERE id = ?').run(id)
    logPeriodEvent(db, { entity: 'cycle_day', entity_id: id, action: 'delete', cycle_id: day.cycle_id, date: day.date })

    const remaining = db.prepare('SELECT COUNT(*) as cnt FROM cycle_days WHERE cycle_id = ?').get(day.cycle_id)
    const cycle = db.prepare('SELECT end_date FROM cycles WHERE id = ?').get(day.cycle_id)

    if (remaining.cnt === 0 && cycle && !cycle.end_date) {
      // No days left — remove the orphaned cycle so predictions recalculate cleanly
      db.prepare('DELETE FROM cycles WHERE id = ?').run(day.cycle_id)
    } else if (day.date === day.start_date && remaining.cnt > 0) {
      // Deleted the start day — promote the earliest remaining day as the new cycle start
      const newStart = db.prepare(
        'SELECT date FROM cycle_days WHERE cycle_id = ? ORDER BY date ASC LIMIT 1'
      ).get(day.cycle_id)
      if (newStart) {
        db.prepare('UPDATE cycles SET start_date = ? WHERE id = ?').run(newStart.date, day.cycle_id)
      }
    }

    res.json({ success: true })
  })

  return router
}