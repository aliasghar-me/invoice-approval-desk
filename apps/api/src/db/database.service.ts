import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Works from both src/db (tests, ts) and dist/db (built app): both resolve to apps/api/data.
const DEFAULT_DB_PATH = resolve(import.meta.dirname, '../../data/invoices.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS invoices (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor          TEXT    NOT NULL,
  vendor_key      TEXT    NOT NULL,
  invoice_number  TEXT    NOT NULL,
  number_key      TEXT    NOT NULL,
  amount_cents    INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency        TEXT    NOT NULL DEFAULT 'USD',
  invoice_date    TEXT    NOT NULL,
  status          TEXT    NOT NULL
                  CHECK (status IN ('processing', 'needs_review', 'approved', 'rejected')),
  duplicate_of_id INTEGER REFERENCES invoices (id),
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS invoices_dedupe_key ON invoices (vendor_key, number_key);
CREATE INDEX IF NOT EXISTS invoices_status ON invoices (status);
`;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: DatabaseSync;

  constructor() {
    const path = process.env.DB_PATH ?? DEFAULT_DB_PATH;
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA);
  }

  /** Runs fn inside BEGIN IMMEDIATE so the read-check-write sequence holds the write lock. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  onModuleDestroy() {
    if (this.db.isOpen) this.db.close();
  }
}
