'use strict';

/**
 * BMS IMS — tiny dependency-free SVG chart helpers.
 * barChart:  vertical bars   [{ label, value, color }]
 * hBarChart: horizontal bars [{ label, value, color }]
 * lineChart: running-balance line [{ date, value }]
 */

function trunc(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function barChart(container, data, opts = {}) {
  if (!container) return;
  const W = opts.width || 360;
  const H = opts.height || 235;
  const padL = 36, padR = 8, padT = 26, padB = 36;
  const max = Math.max(1, ...data.map((d) => d.value));
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const slot = iw / data.length;
  const bw = Math.min(64, slot * 0.52);

  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const y = padT + ih - (ih * g) / 4;
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="grid"/>`;
    grid += `<text x="${padL - 7}" y="${y + 4}" text-anchor="end" class="cl">${Math.round((max * g) / 4)}</text>`;
  }

  let bars = '';
  data.forEach((d, i) => {
    const h = Math.max(d.value > 0 ? 3 : 0, Math.round((d.value / max) * ih));
    const x = padL + i * slot + (slot - bw) / 2;
    const y = padT + ih - h;
    bars += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="5" fill="${d.color}"><title>${esc(d.label)}: ${d.value}</title></rect>`;
    bars += `<text x="${x + bw / 2}" y="${y - 7}" text-anchor="middle" class="cv">${d.value}</text>`;
    bars += `<text x="${x + bw / 2}" y="${H - padB + 17}" text-anchor="middle" class="cl">${esc(trunc(d.label, 12))}</text>`;
  });

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${grid}${bars}</svg>`;
}

function hBarChart(container, data, opts = {}) {
  if (!container) return;
  const rowH = 30;
  const padL = 128, padR = 58, padT = 6;
  const W = opts.width || 480;
  const H = padT * 2 + data.length * rowH;
  const max = Math.max(1, ...data.map((d) => d.value));
  const iw = W - padL - padR;
  const palette = ['#0d9488', '#2563eb', '#10b981', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#db2777', '#475569'];

  let rows = '';
  data.forEach((d, i) => {
    const y = padT + i * rowH;
    const w = Math.max(d.value > 0 ? 3 : 0, Math.round((d.value / max) * iw));
    const color = d.color || palette[i % palette.length];
    rows += `<text x="${padL - 9}" y="${y + rowH / 2 + 4}" text-anchor="end" class="cl">${esc(trunc(d.label, 17))}</text>`;
    rows += `<rect x="${padL}" y="${y + 5}" width="${w}" height="${rowH - 12}" rx="4" fill="${color}"><title>${esc(d.label)}: ${d.value}</title></rect>`;
    rows += `<text x="${padL + w + 7}" y="${y + rowH / 2 + 4}" class="cv">${d.value}</text>`;
  });

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMinYMin meet" role="img">${rows}</svg>`;
}

function lineChart(container, points, opts = {}) {
  if (!container) return;
  if (!points || !points.length) {
    container.innerHTML = '<p class="empty">No stock movement recorded yet.</p>';
    return;
  }
  const W = opts.width || 760;
  const H = opts.height || 250;
  const padL = 46, padR = 14, padT = 18, padB = 30;
  const vals = points.map((p) => p.value);
  let max = Math.max(...vals);
  let min = Math.min(...vals, 0);
  if (max === min) max = min + 1;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const X = (i) => padL + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const Y = (v) => padT + ih - ((v - min) / (max - min)) * ih;
  const pts = points.map((p, i) => `${X(i)},${Y(p.value)}`).join(' ');
  const area = `${padL},${Y(min)} ${pts} ${padL + iw},${Y(min)}`;

  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const v = min + ((max - min) * g) / 4;
    const y = Y(v);
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" class="grid"/>`;
    grid += `<text x="${padL - 7}" y="${y + 4}" text-anchor="end" class="cl">${Math.round(v)}</text>`;
  }

  const dots = points
    .map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.value)}" r="3.5" fill="#0d9488"><title>${esc(p.date)}: ${p.value}</title></circle>`)
    .join('');

  const idx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const xlabels = idx
    .map(
      (i) =>
        `<text x="${X(i)}" y="${H - 8}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}" class="cl">${esc(points[i].date)}</text>`
    )
    .join('');

  container.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">` +
    `<polygon points="${area}" fill="rgba(13,148,136,.12)"/>` +
    `<polyline points="${pts}" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `${grid}${dots}${xlabels}</svg>`;
}
