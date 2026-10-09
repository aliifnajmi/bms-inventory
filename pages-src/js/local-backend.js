'use strict';

/**
 * BMS IMS — browser backend (GitHub Pages build).
 *
 * Implements the exact same REST API as server.js / inventory.js, but backed by
 * localStorage instead of SQLite. All business rules are identical:
 *   - Stock Balance = Opening Stock + Σ Stock In − Σ Stock Out + Σ Adjustment
 *     (calculated from transactions — never stored or editable)
 *   - Stock Out can never exceed available stock
 *   - Unique item codes, valid categories, quantity/date validation
 *   - Status: 0 → OUT OF STOCK, ≤ min → LOW STOCK, else NORMAL
 *
 * Data lives in this browser only (localStorage) — nothing is sent anywhere.
 */
(function () {
  const LS_KEY = 'bms-ims-local-v1';
  const VERSION = '1.1.0';

  // The demo dataset is inlined at build time by scripts/build-pages.js
  // (it replaces the placeholder below with JSON generated from seed.js).
  const SEED = /*__BMS_IMS_SEED__*/ null;

  let db = null; // { categories: [], items: [], transactions: [] }
  let seedData = null; // pristine demo dataset, used by /api/reset
  let ready = null; // load promise

  /* ---------- small utils ---------- */
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const nowISO = () => new Date().toISOString();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  const byCode = (a, b) => String(a.item_code).localeCompare(String(b.item_code));
  const cmpDateIdAsc = (a, b) =>
    a.transaction_date === b.transaction_date ? a.id - b.id : a.transaction_date < b.transaction_date ? -1 : 1;
  const cmpDateIdDesc = (a, b) => -cmpDateIdAsc(a, b);

  class HttpError extends Error {
    constructor(status, message, extra) {
      super(message);
      this.status = status;
      this.extra = extra || null;
    }
  }

  /* ---------- validation (mirrors inventory.js) ---------- */
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `Invalid ${name} "${v}". Use format YYYY-MM-DD.`);
    const d = new Date(s + 'T00:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
      throw new HttpError(400, `Invalid ${name} "${v}". Use format YYYY-MM-DD.`);
    }
    return s;
  }
  function statusOf(balance, minimumStock) {
    if (balance <= 0) return 'OUT OF STOCK';
    if (minimumStock > 0 && balance <= minimumStock) return 'LOW STOCK';
    return 'NORMAL';
  }

  /* ---------- persistence ---------- */
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  }

  const realFetch = window.fetch.bind(window);

  function ensureLoaded() {
    if (ready) return ready;
    ready = (async () => {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        db = JSON.parse(raw);
        return;
      }
      if (!SEED) throw new Error('Demo dataset is not embedded — run: npm run build:pages');
      seedData = SEED;
      db = clone(SEED);
      save();
    })();
    return ready;
  }

  // Keep in sync if another tab changes the data.
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY && e.newValue) {
      try {
        db = JSON.parse(e.newValue);
      } catch { /* ignore */ }
    }
  });

  /* ---------- stock engine ---------- */
  function movementOf(itemId) {
    let m = 0;
    for (const t of db.transactions) {
      if (t.item_id !== itemId) continue;
      m += t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity;
    }
    return m;
  }
  const balanceOf = (item) => item.opening_stock + movementOf(item.id);
  const withStatus = (item) => {
    const balance = balanceOf(item);
    return { ...item, balance, status: statusOf(balance, item.minimum_stock) };
  };
  const findItem = (id) => db.items.find((i) => i.id === Number(id));
  const findCategory = (id) => db.categories.find((c) => c.id === Number(id));
  const nextItemId = () => db.items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
  const nextCategoryId = () => db.categories.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  const nextTxnRowId = () => db.transactions.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  const nextTransactionId = () =>
    `TXN-${new Date().getFullYear()}-${String(nextTxnRowId()).padStart(6, '0')}`;

  function ensureCategoryExists(name) {
    if (!db.categories.some((c) => eq(c.name, name))) {
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

  function validateMovementPayload(data) {
    const v = {
      item_id: intField(data.item_id, 'Item', { min: 1 }),
      quantity: intField(data.quantity, 'Quantity', { min: 1 }),
      transaction_date: dateField(data.transaction_date || data.date),
      reference: optStr(data.reference),
      supplier: optStr(data.supplier),
      issued_to: optStr(data.issued_to),
      work_order: optStr(data.work_order),
      area: optStr(data.area),
      reason: optStr(data.reason),
      received_by: optStr(data.received_by),
      issued_by: optStr(data.issued_by),
      user: optStr(data.user),
      remarks: optStr(data.remarks),
    };
    const item = findItem(v.item_id);
    if (!item) throw new HttpError(404, 'Item not found. Please select a valid item.');
    v.item = item;
    return v;
  }

  /* ---------- items ---------- */
  function listItems(q = {}) {
    let rows = db.items.map(withStatus);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      rows = rows.filter((i) =>
        [i.item_code, i.item_name, i.part_number, i.brand, i.model].some((v) => String(v || '').toLowerCase().includes(s))
      );
    }
    if (q.category) rows = rows.filter((i) => i.category === q.category);
    if (q.location) rows = rows.filter((i) => i.location === q.location);
    if (q.brand) rows = rows.filter((i) => i.brand === q.brand);
    if (q.status) rows = rows.filter((i) => i.status === q.status);
    rows.sort(byCode);
    return rows;
  }

  function itemDetail(id) {
    const item = findItem(id);
    if (!item) throw new HttpError(404, 'Item not found.');
    const txns = db.transactions.filter((t) => t.item_id === item.id);
    const total_in = txns.filter((t) => t.transaction_type === 'STOCK_IN').reduce((s, t) => s + t.quantity, 0);
    const total_out = txns.filter((t) => t.transaction_type === 'STOCK_OUT').reduce((s, t) => s + t.quantity, 0);
    const total_adjustment = txns.filter((t) => t.transaction_type === 'ADJUSTMENT').reduce((s, t) => s + t.quantity, 0);

    const history = txns
      .slice()
      .sort(cmpDateIdDesc)
      .slice(0, 100)
      .map((t) => ({ ...t, item_code: item.item_code, item_name: item.item_name, unit: item.unit, category: item.category }));

    let running = item.opening_stock;
    const timeline = [{ label: 'Opening Stock', date: 'Start', value: running, type: 'OPENING' }];
    txns
      .slice()
      .sort(cmpDateIdAsc)
      .forEach((t) => {
        running += t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity;
        timeline.push({ label: t.transaction_id, date: t.transaction_date, value: running, type: t.transaction_type });
      });

    return {
      ...withStatus(item),
      total_in,
      total_out,
      total_adjustment,
      transaction_count: txns.length,
      history,
      timeline,
    };
  }

  function createItem(data) {
    const v = validateItemPayload(data || {});
    if (db.items.some((i) => eq(i.item_code, v.item_code))) {
      throw new HttpError(409, `Item code "${v.item_code}" already exists. Item codes must be unique.`);
    }
    ensureCategoryExists(v.category);
    const ts = nowISO();
    const item = { id: nextItemId(), ...v, created_at: ts, updated_at: ts };
    db.items.push(item);
    save();
    return withStatus(item);
  }

  function updateItem(id, data) {
    const existing = findItem(id);
    if (!existing) throw new HttpError(404, 'Item not found.');
    const merged = { ...existing };
    for (const [k, val] of Object.entries(data || {})) {
      if (val !== undefined && val !== null) merged[k] = val;
    }
    const v = validateItemPayload(merged);
    if (db.items.some((i) => i.id !== existing.id && eq(i.item_code, v.item_code))) {
      throw new HttpError(409, `Item code "${v.item_code}" is already used by another item.`);
    }
    ensureCategoryExists(v.category);
    Object.assign(existing, v, { updated_at: nowISO() });
    save();
    return withStatus(existing);
  }

  /* ---------- categories ---------- */
  function listCategories() {
    return db.categories
      .map((c) => ({ ...c, item_count: db.items.filter((i) => eq(i.category, c.name)).length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function createCategory(data) {
    const name = reqStr((data || {}).name, 'Category Name');
    const description = optStr((data || {}).description);
    if (db.categories.some((c) => eq(c.name, name))) {
      throw new HttpError(409, `Category "${name}" already exists.`);
    }
    const cat = { id: nextCategoryId(), name, description, created_at: nowISO() };
    db.categories.push(cat);
    save();
    return cat;
  }
  function updateCategory(id, data) {
    const existing = findCategory(id);
    if (!existing) throw new HttpError(404, 'Category not found.');
    const name = reqStr((data || {}).name, 'Category Name');
    const description = optStr((data || {}).description);
    if (db.categories.some((c) => c.id !== existing.id && eq(c.name, name))) {
      throw new HttpError(409, `Category "${name}" already exists.`);
    }
    if (!eq(existing.name, name)) {
      db.items.forEach((i) => {
        if (eq(i.category, existing.name)) i.category = name;
      });
    }
    existing.name = name;
    existing.description = description;
    save();
    return existing;
  }
  function deleteCategory(id, force = false) {
    const cat = findCategory(id);
    if (!cat) throw new HttpError(404, 'Category not found.');
    const inUse = db.items.filter((i) => eq(i.category, cat.name)).length;
    if (inUse > 0 && !force) {
      throw new HttpError(
        409,
        `Category "${cat.name}" is used by ${inUse} item(s). Reassign those items first, or delete with confirmation.`,
        { itemCount: inUse, category: cat.name }
      );
    }
    let reassigned = 0;
    if (inUse > 0) {
      if (!db.categories.some((c) => eq(c.name, 'Others'))) {
        db.categories.push({ id: nextCategoryId(), name: 'Others', description: 'Miscellaneous items', created_at: nowISO() });
      }
      db.items.forEach((i) => {
        if (eq(i.category, cat.name)) {
          i.category = 'Others';
          reassigned += 1;
        }
      });
    }
    db.categories = db.categories.filter((c) => c.id !== cat.id);
    save();
    return { deleted: true, category: cat.name, reassigned };
  }

  /* ---------- transactions ---------- */
  function listTransactions(q = {}) {
    let rows = db.transactions.map((t) => {
      const item = findItem(t.item_id) || {};
      return { ...t, item_code: item.item_code, item_name: item.item_name, category: item.category, unit: item.unit };
    });
    if (q.type) rows = rows.filter((t) => t.transaction_type === q.type);
    if (q.item_id) rows = rows.filter((t) => t.item_id === Number(q.item_id));
    if (q.category) rows = rows.filter((t) => t.category === q.category);
    if (q.user) {
      const s = String(q.user).toLowerCase();
      rows = rows.filter((t) => String(t.user).toLowerCase().includes(s));
    }
    if (q.from) rows = rows.filter((t) => t.transaction_date >= q.from);
    if (q.to) rows = rows.filter((t) => t.transaction_date <= q.to);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      rows = rows.filter((t) =>
        [t.transaction_id, t.reference, t.work_order, t.item_code, t.item_name, t.remarks].some((v) =>
          String(v || '').toLowerCase().includes(s)
        )
      );
    }
    rows.sort(cmpDateIdDesc);
    return rows.slice(0, 1000);
  }

  function pushTransaction(fields) {
    const txn = {
      id: nextTxnRowId(),
      transaction_id: nextTransactionId(),
      item_id: fields.item_id,
      transaction_type: fields.transaction_type,
      quantity: fields.quantity,
      reference: fields.reference || '',
      supplier: fields.supplier || '',
      issued_to: fields.issued_to || '',
      work_order: fields.work_order || '',
      area: fields.area || '',
      reason: fields.reason || '',
      user: fields.user || '',
      remarks: fields.remarks || '',
      transaction_date: fields.transaction_date,
      created_at: nowISO(),
    };
    db.transactions.push(txn);
    save();
    const item = findItem(txn.item_id);
    return {
      transaction: { ...txn, item_code: item.item_code, item_name: item.item_name, unit: item.unit, category: item.category },
      balance: balanceOf(item),
    };
  }

  function stockIn(data) {
    const v = validateMovementPayload(data);
    return pushTransaction({
      item_id: v.item_id,
      transaction_type: 'STOCK_IN',
      quantity: v.quantity,
      reference: v.reference,
      supplier: v.supplier,
      user: v.received_by || v.user || 'Storekeeper',
      remarks: v.remarks,
      transaction_date: v.transaction_date,
    });
  }

  function stockOut(data) {
    const v = validateMovementPayload(data);
    const available = balanceOf(v.item);
    if (v.quantity > available) {
      throw new HttpError(
        400,
        `Stock Out failed. Only ${available} ${v.item.unit} of "${v.item.item_code}" are currently available.`,
        { available, requested: v.quantity, unit: v.item.unit, item_code: v.item.item_code }
      );
    }
    return pushTransaction({
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
    const item = findItem(itemId);
    if (!item) throw new HttpError(404, 'Item not found. Please select a valid item.');

    const systemStock = balanceOf(item);
    const difference = physical - systemStock;
    if (difference === 0) {
      throw new HttpError(
        400,
        `No adjustment needed. Physical stock matches system stock (${systemStock} ${item.unit}).`,
        { system_stock: systemStock, physical_stock: physical }
      );
    }
    const r = pushTransaction({
      item_id: itemId,
      transaction_type: 'ADJUSTMENT',
      quantity: difference, // signed
      reference: optStr(raw.reference) || 'STOCK-TAKE',
      reason,
      user: optStr(raw.user) || 'Storekeeper',
      remarks: optStr(raw.remarks),
      transaction_date: transactionDate,
    });
    return {
      ...r,
      system_stock: systemStock,
      physical_stock: physical,
      difference,
    };
  }

  /* ---------- dashboard & meta ---------- */
  function dashboard() {
    const today = todayISO();
    const rows = db.items.map(withStatus);
    let totalStock = 0;
    let lowCount = 0;
    let outCount = 0;
    const byCat = new Map();
    for (const r of rows) {
      totalStock += r.balance;
      if (r.status === 'LOW STOCK') lowCount += 1;
      if (r.status === 'OUT OF STOCK') outCount += 1;
      const c = byCat.get(r.category) || { category: r.category, item_count: 0, total_stock: 0 };
      c.item_count += 1;
      c.total_stock += r.balance;
      byCat.set(r.category, c);
    }
    const sum = (type, date) =>
      db.transactions
        .filter((t) => t.transaction_type === type && (!date || t.transaction_date === date))
        .reduce((s, t) => s + t.quantity, 0);

    const totals = {
      total_in: sum('STOCK_IN'),
      total_out: sum('STOCK_OUT'),
      total_adjustment: sum('ADJUSTMENT'),
      total_transactions: db.transactions.length,
    };

    return {
      total_items: db.items.length,
      total_stock: totalStock,
      low_stock_count: lowCount,
      out_of_stock_count: outCount,
      stock_in_today: sum('STOCK_IN', today),
      stock_out_today: sum('STOCK_OUT', today),
      totals,
      stock_overview: { stock_in: totals.total_in, stock_out: totals.total_out, balance: totalStock },
      by_category: [...byCat.values()].sort((a, b) => b.total_stock - a.total_stock),
      low_stock_items: rows
        .filter((i) => i.status !== 'NORMAL')
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 10),
      recent_transactions: listTransactions({}).slice(0, 10),
    };
  }

  function meta() {
    const distinct = (key) =>
      [...new Set(db.items.map((i) => i[key]).filter((v) => v && v !== ''))].sort((a, b) => a.localeCompare(b));
    return { brands: distinct('brand'), locations: distinct('location'), units: distinct('unit') };
  }

  function resetDemo() {
    if (!seedData) throw new HttpError(500, 'Demo dataset not loaded.');
    db = clone(seedData);
    save();
    return { ok: true, message: 'Demo data restored.' };
  }

  /* ---------- fetch shim: same REST API as server.js ---------- */
  function jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }

  async function handleApi(method, url, body) {
    await ensureLoaded();
    const path = url.pathname;
    const q = Object.fromEntries(url.searchParams.entries());
    try {
      let m;
      if (method === 'GET' && path === '/api/health') {
        return jsonResponse(200, { status: 'ok', app: 'BMS IMS', version: VERSION, database: 'localStorage (browser demo)' });
      }
      if (method === 'GET' && path === '/api/dashboard') return jsonResponse(200, dashboard());
      if (method === 'GET' && path === '/api/meta') return jsonResponse(200, meta());
      if (method === 'GET' && path === '/api/items') return jsonResponse(200, listItems(q));
      if (method === 'POST' && path === '/api/items') return jsonResponse(200, createItem(body));
      if ((m = path.match(/^\/api\/items\/(\d+)$/))) {
        if (method === 'GET') return jsonResponse(200, itemDetail(m[1]));
        if (method === 'PUT') return jsonResponse(200, updateItem(m[1], body));
      }
      if (method === 'GET' && path === '/api/categories') return jsonResponse(200, listCategories());
      if (method === 'POST' && path === '/api/categories') return jsonResponse(200, createCategory(body));
      if ((m = path.match(/^\/api\/categories\/(\d+)$/))) {
        if (method === 'PUT') return jsonResponse(200, updateCategory(m[1], body));
        if (method === 'DELETE') return jsonResponse(200, deleteCategory(m[1], q.force === 'true' || q.force === '1'));
      }
      if (method === 'GET' && path === '/api/transactions') return jsonResponse(200, listTransactions(q));
      if (method === 'POST' && path === '/api/transactions/stock-in') return jsonResponse(200, stockIn(body));
      if (method === 'POST' && path === '/api/transactions/stock-out') return jsonResponse(200, stockOut(body));
      if (method === 'POST' && path === '/api/transactions/adjustment') return jsonResponse(200, adjust(body));
      if (method === 'POST' && path === '/api/reset') return jsonResponse(200, resetDemo());
      return jsonResponse(404, { error: 'API endpoint not found.' });
    } catch (e) {
      if (e instanceof HttpError) return jsonResponse(e.status, { error: e.message, ...(e.extra || {}) });
      console.error('[bms-ims local]', e);
      return jsonResponse(500, { error: 'Internal error.' });
    }
  }

  window.fetch = function (input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.pathname.startsWith('/api/')) {
      const method = (init && init.method) || 'GET';
      let body = {};
      if (init && init.body) {
        try { body = JSON.parse(init.body); } catch { body = {}; }
      }
      return handleApi(method, url, body);
    }
    return realFetch(input, init);
  };
})();


/* ============================================================
   SUPABASE CLOUD OVERRIDE
   ============================================================ */
(function () {
  const SUPABASE_URL = 'https://pczpprtdiqpoqodksaxc.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = String.fromCharCode(115,98,95,112,117,98,108,105,115,104,97,98,108,101,95,53,115,106,79,113,54,77,84,72,76,113,50,119,48,108,103,100,83,101,80,106,119,95,45,120,107,56,53,45,118,104);

  if (!window.supabase || !window.supabase.createClient) return;
  if (!SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY.indexOf('PASTE_') === 0) {
    console.warn('[BMS IMS] Supabase publishable key is not configured.');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  window.bmsSupabase = sb; // Reuse the configured client for transaction attachments.
  const nativeFetch = window.fetch.bind(window);
  const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const today = () => new Date().toISOString().slice(0,10);
  const statusOf = (b,m) => b <= 0 ? 'OUT OF STOCK' : (m > 0 && b <= m ? 'LOW STOCK' : 'NORMAL');
  const s = v => String(v ?? '').trim();

  async function load() {
    const [ir,tr] = await Promise.all([
      sb.from('items').select('*').order('item_code'),
      sb.from('transactions').select('*').order('transaction_date',{ascending:false}).order('id',{ascending:false})
    ]);
    if (ir.error) throw ir.error;
    if (tr.error) throw tr.error;
    const tx = tr.data || [], by = new Map();
    tx.forEach(t => { if(!by.has(t.item_id)) by.set(t.item_id,[]); by.get(t.item_id).push(t); });
    const items = (ir.data||[]).map(i => {
      const ts=by.get(i.id)||[];
      const movement=ts.reduce((n,t)=>n+(t.transaction_type==='STOCK_OUT'?-Number(t.quantity):Number(t.quantity)),0);
      const balance=Number(i.opening_stock||0)+movement;
      return {...i,balance,status:statusOf(balance,Number(i.minimum_stock||0))};
    });
    return {items,tx};
  }
  const decorated=(tx,items)=> {
    const map=new Map(items.map(i=>[i.id,i]));
    return tx.map(t=>{const i=map.get(t.item_id)||{};return {...t,user:t.user_name||'',item_code:i.item_code,item_name:i.item_name,category:i.category,unit:i.unit};});
  };

  async function apiCloud(method,url,body) {
    try {
      if(method==='GET' && url.pathname==='/api/health'){
        const r=await sb.from('items').select('id',{count:'exact',head:true});
        if(r.error) throw r.error;
        return json(200,{status:'ok',app:'BMS IMS',version:'2.0.0',database:'Supabase cloud'});
      }
      const {items,tx}=await load();
      const q=Object.fromEntries(url.searchParams.entries());

      if(method==='GET' && url.pathname==='/api/items'){
        let rows=items;
        if(q.search){const z=q.search.toLowerCase();rows=rows.filter(i=>[i.item_code,i.item_name,i.part_number,i.brand,i.model].some(v=>String(v||'').toLowerCase().includes(z)));}
        if(q.category) rows=rows.filter(i=>i.category===q.category);
        if(q.location) rows=rows.filter(i=>i.location===q.location);
        if(q.brand) rows=rows.filter(i=>i.brand===q.brand);
        if(q.status) rows=rows.filter(i=>i.status===q.status);
        return json(200,rows);
      }

      if(method==='GET' && url.pathname==='/api/categories'){
        const m=new Map();
        items.forEach(i=>{if(!m.has(i.category))m.set(i.category,{id:i.category,name:i.category,description:'',item_count:0});m.get(i.category).item_count++;});
        return json(200,[...m.values()].sort((a,b)=>a.name.localeCompare(b.name)));
      }

      if(method==='GET' && url.pathname==='/api/meta'){
        const distinct=k=>[...new Set(items.map(i=>i[k]).filter(Boolean))].sort();
        return json(200,{brands:distinct('brand'),locations:distinct('location'),units:distinct('unit')});
      }

      if(method==='GET' && url.pathname==='/api/dashboard'){
        const sum=(type,date)=>tx.filter(t=>t.transaction_type===type&&(!date||t.transaction_date===date)).reduce((n,t)=>n+Number(t.quantity),0);
        const cats=new Map();
        items.forEach(i=>{const c=cats.get(i.category)||{category:i.category,item_count:0,total_stock:0};c.item_count++;c.total_stock+=i.balance;cats.set(i.category,c);});
        return json(200,{
          total_items:items.length,total_stock:items.reduce((n,i)=>n+i.balance,0),
          low_stock_count:items.filter(i=>i.status==='LOW STOCK').length,
          out_of_stock_count:items.filter(i=>i.status==='OUT OF STOCK').length,
          stock_in_today:sum('STOCK_IN',today()),stock_out_today:sum('STOCK_OUT',today()),
          totals:{total_in:sum('STOCK_IN'),total_out:sum('STOCK_OUT'),total_adjustment:sum('ADJUSTMENT'),total_transactions:tx.length},
          stock_overview:{stock_in:sum('STOCK_IN'),stock_out:sum('STOCK_OUT'),balance:items.reduce((n,i)=>n+i.balance,0)},
          by_category:[...cats.values()].sort((a,b)=>b.total_stock-a.total_stock),
          low_stock_items:items.filter(i=>i.status!=='NORMAL').sort((a,b)=>a.balance-b.balance).slice(0,10),
          recent_transactions:decorated(tx.slice(0,10),items)
        });
      }

      let m=url.pathname.match(/^\/api\/items\/(\d+)$/);
      if(m){
        const id=Number(m[1]),item=items.find(i=>i.id===id);
        if(!item)return json(404,{error:'Item not found.'});
        if(method==='GET'){
          const h=decorated(tx.filter(t=>t.item_id===id),items);
          let running=item.opening_stock;
          const timeline=[{label:'Opening Stock',date:'Start',value:running,type:'OPENING'}];
          h.slice().sort((a,b)=>a.transaction_date.localeCompare(b.transaction_date)||a.id-b.id).forEach(t=>{running+=t.transaction_type==='STOCK_OUT'?-t.quantity:t.quantity;timeline.push({label:t.transaction_id,date:t.transaction_date,value:running,type:t.transaction_type});});
          return json(200,{...item,total_in:h.filter(t=>t.transaction_type==='STOCK_IN').reduce((n,t)=>n+t.quantity,0),total_out:h.filter(t=>t.transaction_type==='STOCK_OUT').reduce((n,t)=>n+t.quantity,0),total_adjustment:h.filter(t=>t.transaction_type==='ADJUSTMENT').reduce((n,t)=>n+t.quantity,0),transaction_count:h.length,history:h.slice(0,100),timeline});
        }
        if(method==='PUT'){
          const patch={};
          ['item_name','description','category','subcategory','brand','model','part_number','unit','location','minimum_stock','maximum_stock','opening_stock','supplier','remarks'].forEach(k=>{if(body[k]!==undefined)patch[k]=body[k];});
          ['minimum_stock','maximum_stock','opening_stock'].forEach(k=>{if(patch[k]!==undefined)patch[k]=Number(patch[k]);});
          patch.updated_at=new Date().toISOString();
          const r=await sb.from('items').update(patch).eq('id',id).select('*').single();
          if(r.error)throw r.error;
          const fresh=await load();return json(200,fresh.items.find(i=>i.id===id)||r.data);
        }
      }

      if(method==='POST' && url.pathname==='/api/items'){
        const v={item_code:s(body.item_code),item_name:s(body.item_name),description:s(body.description),category:s(body.category),subcategory:s(body.subcategory),brand:s(body.brand),model:s(body.model),part_number:s(body.part_number),unit:s(body.unit)||'PCS',location:s(body.location)||'BMS Store',minimum_stock:Number(body.minimum_stock||0),maximum_stock:Number(body.maximum_stock||0),opening_stock:Number(body.opening_stock||0),supplier:s(body.supplier),remarks:s(body.remarks)};
        if(!v.item_code||!v.item_name||!v.category)return json(400,{error:'Item Code, Item Name and Category are required.'});
        const r=await sb.from('items').insert(v).select('*').single();if(r.error)throw r.error;
        return json(200,{...r.data,balance:r.data.opening_stock,status:statusOf(r.data.opening_stock,r.data.minimum_stock)});
      }

      if(method==='GET' && url.pathname==='/api/transactions'){
        let rows=decorated(tx,items);
        if(q.type)rows=rows.filter(t=>t.transaction_type===q.type);
        if(q.item_id)rows=rows.filter(t=>t.item_id===Number(q.item_id));
        if(q.category)rows=rows.filter(t=>t.category===q.category);
        if(q.user)rows=rows.filter(t=>String(t.user||'').toLowerCase().includes(q.user.toLowerCase()));
        if(q.from)rows=rows.filter(t=>t.transaction_date>=q.from);
        if(q.to)rows=rows.filter(t=>t.transaction_date<=q.to);
        if(q.search){const z=q.search.toLowerCase();rows=rows.filter(t=>[t.transaction_id,t.reference,t.work_order,t.item_code,t.item_name,t.remarks].some(v=>String(v||'').toLowerCase().includes(z)));}
        return json(200,rows.slice(0,1000));
      }

      if(method==='POST' && (url.pathname==='/api/transactions/stock-in'||url.pathname==='/api/transactions/stock-out')){
        const type=url.pathname.endsWith('stock-in')?'STOCK_IN':'STOCK_OUT';
        const itemId=Number(body.item_id),qty=Number(body.quantity),item=items.find(i=>i.id===itemId);
        if(!item||!Number.isInteger(qty)||qty<1)return json(400,{error:'Valid item and positive quantity are required.'});
        if(type==='STOCK_OUT'&&qty>item.balance)return json(400,{error:`Stock Out failed. Only ${item.balance} ${item.unit} of "${item.item_code}" are currently available.`});
        const max=(await sb.from('transactions').select('id').order('id',{ascending:false}).limit(1)).data?.[0]?.id||0;
        const row={transaction_id:`TXN-${new Date().getFullYear()}-${String(Number(max)+1).padStart(6,'0')}`,item_id:itemId,transaction_type:type,quantity:qty,reference:s(body.reference||(type==='STOCK_OUT'?body.work_order:'')),supplier:s(body.supplier),issued_to:s(body.issued_to),work_order:s(body.work_order),area:s(body.area),reason:s(body.reason),received_by:s(body.received_by),issued_by:s(body.issued_by),user_name:s(body.received_by||body.issued_by||body.user)||(type==='STOCK_IN'?'Storekeeper':'BMS Technician'),remarks:s(body.remarks),transaction_date:s(body.transaction_date||body.date)||today()};
        const r=await sb.from('transactions').insert(row).select('*').single();if(r.error)throw r.error;
        return json(200,{transaction:{...r.data,user:r.data.user_name,item_code:item.item_code,item_name:item.item_name,unit:item.unit,category:item.category},balance:type==='STOCK_OUT'?item.balance-qty:item.balance+qty});
      }

      if(method==='POST' && url.pathname==='/api/transactions/adjustment'){
        const itemId=Number(body.item_id),physical=Number(body.physical_stock),item=items.find(i=>i.id===itemId),reason=s(body.reason);
        if(!item||!Number.isInteger(physical)||physical<0||!reason)return json(400,{error:'Valid item, physical stock and reason are required.'});
        const diff=physical-item.balance;if(diff===0)return json(400,{error:`No adjustment needed. Physical stock matches system stock (${item.balance} ${item.unit}).`});
        const max=(await sb.from('transactions').select('id').order('id',{ascending:false}).limit(1)).data?.[0]?.id||0;
        const row={transaction_id:`TXN-${new Date().getFullYear()}-${String(Number(max)+1).padStart(6,'0')}`,item_id:itemId,transaction_type:'ADJUSTMENT',quantity:diff,reference:s(body.reference)||'STOCK-TAKE',reason,user_name:s(body.user)||'Storekeeper',remarks:s(body.remarks),transaction_date:s(body.transaction_date||body.date)||today()};
        const r=await sb.from('transactions').insert(row).select('*').single();if(r.error)throw r.error;
        return json(200,{transaction:r.data,balance:physical,system_stock:item.balance,physical_stock:physical,difference:diff});
      }

      if(method==='POST'&&url.pathname==='/api/reset')return json(400,{error:'Reset Demo Data is disabled for cloud inventory.'});
      return json(404,{error:'API endpoint not found.'});
    } catch(e) { console.error('[BMS IMS]',e); return json(500,{error:e.message||'Supabase request failed.'}); }
  }

  window.fetch=function(input,init){
    const url=new URL(typeof input==='string'?input:input.url,location.href);
    if(url.pathname.startsWith('/api/')){
      const method=(init&&init.method)||'GET';let body={};
      if(init&&init.body){try{body=JSON.parse(init.body);}catch{}}
      return apiCloud(method,url,body);
    }
    return nativeFetch(input,init);
  };
})();
