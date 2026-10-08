'use strict';

/**
 * Builds the GitHub Pages static demo into docs/.
 *
 *   npm run build:pages
 *
 * The Pages build is 100% static (no server):
 *   - docs/index.html          shell that loads js/local-backend.js (localStorage API)
 *   - docs/css, docs/js/app.js, docs/js/charts.js   shared frontend, copied from public/
 *   - docs/js/local-backend.js browser implementation of the REST API
 *   - docs/data/seed.json      demo dataset, generated from seed.js (stays in sync)
 *   - docs/.nojekyll           disables Jekyll processing on GitHub Pages
 */

const fs = require('node:fs');
const path = require('node:path');
const { CATEGORIES, ITEMS, TXNS } = require('../seed');

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/* 1. clean output */
fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(DOCS, { recursive: true });

/* 2. shared frontend assets (identical UI to the Node version) */
copy(path.join(ROOT, 'public/css/style.css'), path.join(DOCS, 'css/style.css'));
copy(path.join(ROOT, 'public/js/app.js'), path.join(DOCS, 'js/app.js'));
copy(path.join(ROOT, 'public/js/charts.js'), path.join(DOCS, 'js/charts.js'));

/* 3. pages-specific sources */
copy(path.join(ROOT, 'pages-src/index.html'), path.join(DOCS, 'index.html'));
copy(path.join(ROOT, 'pages-src/js/local-backend.js'), path.join(DOCS, 'js/local-backend.js'));

/* 4. demo dataset, generated from seed.js so it never drifts */
const now = new Date().toISOString();
const categories = CATEGORIES.map(([name, description], i) => ({ id: i + 1, name, description, created_at: now }));
const items = ITEMS.map((r, i) => ({
  id: i + 1,
  item_code: r[0],
  item_name: r[1],
  description: r[2],
  category: r[3],
  subcategory: r[4],
  brand: r[5],
  model: r[6],
  part_number: r[7],
  unit: r[8],
  location: r[9],
  minimum_stock: r[10],
  maximum_stock: r[11],
  opening_stock: r[12],
  supplier: r[13],
  remarks: r[14],
  created_at: now,
  updated_at: now,
}));
const idByCode = new Map(items.map((it) => [it.item_code, it.id]));
const transactions = TXNS.map(([code, type, qty, date, extra], i) => ({
  id: i + 1,
  transaction_id: `TXN-2026-${String(i + 1).padStart(6, '0')}`,
  item_id: idByCode.get(code),
  transaction_type: type,
  quantity: qty,
  reference: extra.reference || '',
  supplier: extra.supplier || '',
  issued_to: extra.issued_to || '',
  work_order: extra.work_order || '',
  area: extra.area || '',
  reason: extra.reason || '',
  user: extra.user || '',
  remarks: extra.remarks || '',
  transaction_date: date,
  created_at: now,
}));
fs.mkdirSync(path.join(DOCS, 'data'), { recursive: true });
fs.writeFileSync(path.join(DOCS, 'data/seed.json'), JSON.stringify({ categories, items, transactions }));

/* 5. nojekyll */
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '');

console.log(
  `[build-pages] docs/ written — ${categories.length} categories, ${items.length} items, ${transactions.length} transactions`
);
