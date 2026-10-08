'use strict';

/**
 * BMS IMS — business logic / inventory engine.
 *
 * Core rule: Stock Balance is NEVER stored as an editable value.
 *   Stock Balance = Opening Stock + SUM(STOCK_IN) - SUM(STOCK_OUT) + SUM(ADJUSTMENT)
 * It is always calculated from the transactions table.
 */

const { open, todayISO, nowISO } = require('./db');

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.extra = extra || null;
  }
}

/* ---------- SQL fragment: net movement from transactions ---------- */
const MOVEMENT =
  "COALESCE(SUM(CASE t.transaction_type " +
  "WHEN 'STOCK_IN' THEN t.quantity " +
  "WHEN 'STOCK_OUT' THEN -t.quantity " +
  "ELSE t.quantity END), 0)";

const ITEM_BALANCE_SQL =
  `SELECT i.*, i.opening_stock + ${MOVEMENT} AS balance ` +
  `FROM items i LEFT JOIN transactions t ON t.item_id = i.id`;

/* ---------- validation helpers ---------- */

function reqStr(v, name) {
  if (v === undefined || v === null) throw new HttpError(400, `${name} is required.`);
  const s = String(v).trim();
  if (!s) throw new HttpError(400, `${name} is required.`);
  if (s.length > 200) throw new HttpError(400, `${name} is too long (max 200 characters).`);
  return s;
}

function optStr(v, max = 200) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}

function intField(v, name, { defaultValue = 0, min = 0 } = {}) {
  if (v === undefined || v === null || v === '') return defaultValue;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isInteger(n)) throw new HttpError(400, `${name} must be a whole number.`);
  if (n < min) throw new HttpError(400, `${name} must be ${min} or greater.`);
  return n;
}

function dateField(v, name = 'Date') {
  if (v === undefined || v === null || v === '') return todayISO();
  const s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new HttpError(400, `Invalid ${name} "${v}". Use format YYYY-MM-DD.`);
  }
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new HttpError(400, `Invalid ${name} "${v}". Use format YYYY-MM-DD.`);
  }
  return s;
}

/* ---------- status ---------- */

function statusOf(balance, minimumStock) {
  if (balance <= 0) return 'OUT OF STOCK';
  if (balance <= minimumStock) return 'LOW STOCK';
  return 'NORMAL';
}

function attachStatus(row) {
  return { ...row, balance: Number(row.balance), status: statusOf(Number(row.balance), row.minimum_stock) };
}

/* ---------- items ---------- */

function listItems(q = {}) {
  const db = open();
  let sql = ITEM_BALANCE_SQL;
  const where = [];
  const args = [];
  if (q.search) {
    where.push('(i.item_code LIKE ? OR i.item_name LIKE ? OR i.part_number LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)');
    const s = `%${q.search}%`;
    args.push(s, s, s, s, s);
  }
  if (q.category) { where.push('i.category = ?'); args.push(q.category); }
  if (q.location) { where.push('i.location = ?'); args.push(q.location); }
  if (q.brand) { where.push('i.brand = ?'); args.push(q.brand); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' GROUP BY i.id ORDER BY i.item_code ASC';

  let rows = db.prepare(sql).all(...args).map(attachStatus);
  if (q.status) rows = rows.filter((r) => r.status === q.status);
  return rows;
}

function itemRow(id) {
  const db = open();
  const row = db.prepare(`${ITEM_BALANCE_SQL} WHERE i.id = ? GROUP BY i.id`).get(id);
  return row ? attachStatus(row) : null;
}

function getItemDetail(id) {
  const db = open();
  const item = itemRow(id);
  if (!item) throw new HttpError(404, 'Item not found.');

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'STOCK_IN' THEN quantity ELSE 0 END), 0) AS total_in,
         COALESCE(SUM(CASE WHEN transaction_type = 'STOCK_OUT' THEN quantity ELSE 0 END), 0) AS total_out,
         COALESCE(SUM(CASE WHEN transaction_type = 'ADJUSTMENT' THEN quantity ELSE 0 END), 0) AS total_adjustment,
         COUNT(*) AS transaction_count
       FROM transactions WHERE item_id = ?`
    )
    .get(id);

  const history = db
    .prepare(
      `SELECT t.*, i.item_code, i.item_name, i.unit, i.category
       FROM transactions t JOIN items i ON i.id = t.item_id
       WHERE t.item_id = ? ORDER BY t.transaction_date DESC, t.id DESC LIMIT 100`
    )
    .all(id);

  const timelineRows = db
    .prepare(
      `SELECT transaction_id, transaction_type, quantity, transaction_date
       FROM transactions WHERE item_id = ? ORDER BY transaction_date ASC, id ASC`
    )
    .all(id);

  // Running balance over time (for the stock movement chart)
  let running = item.opening_stock;
  const timeline = [{ label: 'Opening Stock', date: 'Start', value: running, type: 'OPENING' }];
  for (const t of timelineRows) {
    running += t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity;
    timeline.push({ label: t.transaction_id, date: t.transaction_date, value: running, type: t.transaction_type });
  }

  return { ...item, ...totals, history, timeline };
}

function ensureCategoryExists(name) {
  const db = open();
  const c = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').get(name);
  if (!c) {
    throw new HttpError(400, `Category "${name}" does not exist. Please add it under Categories first.`);
  }
}

function validateItemPayload(data) {
  const v = {
    item_code: reqStr(data.item_code, 'Item Code'),
    item_name: reqStr(data.item_name, 'Item Name'),
    description: optStr(data.description),
    category: reqStr(data.category, 'Category'),
    subcategory: optStr(data.subcategory),
    brand: optStr(data.brand),
    model: optStr(data.model),
    part_number: optStr(data.part_number),
    unit: optStr(data.unit) || 'PCS',
    location: optStr(data.location),
    minimum_stock: intField(data.minimum_stock, 'Minimum Stock'),
    maximum_stock: intField(data.maximum_stock, 'Maximum Stock'),
    opening_stock: intField(data.opening_stock, 'Opening Stock'),
    supplier: optStr(data.supplier),
    remarks: optStr(data.remarks),
  };
  if (v.maximum_stock > 0 && v.maximum_stock < v.minimum_stock) {
    throw new HttpError(400, 'Maximum Stock cannot be less than Minimum Stock.');
  }
  return v;
}

function createItem(data) {
  const v = validateItemPayload(data || {});
  const db = open();

  const dup = db.prepare('SELECT id FROM items WHERE item_code = ? COLLATE NOCASE').get(v.item_code);
  if (dup) {
    throw new HttpError(409, `Item code "${v.item_code}" already exists. Item codes must be unique.`);
  }
  ensureCategoryExists(v.category);

  const ts = nowISO();
  const r = db
    .prepare(
      `INSERT INTO items
        (item_code, item_name, description, category, subcategory, brand, model, part_number,
         unit, location, minimum_stock, maximum_stock, opening_stock, supplier, remarks, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      v.item_code, v.item_name, v.description, v.category, v.subcategory, v.brand, v.model,
      v.part_number, v.unit, v.location, v.minimum_stock, v.maximum_stock, v.opening_stock,
      v.supplier, v.remarks, ts, ts
    );
  return itemRow(Number(r.lastInsertRowid));
}

function definedOnly(obj) {
  const out = {};
  for (const [k, val] of Object.entries(obj || {})) {
    if (val !== undefined && val !== null) out[k] = val;
  }
  return out;
}

function updateItem(id, data) {
  const db = open();
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Item not found.');

  // Merge provided fields over the existing record, then validate the result.
  const merged = { ...existing, ...definedOnly(data) };
  const v = validateItemPayload(merged);

  const dup = db.prepare('SELECT id FROM items WHERE item_code = ? COLLATE NOCASE AND id != ?').get(v.item_code, id);
  if (dup) {
    throw new HttpError(409, `Item code "${v.item_code}" is already used by another item.`);
  }
  ensureCategoryExists(v.category);

  db.prepare(
    `UPDATE items SET
       item_code = ?, item_name = ?, description = ?, category = ?, subcategory = ?,
       brand = ?, model = ?, part_number = ?, unit = ?, location = ?,
       minimum_stock = ?, maximum_stock = ?, opening_stock = ?, supplier = ?, remarks = ?,
       updated_at = ?
     WHERE id = ?`
  ).run(
    v.item_code, v.item_name, v.description, v.category, v.subcategory,
    v.brand, v.model, v.part_number, v.unit, v.location,
    v.minimum_stock, v.maximum_stock, v.opening_stock, v.supplier, v.remarks,
    nowISO(), id
  );
  return itemRow(id);
}

/* ---------- categories ---------- */

function listCategories() {
  const db = open();
  return db
    .prepare(
      `SELECT c.*, COUNT(i.id) AS item_count
       FROM categories c LEFT JOIN items i ON i.category = c.name COLLATE NOCASE
       GROUP BY c.id ORDER BY c.name ASC`
    )
    .all();
}

function createCategory(data) {
  const name = reqStr((data || {}).name, 'Category Name');
  const description = optStr((data || {}).description);
  const db = open();
  const dup = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').get(name);
  if (dup) throw new HttpError(409, `Category "${name}" already exists.`);
  const r = db.prepare('INSERT INTO categories (name, description, created_at) VALUES (?,?,?)').run(name, description, nowISO());
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(r.lastInsertRowid));
}

function updateCategory(id, data) {
  const db = open();
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!existing) throw new HttpError(404, 'Category not found.');
  const name = reqStr((data || {}).name, 'Category Name');
  const description = optStr((data || {}).description);
  const dup = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND id != ?').get(name, id);
  if (dup) throw new HttpError(409, `Category "${name}" already exists.`);

  db.exec('BEGIN IMMEDIATE');
  try {
    // Keep items consistent when a category is renamed.
    if (existing.name.toLowerCase() !== name.toLowerCase()) {
      db.prepare('UPDATE items SET category = ? WHERE category = ? COLLATE NOCASE').run(name, existing.name);
    }
    db.prepare('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description, id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function deleteCategory(id, force = false) {
  const db = open();
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!cat) throw new HttpError(404, 'Category not found.');
  const inUse = db.prepare('SELECT COUNT(*) AS n FROM items WHERE category = ? COLLATE NOCASE').get(cat.name).n;
  if (inUse > 0 && !force) {
    throw new HttpError(
      409,
      `Category "${cat.name}" is used by ${inUse} item(s). Reassign those items first, or delete with confirmation.`,
      { itemCount: inUse, category: cat.name }
    );
  }
  db.exec('BEGIN IMMEDIATE');
  try {
    let reassigned = 0;
    if (inUse > 0) {
      // Move affected items to "Others" so no item is ever left without a category.
      let others = db.prepare("SELECT id FROM categories WHERE name = 'Others' COLLATE NOCASE").get();
      if (!others) {
        const r = db.prepare('INSERT INTO categories (name, description, created_at) VALUES (?,?,?)')
          .run('Others', 'Miscellaneous items', nowISO());
        others = { id: Number(r.lastInsertRowid) };
      }
      reassigned = db.prepare("UPDATE items SET category = 'Others' WHERE category = ? COLLATE NOCASE").run(cat.name).changes;
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.exec('COMMIT');
    return { deleted: true, category: cat.name, reassigned };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

/* ---------- transactions ---------- */

function currentBalance(itemId) {
  const db = open();
  const row = db
    .prepare(`SELECT i.opening_stock + ${MOVEMENT} AS balance FROM items i
              LEFT JOIN transactions t ON t.item_id = i.id WHERE i.id = ? GROUP BY i.id`)
    .get(itemId);
  return row ? Number(row.balance) : null;
}

function nextTransactionId() {
  const db = open();
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM transactions').get();
  return `TXN-${new Date().getFullYear()}-${String(row.n).padStart(6, '0')}`;
}

function insertTransaction(db, fields) {
  const s = (v) => (v === undefined || v === null ? '' : String(v));
  const txnId = nextTransactionId();
  db.prepare(
    `INSERT INTO transactions
      (transaction_id, item_id, transaction_type, quantity, reference, supplier,
       issued_to, work_order, area, reason, user, remarks, transaction_date, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    txnId, fields.item_id, fields.transaction_type, fields.quantity, s(fields.reference),
    s(fields.supplier), s(fields.issued_to), s(fields.work_order), s(fields.area), s(fields.reason),
    s(fields.user), s(fields.remarks), fields.transaction_date, nowISO()
  );
  return db
    .prepare(
      `SELECT t.*, i.item_code, i.item_name, i.unit, i.category
       FROM transactions t JOIN items i ON i.id = t.item_id WHERE t.transaction_id = ?`
    )
    .get(txnId);
}

function validateMovementPayload(data) {
  const v = {
    item_id: intField((data || {}).item_id, 'Item', { min: 1 }),
    quantity: intField((data || {}).quantity, 'Quantity', { min: 1 }),
    transaction_date: dateField((data || {}).transaction_date || (data || {}).date),
    reference: optStr((data || {}).reference),
    supplier: optStr((data || {}).supplier),
    issued_to: optStr((data || {}).issued_to),
    work_order: optStr((data || {}).work_order),
    area: optStr((data || {}).area),
    reason: optStr((data || {}).reason),
    received_by: optStr((data || {}).received_by),
    issued_by: optStr((data || {}).issued_by),
    user: optStr((data || {}).user),
    remarks: optStr((data || {}).remarks),
  };
  const db = open();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(v.item_id);
  if (!item) throw new HttpError(404, 'Item not found. Please select a valid item.');
  v.item = item;
  return v;
}

function stockIn(data) {
  const v = validateMovementPayload(data);
  const db = open();
  db.exec('BEGIN IMMEDIATE');
  try {
    const txn = insertTransaction(db, {
      item_id: v.item_id,
      transaction_type: 'STOCK_IN',
      quantity: v.quantity,
      reference: v.reference,
      supplier: v.supplier,
      user: v.received_by || v.user || 'Storekeeper',
      remarks: v.remarks,
      transaction_date: v.transaction_date,
    });
    db.exec('COMMIT');
    return { transaction: txn, balance: currentBalance(v.item_id) };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function stockOut(data) {
  const v = validateMovementPayload(data);
  const db = open();
  db.exec('BEGIN IMMEDIATE');
  try {
    const available = currentBalance(v.item_id);
    if (v.quantity > available) {
      throw new HttpError(
        400,
        `Stock Out failed. Only ${available} ${v.item.unit} of "${v.item.item_code}" are currently available.`,
        { available, requested: v.quantity, unit: v.item.unit, item_code: v.item.item_code }
      );
    }
    const txn = insertTransaction(db, {
      item_id: v.item_id,
      transaction_type: 'STOCK_OUT',
      quantity: v.quantity,
      reference: v.reference || v.work_order,
      issued_to: v.issued_to,
      work_order: v.work_order,
      area: v.area,
      reason: v.reason,
      user: v.issued_by || v.user || 'BMS Technician',
      remarks: v.remarks,
      transaction_date: v.transaction_date,
    });
    db.exec('COMMIT');
    return { transaction: txn, balance: currentBalance(v.item_id) };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function adjust(data) {
  const raw = data || {};
  if (raw.physical_stock === undefined || raw.physical_stock === null || raw.physical_stock === '') {
    throw new HttpError(400, 'Physical Stock is required.');
  }
  const itemId = intField(raw.item_id, 'Item', { min: 1 });
  const physical = intField(raw.physical_stock, 'Physical Stock');
  const reason = reqStr(raw.reason, 'Reason');
  const transactionDate = dateField(raw.transaction_date || raw.date);

  const db = open();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!item) throw new HttpError(404, 'Item not found. Please select a valid item.');

  db.exec('BEGIN IMMEDIATE');
  try {
    const systemStock = currentBalance(itemId);
    const difference = physical - systemStock;
    if (difference === 0) {
      throw new HttpError(
        400,
        `No adjustment needed. Physical stock matches system stock (${systemStock} ${item.unit}).`,
        { system_stock: systemStock, physical_stock: physical }
      );
    }
    const txn = insertTransaction(db, {
      item_id: itemId,
      transaction_type: 'ADJUSTMENT',
      quantity: difference, // signed
      reference: optStr(raw.reference) || 'STOCK-TAKE',
      reason,
      user: optStr(raw.user) || 'Storekeeper',
      remarks: optStr(raw.remarks),
      transaction_date: transactionDate,
    });
    db.exec('COMMIT');
    return {
      transaction: txn,
      system_stock: systemStock,
      physical_stock: physical,
      difference,
      balance: currentBalance(itemId),
    };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

function listTransactions(q = {}) {
  const db = open();
  let sql =
    'SELECT t.*, i.item_code, i.item_name, i.category, i.unit ' +
    'FROM transactions t JOIN items i ON i.id = t.item_id';
  const where = [];
  const args = [];
  if (q.type) { where.push('t.transaction_type = ?'); args.push(q.type); }
  if (q.item_id) { where.push('t.item_id = ?'); args.push(Number(q.item_id)); }
  if (q.category) { where.push('i.category = ?'); args.push(q.category); }
  if (q.user) { where.push('t.user LIKE ?'); args.push(`%${q.user}%`); }
  if (q.from) { where.push('t.transaction_date >= ?'); args.push(q.from); }
  if (q.to) { where.push('t.transaction_date <= ?'); args.push(q.to); }
  if (q.search) {
    where.push(
      '(t.transaction_id LIKE ? OR t.reference LIKE ? OR t.work_order LIKE ? OR i.item_code LIKE ? OR i.item_name LIKE ? OR t.remarks LIKE ?)'
    );
    const s = `%${q.search}%`;
    args.push(s, s, s, s, s, s);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY t.transaction_date DESC, t.id DESC LIMIT 1000';
  return db.prepare(sql).all(...args);
}

/* ---------- dashboard ---------- */

function dashboard() {
  const db = open();
  const today = todayISO();

  const totalItems = db.prepare('SELECT COUNT(*) AS n FROM items').get().n;

  const rows = db
    .prepare(`SELECT i.category, i.minimum_stock, i.opening_stock + ${MOVEMENT} AS balance
              FROM items i LEFT JOIN transactions t ON t.item_id = i.id GROUP BY i.id`)
    .all();

  let totalStock = 0;
  let lowCount = 0;
  let outCount = 0;
  const byCat = new Map();
  for (const r of rows) {
    const balance = Number(r.balance);
    totalStock += balance;
    const st = statusOf(balance, r.minimum_stock);
    if (st === 'LOW STOCK') lowCount += 1;
    if (st === 'OUT OF STOCK') outCount += 1;
    const c = byCat.get(r.category) || { category: r.category, item_count: 0, total_stock: 0 };
    c.item_count += 1;
    c.total_stock += balance;
    byCat.set(r.category, c);
  }

  const inToday = db
    .prepare(`SELECT COALESCE(SUM(quantity), 0) AS q FROM transactions WHERE transaction_type = 'STOCK_IN' AND transaction_date = ?`)
    .get(today).q;
  const outToday = db
    .prepare(`SELECT COALESCE(SUM(quantity), 0) AS q FROM transactions WHERE transaction_type = 'STOCK_OUT' AND transaction_date = ?`)
    .get(today).q;

  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type = 'STOCK_IN' THEN quantity ELSE 0 END), 0) AS total_in,
         COALESCE(SUM(CASE WHEN transaction_type = 'STOCK_OUT' THEN quantity ELSE 0 END), 0) AS total_out,
         COALESCE(SUM(CASE WHEN transaction_type = 'ADJUSTMENT' THEN quantity ELSE 0 END), 0) AS total_adjustment,
         COUNT(*) AS total_transactions
       FROM transactions`
    )
    .get();

  const lowStockItems = listItems({})
    .filter((i) => i.status !== 'NORMAL')
    .sort((a, b) => a.balance - b.balance)
    .slice(0, 10);

  const recentTransactions = db
    .prepare(
      `SELECT t.*, i.item_code, i.item_name, i.category, i.unit
       FROM transactions t JOIN items i ON i.id = t.item_id
       ORDER BY t.transaction_date DESC, t.id DESC LIMIT 10`
    )
    .all();

  return {
    total_items: totalItems,
    total_stock: totalStock,
    low_stock_count: lowCount,
    out_of_stock_count: outCount,
    stock_in_today: inToday,
    stock_out_today: outToday,
    totals,
    stock_overview: { stock_in: totals.total_in, stock_out: totals.total_out, balance: totalStock },
    by_category: [...byCat.values()].sort((a, b) => b.total_stock - a.total_stock),
    low_stock_items: lowStockItems,
    recent_transactions: recentTransactions,
  };
}

/* ---------- meta (filter dropdown sources) ---------- */

function meta() {
  const db = open();
  const distinct = (col) =>
    db.prepare(`SELECT DISTINCT ${col} AS v FROM items WHERE ${col} <> '' ORDER BY ${col} ASC`).all().map((r) => r.v);
  return {
    brands: distinct('brand'),
    locations: distinct('location'),
    units: distinct('unit'),
  };
}

module.exports = {
  HttpError,
  listItems,
  getItemDetail,
  createItem,
  updateItem,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  stockIn,
  stockOut,
  adjust,
  listTransactions,
  dashboard,
  meta,
  currentBalance,
};
