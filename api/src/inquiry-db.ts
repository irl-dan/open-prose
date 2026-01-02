import { db } from './db';

// Initialize inquiry schema
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    source TEXT DEFAULT 'landing'
  );

  CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
  CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
`);

export interface InquiryPayload {
  name: string;
  email: string;
  company?: string;
  message: string;
  source?: string;
}

export const insertInquiry = db.prepare(`
  INSERT INTO inquiries (name, email, company, message, source)
  VALUES (?, ?, ?, ?, ?)
`);

export const inquiryQueries = {
  all: db.prepare(`
    SELECT * FROM inquiries
    ORDER BY created_at DESC
    LIMIT ?
  `),
  count: db.prepare(`
    SELECT COUNT(*) as count FROM inquiries
  `),
};
