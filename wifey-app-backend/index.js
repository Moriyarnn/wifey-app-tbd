const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Database setup
const dbPath = path.join(__dirname, 'data', 'wifey.db')
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true })
const db = new Database(dbPath)

// Run migrations
const runMigrations = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      filename  TEXT NOT NULL UNIQUE,
      run_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const migrationsPath = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsPath).sort()

  for (const file of files) {
    const alreadyRun = db.prepare('SELECT id FROM migrations WHERE filename = ?').get(file)
    if (alreadyRun) continue

    const sql = fs.readFileSync(path.join(migrationsPath, file), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file)
    console.log(`✅ Migration run: ${file}`)
  }

  console.log('✅ All migrations up to date')
}

runMigrations()

// Routes
const cyclesRouter = require('./routes/period/cycles')(db)
const cycleDaysRouter = require('./routes/period/cycle_days')(db)
const calculationsRouter = require('./routes/period/calculations')(db)

app.use('/api/period/cycles', cyclesRouter)
app.use('/api/period/cycle-days', cycleDaysRouter)
app.use('/api/period/calculations', calculationsRouter)

// Logs dashboard — all active log tables, newest first, paginated
app.get('/api/logs', (req, res) => {
  const LIMIT = 200
  const offset = Math.max(0, parseInt(req.query.offset) || 0)
  res.json({
    offset,
    system_errors: db.prepare('SELECT * FROM log_system_errors ORDER BY logged_at DESC LIMIT ? OFFSET ?').all(LIMIT, offset),
    notification_runs: db.prepare('SELECT * FROM log_system_notification_runs ORDER BY logged_at DESC LIMIT ? OFFSET ?').all(LIMIT, offset),
    notification_sends: db.prepare('SELECT * FROM log_system_notification_sends ORDER BY logged_at DESC LIMIT ? OFFSET ?').all(LIMIT, offset),
    period_events: db.prepare('SELECT * FROM log_period_events ORDER BY logged_at DESC LIMIT ? OFFSET ?').all(LIMIT, offset),
    period_calculations: db.prepare('SELECT * FROM log_period_calculations ORDER BY logged_at DESC LIMIT ? OFFSET ?').all(LIMIT, offset)
  })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'wifey app backend is running!' }) // TODO: App name TBD — update before launch
})

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)

  // Start notification cron — runs daily at 08:00 and catches up on startup if missed
  const { startNotifications } = require('./notifications')
  startNotifications(db)
})