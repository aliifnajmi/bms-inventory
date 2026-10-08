'use strict';

/**
 * BMS IMS — end-to-end smoke test.
 * Boots the server on a test port with a throwaway database and exercises
 * the full inventory workflow: items, stock in, stock out, insufficient-stock
 * protection, adjustments, statuses, dashboard, search/filter, categories.
 *
 *   npm test
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 3987;
const BASE = `http://127.0.0.1:${PORT}`;

// Use a throwaway database BEFORE requiring the server.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bms-ims-test-'));
process.env.BMS_DB_PATH = path.join(tmp, 'test.db');

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

async function main() {
  const { start } = require('../server');
  const server = start(PORT);
  await new Promise((resolve) => server.on('listening', resolve));
  console.log(`\nBMS IMS smoke test — ${BASE}\n`);

  try {
    /* ---- demo data ---- */
    console.log('Demo data:');
    let r = await api('GET', '/api/dashboard');
    check('dashboard responds', r.status === 200);
    check('30 demo items', r.data.total_items === 30, `got ${r.data.total_items}`);
    check('has low-stock items', r.data.low_stock_count > 0, `got ${r.data.low_stock_count}`);
    check('has out-of-stock items', r.data.out_of_stock_count > 0, `got ${r.data.out_of_stock_count}`);
    check('has transactions', r.data.totals.total_transactions >= 30, `got ${r.data.totals.total_transactions}`);
    check('stock-in-today > 0 (seeded)', r.data.stock_in_today > 0);
    check('stock-out-today > 0 (seeded)', r.data.stock_out_today > 0);

    r = await api('GET', '/api/items');
    check('30 items listed', r.data.length === 30);
    const sen1 = r.data.find((i) => i.item_code === 'BMS-SEN-001');
    check('BMS-SEN-001 balance = 22 (10 opening + 15 in + 10 in - 13 out)', sen1.balance === 22, `got ${sen1.balance}`);
    check('BMS-SEN-001 status NORMAL', sen1.status === 'NORMAL');
    const ctrl1 = r.data.find((i) => i.item_code === 'BMS-CTRL-001');
    check('BMS-CTRL-001 balance = 0', ctrl1.balance === 0);
    check('BMS-CTRL-001 status OUT OF STOCK', ctrl1.status === 'OUT OF STOCK');

    /* ---- add item ---- */
    console.log('\nAdd item:');
    r = await api('POST', '/api/items', {
      item_code: 'TEST-NEW-001', item_name: 'Test Sensor', category: 'BMS',
      unit: 'PCS', minimum_stock: 2, maximum_stock: 10, opening_stock: 5,
      brand: 'TestBrand', location: 'Store A', supplier: 'Test Supplier',
    });
    check('create item', r.status === 200 && r.data.balance === 5, JSON.stringify(r.data));
    const newId = r.data.id;
    r = await api('POST', '/api/items', { item_code: 'TEST-NEW-001', item_name: 'Dup', category: 'BMS', unit: 'PCS' });
    check('duplicate item code rejected (409)', r.status === 409, `got ${r.status}`);
    r = await api('POST', '/api/items', { item_code: 'TEST-BAD-001', item_name: 'X', category: 'Nope', unit: 'PCS' });
    check('missing category rejected (400)', r.status === 400, `got ${r.status}`);
    r = await api('POST', '/api/items', { item_name: 'No code', category: 'BMS', unit: 'PCS' });
    check('missing item code rejected (400)', r.status === 400, `got ${r.status}`);

    /* ---- stock in ---- */
    console.log('\nStock In:');
    r = await api('POST', '/api/transactions/stock-in', {
      item_id: newId, quantity: 7, reference: 'DO-TEST-1', supplier: 'Test Supplier', received_by: 'Tester',
    });
    check('stock in +7', r.status === 200 && r.data.balance === 12, `got ${r.data.balance}`);
    check('stock in creates transaction', !!r.data.transaction.transaction_id);
    r = await api('POST', '/api/transactions/stock-in', { item_id: newId, quantity: 0 });
    check('quantity 0 rejected (400)', r.status === 400, `got ${r.status}`);
    r = await api('POST', '/api/transactions/stock-in', { item_id: newId, quantity: -3 });
    check('negative quantity rejected (400)', r.status === 400, `got ${r.status}`);
    r = await api('POST', '/api/transactions/stock-in', { item_id: newId, quantity: 1, transaction_date: '08/10/2026' });
    check('invalid date rejected (400)', r.status === 400, `got ${r.status}`);
    r = await api('POST', '/api/transactions/stock-in', { item_id: 999999, quantity: 1 });
    check('missing item rejected (404)', r.status === 404, `got ${r.status}`);

    /* ---- stock out ---- */
    console.log('\nStock Out:');
    r = await api('POST', '/api/transactions/stock-out', {
      item_id: newId, quantity: 4, work_order: 'WO-TEST-1', issued_to: 'BMS Team',
      area: 'Level 1', reason: 'Testing', issued_by: 'Tester',
    });
    check('stock out -4 → balance 8', r.status === 200 && r.data.balance === 8, `got ${r.data.balance}`);
    r = await api('POST', '/api/transactions/stock-out', { item_id: newId, quantity: 999, issued_by: 'Tester' });
    check('insufficient stock rejected (400)', r.status === 400, `got ${r.status}`);
    check('insufficient message mentions availability', /Only 8 PCS/.test(r.data.error || ''), r.data.error);
    r = await api('GET', `/api/items/${newId}`);
    check('balance unchanged after failed stock out', r.data.balance === 8, `got ${r.data.balance}`);

    /* ---- adjustment ---- */
    console.log('\nAdjustment:');
    r = await api('POST', '/api/transactions/adjustment', {
      item_id: newId, physical_stock: 6, reason: 'Physical stock verification', user: 'Storekeeper',
    });
    check('adjustment -2 → balance 6', r.status === 200 && r.data.balance === 6 && r.data.difference === -2, JSON.stringify(r.data));
    r = await api('GET', `/api/items/${newId}`);
    check('adjustment appears in history', r.data.history.some((t) => t.transaction_type === 'ADJUSTMENT'));
    check('totals: in=7, out=4, adj=-2', r.data.total_in === 7 && r.data.total_out === 4 && r.data.total_adjustment === -2,
      `in=${r.data.total_in} out=${r.data.total_out} adj=${r.data.total_adjustment}`);
    check('formula: 5 + 7 - 4 - 2 = 6', r.data.opening_stock + r.data.total_in - r.data.total_out + r.data.total_adjustment === r.data.balance);
    r = await api('POST', '/api/transactions/adjustment', { item_id: newId, physical_stock: 6, reason: 'again' });
    check('no-change adjustment rejected (400)', r.status === 400, `got ${r.status}`);
    r = await api('POST', '/api/transactions/adjustment', { item_id: newId, physical_stock: 3 });
    check('adjustment without reason rejected (400)', r.status === 400, `got ${r.status}`);

    /* ---- status logic ---- */
    console.log('\nStatus logic:');
    r = await api('GET', `/api/items/${newId}`);
    check('balance 6 > min 2 → NORMAL', r.data.status === 'NORMAL');
    await api('POST', '/api/transactions/stock-out', { item_id: newId, quantity: 5, issued_by: 'Tester' });
    r = await api('GET', `/api/items/${newId}`);
    check('balance 1 ≤ min 2 → LOW STOCK', r.data.status === 'LOW STOCK', r.data.status);
    await api('POST', '/api/transactions/stock-out', { item_id: newId, quantity: 1, issued_by: 'Tester' });
    r = await api('GET', `/api/items/${newId}`);
    check('balance 0 → OUT OF STOCK', r.data.status === 'OUT OF STOCK', r.data.status);

    /* ---- edit item (balance must not change) ---- */
    console.log('\nEdit item:');
    r = await api('PUT', `/api/items/${newId}`, { item_name: 'Test Sensor (renamed)', minimum_stock: 1, remarks: 'edited' });
    check('edit item ok', r.status === 200 && r.data.item_name === 'Test Sensor (renamed)');
    check('balance preserved after edit', r.data.balance === 0, `got ${r.data.balance}`);
    r = await api('PUT', `/api/items/${newId}`, { balance: 999 });
    check('manual balance edit ignored', r.status === 200 && r.data.balance === 0, `got ${r.data.balance}`);

    /* ---- search & filter ---- */
    console.log('\nSearch & filter:');
    r = await api('GET', '/api/items?search=sensor');
    check('search "sensor" finds items', r.data.length >= 3 && r.data.every((i) => /sensor/i.test(i.item_code + i.item_name + i.brand + i.part_number)), `got ${r.data.length}`);
    r = await api('GET', '/api/items?status=OUT%20OF%20STOCK');
    check('status filter OUT OF STOCK', r.data.length >= 6 && r.data.every((i) => i.status === 'OUT OF STOCK'), `got ${r.data.length}`);
    r = await api('GET', '/api/items?category=Tools');
    check('category filter', r.data.length === 3 && r.data.every((i) => i.category === 'Tools'), `got ${r.data.length}`);
    r = await api('GET', '/api/items?location=Store%20C');
    check('location filter', r.data.length >= 3 && r.data.every((i) => i.location === 'Store C'), `got ${r.data.length}`);
    r = await api('GET', '/api/items?brand=Fluke');
    check('brand filter', r.data.length === 3 && r.data.every((i) => i.brand === 'Fluke'), `got ${r.data.length}`);
    r = await api('GET', '/api/transactions?type=STOCK_OUT');
    check('transaction type filter', r.data.length >= 30 && r.data.every((t) => t.transaction_type === 'STOCK_OUT'), `got ${r.data.length}`);
    r = await api('GET', '/api/transactions?search=WO-2026-041');
    check('transaction search', r.data.length >= 1 && r.data[0].work_order === 'WO-2026-041');
    r = await api('GET', '/api/transactions?from=2026-10-01&to=2026-10-08');
    check('transaction date-range filter', r.data.length >= 3 && r.data.every((t) => t.transaction_date >= '2026-10-01' && t.transaction_date <= '2026-10-08'), `got ${r.data.length}`);

    /* ---- categories ---- */
    console.log('\nCategories:');
    r = await api('GET', '/api/categories');
    check('10 default categories', r.data.length === 10, `got ${r.data.length}`);
    r = await api('POST', '/api/categories', { name: 'TestCat', description: 'temp' });
    check('create category', r.status === 200);
    const catId = r.data.id;
    r = await api('POST', '/api/categories', { name: 'TestCat' });
    check('duplicate category rejected (409)', r.status === 409, `got ${r.status}`);
    r = await api('DELETE', `/api/categories/${catId}`);
    check('delete unused category', r.status === 200);
    r = await api('DELETE', '/api/categories/1');
    check('delete in-use category blocked (409)', r.status === 409, `got ${r.status}`);
    r = await api('DELETE', '/api/categories/1?force=true');
    check('force delete reassigns items', r.status === 200 && r.data.reassigned > 0, JSON.stringify(r.data));
    r = await api('GET', '/api/items?category=BMS');
    check('items moved to Others after force delete', r.data.length === 0, `got ${r.data.length}`);

    /* ---- dashboard recalculates ---- */
    console.log('\nDashboard recalculation:');
    r = await api('GET', '/api/dashboard');
    check('dashboard updates after transactions', r.data.total_items === 31, `got ${r.data.total_items}`);
    const d2 = await api('GET', '/api/dashboard');
    check('low+out counts consistent', d2.data.low_stock_count + d2.data.out_of_stock_count >= 11, `low=${d2.data.low_stock_count} out=${d2.data.out_of_stock_count}`);

    /* ---- item detail / timeline ---- */
    console.log('\nItem detail:');
    r = await api('GET', '/api/items/1');
    check('item detail has timeline', Array.isArray(r.data.timeline) && r.data.timeline.length >= 3);
    check('timeline ends at current balance', r.data.timeline[r.data.timeline.length - 1].value === r.data.balance);
    r = await api('GET', '/api/items/999999');
    check('unknown item → 404', r.status === 404);

    /* ---- static frontend ---- */
    console.log('\nFrontend:');
    const page = await fetch(BASE + '/');
    const html = await page.text();
    check('index.html served', page.status === 200 && html.includes('BMS IMS'));
    const js = await fetch(BASE + '/js/app.js');
    check('app.js served', js.status === 200);
    const css = await fetch(BASE + '/css/style.css');
    check('style.css served', css.status === 200);
  } finally {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
