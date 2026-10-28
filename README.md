# BMS SuperApps — Building Management System Operations Platform

**One connected workspace for BMS technicians, store operations, and building maintenance workflows at Exchange 106.**

BMS SuperApps is evolving from a simple inventory tracker into a modular digital workspace for Building Management System (BMS) and Facilities Management (FM) operations. The goal is straightforward: reduce manual work, keep operational records organised, and make useful information easier to access from a PC or mobile phone.

> **Project status:** This repository is actively evolving. Inventory is the foundation; FCU Schedule Assistant, OT Management, and further modules are being developed and integrated in stages. Features described as planned or in progress should not be treated as production-ready until released and tested.

## The Story Behind the Project

### The problem

BMS technicians and store operations handle many small but important tasks every day. When information is spread across spreadsheets, paper forms, browser storage, or separate tools, it can become difficult to:

- Know which spare parts are available and where they are stored.
- Keep stock records consistent when staff use different devices.
- Find work references and trace why materials were issued.
- Manage operational schedules and overtime records without repetitive manual entry.
- Review reports quickly and hand over accurate information between shifts.
- Grow the system without creating a separate disconnected app for every task.

### The approach

Instead of building one large system all at once, BMS SuperApps is being developed as a set of practical modules that share a common direction: a responsive interface, structured data, and a cloud-backed foundation using Supabase.

The project grows from real operational needs. Each module addresses a specific workflow, while the long-term aim is to connect those workflows into one BMS operations platform.

## How the Project Has Evolved

### 1. BMS Inventory — the foundation

The project began with inventory and spare-parts tracking for day-to-day BMS store operations.

**The goal:** make it easier to record what comes in, what goes out, and what remains in stock.

Core inventory workflows include:

- Inventory item records and search.
- Stock In, Stock Out, and stock adjustments.
- Transaction history and stock-balance calculations.
- Low-stock visibility and dashboard summaries.
- Work-order/reference details to help trace material issues.
- Reports and data exports for operational review.

The early browser-based version relied on local storage, which meant data could be different between devices. The project moved toward **Supabase as a shared cloud database**, so supported devices can work with the same central data source.

### 2. FCU Schedule Assistant — supporting recurring operations

The next direction is to make recurring FCU-related scheduling and operational information easier to organise and access.

**The goal:** reduce repetitive manual handling and make schedule information clearer for technicians.

FCU Schedule Assistant is part of the wider SuperApps journey. Its integration and release status may vary by branch, so check the live application and current project updates before relying on a particular feature.

### 3. OT Management — improving overtime administration

Overtime (OT) management is another operational workflow being brought into the wider platform.

**The goal:** organise overtime submissions and records, make them easier to review, and reduce scattered manual tracking.

The intended workflow includes OT records, worker information, reporting, verification, and auditability. The OT module is being connected to Supabase as part of the integration work. Until the relevant changes are reviewed, merged, and tested, treat this integration as work in progress rather than a confirmed production release.

### 4. BMS SuperApps — connecting the workflows

Inventory, FCU scheduling, OT Management, and future tools are being developed toward a single modular experience.

The long-term direction is to give technicians and supervisors one place to access the tools they need, while keeping each module focused on its own task.

## Current Technical Direction

```text
                 PC / Laptop / Mobile
                          |
                          v
                Responsive Web Interface
                          |
             +------------+------------+
             |            |            |
             v            v            v
         Inventory    FCU Schedule   OT Management
             |            |            |
             +------------+------------+
                          |
                          v
                    Supabase Cloud
               Shared data and services
                          |
                          v
               Reports / Audit / Insights
                 (evolving by module)
```

| Component | Purpose |
|---|---|
| HTML, CSS, JavaScript | Web interface and module workflows |
| GitHub | Source code, version history, and collaboration |
| GitHub Pages | Hosts the static web application |
| Supabase | Cloud database and data API for integrated modules |
| Row Level Security (RLS) | Database access control; policies must be reviewed and hardened before wider production use |

The application uses a browser-based frontend, so **never put a Supabase secret or service-role key in client-side code**. A publishable key is not a replacement for correctly configured database permissions and RLS.

## Inventory Workflow at a Glance

```text
Check Dashboard
      |
      v
Review Low / Out-of-Stock Items
      |
      +----> Receive Parts ------> Stock In
      |
      +----> Issue Parts --------> Stock Out
                                      |
                                      v
                           Record Work Reference
                                      |
                                      v
                            Review Transactions
                                      |
                                      v
                            Report / Handover
```

The exact fields and available actions depend on the version currently deployed.

## Roadmap — What Comes Next

The roadmap is a direction for development, not a promise that every item is already available.

### Near-term priorities
- Continue integrating Inventory, FCU Schedule Assistant, and OT Management.
- Keep the interface responsive and practical on mobile and desktop.
- Improve Work Order references, reports, and export consistency.
- Test complete workflows before promoting changes to the live application.
- Review Supabase access rules, authentication, roles, and audit requirements.

### Future module ideas
- **QR Asset & Digital Work Order:** scan an asset or item to open its details and related maintenance record.
- **Preventive Maintenance Planner:** organise recurring maintenance schedules and track completion.
- **Digital Shift Handover:** record outstanding work, abnormal conditions, and follow-up actions.
- **BMS Alarm Intelligence Centre:** organise alarm information and help technicians investigate recurring issues.
- **Inventory–Work Order Integration:** connect material usage to work references and maintenance history.
- **AI Technician Assistant:** help technicians search approved procedures, interpret records, and prepare reports.

Future modules will be prioritised according to operational value, data quality, security, and feasibility.

## Development and Release Notes

This project is developed in stages using branches and pull requests so that changes can be reviewed before they are merged.

- Work-in-progress branches may contain features that are not available on the live site.
- A pull request is not the same as a production release.
- Database changes and security policies must be checked alongside frontend changes.
- Real-world operational use should follow successful end-to-end testing and the appropriate approval process.

## Useful Links

- **Live Inventory application:** https://aliifnajmi.github.io/bms-inventory/
- **GitHub repository:** https://github.com/aliifnajmi/bms-inventory
- **Supabase:** https://supabase.com/

## The Vision

**Build practical tools around the real work of BMS technicians — then connect those tools into one reliable SuperApps platform.**

BMS SuperApps is a work in progress. The focus is not simply to add more features, but to make everyday operations easier to record, find, review, and improve.
