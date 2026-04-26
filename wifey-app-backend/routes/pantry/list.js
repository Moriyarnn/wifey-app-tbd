const express = require('express')
const router = express.Router()

const VALID_CATEGORIES = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'dry_goods', 'other']
const CATEGORY_ORDER = VALID_CATEGORIES.join("','")

module.exports = (db) => {
  // GET all items — unchecked first (by category order), checked last (by checked_at)
  router.get('/', (req, res) => {
    const items = db.prepare(`
      SELECT sl.*, u.username as added_by_username
      FROM shopping_list sl
      LEFT JOIN users u ON u.id = sl.added_by
      ORDER BY
        sl.checked ASC,
        CASE sl.category
          WHEN 'produce'   THEN 1
          WHEN 'dairy'     THEN 2
          WHEN 'meat'      THEN 3
          WHEN 'bakery'    THEN 4
          WHEN 'frozen'    THEN 5
          WHEN 'dry_goods' THEN 6
          ELSE 7
        END,
        sl.name ASC,
        sl.checked_at ASC
    `).all()
    res.json(items)
  })

  // POST add item
  router.post('/', (req, res) => {
    const { name, quantity, category } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' })
    const cat = VALID_CATEGORIES.includes(category) ? category : 'other'
    const userId = req.user?.id ?? null
    const result = db.prepare(
      'INSERT INTO shopping_list (name, quantity, category, added_by) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), quantity?.trim() || null, cat, userId)
    const item = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(item)
  })

  // DELETE bulk-clear all checked items — must be before /:id
  router.delete('/checked', (req, res) => {
    db.prepare('DELETE FROM shopping_list WHERE checked = 1').run()
    res.json({ ok: true })
  })

  // PATCH update or toggle checked
  router.patch('/:id', (req, res) => {
    const { id } = req.params
    const item = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id)
    if (!item) return res.status(404).json({ error: 'Item not found' })

    const { name, quantity, category, checked } = req.body

    if (checked !== undefined) {
      const nowChecked = checked ? 1 : 0
      db.prepare(
        'UPDATE shopping_list SET checked = ?, checked_at = ? WHERE id = ?'
      ).run(nowChecked, nowChecked ? new Date().toISOString() : null, id)
    }

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' })
      db.prepare('UPDATE shopping_list SET name = ? WHERE id = ?').run(name.trim(), id)
    }

    if (quantity !== undefined) {
      db.prepare('UPDATE shopping_list SET quantity = ? WHERE id = ?').run(quantity?.trim() || null, id)
    }

    if (category !== undefined) {
      const cat = VALID_CATEGORIES.includes(category) ? category : 'other'
      db.prepare('UPDATE shopping_list SET category = ? WHERE id = ?').run(cat, id)
    }

    res.json(db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(id))
  })

  // DELETE single item
  router.delete('/:id', (req, res) => {
    const item = db.prepare('SELECT id FROM shopping_list WHERE id = ?').get(req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    db.prepare('DELETE FROM shopping_list WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  })

  return router
}
