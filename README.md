# BMS IMS — BMS Inventory Management System

**Building Management System Inventory & Stock Control**

BMS IMS is a lightweight inventory and spare-parts management system for BMS / Facility Management operations.

## 1. Current Architecture

```text
PC / Laptop ───────┐
                   │
Mobile Phone ──────┤
                   ↓
              GitHub Pages
            Static Web Frontend
                   ↓
             Supabase JS Client
                   ↓
              Supabase Cloud
              ┌─────┴─────┐
              ↓           ↓
           items     transactions
              └─────┬─────┘
                    ↓
             Stock Calculation
```

| Component | Function |
|---|---|
| GitHub Pages | Hosts the web application |
| HTML / CSS / JavaScript | User interface and business flow |
| Supabase | Shared cloud database |
| items | Inventory master data |
| transactions | Stock movement history |
| local-backend.js | Keeps the existing /api/* interface and connects it to Supabase |

GitHub Pages provides static web hosting. Supabase can be accessed from browser JavaScript through its Data API; access should be protected with RLS and least-privilege policies. citeturn0search13turn0search0turn0search2

## 2. Why Supabase

The original GitHub Pages version stored data in browser localStorage. That meant the PC and phone had separate datasets.

The current system stores inventory data in Supabase, so multiple devices can read the same stock database.

```text
PC Stock In +10
      ↓
  Supabase
      ↓
Phone refresh
      ↓
Same Balance = 10
```

## 3. Current Inventory

- Master inventory: **49 items**
- Opening stock for the current master: **0**
- Primary data source: **Supabase**

## 4. Stock Formula

```text
Balance = Opening Stock + Stock In - Stock Out + Adjustment
```

Example:

```text
Opening   = 0
Stock In  = +20
Stock Out = -5
Adjustment = 0
Balance   = 15
```

Stock Out is blocked when requested quantity is greater than the available balance.

## 5. How to Use

### Dashboard
Use Dashboard for total items, stock quantity, low/out-of-stock status, today's movements, recent transactions and quick actions.

### Inventory
Search and filter items by code, name, category, location, brand or stock status. Open an item to see its details and movement.

### Stock In
Use when material is received. Select item, enter quantity and reference/supplier where available, then submit.

### Stock Out
Use when material is issued for BMS/M&E work. Record item, quantity, issued-to, work order, area and reason where applicable.

### Adjustment
Use only when physical count differs from system balance. Record the reason; the adjustment becomes part of the transaction history.

### Transactions
Use this module to review Stock In, Stock Out and Adjustment history.

### Reports / CSV
Use reports for inventory, low stock and stock movement. CSV can be opened with Microsoft Excel.

## 6. Recommended Daily Workflow

```text
START SHIFT
  ↓
Check Dashboard
  ↓
Check Low / Out of Stock
  ↓
Receive material → STOCK IN
  ↓
Issue material → STOCK OUT
  ↓
Verify unusual balance
  ↓
Physical check when required
  ↓
Adjustment only when necessary
  ↓
Review Transactions
  ↓
HANDOVER / END SHIFT
```

## 7. Mobile Operation

The system is intended to be usable from a phone browser.

Recommended phone flow:
1. Open the BMS IMS URL.
2. Use the menu button for navigation.
3. Use Dashboard for quick checks.
4. Use Stock In / Stock Out for daily operations.
5. Use Inventory search to find parts quickly.
6. Prefer portrait mode for normal stock entry.

Mobile-first optimization is the next development priority.

## 8. Database

### items
Stores item code, item name, category, unit, location, minimum/maximum stock, opening stock, brand, model, part number, supplier and remarks.

### transactions
Stores transaction ID, item, type, quantity, reference, supplier, issued-to, work order, area, reason, user, remarks, transaction date and created time.

## 9. Security

The frontend uses a Supabase **publishable key**. Publishable keys are designed for client-side use, but database access must be protected with RLS and appropriate grants. Secret/service-role keys must never be exposed in browser code. citeturn0search2turn0search4

Current RLS configuration is intentionally broad for internal prototype/testing. Before wider or public deployment, implement:
- Supabase Auth login
- Technician / Store Operator / Supervisor roles
- Restricted item master editing
- Supervisor permission for adjustments
- Stronger RLS policies
- Better audit trail

## 10. Current Limitations

- No login/role management yet.
- RLS requires hardening for production.
- Inventory valuation/cost tracking is not implemented.
- Native XLSX export is not implemented.
- WhatsApp/email notifications are not implemented.
- Transaction ID generation should be made concurrency-safe for larger deployments.

## 11. Roadmap

### Phase 1 — Mobile Operation
- Mobile-first layout
- Larger touch controls
- Compact dashboard
- Faster Stock In / Stock Out
- Mobile-friendly tables
- Mobile-friendly modal forms

### Phase 2 — Security
- Login
- User roles
- RLS hardening
- Supervisor approval for adjustments

### Phase 3 — BMS Store Intelligence
- Low-stock alert
- Reorder suggestion
- Minimum/maximum stock recommendation
- Monthly stock report
- Stock movement analytics

### Phase 4 — Smart BMS Integration
- QR/barcode scanning
- Item QR labels
- AI inventory assistant
- WhatsApp notification
- BMS work-order reference
- Predictive spare-parts demand

## 12. Project Structure

```text
bms-inventory/
├── server.js
├── db.js
├── inventory.js
├── seed.js
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       └── charts.js
├── pages-src/
│   ├── index.html
│   └── js/local-backend.js
├── docs/
│   └── GitHub Pages deployed files
├── supabase/
│   └── schema.sql
└── README.md
```

## 13. Official Links

- Live system: https://aliifnajmi.github.io/bms-inventory/
- GitHub repository: https://github.com/aliifnajmi/bms-inventory

## 14. Version Status

**BMS IMS v1.x — Supabase Cloud + GitHub Pages**

**Next priority: Mobile-first optimization.**