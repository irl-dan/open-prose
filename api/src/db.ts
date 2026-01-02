import Database from 'better-sqlite3';
import path from 'path';

// Use volume-mounted path on Fly.io, local path in development
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'telemetry.db');

// Ensure directory exists
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    install_id TEXT NOT NULL,
    plugin_version TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    payload TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_telemetry_install_id ON telemetry_events(install_id);
  CREATE INDEX IF NOT EXISTS idx_telemetry_received_at ON telemetry_events(received_at);
  CREATE INDEX IF NOT EXISTS idx_telemetry_plugin_version ON telemetry_events(plugin_version);
`);

// Prepared statement for inserting telemetry
export const insertTelemetry = db.prepare(`
  INSERT INTO telemetry_events (install_id, plugin_version, schema_version, timestamp, payload)
  VALUES (?, ?, ?, ?, ?)
`);

// Simple aggregation queries for dashboarding
export const queries = {
  totalEvents: db.prepare('SELECT COUNT(*) as count FROM telemetry_events'),
  uniqueInstalls: db.prepare('SELECT COUNT(DISTINCT install_id) as count FROM telemetry_events'),
  eventsByVersion: db.prepare(`
    SELECT plugin_version, COUNT(*) as count
    FROM telemetry_events
    GROUP BY plugin_version
    ORDER BY count DESC
  `),
  recentEvents: db.prepare(`
    SELECT * FROM telemetry_events
    ORDER BY received_at DESC
    LIMIT ?
  `),
};
