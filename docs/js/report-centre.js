'use strict';

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const api = async (path) => {
    const res = await fetch(path);
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || `Request failed (HTTP ${res.status})`);
    return data;
  };
  const signedQty = (t) => t.transaction_type === 'STOCK_OUT'
    ? -Number(t.quantity)
    : Number(t.quantity);

  function csvDownload(filename, headers, rows) {
    const q = (v) => {
      const x = String(v ?? '');
      return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    };
    const csv = [headers, ...rows].map(r => r.map(q).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function reportHtml() {
    const t = today();
    return `
      <style>.report-centre .report-filter-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.report-centre .report-output-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}.report-centre .report-output-btn{min-height:44px}@media(max-width:760px){.report-centre .report-filter-grid,.report-centre .report-output-grid{grid-template-columns:1fr}.report-centre .card-head h2{font-size:18px}}</style><div class="report-centre">
        <div class="card report-hero">
          <div class="card-head">
            <h2>Report Centre</h2>
            <p>Generate a professional report for inventory, low stock, or stock movement.</p>
          </div>
          <div class="card-body">
            <div class="report-filter-grid">
              <div class="field">
                <label class="req">Report Type</label>
                <select id="rcType">
                  <option value="inventory">Inventory</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="movement">Stock Movement</option>
                </select>
              </div>
              <div class="field">
                <label>Date From</label>
                <input type="date" id="rcFrom" value="${t}">
              </div>
              <div class="field">
                <label>Date To</label>
                <input type="date" id="rcTo" value="${t}">
              </div>
            </div>
            <div class="report-hint">
              <strong>Note:</strong> Inventory and Low Stock are current stock snapshots. Date range is used as the report period.
              Stock Movement uses the selected date range to filter transactions.
            </div>
            <div class="form-actions report-generate-actions">
              <button class="btn btn-primary" id="rcGenerate">Generate Report</button>
              <button class="btn" id="rcReset">Reset</button>
            </div>
          </div>
        </div>

        <div class="card" id="rcPreview" style="display:none">
          <div class="card-head">
            <h2>Report Preview</h2>
            <p id="rcSummary">Ready</p>
          </div>
          <div class="card-body">
            <div class="report-output-grid">
              <button class="btn btn-primary report-output-btn" id="rcPdf">Download PDF</button>
              <button class="btn report-output-btn" id="rcExcel">Download Excel</button>
              <button class="btn report-output-btn" id="rcCsv">Download CSV</button>
            </div>
            <div class="table-wrap" id="rcTable"></div>
          </div>
        </div>
      </div>`;
  }

  function rowsFor(type, data) {
    if (type === 'inventory') {
      return {
        headers: ['Item Code','Item Name','Category','Location','Unit','Minimum Stock','Maximum Stock','Opening Stock','Stock Balance','Status'],
        rows: data.items.map(i => [i.item_code,i.item_name,i.category,i.location || '',i.unit,i.minimum_stock,i.maximum_stock,i.opening_stock,i.balance,i.status])
      };
    }
    if (type === 'low-stock') {
      const items = data.items.filter(i => i.status !== 'NORMAL').sort((a,b) => Number(a.balance) - Number(b.balance));
      return {
        headers: ['Item Code','Item Name','Category','Location','Unit','Current Stock','Minimum Stock','Status'],
        rows: items.map(i => [i.item_code,i.item_name,i.category,i.location || '',i.unit,i.balance,i.minimum_stock,i.status])
      };
    }
    return {
      headers: ['Date','Transaction ID','Type','Item Code','Item Name','Quantity','Unit','Reference','Supplier','Issued To','Work Order','Area','Reason','User','Remarks'],
      rows: data.transactions.map(t => [
        t.transaction_date,t.transaction_id,t.transaction_type,t.item_code,t.item_name,
        signedQty(t),t.unit,t.reference || '',t.supplier || '',t.issued_to || '',
        t.work_order || '',t.area || '',t.reason || '',t.user || '',t.remarks || ''
      ])
    };
  }

  function previewTable(type, data) {
    const r = rowsFor(type, data);
    const shown = r.rows.slice(0, 100);
    return `
      <table class="data">
        <thead><tr>${r.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${shown.length
            ? shown.map(row => `<tr>${row.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${r.headers.length}" class="empty">No records found.</td></tr>`}
        </tbody>
      </table>
      ${r.rows.length > 100 ? `<p class="muted" style="margin-top:10px">Preview shows first 100 records. The exported file contains all records.</p>` : ''}
    `;
  }

  function makePdf(type, data, from, to) {
    if (!window.jspdf?.jsPDF || !window.jspdf.jsPDF.API?.autoTable) {
      throw new Error('PDF library is not loaded. Please refresh the page.');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const title = type === 'inventory' ? 'Inventory Report' : type === 'low-stock' ? 'Low Stock Report' : 'Stock Movement Report';
    const r = rowsFor(type, data);
    doc.setFontSize(18);
    doc.text(`BMS IMS — ${title}`, 14, 16);
    doc.setFontSize(9);
    doc.text(`Report Period: ${from || '—'} to ${to || '—'}   |   Generated: ${new Date().toLocaleString()}`, 14, 23);
    doc.autoTable({
      startY: 29,
      head: [r.headers],
      body: r.rows,
      theme: 'grid',
      styles: { fontSize: type === 'movement' ? 6.5 : 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [13, 36, 51] },
      margin: { left: 10, right: 10 }
    });
    doc.save(`bms-${type}-report-${from || today()}-to-${to || today()}.pdf`);
  }

  function makeExcel(type, data, from, to) {
    if (!window.XLSX) throw new Error('Excel library is not loaded. Please refresh the page.');
    const title = type === 'inventory' ? 'Inventory Report' : type === 'low-stock' ? 'Low Stock Report' : 'Stock Movement Report';
    const r = rowsFor(type, data);
    const wb = XLSX.utils.book_new();
    const info = [
      ['BMS IMS — ' + title],
      ['Report Period', `${from || '—'} to ${to || '—'}`],
      ['Generated', new Date().toLocaleString()],
      [],
      r.headers,
      ...r.rows
    ];
    const ws = XLSX.utils.aoa_to_sheet(info);
    ws['!cols'] = r.headers.map(h => ({ wch: Math.min(Math.max(h.length + 2, 12), 28) }));
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31));
    XLSX.writeFile(wb, `bms-${type}-report-${from || today()}-to-${to || today()}.xlsx`);
  }

  function render() {
    const content = $('#content');
    if (!content) return;
    content.innerHTML = reportHtml();

    const type = $('#rcType');
    const from = $('#rcFrom');
    const to = $('#rcTo');
    const preview = $('#rcPreview');
    const table = $('#rcTable');
    const summary = $('#rcSummary');
    let reportData = null;
    let reportType = 'inventory';
    let reportFrom = from.value;
    let reportTo = to.value;

    type.onchange = () => {
      reportType = type.value;
      preview.style.display = 'none';
    };

    $('#rcReset').onclick = () => {
      type.value = 'inventory';
      from.value = today();
      to.value = today();
      preview.style.display = 'none';
      reportData = null;
    };

    $('#rcGenerate').onclick = async () => {
      try {
        if (from.value && to.value && from.value > to.value) {
          throw new Error('Date From cannot be later than Date To.');
        }
        reportType = type.value;
        reportFrom = from.value;
        reportTo = to.value;

        let data;
        if (reportType === 'movement') {
          const qs = new URLSearchParams();
          if (reportFrom) qs.set('from', reportFrom);
          if (reportTo) qs.set('to', reportTo);
          data = { transactions: await api('/api/transactions?' + qs.toString()) };
        } else {
          data = { items: await api('/api/items') };
        }

        reportData = data;
        const r = rowsFor(reportType, data);
        summary.textContent = `${r.rows.length} record(s) · ${reportFrom || '—'} to ${reportTo || '—'}`;
        table.innerHTML = previewTable(reportType, data);
        preview.style.display = 'block';
        preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {
        if (typeof window.toast === 'function') window.toast(e.message, 'error');
        else alert(e.message);
      }
    };

    $('#rcPdf').onclick = () => {
      try { makePdf(reportType, reportData, reportFrom, reportTo); }
      catch (e) { alert(e.message); }
    };
    $('#rcExcel').onclick = () => {
      try { makeExcel(reportType, reportData, reportFrom, reportTo); }
      catch (e) { alert(e.message); }
    };
    $('#rcCsv').onclick = () => {
      try {
        const r = rowsFor(reportType, reportData);
        csvDownload(`bms-${reportType}-report-${reportFrom || today()}-to-${reportTo || today()}.csv`, r.headers, r.rows);
      } catch (e) { alert(e.message); }
    };
  }

  function isReportsRoute() {
    return (location.hash || '#/').replace(/^#/, '') === '/reports';
  }

  function sync() {
    if (isReportsRoute()) {
      setTimeout(render, 0);
    }
  }

  window.addEventListener('hashchange', sync);
  window.BMSReportCentre = { render: sync };
  if (isReportsRoute()) setTimeout(render, 0);
})();