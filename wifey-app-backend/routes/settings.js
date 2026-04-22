const express = require('express')
const router = express.Router()
const { requireOwner } = require('../middleware/auth')

module.exports = (db) => {
  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const settings = {}
    rows.forEach(r => { settings[r.key] = r.value })
    res.json(settings)
  })

  router.patch('/:key', requireOwner, (req, res) => {
    const { value } = req.body
    if (value === undefined) return res.status(400).json({ error: 'value is required' })
    db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
      .run(String(value), req.params.key)
    res.json({ success: true })
  })

  return router
}
