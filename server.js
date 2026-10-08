'use strict';

/**
 * BMS IMS — server.
 * Pure Node.js (>= 22.5): REST API + static file serving. No external dependencies.
 *
 *   node server.js            start on PORT (default 3000)
 *   node server.js --reset    wipe the database and reload demo data, then start
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { open, resetDatabase, DB_PATH } = require('./db');
const { seedDemoData, isEmpty } = require('./seed');
const inv = require('./inventory');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const VERSION = '1.0.0';

if (process.argv.includes('--reset')) {
  resetDatabase();
  console.log('[bms-ims] Database reset.');
}

const db = open();
if (isEmpty(db)) {
  const stats = seedDemoData(db);
  console.log(
    `[bms-ims] Demo data loaded: ${stats.items} items, ${stats.transactions} transactions, ${stats.categories} categories.`
  );
}

/* ---------------- routing ---------------- */

const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const rx = new RegExp(
    '^' + pattern.replace(/:[^/]+/g, (m) => {
      keys.push(m.slice(1));
      return '([^/]+)';
    }) + '$'
  );
  routes.push({ method, rx, keys, handler });
}

route('GET', '/api/health', () => ({ status: 'ok', app: 'BMS IMS', version: VERSION, database: DB_PATH }));

route('GET', '/api/dashboard', () => inv.dashboard());
route('GET', '/api/meta', () => inv.meta());

route('GET', '/api/items', (req, res, p, b, q) => inv.listItems(q));
route('POST', '/api/items', (req, res, p, b) => inv.createItem(b));
route('GET', '/api/items/:id', (req, res, p) => inv.getItemDetail(Number(p.id)));
route('PUT', '/api/items/:id', (req, res, p, b) => inv.updateItem(Number(p.id), b));

route('GET', '/api/categories', () => inv.listCategories());
route('POST', '/api/categories', (req, res, p, b) => inv.createCategory(b));
route('PUT', '/api/categories/:id', (req, res, p, b) => inv.updateCategory(Number(p.id), b));
route('DELETE', '/api/categories/:id', (req, res, p, b, q) =>
  inv.deleteCategory(Number(p.id), q.force === 'true' || q.force === '1')
);

route('GET', '/api/transactions', (req, res, p, b, q) => inv.listTransactions(q));
route('POST', '/api/transactions/stock-in', (req, res, p, b) => inv.stockIn(b));
route('POST', '/api/transactions/stock-out', (req, res, p, b) => inv.stockOut(b));
route('POST', '/api/transactions/adjustment', (req, res, p, b) => inv.adjust(b));

route('POST', '/api/reset', () => {
  resetDatabase();
  seedDemoData(db);
  return { ok: true, message: 'Demo data restored.' };
});

/* ---------------- helpers ---------------- */

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1024 * 1024) {
        reject(new inv.HttpError(413, 'Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new inv.HttpError(400, 'Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function serveStatic(pathname, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (rel === '/' || rel === '') rel = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: unknown non-API paths serve the app shell.
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, index) => {
        if (e2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(index);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    res.end(data);
  });
}

/* ---------------- request handler ---------------- */

async function handler(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const pathname = u.pathname;
  const query = Object.fromEntries(u.searchParams.entries());

  if (pathname.startsWith('/api/')) {
    try {
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : {};
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.rx.exec(pathname);
        if (!m) continue;
        const params = {};
        r.keys.forEach((k, i) => {
          params[k] = decodeURIComponent(m[i + 1]);
        });
        try {
          const result = await r.handler(req, res, params, body, query);
          return sendJson(res, 200, result);
        } catch (e) {
          if (e instanceof inv.HttpError) {
            return sendJson(res, e.status, { error: e.message, ...(e.extra || {}) });
          }
          console.error('[bms-ims] unhandled error:', e);
          return sendJson(res, 500, { error: 'Internal server error.' });
        }
      }
      return sendJson(res, 404, { error: 'API endpoint not found.' });
    } catch (e) {
      if (e instanceof inv.HttpError) return sendJson(res, e.status, { error: e.message });
      console.error('[bms-ims] body error:', e);
      return sendJson(res, 500, { error: 'Internal server error.' });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end('Method not allowed');
  }
  serveStatic(pathname, res);
}

function start(port = PORT) {
  const server = http.createServer(handler);
  server.listen(port, HOST, () => {
    console.log(`[bms-ims] BMS Inventory Management System running at http://${HOST}:${port}`);
    console.log(`[bms-ims] Database: ${DB_PATH}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start, handler };
