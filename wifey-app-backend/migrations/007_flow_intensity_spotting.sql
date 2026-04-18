PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS cycle_days_new;

-- SQLite can't ALTER a CHECK constraint directly, so recreate cycle_days with spotting added
CREATE TABLE cycle_days_new (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id       INTEGER NOT NULL REFERENCES cycles(id),
  date           DATE NOT NULL,
  flow_intensity TEXT CHECK(flow_intensity IN ('spotting', 'light', 'medium', 'heavy')),
  notes          TEXT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cycle_days_new SELECT * FROM cycle_days;

DROP TABLE cycle_days;

ALTER TABLE cycle_days_new RENAME TO cycle_days;

PRAGMA foreign_keys = ON;
