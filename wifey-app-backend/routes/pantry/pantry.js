const express = require('express')
const router = express.Router()

const VALID_CATEGORIES = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'dry_goods', 'other']
const VALID_STATUSES = ['active', 'used', 'wasted']

module.exports = (db) => {
  // GET all active pantry items, expiring soonest first, nulls last
  router.get('/', (req, res) => {
    const items = db.prepare(`
      SELECT * FROM pantry
      WHERE status = 'active'
      ORDER BY
        CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END,
        expiry_date ASC,
        name ASC
    `).all()
    res.json(items)
  })

  // GET items expiring within N days (used by notification cron)
  router.get('/expiring', (req, res) => {
    const days = Math.max(1, parseInt(req.query.days) || 7)
    const items = db.prepare(`
      SELECT * FROM pantry
      WHERE status = 'active'
        AND expiry_date IS NOT NULL
        AND expiry_date <= date('now', '+' || ? || ' days')
      ORDER BY expiry_date ASC
    `).all(days)
    res.json(items)
  })

  // POST add item directly (not from shopping list)
  router.post('/', (req, res) => {
    const { name, quantity, category, expiry_date, bought_date, notes } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' })
    const cat = VALID_CATEGORIES.includes(category) ? category : 'other'
    const today = new Date().toISOString().split('T')[0]
    const result = db.prepare(`
      INSERT INTO pantry (name, quantity, category, bought_date, expiry_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name.trim(), quantity?.trim() || null, cat, bought_date || today, expiry_date || null, notes || null)
    res.status(201).json(db.prepare('SELECT * FROM pantry WHERE id = ?').get(result.lastInsertRowid))
  })

  // PATCH update fields
  router.patch('/:id', (req, res) => {
    const item = db.prepare('SELECT * FROM pantry WHERE id = ?').get(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })

    const { name, quantity, category, expiry_date, opened_date, notes } = req.body
    const now = new Date().toISOString()

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' })
      db.prepare('UPDATE pantry SET name = ?, updated_at = ? WHERE id = ?').run(name.trim(), now, req.params.id)
    }
    if (quantity !== undefined) db.prepare('UPDATE pantry SET quantity = ?, updated_at = ? WHERE id = ?').run(quantity || null, now, req.params.id)
    if (category !== undefined) {
      const cat = VALID_CATEGORIES.includes(category) ? category : 'other'
      db.prepare('UPDATE pantry SET category = ?, updated_at = ? WHERE id = ?').run(cat, now, req.params.id)
    }
    if (expiry_date !== undefined) db.prepare('UPDATE pantry SET expiry_date = ?, updated_at = ? WHERE id = ?').run(expiry_date || null, now, req.params.id)
    if (opened_date !== undefined) db.prepare('UPDATE pantry SET opened_date = ?, updated_at = ? WHERE id = ?').run(opened_date || null, now, req.params.id)
    if (notes !== undefined) db.prepare('UPDATE pantry SET notes = ?, updated_at = ? WHERE id = ?').run(notes || null, now, req.params.id)

    res.json(db.prepare('SELECT * FROM pantry WHERE id = ?').get(req.params.id))
  })

  // PATCH set status (used / wasted)
  router.patch('/:id/status', (req, res) => {
    const item = db.prepare('SELECT * FROM pantry WHERE id = ?').get(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    const { status } = req.body
    if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    db.prepare('UPDATE pantry SET status = ?, updated_at = ? WHERE id = ?')
      .run(status, new Date().toISOString(), req.params.id)
    res.json({ ok: true })
  })

  // DELETE hard delete
  router.delete('/:id', (req, res) => {
    const item = db.prepare('SELECT id FROM pantry WHERE id = ?').get(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    db.prepare('DELETE FROM pantry WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  return router
}
