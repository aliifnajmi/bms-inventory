'use strict';

/**
 * Database layer for BMS IMS.
 * Uses the built-in node:sqlite module (Node.js >= 22.5) — no external dependencies.
 */

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.BMS_DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = process.env.BMS_DB_PATH || path.join(DATA_DIR, 'bms.db');

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code     TEXT NOT NULL UNIQUE COLLATE NOCASE,
  item_name     TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL,
  subcategory   TEXT NOT NULL DEFAULT '',
  brand         TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  part_number   TEXT NOT NULL DEFAULT '',
  unit          TEXT NOT NULL DEFAULT 'PCS',
  location      TEXT NOT NULL DEFAULT '',
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  maximum_stock INTEGER NOT NULL DEFAULT 0,
  opening_stock INTEGER NOT NULL DEFAULT 0,
  supplier      TEXT NOT NULL DEFAULT '',
  remarks       TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id   TEXT NOT NULL UNIQUE,
  item_id          INTEGER NOT NULL REFERENCES items(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT')),
  quantity         INTEGER NOT NULL,          -- positive for IN/OUT, signed for ADJUSTMENT
  reference        TEXT NOT NULL DEFAULT '',
  supplier         TEXT NOT NULL DEFAULT '',
  issued_to        TEXT NOT NULL DEFAULT '',
  work_order       TEXT NOT NULL DEFAULT '',
  area             TEXT NOT NULL DEFAULT '',
  reason           TEXT NOT NULL DEFAULT '',
  user             TEXT NOT NULL DEFAULT '',
  remarks          TEXT NOT NULL DEFAULT '',
  transaction_date TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_item ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
`;

function open() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

/** Local date as YYYY-MM-DD (used for "today" calculations). */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nowISO() {
  return new Date().toISOString();
}

/** Drop all tables and recreate the schema (demo-data reset). */
function resetDatabase() {
  const d = open();
  d.exec('DROP TABLE IF EXISTS transactions;');
  d.exec('DROP TABLE IF EXISTS items;');
  d.exec('DROP TABLE IF EXISTS categories;');
  d.exec(SCHEMA);
}

module.exports = { open, resetDatabase, todayISO, nowISO, DB_PATH, DATA_DIR };
