# BMS IMS — NOTA RASMI SISTEM

**Nama Sistem:** BMS Inventory Management System (BMS IMS)
**Fungsi:** Inventory & Stock Control untuk operasi BMS / Facility Management
**Platform:** GitHub Pages + Supabase
**Status:** Internal Prototype / Operational Development

## 1. Tujuan

BMS IMS dibangunkan untuk merekod dan mengawal stok spare parts, electrical items, sensors, cables, tools dan consumables yang digunakan dalam operasi BMS.

## 2. Architecture

```text
PC / Laptop ───────┐
                   │
Mobile Phone ──────┤
                   ↓
              GitHub Pages
            Web Application
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

**Ringkas:** GitHub Pages = website; JavaScript/CSS/HTML = interface; Supabase = database cloud; items = master inventory; transactions = rekod pergerakan stok.

## 3. Formula Stok

```text
Balance = Opening Stock + Stock In - Stock Out + Adjustment
```

Balance hendaklah dikira berdasarkan transaction dan bukan diubah secara manual.

## 4. Modul

| Modul | Kegunaan |
|---|---|
| Dashboard | Ringkasan stok dan aktiviti |
| Inventory | Senarai, carian dan maklumat item |
| Stock In | Rekod barang diterima |
| Stock Out | Rekod barang dikeluarkan |
| Adjustment | Pembetulan berdasarkan physical count |
| Transactions | Sejarah pergerakan stok |
| Reports | Laporan inventory dan movement |
| CSV Export | Export untuk Excel |

## 5. Cara Guna

### Stock In
Receive item → Check quantity → Select item → Enter quantity → Enter reference/supplier → Submit → Verify balance.

### Stock Out
Select item → Enter quantity → Record work order/area/reason → Submit. Sistem akan menghalang quantity yang melebihi balance.

### Adjustment
Bandingkan system balance dengan physical count → kira difference → masukkan reason → submit. Adjustment direkod sebagai transaction.

## 6. Operasi Telefon

Sistem boleh dibuka melalui browser telefon. Workflow ringkas:

```text
Open BMS IMS
→ Dashboard
→ Check Low Stock
→ Search Item
→ Stock In / Stock Out
→ Verify Balance
```

Mobile optimization merupakan development priority seterusnya.

## 7. Data Semasa

- Master inventory: **49 items**
- Opening stock semasa: **0**
- Database utama: **Supabase**

## 8. Security

Frontend menggunakan Supabase publishable key. Access database perlu dikawal menggunakan RLS dan permission yang sesuai. Secret/service-role key tidak boleh diletakkan dalam frontend.

Current setup masih sesuai untuk prototype/internal testing. Untuk production perlu ditambah:
- Login / Supabase Auth
- User roles
- RLS yang lebih ketat
- Supervisor permission untuk Adjustment
- Audit trail yang lebih lengkap

## 9. Roadmap

### Next Step — Mobile Friendly
1. Mobile-first layout
2. Larger touch buttons
3. Compact Dashboard
4. Mobile-friendly Stock In / Stock Out
5. Better table/card view
6. Easier search
7. Mobile modal
8. Safe-area support
9. Faster one-hand operation

### Selepas Mobile
Login & roles → QR/barcode → Low-stock alert → Reorder suggestion → Monthly report → WhatsApp notification → AI inventory assistant.

## 10. Prinsip Sistem

> **Record the movement, calculate the balance.**