'use strict';

/* ============================================================
   BMS IMS — frontend application (vanilla JS SPA, hash router)
   ============================================================ */

/* ---------- icons (feather-style inline SVG) ---------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  tag: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
};

function icon(name, size = 18) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------- small utilities ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, type = 'success') {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = icon(type === 'error' ? 'alert' : 'check', 17) + `<span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 260);
  }, 4200);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (HTTP ${res.status})`);
  return data;
}

function badge(status) {
  const map = {
    NORMAL: ['normal', 'Normal'],
    'LOW STOCK': ['low', 'Low Stock'],
    'OUT OF STOCK': ['out', 'Out of Stock'],
  };
  const [cls, label] = map[status] || ['normal', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function typeBadge(t) {
  if (t === 'STOCK_IN') return '<span class="badge tin">STOCK IN</span>';
  if (t === 'STOCK_OUT') return '<span class="badge tout">STOCK OUT</span>';
  return '<span class="badge tadj">ADJUSTMENT</span>';
}

function signedQty(t) {
  const q = Number(t.quantity);
  if (t.transaction_type === 'STOCK_IN') return `<span class="qty in">+${q}</span>`;
  if (t.transaction_type === 'STOCK_OUT') return `<span class="qty out">−${q}</span>`;
  return `<span class="qty adj">${q > 0 ? '+' : ''}${q}</span>`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyRow(colspan, msg = 'No records found.') {
  return `<tr><td colspan="${colspan}" class="empty">${esc(msg)}</td></tr>`;
}

function downloadCsv(filename, headers, rows) {
  const escCsv = (v) => {
    v = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  const csv = [headers.map(escCsv).join(','), ...rows.map((r) => r.map(escCsv).join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Exported ${filename}`);
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/* ---------- shared state ---------- */
const state = {
  items: [],
  categories: [],
  meta: { brands: [], locations: [], units: [] },
  inv: { search: '', category: '', location: '', brand: '', status: '' },
  txn: { type: '', item_id: '', category: '', user: '', from: '', to: '', search: '' },
};

async function reloadMaster() {
  const [items, categories, meta] = await Promise.all([
    api('/api/items'),
    api('/api/categories'),
    api('/api/meta'),
  ]);
  state.items = items;
  state.categories = categories;
  state.meta = meta;
}

/* ---------- modal ---------- */
function openModal(title, bodyHtml, footerHtml = '', wide = false) {
  $('#modalRoot').innerHTML = `
    <div class="modal-backdrop" id="modalBackdrop">
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" id="modalClose" aria-label="Close">${icon('x', 17)}</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
      </div>
    </div>`;
  $('#modalClose').onclick = closeModal;
  $('#modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  document.addEventListener('keydown', escKey);
}

function escKey(e) {
  if (e.key === 'Escape') closeModal();
}

function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.removeEventListener('keydown', escKey);
}

function modalError(msg) {
  const el = $('#modalError');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

/* ---------- item picker (filter + listbox) ---------- */
function itemSelectHtml(id) {
  const opts = state.items
    .map(
      (i) =>
        `<option value="${i.id}" data-balance="${i.balance}" data-unit="${esc(i.unit)}" data-min="${i.minimum_stock}" data-status="${i.status}" data-loc="${esc(i.location)}">${esc(i.item_code)} — ${esc(i.item_name)}</option>`
    )
    .join('');
  return `
    <div class="field full">
      <label class="req">Item</label>
      <input type="text" class="select-filter" id="${id}_filter" placeholder="Type to filter items by code or name…" autocomplete="off">
      <select id="${id}" size="8" class="item-select">
        <option value="">— Select an item —</option>
        ${opts}
      </select>
      <div class="item-info" id="${id}_info" style="display:none"></div>
    </div>`;
}

function showItemInfo(sel, info) {
  const o = sel.selectedOptions[0];
  if (!o || !o.value) {
    info.style.display = 'none';
    info.innerHTML = '';
    return;
  }
  const b = Number(o.dataset.balance);
  const unit = o.dataset.unit;
  info.innerHTML = `
    <div class="info-grid">
      <div><span>Current Balance</span><strong>${b} ${esc(unit)}</strong></div>
      <div><span>Minimum Stock</span><strong>${o.dataset.min} ${esc(unit)}</strong></div>
      <div><span>Location</span><strong>${esc(o.dataset.loc || '—')}</strong></div>
      <div><span>Status</span><strong>${badge(o.dataset.status)}</strong></div>
    </div>`;
  info.style.display = 'block';
}

function bindItemSelect(selectId, onChange) {
  const sel = $('#' + selectId);
  const filter = $('#' + selectId + '_filter');
  const info = $('#' + selectId + '_info');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    [...sel.options].forEach((o) => {
      if (!o.value) return;
      o.hidden = !!q && !o.textContent.toLowerCase().includes(q);
    });
  });
  sel.addEventListener('change', () => {
    showItemInfo(sel, info);
    if (onChange) onChange(sel);
  });
}

/* ---------- add / edit item modal ---------- */
function itemFormHtml(item = {}) {
  const val = (k, d = '') => (item[k] !== undefined && item[k] !== null && item[k] !== '' ? item[k] : d);
  const catOpts = state.categories
    .map((c) => `<option value="${esc(c.name)}" ${val('category') === c.name ? 'selected' : ''}>${esc(c.name)}</option>`)
    .join('');
  const unitOpts = ['PCS', 'MTR', 'BOX', 'ROLL', 'SET', 'BAG', 'PAIR', 'LOT', 'CAN', 'BOTTLE']
    .map((u) => `<option value="${u}" ${val('unit') === u ? 'selected' : ''}>${u}</option>`)
    .join('');
  return `
    <div class="form-error" id="modalError" style="display:none"></div>
    <div class="form-grid">
      <div class="field"><label class="req">Item Code</label><input id="f_code" value="${esc(val('item_code'))}" placeholder="e.g. BMS-SEN-003" ${item.id ? 'readonly' : ''}><div class="hint">Must be unique.${item.id ? ' Cannot be changed after creation.' : ''}</div></div>
      <div class="field"><label class="req">Item Name</label><input id="f_name" value="${esc(val('item_name'))}" placeholder="e.g. Temperature Sensor"></div>
      <div class="field"><label class="req">Category</label><select id="f_category"><option value="">— Select category —</option>${catOpts}</select></div>
      <div class="field"><label>Subcategory</label><input id="f_subcategory" value="${esc(val('subcategory'))}" placeholder="e.g. Sensors"></div>
      <div class="field"><label>Brand</label><input id="f_brand" value="${esc(val('brand'))}" list="brandList" placeholder="e.g. Honeywell"></div>
      <div class="field"><label>Model</label><input id="f_model" value="${esc(val('model'))}"></div>
      <div class="field"><label>Part Number</label><input id="f_part" value="${esc(val('part_number'))}"></div>
      <div class="field"><label class="req">Unit</label><input id="f_unit" value="${esc(val('unit', 'PCS'))}" list="unitList"></div>
      <div class="field"><label>Location</label><input id="f_location" value="${esc(val('location'))}" list="locList" placeholder="e.g. Store A"></div>
      <div class="field"><label class="req">Minimum Stock</label><input id="f_min" type="number" min="0" step="1" value="${val('minimum_stock', 0)}"></div>
      <div class="field"><label>Maximum Stock</label><input id="f_max" type="number" min="0" step="1" value="${val('maximum_stock', 0)}"></div>
      <div class="field"><label>Opening Stock</label><input id="f_opening" type="number" min="0" step="1" value="${val('opening_stock', 0)}"><div class="hint">Starting balance. The Stock Balance itself is always calculated from transactions and cannot be typed in.</div></div>
      <div class="field"><label>Supplier</label><input id="f_supplier" value="${esc(val('supplier'))}"></div>
      <div class="field full"><label>Description</label><textarea id="f_desc" rows="2">${esc(val('description'))}</textarea></div>
      <div class="field full"><label>Remarks</label><textarea id="f_remarks" rows="2">${esc(val('remarks'))}</textarea></div>
    </div>
    <datalist id="brandList">${state.meta.brands.map((b) => `<option value="${esc(b)}">`).join('')}</datalist>
    <datalist id="unitList">${unitOpts}</datalist>
    <datalist id="locList">${state.meta.locations.map((l) => `<option value="${esc(l)}">`).join('')}</datalist>`;
}

function openItemModal(id) {
  const item = id ? state.items.find((i) => i.id === id) || {} : {};
  openModal(
    id ? `Edit Item — ${item.item_code || ''}` : 'Add New Item',
    itemFormHtml(item) +
      `<div class="form-actions">
         <button class="btn btn-primary" id="btnSaveItem">${icon('check', 16)} Save Item</button>
         <button class="btn" id="btnCancelItem">Cancel</button>
       </div>`,
    '',
    true
  );
  $('#btnCancelItem').onclick = closeModal;
  $('#btnSaveItem').onclick = async () => {
    const payload = {
      item_code: $('#f_code').value,
      item_name: $('#f_name').value,
      category: $('#f_category').value,
      subcategory: $('#f_subcategory').value,
      brand: $('#f_brand').value,
      model: $('#f_model').value,
      part_number: $('#f_part').value,
      unit: $('#f_unit').value,
      location: $('#f_location').value,
      minimum_stock: $('#f_min').value,
      maximum_stock: $('#f_max').value,
      opening_stock: $('#f_opening').value,
      supplier: $('#f_supplier').value,
      description: $('#f_desc').value,
      remarks: $('#f_remarks').value,
    };
    try {
      if (id) await api(`/api/items/${id}`, { method: 'PUT', body: payload });
      else await api('/api/items', { method: 'POST', body: payload });
      closeModal();
      toast(id ? 'Item updated successfully.' : 'Item added successfully.');
      await reloadMaster();
      router();
    } catch (e) {
      modalError(e.message);
    }
  };
}

/* ---------- stock adjustment (shared form) ---------- */
function adjustmentHtml(prefix) {
  return `
    <form id="${prefix}Form">
      <div class="form-grid">
        <div class="field"><label class="req">Date</label><input type="date" id="${prefix}_date" value="${todayStr()}"></div>
        ${itemSelectHtml(prefix + '_item')}
        <div class="field"><label>System Stock</label><input id="${prefix}_sys" readonly placeholder="Select an item"></div>
        <div class="field"><label class="req">Physical Stock (counted)</label><input type="number" id="${prefix}_phys" min="0" step="1" placeholder="Actual counted quantity"></div>
        <div class="field"><label>Difference</label><input id="${prefix}_diff" readonly placeholder="Auto-calculated"></div>
        <div class="field"><label class="req">Reason</label><input id="${prefix}_reason" placeholder="e.g. Physical stock verification"></div>
        <div class="field"><label>Adjusted By</label><input id="${prefix}_by" value="Storekeeper"></div>
        <div class="field full"><label>Remarks</label><textarea id="${prefix}_remarks" rows="2"></textarea></div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">${icon('check', 16)} Submit Adjustment</button>
      </div>
    </form>`;
}

function bindAdjustment(prefix, onDone) {
  bindItemSelect(prefix + '_item');
  const sel = $('#' + prefix + '_item');
  const phys = $('#' + prefix + '_phys');
  const sys = $('#' + prefix + '_sys');
  const diff = $('#' + prefix + '_diff');

  function recalc() {
    const o = sel.selectedOptions[0];
    if (!o || !o.value) {
      sys.value = '';
      diff.value = '';
      return;
    }
    sys.value = `${o.dataset.balance} ${o.dataset.unit}`;
    if (phys.value === '') {
      diff.value = '';
    } else {
      const p = Number(phys.value);
      diff.value = Number.isNaN(p) ? '' : `${p - Number(o.dataset.balance)} ${o.dataset.unit}`;
    }
  }
  sel.addEventListener('change', recalc);
  phys.addEventListener('input', recalc);

  $(`#${prefix}Form`).addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sel.value) return toast('Please select an item.', 'error');
    if (phys.value === '') return toast('Physical Stock is required.', 'error');
    if (!$('#' + prefix + '_reason').value.trim()) return toast('Reason is required.', 'error');
    try {
      const r = await api('/api/transactions/adjustment', {
        method: 'POST',
        body: {
          item_id: Number(sel.value),
          physical_stock: Number(phys.value),
          reason: $('#' + prefix + '_reason').value,
          user: $('#' + prefix + '_by').value,
          transaction_date: $('#' + prefix + '_date').value,
          remarks: $('#' + prefix + '_remarks').value,
        },
      });
      toast(`Adjustment recorded (${r.difference > 0 ? '+' : ''}${r.difference}). New balance: ${r.balance}.`);
      e.target.reset();
      $('#' + prefix + '_date').value = todayStr();
      sys.value = '';
      diff.value = '';
      $('#' + prefix + '_item_info').style.display = 'none';
      await reloadMaster();
      if (onDone) onDone();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function openAdjustmentModal() {
  openModal('Stock Adjustment', adjustmentHtml('adj'), '', true);
  bindAdjustment('adj', closeModal);
}

/* ---------- navigation ---------- */
const NAV = [
  { section: 'Operations' },
  { route: '/', icon: 'dashboard', label: 'Dashboard' },
  { route: '/inventory', icon: 'box', label: 'Inventory' },
  { route: '/stock-in', icon: 'download', label: 'Stock In' },
  { route: '/stock-out', icon: 'upload', label: 'Stock Out' },
  { route: '/transactions', icon: 'list', label: 'Transactions' },
  { section: 'Management' },
  { route: '/categories', icon: 'tag', label: 'Categories' },
  { route: '/reports', icon: 'chart', label: 'Reports' },
  { route: '/settings', icon: 'sliders', label: 'Settings' },
];

function buildNav() {
  $('#nav').innerHTML = NAV.map((n) =>
    n.section
      ? `<div class="nav-section">${esc(n.section)}</div>`
      : `<a href="#${n.route}" data-route="${n.route}">${icon(n.icon, 19)}<span>${esc(n.label)}</span></a>`
  ).join('');
  $('#menuBtn').innerHTML = icon('menu', 20);
}

/* ---------- router ---------- */
const routes = [
  { rx: /^\/$/, title: 'Dashboard', render: renderDashboard },
  { rx: /^\/inventory$/, title: 'Inventory', render: renderInventory },
  { rx: /^\/stock-in$/, title: 'Stock In', render: renderStockIn },
  { rx: /^\/stock-out$/, title: 'Stock Out', render: renderStockOut },
  { rx: /^\/transactions$/, title: 'Transactions', render: renderTransactions },
  { rx: /^\/categories$/, title: 'Categories', render: renderCategories },
  { rx: /^\/reports$/, title: 'Reports', render: renderReports },
  { rx: /^\/settings$/, title: 'Settings', render: renderSettings },
  { rx: /^\/items\/(\d+)$/, title: 'Item Details', render: renderItemDetail },
];

async function router() {
  const hash = (location.hash || '#/').replace(/^#/, '') || '/';
  const route = routes.find((r) => r.rx.test(hash));
  const content = $('#content');
  if (!route) {
    location.hash = '#/';
    return;
  }
  const m = route.rx.exec(hash);
  $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + hash));
  $('#pageTitle').textContent = route.title;
  content.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const page = await route.render(m);
    content.innerHTML = page.html;
    if (page.bind) page.bind();
  } catch (e) {
    content.innerHTML = `<div class="card"><div class="card-body"><p>${esc(e.message || 'Failed to load page.')}</p></div></div>`;
    toast(e.message || 'Failed to load page.', 'error');
  }
  $('#sidebar').classList.remove('open');
  $('#sidebarOverlay').classList.remove('show');
  window.scrollTo(0, 0);
}

/* ============================================================
   DASHBOARD
   ============================================================ */
async function renderDashboard() {
  const d = await api('/api/dashboard');

  const stats = [
    { label: 'Total Items', value: d.total_items, ic: 'box', color: '#2563eb', bg: '#dbeafe', go: '#/inventory' },
    { label: 'Total Stock', value: d.total_stock, ic: 'layers', color: '#0d9488', bg: '#ccfbf1', go: '#/inventory' },
    { label: 'Low Stock', value: d.low_stock_count, ic: 'alert', color: '#d97706', bg: '#fef3c7', go: () => { state.inv.status = 'LOW STOCK'; location.hash = '#/inventory'; } },
    { label: 'Out of Stock', value: d.out_of_stock_count, ic: 'x', color: '#dc2626', bg: '#fee2e2', go: () => { state.inv.status = 'OUT OF STOCK'; location.hash = '#/inventory'; } },
    { label: 'Stock In Today', value: d.stock_in_today, ic: 'download', color: '#16a34a', bg: '#dcfce7', go: '#/stock-in' },
    { label: 'Stock Out Today', value: d.stock_out_today, ic: 'upload', color: '#dc2626', bg: '#fee2e2', go: '#/stock-out' },
  ];

  const actions = [
    { label: 'Add Item', ic: 'plus', color: '#2563eb', fn: () => openItemModal() },
    { label: 'Stock In', ic: 'download', color: '#16a34a', fn: () => { location.hash = '#/stock-in'; } },
    { label: 'Stock Out', ic: 'upload', color: '#dc2626', fn: () => { location.hash = '#/stock-out'; } },
    { label: 'Stock Adjustment', ic: 'sliders', color: '#d97706', fn: () => openAdjustmentModal() },
    { label: 'View Low Stock', ic: 'alert', color: '#d97706', fn: () => { state.inv.status = 'LOW STOCK'; location.hash = '#/inventory'; } },
    { label: 'Transactions', ic: 'list', color: '#0d9488', fn: () => { location.hash = '#/transactions'; } },
  ];

  const lowRows = d.low_stock_items.length
    ? d.low_stock_items
        .map(
          (i) => `<tr>
            <td><a class="link" href="#/items/${i.id}">${esc(i.item_code)}</a></td>
            <td>${esc(i.item_name)}</td>
            <td class="num"><strong>${i.balance}</strong></td>
            <td class="num">${i.minimum_stock}</td>
            <td>${badge(i.status)}</td>
          </tr>`
        )
        .join('')
    : emptyRow(5, 'No low-stock items. All items are healthy.');

  const recentRows = d.recent_transactions.length
    ? d.recent_transactions
        .map(
          (t) => `<tr>
            <td style="white-space:nowrap">${esc(t.transaction_date)}</td>
            <td><a class="link" href="#/transactions">${esc(t.transaction_id)}</a></td>
            <td>${typeBadge(t.transaction_type)}</td>
            <td><a class="link" href="#/items/${t.item_id}">${esc(t.item_code)}</a><span class="sub">${esc(t.item_name)}</span></td>
            <td class="num">${signedQty(t)}</td>
            <td>${esc(t.user || '—')}</td>
          </tr>`
        )
        .join('')
    : emptyRow(6, 'No transactions yet.');

  const html = `
    <div class="quick-actions">
      ${actions
        .map(
          (a, i) => `<button class="qa" data-qa="${i}">
            <span class="qa-ic" style="background:${a.color}">${icon(a.ic, 21)}</span>${esc(a.label)}
          </button>`
        )
        .join('')}
    </div>

    <div class="section-title">Overview</div>
    <div class="stats">
      ${stats
        .map(
          (s, i) => `<button class="stat" data-stat="${i}">
            <span class="ic-wrap" style="background:${s.bg};color:${s.color}">${icon(s.ic, 22)}</span>
            <span><span class="v">${s.value}</span><span class="l" style="display:block">${esc(s.label)}</span></span>
          </button>`
        )
        .join('')}
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>${icon('chart', 17)} Stock Overview</h2><p>Total received vs issued vs current balance (all items)</p></div>
        <div class="card-body chart-box" id="chartOverview"></div>
      </div>
      <div class="card">
        <div class="card-head"><h2>${icon('layers', 17)} Inventory by Category</h2><p>Current stock quantity per category</p></div>
        <div class="card-body chart-box" id="chartCategory"></div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>${icon('alert', 17)} Low Stock Items</h2><p>Items at or below minimum stock level</p></div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Item Code</th><th>Item Name</th><th class="num">Current Stock</th><th class="num">Minimum Stock</th><th>Status</th></tr></thead>
            <tbody>${lowRows}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>${icon('list', 17)} Recent Transactions</h2><p>Latest 10 stock movements</p></div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>Date</th><th>Txn ID</th><th>Type</th><th>Item</th><th class="num">Qty</th><th>User</th></tr></thead>
            <tbody>${recentRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  return {
    html,
    bind: () => {
      $$('[data-qa]').forEach((b) => (b.onclick = actions[Number(b.dataset.qa)].fn));
      $$('[data-stat]').forEach((b) => {
        const s = stats[Number(b.dataset.stat)];
        b.onclick = typeof s.go === 'function' ? s.go : () => { location.hash = s.go; };
      });
      barChart($('#chartOverview'), [
        { label: 'Stock In', value: d.stock_overview.stock_in, color: '#16a34a' },
        { label: 'Stock Out', value: d.stock_overview.stock_out, color: '#dc2626' },
        { label: 'Balance', value: d.stock_overview.balance, color: '#2563eb' },
      ]);
      hBarChart(
        $('#chartCategory'),
        d.by_category.map((c) => ({ label: c.category, value: c.total_stock }))
      );
    },
  };
}

/* ============================================================
   INVENTORY
   ============================================================ */
async function renderInventory() {
  const meta = state.meta;
  const f = state.inv;

  const catOpts = ['<option value="">All Categories</option>', ...state.categories.map((c) => `<option value="${esc(c.name)}" ${f.category === c.name ? 'selected' : ''}>${esc(c.name)}</option>`)].join('');
  const locOpts = ['<option value="">All Locations</option>', ...meta.locations.map((l) => `<option value="${esc(l)}" ${f.location === l ? 'selected' : ''}>${esc(l)}</option>`)].join('');
  const brandOpts = ['<option value="">All Brands</option>', ...meta.brands.map((b) => `<option value="${esc(b)}" ${f.brand === b ? 'selected' : ''}>${esc(b)}</option>`)].join('');
  const statusOpts = ['<option value="">All Status</option>', ...['NORMAL', 'LOW STOCK', 'OUT OF STOCK'].map((s) => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s === 'NORMAL' ? 'Normal' : s === 'LOW STOCK' ? 'Low Stock' : 'Out of Stock'}</option>`)].join('');

  const html = `
    <div class="card">
      <div class="toolbar">
        <div class="search-box">${icon('search', 17)}<input id="invSearch" placeholder="Search code, name, part no, brand…" value="${esc(f.search)}"></div>
        <select id="invCat">${catOpts}</select>
        <select id="invLoc">${locOpts}</select>
        <select id="invStatus">${statusOpts}</select>
        <select id="invBrand">${brandOpts}</select>
        <div class="toolbar-actions">
          <button class="btn btn-primary" id="btnAddItem">${icon('plus', 16)} Add Item</button>
          <button class="btn" id="btnExportInv">${icon('file', 16)} Export CSV</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>Item Code</th><th>Item Name</th><th>Category</th><th>Location</th><th>Unit</th>
            <th class="num">Min Stock</th><th class="num">Stock Balance</th><th>Status</th><th>Action</th>
          </tr></thead>
          <tbody id="invBody"></tbody>
        </table>
      </div>
      <div class="card-foot" id="invCount"></div>
    </div>`;

  let items = [];

  function renderBody() {
    $('#invBody').innerHTML = items.length
      ? items
          .map(
            (i) => `<tr>
              <td><a class="link" href="#/items/${i.id}">${esc(i.item_code)}</a></td>
              <td>${esc(i.item_name)}</td>
              <td>${esc(i.category)}</td>
              <td>${esc(i.location || '—')}</td>
              <td>${esc(i.unit)}</td>
              <td class="num">${i.minimum_stock}</td>
              <td class="num"><strong>${i.balance}</strong></td>
              <td>${badge(i.status)}</td>
              <td class="actions"><a class="btn btn-sm" href="#/items/${i.id}">View</a><button class="btn btn-sm" data-edit="${i.id}">Edit</button></td>
            </tr>`
          )
          .join('')
      : emptyRow(9);
    $('#invCount').textContent = `${items.length} item(s) — Stock Balance is calculated automatically from transactions`;
    $$('#invBody [data-edit]').forEach((b) => (b.onclick = () => openItemModal(Number(b.dataset.edit))));
  }

  async function load() {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(state.inv)) if (v) qs.set(k, v);
    items = await api('/api/items?' + qs);
    renderBody();
  }

  return {
    html,
    bind: () => {
      load().catch((e) => toast(e.message, 'error'));
      $('#invSearch').addEventListener('input', debounce((e) => { state.inv.search = e.target.value.trim(); load(); }, 300));
      $('#invCat').onchange = (e) => { state.inv.category = e.target.value; load(); };
      $('#invLoc').onchange = (e) => { state.inv.location = e.target.value; load(); };
      $('#invStatus').onchange = (e) => { state.inv.status = e.target.value; load(); };
      $('#invBrand').onchange = (e) => { state.inv.brand = e.target.value; load(); };
      $('#btnAddItem').onclick = () => openItemModal();
      $('#btnExportInv').onclick = () => {
        downloadCsv(
          `bms-inventory-${todayStr()}.csv`,
          ['Item Code', 'Item Name', 'Category', 'Subcategory', 'Brand', 'Model', 'Part Number', 'Unit', 'Location', 'Minimum Stock', 'Maximum Stock', 'Opening Stock', 'Stock Balance', 'Status'],
          items.map((i) => [i.item_code, i.item_name, i.category, i.subcategory, i.brand, i.model, i.part_number, i.unit, i.location, i.minimum_stock, i.maximum_stock, i.opening_stock, i.balance, i.status])
        );
      };
    },
  };
}

/* ============================================================
   STOCK IN
   ============================================================ */
async function renderStockIn() {
  const html = `
    <div class="card">
      <div class="card-head"><h2>${icon('download', 17)} Record Stock In</h2><p>Goods received into the store. The stock balance increases automatically and a transaction is recorded.</p></div>
      <div class="card-body">
        <form id="stockInForm">
          <div class="form-grid">
            <div class="field"><label class="req">Date</label><input type="date" id="si_date" value="${todayStr()}"></div>
            ${itemSelectHtml('si_item')}
            <div class="field"><label class="req">Quantity</label><input type="number" id="si_qty" min="1" step="1" placeholder="e.g. 10"></div>
            <div class="field"><label>Unit</label><input id="si_unit" readonly placeholder="Auto from item"></div>
            <div class="field"><label>Supplier</label><input id="si_supplier" placeholder="e.g. ABC Engineering"></div>
            <div class="field"><label>Delivery / PO Reference</label><input id="si_ref" placeholder="e.g. DO-2026-001"></div>
            <div class="field"><label>Received By</label><input id="si_by" value="BMS Technician"></div>
            <div class="field full"><label>Remarks</label><textarea id="si_remarks" rows="2"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${icon('check', 16)} Submit Stock In</button>
            <button type="reset" class="btn">Clear</button>
          </div>
        </form>
      </div>
    </div>`;

  return {
    html,
    bind: () => {
      bindItemSelect('si_item', (sel) => {
        const o = sel.selectedOptions[0];
        $('#si_unit').value = o && o.value ? o.dataset.unit : '';
      });
      $('#stockInForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sel = $('#si_item');
        if (!sel.value) return toast('Please select an item.', 'error');
        const qty = Number($('#si_qty').value);
        if (!Number.isInteger(qty) || qty <= 0) return toast('Quantity must be a whole number greater than 0.', 'error');
        try {
          const r = await api('/api/transactions/stock-in', {
            method: 'POST',
            body: {
              item_id: Number(sel.value),
              quantity: qty,
              transaction_date: $('#si_date').value,
              supplier: $('#si_supplier').value,
              reference: $('#si_ref').value,
              received_by: $('#si_by').value,
              remarks: $('#si_remarks').value,
            },
          });
          toast(`Stock In recorded — ${r.transaction.item_code} new balance: ${r.balance} ${r.transaction.unit}`);
          e.target.reset();
          $('#si_date').value = todayStr();
          $('#si_unit').value = '';
          $('#si_item_info').style.display = 'none';
          await reloadMaster();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    },
  };
}

/* ============================================================
   STOCK OUT
   ============================================================ */
async function renderStockOut() {
  const html = `
    <div class="card">
      <div class="card-head"><h2>${icon('upload', 17)} Record Stock Out</h2><p>Items issued for maintenance work. The stock balance decreases automatically. Stock Out cannot exceed available stock.</p></div>
      <div class="card-body">
        <form id="stockOutForm">
          <div class="form-grid">
            <div class="field"><label class="req">Date</label><input type="date" id="so_date" value="${todayStr()}"></div>
            ${itemSelectHtml('so_item')}
            <div class="field"><label class="req">Quantity</label><input type="number" id="so_qty" min="1" step="1" placeholder="e.g. 2"></div>
            <div class="field"><label>Unit</label><input id="so_unit" readonly placeholder="Auto from item"></div>
            <div class="field"><label>Issued To</label><input id="so_to" placeholder="e.g. BMS Team - Level 35"></div>
            <div class="field"><label>Work Order / Job Ref</label><input id="so_wo" placeholder="e.g. WO-2026-015"></div>
            <div class="field"><label>Area / Location</label><input id="so_area" placeholder="e.g. Level 35"></div>
            <div class="field"><label>Reason</label><input id="so_reason" placeholder="e.g. Replacement of faulty sensor"></div>
            <div class="field"><label>Issued By</label><input id="so_by" value="BMS Technician"></div>
            <div class="field full"><label>Remarks</label><textarea id="so_remarks" rows="2"></textarea></div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-red">${icon('upload', 16)} Submit Stock Out</button>
            <button type="reset" class="btn">Clear</button>
          </div>
        </form>
      </div>
    </div>`;

  return {
    html,
    bind: () => {
      bindItemSelect('so_item', (sel) => {
        const o = sel.selectedOptions[0];
        $('#so_unit').value = o && o.value ? o.dataset.unit : '';
      });
      $('#stockOutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const sel = $('#so_item');
        if (!sel.value) return toast('Please select an item.', 'error');
        const qty = Number($('#so_qty').value);
        if (!Number.isInteger(qty) || qty <= 0) return toast('Quantity must be a whole number greater than 0.', 'error');
        const o = sel.selectedOptions[0];
        const available = Number(o.dataset.balance);
        const unit = o.dataset.unit;
        if (qty > available) {
          return toast(`Insufficient Stock — only ${available} ${unit} of ${o.textContent.split(' — ')[0]} are currently available. Requested: ${qty} ${unit}.`, 'error');
        }
        try {
          const r = await api('/api/transactions/stock-out', {
            method: 'POST',
            body: {
              item_id: Number(sel.value),
              quantity: qty,
              transaction_date: $('#so_date').value,
              issued_to: $('#so_to').value,
              work_order: $('#so_wo').value,
              area: $('#so_area').value,
              reason: $('#so_reason').value,
              issued_by: $('#so_by').value,
              remarks: $('#so_remarks').value,
            },
          });
          toast(`Stock Out recorded — ${r.transaction.item_code} new balance: ${r.balance} ${r.transaction.unit}`);
          e.target.reset();
          $('#so_date').value = todayStr();
          $('#so_unit').value = '';
          $('#so_item_info').style.display = 'none';
          await reloadMaster();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    },
  };
}

/* ============================================================
   TRANSACTIONS
   ============================================================ */
async function renderTransactions() {
  const f = state.txn;
  const typeOpts = ['<option value="">All Types</option>', ...['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].map((t) => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>`)].join('');
  const itemOpts = ['<option value="">All Items</option>', ...state.items.map((i) => `<option value="${i.id}" ${String(f.item_id) === String(i.id) ? 'selected' : ''}>${esc(i.item_code)} — ${esc(i.item_name)}</option>`)].join('');
  const catOpts = ['<option value="">All Categories</option>', ...state.categories.map((c) => `<option value="${esc(c.name)}" ${f.category === c.name ? 'selected' : ''}>${esc(c.name)}</option>`)].join('');

  const html = `
    <div class="card">
      <div class="toolbar">
        <div class="search-box">${icon('search', 17)}<input id="txnSearch" placeholder="Search txn ID, reference, work order, item…" value="${esc(f.search)}"></div>
        <select id="txnType">${typeOpts}</select>
        <select id="txnItem">${itemOpts}</select>
        <select id="txnCat">${catOpts}</select>
        <input type="text" id="txnUser" placeholder="User…" value="${esc(f.user)}" style="padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px;max-width:140px">
        <input type="date" id="txnFrom" value="${esc(f.from)}" title="From date" style="padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px">
        <input type="date" id="txnTo" value="${esc(f.to)}" title="To date" style="padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px">
        <div class="toolbar-actions">
          <button class="btn" id="btnExportTxn">${icon('file', 16)} Export CSV</button>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>Date</th><th>Transaction ID</th><th>Type</th><th>Item Code</th><th>Item Name</th>
            <th class="num">Quantity</th><th>Reference</th><th>User</th>
          </tr></thead>
          <tbody id="txnBody"></tbody>
        </table>
      </div>
      <div class="card-foot" id="txnCount"></div>
    </div>`;

  let txns = [];

  function renderBody() {
    $('#txnBody').innerHTML = txns.length
      ? txns
          .map(
            (t) => `<tr>
              <td style="white-space:nowrap">${esc(t.transaction_date)}</td>
              <td><strong>${esc(t.transaction_id)}</strong></td>
              <td>${typeBadge(t.transaction_type)}</td>
              <td><a class="link" href="#/items/${t.item_id}">${esc(t.item_code)}</a></td>
              <td>${esc(t.item_name)}${t.work_order ? `<span class="sub">${esc(t.work_order)}${t.area ? ' · ' + esc(t.area) : ''}</span>` : ''}</td>
              <td class="num">${signedQty(t)} ${esc(t.unit)}</td>
              <td>${esc(t.reference || t.work_order || '—')}</td>
              <td>${esc(t.user || '—')}</td>
            </tr>`
          )
          .join('')
      : emptyRow(8);
    $('#txnCount').textContent = `${txns.length} transaction(s)`;
  }

  async function load() {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(state.txn)) if (v) qs.set(k, v);
    txns = await api('/api/transactions?' + qs);
    renderBody();
  }

  return {
    html,
    bind: () => {
      load().catch((e) => toast(e.message, 'error'));
      $('#txnSearch').addEventListener('input', debounce((e) => { state.txn.search = e.target.value.trim(); load(); }, 300));
      $('#txnType').onchange = (e) => { state.txn.type = e.target.value; load(); };
      $('#txnItem').onchange = (e) => { state.txn.item_id = e.target.value; load(); };
      $('#txnCat').onchange = (e) => { state.txn.category = e.target.value; load(); };
      $('#txnUser').addEventListener('input', debounce((e) => { state.txn.user = e.target.value.trim(); load(); }, 300));
      $('#txnFrom').onchange = (e) => { state.txn.from = e.target.value; load(); };
      $('#txnTo').onchange = (e) => { state.txn.to = e.target.value; load(); };
      $('#btnExportTxn').onclick = () => {
        downloadCsv(
          `bms-transactions-${todayStr()}.csv`,
          ['Date', 'Transaction ID', 'Type', 'Item Code', 'Item Name', 'Quantity', 'Unit', 'Reference', 'Supplier', 'Issued To', 'Work Order', 'Area', 'Reason', 'User', 'Remarks'],
          txns.map((t) => [t.transaction_date, t.transaction_id, t.transaction_type, t.item_code, t.item_name, t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity, t.unit, t.reference, t.supplier, t.issued_to, t.work_order, t.area, t.reason, t.user, t.remarks])
        );
      };
    },
  };
}

/* ============================================================
   CATEGORIES
   ============================================================ */
async function renderCategories() {
  const html = `
    <div class="card">
      <div class="toolbar">
        <div class="search-box" style="max-width:340px">${icon('search', 17)}<input id="catSearch" placeholder="Search categories…"></div>
        <div class="toolbar-actions"><button class="btn btn-primary" id="btnAddCat">${icon('plus', 16)} Add Category</button></div>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Category</th><th>Description</th><th class="num">Items</th><th>Action</th></tr></thead>
          <tbody id="catBody"></tbody>
        </table>
      </div>
      <div class="card-foot" id="catCount"></div>
    </div>`;

  let cats = [];

  function renderBody(filter = '') {
    const q = filter.trim().toLowerCase();
    const list = cats.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    $('#catBody').innerHTML = list.length
      ? list
          .map(
            (c) => `<tr>
              <td><strong>${esc(c.name)}</strong></td>
              <td>${esc(c.description || '—')}</td>
              <td class="num">${c.item_count}</td>
              <td class="actions">
                <button class="btn btn-sm" data-edit-cat="${c.id}">Edit</button>
                <button class="btn btn-sm btn-red" data-del-cat="${c.id}">Delete</button>
              </td>
            </tr>`
          )
          .join('')
      : emptyRow(4);
    $('#catCount').textContent = `${cats.length} category(ies)`;
    $$('#catBody [data-edit-cat]').forEach((b) => (b.onclick = () => openCategoryModal(Number(b.dataset.editCat))));
    $$('#catBody [data-del-cat]').forEach((b) => (b.onclick = () => deleteCategory(Number(b.dataset.delCat))));
  }

  async function load() {
    cats = await api('/api/categories');
    renderBody($('#catSearch').value);
  }

  function openCategoryModal(id) {
    const cat = id ? cats.find((c) => c.id === id) : null;
    openModal(
      id ? `Edit Category — ${cat.name}` : 'Add Category',
      `<div class="form-error" id="modalError" style="display:none"></div>
       <div class="form-grid">
         <div class="field full"><label class="req">Category Name</label><input id="c_name" value="${esc(cat ? cat.name : '')}" placeholder="e.g. BMS"></div>
         <div class="field full"><label>Description</label><textarea id="c_desc" rows="2">${esc(cat ? cat.description : '')}</textarea></div>
       </div>
       <div class="form-actions">
         <button class="btn btn-primary" id="btnSaveCat">${icon('check', 16)} Save Category</button>
         <button class="btn" id="btnCancelCat">Cancel</button>
       </div>`
    );
    $('#btnCancelCat').onclick = closeModal;
    $('#btnSaveCat').onclick = async () => {
      try {
        const payload = { name: $('#c_name').value, description: $('#c_desc').value };
        if (id) await api(`/api/categories/${id}`, { method: 'PUT', body: payload });
        else await api('/api/categories', { method: 'POST', body: payload });
        closeModal();
        toast(id ? 'Category updated.' : 'Category added.');
        await reloadMaster();
        load();
      } catch (e) {
        modalError(e.message);
      }
    };
  }

  async function deleteCategory(id) {
    const cat = cats.find((c) => c.id === id);
    if (!cat) return;
    if (cat.item_count > 0) {
      const force = confirm(`Category "${cat.name}" is used by ${cat.item_count} item(s).\n\nDelete anyway and move those items to "Others"?`);
      if (!force) return;
      try {
        const r = await api(`/api/categories/${id}?force=true`, { method: 'DELETE' });
        toast(`Category deleted. ${r.reassigned} item(s) moved to "Others".`);
        await reloadMaster();
        load();
      } catch (e) {
        toast(e.message, 'error');
      }
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await api(`/api/categories/${id}`, { method: 'DELETE' });
      toast('Category deleted.');
      await reloadMaster();
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return {
    html,
    bind: () => {
      load().catch((e) => toast(e.message, 'error'));
      $('#catSearch').addEventListener('input', debounce((e) => renderBody(e.target.value), 200));
      $('#btnAddCat').onclick = () => openCategoryModal();
    },
  };
}

/* ============================================================
   REPORTS
   ============================================================ */
async function renderReports() {
  const [items, txns] = await Promise.all([api('/api/items'), api('/api/transactions')]);
  const low = items.filter((i) => i.status !== 'NORMAL').sort((a, b) => a.balance - b.balance);

  const invRows = items
    .map(
      (i) => `<tr>
        <td><a class="link" href="#/items/${i.id}">${esc(i.item_code)}</a></td>
        <td>${esc(i.item_name)}</td><td>${esc(i.category)}</td><td>${esc(i.location || '—')}</td>
        <td>${esc(i.unit)}</td><td class="num">${i.minimum_stock}</td><td class="num"><strong>${i.balance}</strong></td><td>${badge(i.status)}</td>
      </tr>`
    )
    .join('');

  const lowRows = low.length
    ? low
        .map(
          (i) => `<tr>
            <td><a class="link" href="#/items/${i.id}">${esc(i.item_code)}</a></td>
            <td>${esc(i.item_name)}</td><td>${esc(i.category)}</td>
            <td class="num"><strong>${i.balance}</strong></td><td class="num">${i.minimum_stock}</td><td>${badge(i.status)}</td>
          </tr>`
        )
        .join('')
    : emptyRow(6, 'No low-stock items.');

  const txnRows = txns
    .map(
      (t) => `<tr>
        <td style="white-space:nowrap">${esc(t.transaction_date)}</td><td>${esc(t.transaction_id)}</td>
        <td>${typeBadge(t.transaction_type)}</td>
        <td><a class="link" href="#/items/${t.item_id}">${esc(t.item_code)}</a></td>
        <td>${esc(t.item_name)}</td><td class="num">${signedQty(t)}</td>
        <td>${esc(t.reference || t.work_order || '—')}</td><td>${esc(t.user || '—')}</td>
      </tr>`
    )
    .join('');

  const html = `
    <div class="card">
      <div class="card-head"><h2>${icon('box', 17)} Inventory Report</h2><p>All items with current stock balance and status — ${items.length} items, total stock ${items.reduce((s, i) => s + i.balance, 0)}</p></div>
      <div class="toolbar"><div class="toolbar-actions"><button class="btn" id="expInv">${icon('file', 16)} Export CSV</button></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Item Code</th><th>Item Name</th><th>Category</th><th>Location</th><th>Unit</th><th class="num">Min Stock</th><th class="num">Balance</th><th>Status</th></tr></thead>
        <tbody>${invRows || emptyRow(8)}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-head"><h2>${icon('alert', 17)} Low Stock Report</h2><p>${low.length} item(s) below minimum stock level — reorder soon</p></div>
      <div class="toolbar"><div class="toolbar-actions"><button class="btn" id="expLow">${icon('file', 16)} Export CSV</button></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Item Code</th><th>Item Name</th><th>Category</th><th class="num">Current Stock</th><th class="num">Minimum Stock</th><th>Status</th></tr></thead>
        <tbody>${lowRows}</tbody>
      </table></div>
    </div>

    <div class="card">
      <div class="card-head"><h2>${icon('list', 17)} Stock Movement Report</h2><p>All Stock In / Stock Out / Adjustment transactions — ${txns.length} records</p></div>
      <div class="toolbar"><div class="toolbar-actions"><button class="btn" id="expTxn">${icon('file', 16)} Export CSV</button></div></div>
      <div class="table-wrap"><table class="data">
        <thead><tr><th>Date</th><th>Txn ID</th><th>Type</th><th>Item Code</th><th>Item Name</th><th class="num">Qty</th><th>Reference</th><th>User</th></tr></thead>
        <tbody>${txnRows || emptyRow(8)}</tbody>
      </table></div>
    </div>`;

  return {
    html,
    bind: () => {
      $('#expInv').onclick = () =>
        downloadCsv(`bms-inventory-report-${todayStr()}.csv`,
          ['Item Code', 'Item Name', 'Category', 'Subcategory', 'Brand', 'Model', 'Part Number', 'Unit', 'Location', 'Minimum Stock', 'Maximum Stock', 'Opening Stock', 'Stock Balance', 'Status'],
          items.map((i) => [i.item_code, i.item_name, i.category, i.subcategory, i.brand, i.model, i.part_number, i.unit, i.location, i.minimum_stock, i.maximum_stock, i.opening_stock, i.balance, i.status]));
      $('#expLow').onclick = () =>
        downloadCsv(`bms-low-stock-report-${todayStr()}.csv`,
          ['Item Code', 'Item Name', 'Category', 'Location', 'Unit', 'Current Stock', 'Minimum Stock', 'Status'],
          low.map((i) => [i.item_code, i.item_name, i.category, i.location, i.unit, i.balance, i.minimum_stock, i.status]));
      $('#expTxn').onclick = () =>
        downloadCsv(`bms-stock-movement-report-${todayStr()}.csv`,
          ['Date', 'Transaction ID', 'Type', 'Item Code', 'Item Name', 'Quantity', 'Unit', 'Reference', 'Supplier', 'Issued To', 'Work Order', 'Area', 'Reason', 'User', 'Remarks'],
          txns.map((t) => [t.transaction_date, t.transaction_id, t.transaction_type, t.item_code, t.item_name, t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity, t.unit, t.reference, t.supplier, t.issued_to, t.work_order, t.area, t.reason, t.user, t.remarks]));
    },
  };
}

/* ============================================================
   SETTINGS
   ============================================================ */
async function renderSettings() {
  const html = `
    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>${icon('sliders', 17)} Stock Adjustment</h2><p>Correct the balance after a physical count, damage or loss. Every adjustment is recorded in the transaction history — the balance is never changed silently.</p></div>
        <div class="card-body">${adjustmentHtml('set')}</div>
      </div>
      <div class="card">
        <div class="card-head"><h2>${icon('info', 17)} About BMS IMS</h2></div>
        <div class="card-body">
          <p><strong>BMS IMS</strong> — Building Management System Inventory &amp; Stock Control.</p>
          <p class="muted" style="margin-top:4px">Version 1.0.0 · A simple store &amp; spare-parts inventory system for BMS technicians and store operators.</p>
          <div class="formula-box">
            <strong>Stock Balance</strong> = Opening Stock + Σ Stock In − Σ Stock Out + Σ Adjustment
            <p class="muted">The balance is always calculated from the transaction history. Users can never type in a stock balance directly, so the numbers always stay accurate.</p>
          </div>
          <div class="formula-box">
            <strong>Status logic</strong>
            <p class="muted">Balance = 0 → Out of Stock · Balance ≤ Minimum Stock → Low Stock · otherwise → Normal. Status updates automatically with every transaction.</p>
          </div>
        </div>
      </div>
    </div>
    <div class="card danger">
      <div class="card-head"><h2>${icon('alert', 17)} Danger Zone</h2></div>
      <div class="card-body">
        <p>Reset the database to the original demo dataset (30 items, 50+ transactions). All current items and transactions will be replaced. This cannot be undone.</p>
        <div class="form-actions"><button class="btn btn-red" id="btnReset">${icon('refresh', 16)} Reset Demo Data</button></div>
      </div>
    </div>`;

  return {
    html,
    bind: () => {
      bindAdjustment('set');
      $('#btnReset').onclick = async () => {
        if (!confirm('Reset ALL data to the original demo dataset? This cannot be undone.')) return;
        try {
          await api('/api/reset', { method: 'POST', body: {} });
          await reloadMaster();
          toast('Demo data restored.');
          router();
        } catch (e) {
          toast(e.message, 'error');
        }
      };
    },
  };
}

/* ============================================================
   ITEM DETAILS
   ============================================================ */
async function renderItemDetail(m) {
  const d = await api(`/api/items/${m[1]}`);

  const txnRows = d.history.length
    ? d.history
        .map(
          (t) => `<tr>
            <td style="white-space:nowrap">${esc(t.transaction_date)}</td>
            <td><strong>${esc(t.transaction_id)}</strong></td>
            <td>${typeBadge(t.transaction_type)}</td>
            <td class="num">${signedQty(t)} ${esc(t.unit)}</td>
            <td>${esc(t.reference || t.work_order || '—')}</td>
            <td>${esc(t.user || '—')}</td>
            <td>${esc(t.reason || t.remarks || '—')}</td>
          </tr>`
        )
        .join('')
    : emptyRow(7, 'No transactions yet.');

  const html = `
    <a class="back-link" href="#/inventory">${icon('arrow-left', 16)} Back to Inventory</a>
    <div class="detail-head">
      <div>
        <h2>${esc(d.item_name)}</h2>
        <div class="code">${esc(d.item_code)} · ${esc(d.category)}${d.subcategory ? ' / ' + esc(d.subcategory) : ''}</div>
      </div>
      <div class="spacer"></div>
      ${badge(d.status)}
      <button class="btn btn-primary" id="btnEditItem">${icon('edit', 16)} Edit Item</button>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-head"><h2>${icon('info', 17)} Item Information</h2></div>
        <div class="card-body">
          <div class="kv">
            <div><span>Item Code</span><strong>${esc(d.item_code)}</strong></div>
            <div><span>Category</span><strong>${esc(d.category)}</strong></div>
            <div><span>Subcategory</span><strong>${esc(d.subcategory || '—')}</strong></div>
            <div><span>Brand</span><strong>${esc(d.brand || '—')}</strong></div>
            <div><span>Model</span><strong>${esc(d.model || '—')}</strong></div>
            <div><span>Part Number</span><strong>${esc(d.part_number || '—')}</strong></div>
            <div><span>Unit</span><strong>${esc(d.unit)}</strong></div>
            <div><span>Location</span><strong>${esc(d.location || '—')}</strong></div>
            <div><span>Minimum Stock</span><strong>${d.minimum_stock} ${esc(d.unit)}</strong></div>
            <div><span>Maximum Stock</span><strong>${d.maximum_stock || '—'}</strong></div>
            <div><span>Supplier</span><strong>${esc(d.supplier || '—')}</strong></div>
            <div><span>Current Stock</span><strong>${d.balance} ${esc(d.unit)}</strong></div>
          </div>
          ${d.description ? `<p style="margin-top:14px"><strong>Description:</strong> ${esc(d.description)}</p>` : ''}
          ${d.remarks ? `<p style="margin-top:8px"><strong>Remarks:</strong> ${esc(d.remarks)}</p>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>${icon('chart', 17)} Stock Movement</h2><p>Balance is calculated — never typed in</p></div>
        <div class="card-body">
          <div class="movement-formula">
            <div class="mf"><span>Opening Stock</span><strong>${d.opening_stock}</strong></div>
            <div class="mf"><span>Stock In</span><strong style="color:var(--green)">+${d.total_in}</strong></div>
            <div class="mf"><span>Stock Out</span><strong style="color:var(--red)">−${d.total_out}</strong></div>
            <div class="mf"><span>Adjustment</span><strong style="color:var(--orange)">${d.total_adjustment > 0 ? '+' : ''}${d.total_adjustment}</strong></div>
            <div class="mf total"><span>= Current Balance</span><strong>${d.balance}</strong></div>
          </div>
          <div class="chart-box" id="itemChart"></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>${icon('list', 17)} Transaction History</h2><p>${d.transaction_count} transaction(s) for this item</p></div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Date</th><th>Txn ID</th><th>Type</th><th class="num">Quantity</th><th>Reference</th><th>User</th><th>Reason / Remarks</th></tr></thead>
          <tbody>${txnRows}</tbody>
        </table>
      </div>
    </div>`;

  return {
    html,
    bind: () => {
      $('#btnEditItem').onclick = () => openItemModal(d.id);
      lineChart($('#itemChart'), d.timeline.map((p) => ({ date: p.date, value: p.value })));
    },
  };
}

/* ---------- init ---------- */
async function init() {
  buildNav();
  $('#menuBtn').onclick = () => {
    $('#sidebar').classList.toggle('open');
    $('#sidebarOverlay').classList.toggle('show');
  };
  $('#sidebarOverlay').onclick = () => {
    $('#sidebar').classList.remove('open');
    $('#sidebarOverlay').classList.remove('show');
  };
  window.addEventListener('hashchange', router);
  try {
    await reloadMaster();
  } catch (e) {
    toast('Cannot reach the BMS IMS API — is the server running?', 'error');
  }
  router();
}

init();
