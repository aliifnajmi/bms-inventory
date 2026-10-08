# BMS IMS — BMS Inventory Management System

**Building Management System Inventory & Stock Control**

A simple, reliable store & spare-parts inventory system for BMS technicians and
facility-management store operators. Track BMS components, electrical items,
ACMV spares, sensors, controllers, cables, tools and consumables — with
automatic stock-balance calculation, low-stock monitoring, full transaction
history, reporting and CSV export.

![BMS IMS](https://img.shields.io/badge/BMS%20IMS-v1.0.0-0d9488)

---

## Features

- **Dashboard** — total items, total stock, low-stock & out-of-stock counts,
  stock in/out today, stock-overview bar chart, inventory-by-category chart,
  low-stock table, recent transactions, and quick actions.
- **Inventory** — full item table with search (code, name, part number, brand)
  and filters (category, location, stock status, brand). Add / edit items.
- **Stock In** — record goods received; balance increases automatically.
- **Stock Out** — record items issued to work orders; balance decreases
  automatically. **Stock Out can never exceed available stock.**
- **Stock Adjustment** — reconcile physical counts; every adjustment is
  recorded as a transaction (never a silent change).
- **Transactions** — complete history (Stock In / Stock Out / Adjustment) with
  search and filters (type, item, category, user, date range).
- **Item Details** — full item info, stock-movement formula
  (Opening + In − Out + Adjustment = Balance) and a balance-over-time chart.
- **Categories** — add / edit / delete with protection for categories in use.
- **Reports** — Inventory, Low Stock and Stock Movement reports with CSV export.
- **CSV Export** — inventory, transactions and low-stock report.
- **Demo data** — 30 items, 52 transactions, 10 categories, including normal,
  low-stock and out-of-stock items. The dashboard is meaningful immediately.
- **Responsive** — desktop sidebar, collapsible mobile menu, usable tables on
  small screens.

## The inventory formula

```
Stock Balance = Opening Stock + Σ Stock In − Σ Stock Out + Σ Adjustment
```

The **Stock Balance is never stored as an editable value** and users can never
type it in. It is always calculated from the transaction history, so it stays
correct after every Stock In, Stock Out, Adjustment, item edit or reset.

Status is derived automatically:

| Condition | Status |
| --- | --- |
| Balance = 0 | 🔴 Out of Stock |
| Balance ≤ Minimum Stock | 🟠 Low Stock |
| otherwise | 🟢 Normal |

## Quick start

Requires **Node.js ≥ 22.5** (uses the built-in `node:sqlite` — **zero npm
dependencies**, nothing to install).

```bash
# 1. Start the system (creates ./data/bms.db and loads demo data on first run)
npm start

# 2. Open in your browser
#    http://localhost:3000
```

Other commands:

```bash
npm test          # run the end-to-end API smoke test (61 checks)
npm run start:reset   # wipe the database and reload the demo dataset
```

Configuration via environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | bind address |
| `BMS_DB_PATH` | `./data/bms.db` | SQLite database file |

## How to use

### Add a new BMS item
Dashboard → **ADD ITEM** (or Inventory → **Add Item**). Fill in the item code
(must be unique), name, category, unit, location, minimum/maximum stock and the
**Opening Stock** (the starting balance). Save — the item appears in Inventory
with its calculated balance.

### Record Stock In (goods received)
**Stock In** page → pick the item (use the filter box to find it fast), enter
quantity, supplier, delivery/PO reference and who received it → **Submit
Stock In**. The balance increases instantly and a transaction is recorded.

### Record Stock Out (issued for a job)
**Stock Out** page → pick the item, enter quantity, issued-to, work order,
area and reason → **Submit Stock Out**. The balance decreases instantly.
If you request more than the available stock, the system blocks it:

> Stock Out failed. Only 3 PCS of "BMS-SEN-002" are currently available.

### Stock Adjustment (physical count)
Dashboard → **STOCK ADJUSTMENT** (or Settings). Select the item, enter the
**physical counted stock** — the difference is calculated automatically — and
give a reason. The adjustment is written to the transaction history and the
balance is corrected.

### Check an item
Click any item code → Item Details page shows all information, the stock
movement formula and a balance-over-time chart.

## Project structure

```
bms-inventory/
├── server.js            # HTTP server: REST API + static files (Node stdlib only)
├── db.js                # SQLite setup (node:sqlite) + schema
├── inventory.js         # business logic: validation, stock engine, dashboard
├── seed.js              # demo dataset (30 items, 52 transactions, 10 categories)
├── test/
│   └── smoke-test.js    # end-to-end API test (npm test)
├── public/
│   ├── index.html       # app shell (sidebar + topbar)
│   ├── css/style.css    # dark blue/green facility-management theme
│   └── js/
│       ├── app.js       # SPA: router, pages, forms, modals, CSV export
│       └── charts.js    # dependency-free SVG charts
└── data/                # SQLite database (created at runtime, git-ignored)
```

## REST API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/dashboard` | summary cards, charts, low stock, recent transactions |
| GET | `/api/items?search=&category=&location=&brand=&status=` | list items with calculated balance & status |
| POST | `/api/items` | add item (unique code, valid category) |
| GET / PUT | `/api/items/:id` | item detail (with timeline) / update item |
| GET / POST | `/api/categories` | list / add categories |
| PUT / DELETE | `/api/categories/:id` | update / delete (`?force=true` reassigns items to "Others") |
| GET | `/api/transactions?type=&item_id=&category=&user=&from=&to=&search=` | transaction history |
| POST | `/api/transactions/stock-in` | record Stock In |
| POST | `/api/transactions/stock-out` | record Stock Out (blocked if qty > available) |
| POST | `/api/transactions/adjustment` | record adjustment from physical count |
| POST | `/api/reset` | restore demo dataset |

## Validation & system rules

- Item codes are **unique** (case-insensitive).
- Quantities must be whole numbers **> 0**; dates must be `YYYY-MM-DD`.
- **Stock Out can never exceed available stock** (enforced server-side inside a
  transaction, and pre-checked in the UI).
- Every Stock In / Stock Out / Adjustment **creates a transaction record** —
  history never disappears silently.
- Adjustments require a reason and a no-change adjustment is rejected.
- Deleting a category that is in use requires confirmation; items are moved to
  "Others" so no item is ever left without a category.
- Destructive actions (delete, reset) always ask for confirmation.

## 🌐 GitHub Pages demo (browser-only build)

A **100% static, zero-dependency browser version** of the same system is deployed
via GitHub Pages:

👉 **https://aliifnajmi.github.io/bms-inventory/**

- Same UI, same pages, same business rules as the Node version.
- The REST API is implemented in the browser (`pages-src/js/local-backend.js`)
  and backed by **localStorage** — stock balance is still calculated from
  transactions, Stock Out is still blocked above available stock, etc.
- Data is stored **only in the visitor's browser** (per device/browser).
  Use Settings → **Reset Demo Data** to restore the original dataset.
- The demo dataset in `docs/data/seed.json` is generated from `seed.js`, so it
  never drifts from the server version.

Rebuild the Pages site after changing the frontend or seed data:

```bash
npm run build:pages    # regenerates docs/ from public/ + pages-src/ + seed.js
```

Pages is configured to serve the `docs/` folder of this branch. After merging
to `main`, switch the Pages source to `main` → `/docs` (Settings → Pages).

## Limitations of this version

- Single-user / single-store: no login, roles or audit trail of *who* changed
  what beyond the `user` field entered on each transaction.
- No unit-cost / stock valuation (kept out intentionally to stay simple).
- CSV export only (no native .xlsx) — Excel and LibreOffice open the CSV
  directly.
- SQLite is perfect for a single building / small team; for multi-site
  deployments the same API can be backed by PostgreSQL later without changing
  the frontend.

## License

MIT
