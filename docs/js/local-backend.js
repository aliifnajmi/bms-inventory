'use strict';

/**
 * BMS IMS — browser backend (GitHub Pages build).
 *
 * Implements the exact same REST API as server.js / inventory.js, but backed by
 * localStorage instead of SQLite. All business rules are identical:
 *   - Stock Balance = Opening Stock + Σ Stock In − Σ Stock Out + Σ Adjustment
 *     (calculated from transactions — never stored or editable)
 *   - Stock Out can never exceed available stock
 *   - Unique item codes, valid categories, quantity/date validation
 *   - Status: 0 → OUT OF STOCK, ≤ min → LOW STOCK, else NORMAL
 *
 * Data lives in this browser only (localStorage) — nothing is sent anywhere.
 */
(function () {
  const LS_KEY = 'bms-ims-local-v1';
  const VERSION = '1.0.0';

  // The demo dataset is inlined at build time by scripts/build-pages.js
  // (it replaces the placeholder below with JSON generated from seed.js).
  const SEED = {"categories":[{"id":1,"name":"BMS","description":"Building Management System components — sensors, controllers, relays, power supplies, control cables","created_at":"2026-10-08T10:14:17.830Z"},{"id":2,"name":"Electrical","description":"Electrical components — MCBs, relays, contactors, cables","created_at":"2026-10-08T10:14:17.830Z"},{"id":3,"name":"ACMV","description":"Air-Conditioning & Mechanical Ventilation — filters, belts, actuators, pressure sensors","created_at":"2026-10-08T10:14:17.830Z"},{"id":4,"name":"ELV","description":"Extra Low Voltage systems — PIR sensors, power supplies, access control spares","created_at":"2026-10-08T10:14:17.830Z"},{"id":5,"name":"Fire Protection","description":"Fire alarm & protection spares — detectors, batteries, call points","created_at":"2026-10-08T10:14:17.830Z"},{"id":6,"name":"Plumbing","description":"Plumbing spares — valves, taps, fittings","created_at":"2026-10-08T10:14:17.830Z"},{"id":7,"name":"Tools","description":"Maintenance tools & test equipment","created_at":"2026-10-08T10:14:17.830Z"},{"id":8,"name":"Consumables","description":"Consumable items — cable ties, tapes, labels","created_at":"2026-10-08T10:14:17.830Z"},{"id":9,"name":"Safety","description":"Safety & PPE items","created_at":"2026-10-08T10:14:17.830Z"},{"id":10,"name":"Others","description":"Miscellaneous items","created_at":"2026-10-08T10:14:17.830Z"}],"items":[{"id":1,"item_code":"BMS-SEN-001","item_name":"Temperature Sensor","description":"Duct/room temperature sensor, 10k NTC, 0-50°C","category":"BMS","subcategory":"Sensors","brand":"Honeywell","model":"T7411A1004","part_number":"T7411A1004","unit":"PCS","location":"Store A","minimum_stock":5,"maximum_stock":30,"opening_stock":10,"supplier":"ABC Engineering","remarks":"For AHU and FCU monitoring","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":2,"item_code":"BMS-SEN-002","item_name":"Humidity Sensor","description":"Duct humidity sensor, 0-100% RH, 4-20mA output","category":"BMS","subcategory":"Sensors","brand":"Honeywell","model":"H7080B1103","part_number":"H7080B1103","unit":"PCS","location":"Store A","minimum_stock":5,"maximum_stock":20,"opening_stock":8,"supplier":"ABC Engineering","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":3,"item_code":"BMS-CTRL-001","item_name":"DDC Controller","description":"Standalone DDC controller, 16 UI / 8 UO, BACnet","category":"BMS","subcategory":"Controllers","brand":"Siemens","model":"Climatix POL424","part_number":"POL424.XX/STD","unit":"PCS","location":"Store A","minimum_stock":2,"maximum_stock":8,"opening_stock":3,"supplier":"Siemens Pte Ltd","remarks":"Field controller for AHU/FCU","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":4,"item_code":"BMS-CTRL-002","item_name":"I/O Module","description":"Expansion I/O module, 8 UI / 6 DO","category":"BMS","subcategory":"Controllers","brand":"Siemens","model":"Climatix POL638","part_number":"POL638.70/STD","unit":"PCS","location":"Store A","minimum_stock":3,"maximum_stock":10,"opening_stock":5,"supplier":"Siemens Pte Ltd","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":5,"item_code":"BMS-REL-001","item_name":"Relay Module","description":"Interface relay module, 230VAC coil, 2CO, DIN rail","category":"BMS","subcategory":"Relays","brand":"Finder","model":"38.51.7.024.0050","part_number":"38.51.7.024.0050","unit":"PCS","location":"Store A","minimum_stock":3,"maximum_stock":15,"opening_stock":6,"supplier":"Finder Components","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":6,"item_code":"BMS-PWR-001","item_name":"24VDC Power Supply","description":"DIN rail power supply 24VDC 5A for field devices","category":"BMS","subcategory":"Power Supply","brand":"Siemens","model":"SITOP PSU100S","part_number":"6EP1333-2BA20","unit":"PCS","location":"Store A","minimum_stock":2,"maximum_stock":8,"opening_stock":4,"supplier":"Siemens Pte Ltd","remarks":"For DDC controllers and actuators","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":7,"item_code":"BMS-CAB-001","item_name":"Belden Control Cable","description":"Shielded control cable 2x0.75mm², sold by the metre","category":"BMS","subcategory":"Cables","brand":"Belden","model":"8760 009U","part_number":"8760-009U","unit":"MTR","location":"Store C","minimum_stock":50,"maximum_stock":500,"opening_stock":200,"supplier":"Lapp Kabel","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":8,"item_code":"BMS-VAL-001","item_name":"Globe Valve 2 Inch","description":"Bronze globe valve, PN16, flanged, 2 inch","category":"BMS","subcategory":"Valves","brand":"Belimo","model":"G2Q-050","part_number":"G2Q-050","unit":"PCS","location":"Store B","minimum_stock":2,"maximum_stock":6,"opening_stock":3,"supplier":"Belimo Asia","remarks":"For chilled water lines","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":9,"item_code":"ACMV-FLT-001","item_name":"AHU Filter 24x24x2","description":"Pleated panel filter 24x24x2 inch, MERV 8","category":"ACMV","subcategory":"Filters","brand":"Filtrex","model":"FX-P24-M8","part_number":"FX-P24-M8","unit":"PCS","location":"Store B","minimum_stock":10,"maximum_stock":60,"opening_stock":30,"supplier":"Filtrex Asia","remarks":"Quarterly replacement","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":10,"item_code":"ACMV-BLT-001","item_name":"AHU Fan Belt","description":"Classical V-belt, B-section, 68 inch","category":"ACMV","subcategory":"Belts","brand":"Gates","model":"B68","part_number":"B-68","unit":"PCS","location":"Store B","minimum_stock":2,"maximum_stock":10,"opening_stock":4,"supplier":"Power Transmission Co","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":11,"item_code":"ACMV-SEN-001","item_name":"Differential Pressure Sensor","description":"Air differential pressure sensor, 0-500Pa, 4-20mA","category":"ACMV","subcategory":"Sensors","brand":"Dwyer","model":"MS-311-LCD","part_number":"MS-311-LCD","unit":"PCS","location":"Store A","minimum_stock":3,"maximum_stock":10,"opening_stock":5,"supplier":"Dwyer Instruments","remarks":"For filter & fan status monitoring","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":12,"item_code":"ACMV-ACT-001","item_name":"Damper Actuator","description":"Spring-return damper actuator, 24VAC, 10Nm","category":"ACMV","subcategory":"Actuators","brand":"Belimo","model":"LM24A","part_number":"LM24A","unit":"PCS","location":"Store A","minimum_stock":2,"maximum_stock":8,"opening_stock":4,"supplier":"Belimo Asia","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":13,"item_code":"ELEC-MCB-001","item_name":"MCB 10A 1P","description":"Miniature circuit breaker 10A, 1 pole, 6kA","category":"Electrical","subcategory":"Circuit Breakers","brand":"Schneider","model":"Easy9 C120N","part_number":"EZ9F56110","unit":"PCS","location":"Store A","minimum_stock":10,"maximum_stock":80,"opening_stock":40,"supplier":"Schneider Electric","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":14,"item_code":"ELEC-MCB-002","item_name":"MCB 16A 1P","description":"Miniature circuit breaker 16A, 1 pole, 6kA","category":"Electrical","subcategory":"Circuit Breakers","brand":"Schneider","model":"Easy9 C120N","part_number":"EZ9F56116","unit":"PCS","location":"Store A","minimum_stock":10,"maximum_stock":60,"opening_stock":25,"supplier":"Schneider Electric","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":15,"item_code":"ELEC-REL-001","item_name":"Relay 230VAC","description":"Plug-in relay 230VAC coil, 3PDT, 10A with base","category":"Electrical","subcategory":"Relays","brand":"Finder","model":"55.34.9.230.0040","part_number":"55.34.9.230.0040","unit":"PCS","location":"Store A","minimum_stock":5,"maximum_stock":30,"opening_stock":12,"supplier":"Finder Components","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":16,"item_code":"ELEC-CAB-001","item_name":"Cable 2.5mm² 3C","description":"PVC insulated cable 2.5mm², 3-core, sold by the metre","category":"Electrical","subcategory":"Cables","brand":"Lapp","model":"NYY 3C2.5","part_number":"NYY-3C2.5","unit":"MTR","location":"Store C","minimum_stock":100,"maximum_stock":1000,"opening_stock":500,"supplier":"Lapp Kabel","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":17,"item_code":"ELEC-CT-001","item_name":"Contactor 18A","description":"Magnetic contactor, 18A, 230VAC coil, 3P + NO","category":"Electrical","subcategory":"Contactors","brand":"Schneider","model":"LC1K0910","part_number":"LC1K0910B7","unit":"PCS","location":"Store A","minimum_stock":3,"maximum_stock":12,"opening_stock":5,"supplier":"Schneider Electric","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":18,"item_code":"ELV-SEN-001","item_name":"PIR Motion Sensor","description":"Ceiling PIR motion sensor, 360° coverage, 12m range","category":"ELV","subcategory":"Sensors","brand":"Bosch","model":"DS936","part_number":"DS936","unit":"PCS","location":"Store B","minimum_stock":4,"maximum_stock":20,"opening_stock":10,"supplier":"Bosch Security","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":19,"item_code":"ELV-PSU-001","item_name":"12VDC 5A Power Supply","description":"Switch-mode PSU 12VDC 5A, DIN rail mount","category":"ELV","subcategory":"Power Supply","brand":"Mean Well","model":"LRS-75-12","part_number":"LRS-75-12","unit":"PCS","location":"Store A","minimum_stock":3,"maximum_stock":10,"opening_stock":6,"supplier":"Mean Well Asia","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":20,"item_code":"PLB-VAL-001","item_name":"Ball Valve 1 Inch","description":"Brass ball valve, full bore, BSP thread, 1 inch","category":"Plumbing","subcategory":"Valves","brand":"Genebre","model":"3001","part_number":"GEN-3001-1","unit":"PCS","location":"Store B","minimum_stock":3,"maximum_stock":15,"opening_stock":8,"supplier":"PlumbTech Supplies","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":21,"item_code":"PLB-TAP-001","item_name":"Basin Tap Cartridge","description":"Ceramic cartridge for basin mixer tap","category":"Plumbing","subcategory":"Fittings","brand":"Grohe","model":"iperf 96710","part_number":"96710000","unit":"PCS","location":"Store B","minimum_stock":5,"maximum_stock":20,"opening_stock":6,"supplier":"PlumbTech Supplies","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":22,"item_code":"FP-SEN-001","item_name":"Smoke Detector Head","description":"Photoelectric smoke detector head, addressable","category":"Fire Protection","subcategory":"Detectors","brand":"Edwards","model":"Series 65","part_number":"55000-122AP","unit":"PCS","location":"Store B","minimum_stock":5,"maximum_stock":25,"opening_stock":12,"supplier":"Edwards Fire","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":23,"item_code":"FP-BAT-001","item_name":"Battery 12V 7Ah","description":"Sealed lead-acid battery 12V 7Ah for panels","category":"Fire Protection","subcategory":"Batteries","brand":"Yuasa","model":"NP7-12","part_number":"NP7-12","unit":"PCS","location":"Store B","minimum_stock":4,"maximum_stock":16,"opening_stock":8,"supplier":"Edwards Fire","remarks":"For fire alarm & UPS panels","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":24,"item_code":"TOOL-001","item_name":"Multimeter","description":"Digital multimeter, CAT III 600V, true RMS","category":"Tools","subcategory":"Test Equipment","brand":"Fluke","model":"117","part_number":"FLUKE-117","unit":"PCS","location":"Tool Crib","minimum_stock":2,"maximum_stock":6,"opening_stock":3,"supplier":"Fluke Singapore","remarks":"Calibrated","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":25,"item_code":"TOOL-002","item_name":"Clamp Meter","description":"True RMS AC/DC clamp meter, 600A, Bluetooth","category":"Tools","subcategory":"Test Equipment","brand":"Fluke","model":"376 FC","part_number":"FLUKE-376-FC","unit":"PCS","location":"Tool Crib","minimum_stock":1,"maximum_stock":4,"opening_stock":2,"supplier":"Fluke Singapore","remarks":"Calibrated","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":26,"item_code":"TOOL-003","item_name":"FLUKE 922 Airflow Meter","description":"Airflow meter with pressure & temperature measurement","category":"Tools","subcategory":"Test Equipment","brand":"Fluke","model":"922","part_number":"FLUKE-922","unit":"PCS","location":"Tool Crib","minimum_stock":1,"maximum_stock":2,"opening_stock":1,"supplier":"Fluke Singapore","remarks":"For AHU airflow balancing","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":27,"item_code":"CON-CAB-001","item_name":"Cable Tie 200mm","description":"Nylon cable ties 200mm x 4.8mm, bag of 100","category":"Consumables","subcategory":"Fasteners","brand":"Panduit","model":"PLT20H","part_number":"PLT20H-L0","unit":"BAG","location":"Store C","minimum_stock":5,"maximum_stock":40,"opening_stock":20,"supplier":"Hardware Hub","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":28,"item_code":"CON-TAP-001","item_name":"PTFE Tape 12mm","description":"PTFE thread seal tape, 12mm x 12m roll","category":"Consumables","subcategory":"Sealants","brand":"Loctite","model":"5080","part_number":"LOCTITE-5080","unit":"ROLL","location":"Store C","minimum_stock":10,"maximum_stock":50,"opening_stock":15,"supplier":"Hardware Hub","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":29,"item_code":"SAF-GLV-001","item_name":"Safety Gloves","description":"Cut-resistant work gloves, size L, box of 12 pairs","category":"Safety","subcategory":"PPE","brand":"Ansell","model":"HyFlex 11-542","part_number":"11-542-L","unit":"BOX","location":"Store B","minimum_stock":5,"maximum_stock":30,"opening_stock":12,"supplier":"SafetyFirst Pte Ltd","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"},{"id":30,"item_code":"OTH-LBL-001","item_name":"Cable Label Roll","description":"Self-laminating cable marker roll, 1000 labels","category":"Others","subcategory":"Labels","brand":"HellermannTyton","model":"TAGWM-4","part_number":"TAGWM-4","unit":"ROLL","location":"Store C","minimum_stock":3,"maximum_stock":12,"opening_stock":5,"supplier":"Hardware Hub","remarks":"","created_at":"2026-10-08T10:14:17.830Z","updated_at":"2026-10-08T10:14:17.830Z"}],"transactions":[{"id":1,"transaction_id":"TXN-2026-000001","item_id":1,"transaction_type":"STOCK_IN","quantity":15,"reference":"PO-2026-088","supplier":"ABC Engineering","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"Quarterly replenishment","transaction_date":"2026-09-05","created_at":"2026-10-08T10:14:17.830Z"},{"id":2,"transaction_id":"TXN-2026-000002","item_id":1,"transaction_type":"STOCK_OUT","quantity":13,"reference":"","supplier":"","issued_to":"BMS Team - Level 35","work_order":"WO-2026-041","area":"Level 35","reason":"Replacement of faulty temperature sensors","user":"John Tan","remarks":"","transaction_date":"2026-09-22","created_at":"2026-10-08T10:14:17.830Z"},{"id":3,"transaction_id":"TXN-2026-000003","item_id":1,"transaction_type":"STOCK_IN","quantity":10,"reference":"DO-2026-001","supplier":"ABC Engineering","issued_to":"","work_order":"","area":"","reason":"","user":"BMS Technician","remarks":"Urgent restock","transaction_date":"2026-10-08","created_at":"2026-10-08T10:14:17.830Z"},{"id":4,"transaction_id":"TXN-2026-000004","item_id":2,"transaction_type":"STOCK_OUT","quantity":6,"reference":"","supplier":"","issued_to":"AHU Team","work_order":"WO-2026-033","area":"Level 12 AHU","reason":"Sensor drift replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-12","created_at":"2026-10-08T10:14:17.830Z"},{"id":5,"transaction_id":"TXN-2026-000005","item_id":3,"transaction_type":"STOCK_OUT","quantity":3,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-019","area":"BAS Room","reason":"Controller failure replacement","user":"John Tan","remarks":"","transaction_date":"2026-08-28","created_at":"2026-10-08T10:14:17.830Z"},{"id":6,"transaction_id":"TXN-2026-000006","item_id":4,"transaction_type":"STOCK_IN","quantity":4,"reference":"PO-2026-071","supplier":"Siemens Pte Ltd","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-10","created_at":"2026-10-08T10:14:17.830Z"},{"id":7,"transaction_id":"TXN-2026-000007","item_id":4,"transaction_type":"STOCK_OUT","quantity":3,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-052","area":"Level 20","reason":"I/O module fault replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-25","created_at":"2026-10-08T10:14:17.830Z"},{"id":8,"transaction_id":"TXN-2026-000008","item_id":4,"transaction_type":"STOCK_OUT","quantity":3,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-058","area":"Level 28","reason":"Expansion works","user":"John Tan","remarks":"","transaction_date":"2026-10-02","created_at":"2026-10-08T10:14:17.830Z"},{"id":9,"transaction_id":"TXN-2026-000009","item_id":5,"transaction_type":"STOCK_OUT","quantity":6,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-047","area":"Lift Motor Room","reason":"Burnt relay replacement","user":"BMS Technician","remarks":"","transaction_date":"2026-09-18","created_at":"2026-10-08T10:14:17.830Z"},{"id":10,"transaction_id":"TXN-2026-000010","item_id":6,"transaction_type":"STOCK_IN","quantity":2,"reference":"PO-2026-079","supplier":"Siemens Pte Ltd","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-08","created_at":"2026-10-08T10:14:17.830Z"},{"id":11,"transaction_id":"TXN-2026-000011","item_id":6,"transaction_type":"STOCK_OUT","quantity":1,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-055","area":"Level 8","reason":"PSU failure replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-30","created_at":"2026-10-08T10:14:17.830Z"},{"id":12,"transaction_id":"TXN-2026-000012","item_id":7,"transaction_type":"STOCK_IN","quantity":100,"reference":"PO-2026-066","supplier":"Lapp Kabel","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"1 drum = 305m, issued by metre","transaction_date":"2026-09-02","created_at":"2026-10-08T10:14:17.830Z"},{"id":13,"transaction_id":"TXN-2026-000013","item_id":7,"transaction_type":"STOCK_OUT","quantity":80,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-038","area":"Level 15","reason":"BAS rewiring works","user":"John Tan","remarks":"","transaction_date":"2026-09-14","created_at":"2026-10-08T10:14:17.830Z"},{"id":14,"transaction_id":"TXN-2026-000014","item_id":7,"transaction_type":"STOCK_OUT","quantity":60,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-049","area":"Level 22","reason":"New sensor installation","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-26","created_at":"2026-10-08T10:14:17.830Z"},{"id":15,"transaction_id":"TXN-2026-000015","item_id":7,"transaction_type":"STOCK_OUT","quantity":40,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-061","area":"Level 30","reason":"Retrofit works","user":"BMS Technician","remarks":"","transaction_date":"2026-10-05","created_at":"2026-10-08T10:14:17.830Z"},{"id":16,"transaction_id":"TXN-2026-000016","item_id":8,"transaction_type":"STOCK_OUT","quantity":1,"reference":"","supplier":"","issued_to":"Mechanical Team","work_order":"WO-2026-044","area":"CHW Pump Room","reason":"Leaking valve replacement","user":"John Tan","remarks":"","transaction_date":"2026-09-20","created_at":"2026-10-08T10:14:17.830Z"},{"id":17,"transaction_id":"TXN-2026-000017","item_id":9,"transaction_type":"STOCK_IN","quantity":20,"reference":"PO-2026-084","supplier":"Filtrex Asia","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-06","created_at":"2026-10-08T10:14:17.830Z"},{"id":18,"transaction_id":"TXN-2026-000018","item_id":9,"transaction_type":"STOCK_OUT","quantity":18,"reference":"","supplier":"","issued_to":"ACMV Team","work_order":"WO-2026-042","area":"AHU Level 10","reason":"Quarterly filter change","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-16","created_at":"2026-10-08T10:14:17.830Z"},{"id":19,"transaction_id":"TXN-2026-000019","item_id":9,"transaction_type":"STOCK_OUT","quantity":10,"reference":"","supplier":"","issued_to":"ACMV Team","work_order":"WO-2026-059","area":"AHU Level 18","reason":"Quarterly filter change","user":"John Tan","remarks":"","transaction_date":"2026-10-01","created_at":"2026-10-08T10:14:17.830Z"},{"id":20,"transaction_id":"TXN-2026-000020","item_id":10,"transaction_type":"STOCK_OUT","quantity":4,"reference":"","supplier":"","issued_to":"ACMV Team","work_order":"WO-2026-046","area":"AHU Level 6","reason":"Worn belt replacement","user":"BMS Technician","remarks":"","transaction_date":"2026-09-21","created_at":"2026-10-08T10:14:17.830Z"},{"id":21,"transaction_id":"TXN-2026-000021","item_id":11,"transaction_type":"STOCK_IN","quantity":3,"reference":"PO-2026-077","supplier":"Dwyer Instruments","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-11","created_at":"2026-10-08T10:14:17.830Z"},{"id":22,"transaction_id":"TXN-2026-000022","item_id":11,"transaction_type":"STOCK_OUT","quantity":5,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-053","area":"AHU Level 14","reason":"DP sensor failure replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-29","created_at":"2026-10-08T10:14:17.830Z"},{"id":23,"transaction_id":"TXN-2026-000023","item_id":12,"transaction_type":"STOCK_OUT","quantity":2,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-050","area":"Level 16 AHU","reason":"Stuck actuator replacement","user":"John Tan","remarks":"","transaction_date":"2026-09-24","created_at":"2026-10-08T10:14:17.830Z"},{"id":24,"transaction_id":"TXN-2026-000024","item_id":13,"transaction_type":"STOCK_IN","quantity":50,"reference":"PO-2026-070","supplier":"Schneider Electric","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-03","created_at":"2026-10-08T10:14:17.830Z"},{"id":25,"transaction_id":"TXN-2026-000025","item_id":13,"transaction_type":"STOCK_OUT","quantity":20,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-031","area":"DB Level 5","reason":"MCB trip replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-09","created_at":"2026-10-08T10:14:17.830Z"},{"id":26,"transaction_id":"TXN-2026-000026","item_id":13,"transaction_type":"STOCK_OUT","quantity":15,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-045","area":"DB Level 9","reason":"Circuit upgrade works","user":"John Tan","remarks":"","transaction_date":"2026-09-19","created_at":"2026-10-08T10:14:17.830Z"},{"id":27,"transaction_id":"TXN-2026-000027","item_id":13,"transaction_type":"STOCK_OUT","quantity":10,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-067","area":"DB Level 12","reason":"MCB replacement","user":"BMS Technician","remarks":"","transaction_date":"2026-10-08","created_at":"2026-10-08T10:14:17.830Z"},{"id":28,"transaction_id":"TXN-2026-000028","item_id":13,"transaction_type":"ADJUSTMENT","quantity":-2,"reference":"STOCK-TAKE","supplier":"","issued_to":"","work_order":"","area":"","reason":"Physical stock verification","user":"Siti Rahman","remarks":"2 units found damaged in store","transaction_date":"2026-09-30","created_at":"2026-10-08T10:14:17.830Z"},{"id":29,"transaction_id":"TXN-2026-000029","item_id":14,"transaction_type":"STOCK_OUT","quantity":20,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-048","area":"DB Level 7","reason":"Overload replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-23","created_at":"2026-10-08T10:14:17.830Z"},{"id":30,"transaction_id":"TXN-2026-000030","item_id":15,"transaction_type":"STOCK_IN","quantity":8,"reference":"PO-2026-081","supplier":"Finder Components","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-07","created_at":"2026-10-08T10:14:17.830Z"},{"id":31,"transaction_id":"TXN-2026-000031","item_id":15,"transaction_type":"STOCK_OUT","quantity":10,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-051","area":"HVAC Panel Room","reason":"Relay replacement","user":"John Tan","remarks":"","transaction_date":"2026-09-27","created_at":"2026-10-08T10:14:17.830Z"},{"id":32,"transaction_id":"TXN-2026-000032","item_id":16,"transaction_type":"STOCK_OUT","quantity":200,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-037","area":"Level 17","reason":"Lighting circuit rewiring","user":"BMS Technician","remarks":"","transaction_date":"2026-09-13","created_at":"2026-10-08T10:14:17.830Z"},{"id":33,"transaction_id":"TXN-2026-000033","item_id":16,"transaction_type":"STOCK_OUT","quantity":150,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-063","area":"Level 25","reason":"Power circuit works","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-10-04","created_at":"2026-10-08T10:14:17.830Z"},{"id":34,"transaction_id":"TXN-2026-000034","item_id":17,"transaction_type":"STOCK_OUT","quantity":5,"reference":"","supplier":"","issued_to":"Electrical Team","work_order":"WO-2026-043","area":"Chiller Panel Room","reason":"Contactor failure replacement","user":"John Tan","remarks":"","transaction_date":"2026-09-17","created_at":"2026-10-08T10:14:17.830Z"},{"id":35,"transaction_id":"TXN-2026-000035","item_id":18,"transaction_type":"STOCK_IN","quantity":6,"reference":"PO-2026-073","supplier":"Bosch Security","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-04","created_at":"2026-10-08T10:14:17.830Z"},{"id":36,"transaction_id":"TXN-2026-000036","item_id":18,"transaction_type":"STOCK_OUT","quantity":8,"reference":"","supplier":"","issued_to":"ELV Team","work_order":"WO-2026-054","area":"Level 21","reason":"Faulty PIR replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-28","created_at":"2026-10-08T10:14:17.830Z"},{"id":37,"transaction_id":"TXN-2026-000037","item_id":19,"transaction_type":"STOCK_OUT","quantity":4,"reference":"","supplier":"","issued_to":"ELV Team","work_order":"WO-2026-039","area":"ELV Room","reason":"PSU failure replacement","user":"BMS Technician","remarks":"","transaction_date":"2026-09-15","created_at":"2026-10-08T10:14:17.830Z"},{"id":38,"transaction_id":"TXN-2026-000038","item_id":20,"transaction_type":"STOCK_IN","quantity":10,"reference":"PO-2026-082","supplier":"PlumbTech Supplies","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-09","created_at":"2026-10-08T10:14:17.830Z"},{"id":39,"transaction_id":"TXN-2026-000039","item_id":20,"transaction_type":"STOCK_OUT","quantity":9,"reference":"","supplier":"","issued_to":"Plumbing Team","work_order":"WO-2026-050","area":"Toilet Level 11","reason":"Leaking ball valve replacement","user":"John Tan","remarks":"","transaction_date":"2026-09-25","created_at":"2026-10-08T10:14:17.830Z"},{"id":40,"transaction_id":"TXN-2026-000040","item_id":21,"transaction_type":"STOCK_OUT","quantity":6,"reference":"","supplier":"","issued_to":"Plumbing Team","work_order":"WO-2026-047","area":"Pantry Level 8","reason":"Tap cartridge replacement","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-22","created_at":"2026-10-08T10:14:17.830Z"},{"id":41,"transaction_id":"TXN-2026-000041","item_id":22,"transaction_type":"STOCK_IN","quantity":10,"reference":"PO-2026-075","supplier":"Edwards Fire","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-05","created_at":"2026-10-08T10:14:17.830Z"},{"id":42,"transaction_id":"TXN-2026-000042","item_id":22,"transaction_type":"STOCK_OUT","quantity":12,"reference":"","supplier":"","issued_to":"Fire Team","work_order":"WO-2026-050","area":"Level 19","reason":"Detector replacement after false alarms","user":"John Tan","remarks":"","transaction_date":"2026-09-26","created_at":"2026-10-08T10:14:17.830Z"},{"id":43,"transaction_id":"TXN-2026-000043","item_id":23,"transaction_type":"STOCK_OUT","quantity":5,"reference":"","supplier":"","issued_to":"Fire Team","work_order":"WO-2026-044","area":"Fire Panel Room","reason":"Battery replacement","user":"BMS Technician","remarks":"","transaction_date":"2026-09-19","created_at":"2026-10-08T10:14:17.830Z"},{"id":44,"transaction_id":"TXN-2026-000044","item_id":24,"transaction_type":"STOCK_OUT","quantity":1,"reference":"","supplier":"","issued_to":"Site Team","work_order":"WO-2026-035","area":"Site","reason":"Tool issued to site team","user":"John Tan","remarks":"","transaction_date":"2026-09-08","created_at":"2026-10-08T10:14:17.830Z"},{"id":45,"transaction_id":"TXN-2026-000045","item_id":26,"transaction_type":"STOCK_OUT","quantity":1,"reference":"","supplier":"","issued_to":"Commissioning Team","work_order":"WO-2026-021","area":"Site","reason":"Airflow measurement job","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-08-30","created_at":"2026-10-08T10:14:17.830Z"},{"id":46,"transaction_id":"TXN-2026-000046","item_id":27,"transaction_type":"STOCK_IN","quantity":30,"reference":"PO-2026-068","supplier":"Hardware Hub","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-01","created_at":"2026-10-08T10:14:17.830Z"},{"id":47,"transaction_id":"TXN-2026-000047","item_id":27,"transaction_type":"STOCK_OUT","quantity":25,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-052","area":"Level 24","reason":"Cable termination works","user":"BMS Technician","remarks":"","transaction_date":"2026-09-27","created_at":"2026-10-08T10:14:17.830Z"},{"id":48,"transaction_id":"TXN-2026-000048","item_id":27,"transaction_type":"ADJUSTMENT","quantity":5,"reference":"STOCK-TAKE","supplier":"","issued_to":"","work_order":"","area":"","reason":"Physical stock verification","user":"Siti Rahman","remarks":"Found 5 bags in Store B","transaction_date":"2026-10-06","created_at":"2026-10-08T10:14:17.830Z"},{"id":49,"transaction_id":"TXN-2026-000049","item_id":28,"transaction_type":"STOCK_OUT","quantity":8,"reference":"","supplier":"","issued_to":"Mechanical Team","work_order":"WO-2026-048","area":"AHU Level 13","reason":"Pipe jointing works","user":"John Tan","remarks":"","transaction_date":"2026-09-24","created_at":"2026-10-08T10:14:17.830Z"},{"id":50,"transaction_id":"TXN-2026-000050","item_id":29,"transaction_type":"STOCK_IN","quantity":20,"reference":"PO-2026-069","supplier":"SafetyFirst Pte Ltd","issued_to":"","work_order":"","area":"","reason":"","user":"Siti Rahman","remarks":"","transaction_date":"2026-09-03","created_at":"2026-10-08T10:14:17.830Z"},{"id":51,"transaction_id":"TXN-2026-000051","item_id":29,"transaction_type":"STOCK_OUT","quantity":18,"reference":"","supplier":"","issued_to":"Site Team","work_order":"WO-2026-056","area":"Site","reason":"PPE issuance to site team","user":"Ahmad Faiz","remarks":"","transaction_date":"2026-09-29","created_at":"2026-10-08T10:14:17.830Z"},{"id":52,"transaction_id":"TXN-2026-000052","item_id":30,"transaction_type":"STOCK_OUT","quantity":3,"reference":"","supplier":"","issued_to":"BMS Team","work_order":"WO-2026-040","area":"BAS Room","reason":"Cable labelling works","user":"BMS Technician","remarks":"","transaction_date":"2026-09-16","created_at":"2026-10-08T10:14:17.830Z"}]};

  let db = null; // { categories: [], items: [], transactions: [] }
  let seedData = null; // pristine demo dataset, used by /api/reset
  let ready = null; // load promise

  /* ---------- small utils ---------- */
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const nowISO = () => new Date().toISOString();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  const byCode = (a, b) => String(a.item_code).localeCompare(String(b.item_code));
  const cmpDateIdAsc = (a, b) =>
    a.transaction_date === b.transaction_date ? a.id - b.id : a.transaction_date < b.transaction_date ? -1 : 1;
  const cmpDateIdDesc = (a, b) => -cmpDateIdAsc(a, b);

  class HttpError extends Error {
    constructor(status, message, extra) {
      super(message);
      this.status = status;
      this.extra = extra || null;
    }
  }

  /* ---------- validation (mirrors inventory.js) ---------- */
  function reqStr(v, name) {
    if (v === undefined || v === null) throw new HttpError(400, `${name} is required.`);
    const s = String(v).trim();
    if (!s) throw new HttpError(400, `${name} is required.`);
    if (s.length > 200) throw new HttpError(400, `${name} is too long (max 200 characters).`);
    return s;
  }
  function optStr(v, max = 200) {
    if (v === undefined || v === null) return '';
    return String(v).trim().slice(0, max);
  }
  function intField(v, name, { defaultValue = 0, min = 0 } = {}) {
    if (v === undefined || v === null || v === '') return defaultValue;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (!Number.isInteger(n)) throw new HttpError(400, `${name} must be a whole number.`);
    if (n < min) throw new HttpError(400, `${name} must be ${min} or greater.`);
    return n;
  }
  function dateField(v, name = 'Date') {
    if (v === undefined || v === null || v === '') return todayISO();
    const s = String(v).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new HttpError(400, `Invalid ${name} "${v}". Use format YYYY-MM-DD.`);
    const d = new Date(s + 'T00:00:00Z');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
      throw new HttpError(400, `Invalid ${name} "${v}". Use format YYYY-MM-DD.`);
    }
    return s;
  }
  function statusOf(balance, minimumStock) {
    if (balance <= 0) return 'OUT OF STOCK';
    if (balance <= minimumStock) return 'LOW STOCK';
    return 'NORMAL';
  }

  /* ---------- persistence ---------- */
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  }

  const realFetch = window.fetch.bind(window);

  function ensureLoaded() {
    if (ready) return ready;
    ready = (async () => {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        db = JSON.parse(raw);
        return;
      }
      if (!SEED) throw new Error('Demo dataset is not embedded — run: npm run build:pages');
      seedData = SEED;
      db = clone(SEED);
      save();
    })();
    return ready;
  }

  // Keep in sync if another tab changes the data.
  window.addEventListener('storage', (e) => {
    if (e.key === LS_KEY && e.newValue) {
      try {
        db = JSON.parse(e.newValue);
      } catch { /* ignore */ }
    }
  });

  /* ---------- stock engine ---------- */
  function movementOf(itemId) {
    let m = 0;
    for (const t of db.transactions) {
      if (t.item_id !== itemId) continue;
      m += t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity;
    }
    return m;
  }
  const balanceOf = (item) => item.opening_stock + movementOf(item.id);
  const withStatus = (item) => {
    const balance = balanceOf(item);
    return { ...item, balance, status: statusOf(balance, item.minimum_stock) };
  };
  const findItem = (id) => db.items.find((i) => i.id === Number(id));
  const findCategory = (id) => db.categories.find((c) => c.id === Number(id));
  const nextItemId = () => db.items.reduce((m, i) => Math.max(m, i.id), 0) + 1;
  const nextCategoryId = () => db.categories.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  const nextTxnRowId = () => db.transactions.reduce((m, t) => Math.max(m, t.id), 0) + 1;
  const nextTransactionId = () =>
    `TXN-${new Date().getFullYear()}-${String(nextTxnRowId()).padStart(6, '0')}`;

  function ensureCategoryExists(name) {
    if (!db.categories.some((c) => eq(c.name, name))) {
      throw new HttpError(400, `Category "${name}" does not exist. Please add it under Categories first.`);
    }
  }

  function validateItemPayload(data) {
    const v = {
      item_code: reqStr(data.item_code, 'Item Code'),
      item_name: reqStr(data.item_name, 'Item Name'),
      description: optStr(data.description),
      category: reqStr(data.category, 'Category'),
      subcategory: optStr(data.subcategory),
      brand: optStr(data.brand),
      model: optStr(data.model),
      part_number: optStr(data.part_number),
      unit: optStr(data.unit) || 'PCS',
      location: optStr(data.location),
      minimum_stock: intField(data.minimum_stock, 'Minimum Stock'),
      maximum_stock: intField(data.maximum_stock, 'Maximum Stock'),
      opening_stock: intField(data.opening_stock, 'Opening Stock'),
      supplier: optStr(data.supplier),
      remarks: optStr(data.remarks),
    };
    if (v.maximum_stock > 0 && v.maximum_stock < v.minimum_stock) {
      throw new HttpError(400, 'Maximum Stock cannot be less than Minimum Stock.');
    }
    return v;
  }

  function validateMovementPayload(data) {
    const v = {
      item_id: intField(data.item_id, 'Item', { min: 1 }),
      quantity: intField(data.quantity, 'Quantity', { min: 1 }),
      transaction_date: dateField(data.transaction_date || data.date),
      reference: optStr(data.reference),
      supplier: optStr(data.supplier),
      issued_to: optStr(data.issued_to),
      work_order: optStr(data.work_order),
      area: optStr(data.area),
      reason: optStr(data.reason),
      received_by: optStr(data.received_by),
      issued_by: optStr(data.issued_by),
      user: optStr(data.user),
      remarks: optStr(data.remarks),
    };
    const item = findItem(v.item_id);
    if (!item) throw new HttpError(404, 'Item not found. Please select a valid item.');
    v.item = item;
    return v;
  }

  /* ---------- items ---------- */
  function listItems(q = {}) {
    let rows = db.items.map(withStatus);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      rows = rows.filter((i) =>
        [i.item_code, i.item_name, i.part_number, i.brand, i.model].some((v) => String(v || '').toLowerCase().includes(s))
      );
    }
    if (q.category) rows = rows.filter((i) => i.category === q.category);
    if (q.location) rows = rows.filter((i) => i.location === q.location);
    if (q.brand) rows = rows.filter((i) => i.brand === q.brand);
    if (q.status) rows = rows.filter((i) => i.status === q.status);
    rows.sort(byCode);
    return rows;
  }

  function itemDetail(id) {
    const item = findItem(id);
    if (!item) throw new HttpError(404, 'Item not found.');
    const txns = db.transactions.filter((t) => t.item_id === item.id);
    const total_in = txns.filter((t) => t.transaction_type === 'STOCK_IN').reduce((s, t) => s + t.quantity, 0);
    const total_out = txns.filter((t) => t.transaction_type === 'STOCK_OUT').reduce((s, t) => s + t.quantity, 0);
    const total_adjustment = txns.filter((t) => t.transaction_type === 'ADJUSTMENT').reduce((s, t) => s + t.quantity, 0);

    const history = txns
      .slice()
      .sort(cmpDateIdDesc)
      .slice(0, 100)
      .map((t) => ({ ...t, item_code: item.item_code, item_name: item.item_name, unit: item.unit, category: item.category }));

    let running = item.opening_stock;
    const timeline = [{ label: 'Opening Stock', date: 'Start', value: running, type: 'OPENING' }];
    txns
      .slice()
      .sort(cmpDateIdAsc)
      .forEach((t) => {
        running += t.transaction_type === 'STOCK_OUT' ? -t.quantity : t.quantity;
        timeline.push({ label: t.transaction_id, date: t.transaction_date, value: running, type: t.transaction_type });
      });

    return {
      ...withStatus(item),
      total_in,
      total_out,
      total_adjustment,
      transaction_count: txns.length,
      history,
      timeline,
    };
  }

  function createItem(data) {
    const v = validateItemPayload(data || {});
    if (db.items.some((i) => eq(i.item_code, v.item_code))) {
      throw new HttpError(409, `Item code "${v.item_code}" already exists. Item codes must be unique.`);
    }
    ensureCategoryExists(v.category);
    const ts = nowISO();
    const item = { id: nextItemId(), ...v, created_at: ts, updated_at: ts };
    db.items.push(item);
    save();
    return withStatus(item);
  }

  function updateItem(id, data) {
    const existing = findItem(id);
    if (!existing) throw new HttpError(404, 'Item not found.');
    const merged = { ...existing };
    for (const [k, val] of Object.entries(data || {})) {
      if (val !== undefined && val !== null) merged[k] = val;
    }
    const v = validateItemPayload(merged);
    if (db.items.some((i) => i.id !== existing.id && eq(i.item_code, v.item_code))) {
      throw new HttpError(409, `Item code "${v.item_code}" is already used by another item.`);
    }
    ensureCategoryExists(v.category);
    Object.assign(existing, v, { updated_at: nowISO() });
    save();
    return withStatus(existing);
  }

  /* ---------- categories ---------- */
  function listCategories() {
    return db.categories
      .map((c) => ({ ...c, item_count: db.items.filter((i) => eq(i.category, c.name)).length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  function createCategory(data) {
    const name = reqStr((data || {}).name, 'Category Name');
    const description = optStr((data || {}).description);
    if (db.categories.some((c) => eq(c.name, name))) {
      throw new HttpError(409, `Category "${name}" already exists.`);
    }
    const cat = { id: nextCategoryId(), name, description, created_at: nowISO() };
    db.categories.push(cat);
    save();
    return cat;
  }
  function updateCategory(id, data) {
    const existing = findCategory(id);
    if (!existing) throw new HttpError(404, 'Category not found.');
    const name = reqStr((data || {}).name, 'Category Name');
    const description = optStr((data || {}).description);
    if (db.categories.some((c) => c.id !== existing.id && eq(c.name, name))) {
      throw new HttpError(409, `Category "${name}" already exists.`);
    }
    if (!eq(existing.name, name)) {
      db.items.forEach((i) => {
        if (eq(i.category, existing.name)) i.category = name;
      });
    }
    existing.name = name;
    existing.description = description;
    save();
    return existing;
  }
  function deleteCategory(id, force = false) {
    const cat = findCategory(id);
    if (!cat) throw new HttpError(404, 'Category not found.');
    const inUse = db.items.filter((i) => eq(i.category, cat.name)).length;
    if (inUse > 0 && !force) {
      throw new HttpError(
        409,
        `Category "${cat.name}" is used by ${inUse} item(s). Reassign those items first, or delete with confirmation.`,
        { itemCount: inUse, category: cat.name }
      );
    }
    let reassigned = 0;
    if (inUse > 0) {
      if (!db.categories.some((c) => eq(c.name, 'Others'))) {
        db.categories.push({ id: nextCategoryId(), name: 'Others', description: 'Miscellaneous items', created_at: nowISO() });
      }
      db.items.forEach((i) => {
        if (eq(i.category, cat.name)) {
          i.category = 'Others';
          reassigned += 1;
        }
      });
    }
    db.categories = db.categories.filter((c) => c.id !== cat.id);
    save();
    return { deleted: true, category: cat.name, reassigned };
  }

  /* ---------- transactions ---------- */
  function listTransactions(q = {}) {
    let rows = db.transactions.map((t) => {
      const item = findItem(t.item_id) || {};
      return { ...t, item_code: item.item_code, item_name: item.item_name, category: item.category, unit: item.unit };
    });
    if (q.type) rows = rows.filter((t) => t.transaction_type === q.type);
    if (q.item_id) rows = rows.filter((t) => t.item_id === Number(q.item_id));
    if (q.category) rows = rows.filter((t) => t.category === q.category);
    if (q.user) {
      const s = String(q.user).toLowerCase();
      rows = rows.filter((t) => String(t.user).toLowerCase().includes(s));
    }
    if (q.from) rows = rows.filter((t) => t.transaction_date >= q.from);
    if (q.to) rows = rows.filter((t) => t.transaction_date <= q.to);
    if (q.search) {
      const s = String(q.search).toLowerCase();
      rows = rows.filter((t) =>
        [t.transaction_id, t.reference, t.work_order, t.item_code, t.item_name, t.remarks].some((v) =>
          String(v || '').toLowerCase().includes(s)
        )
      );
    }
    rows.sort(cmpDateIdDesc);
    return rows.slice(0, 1000);
  }

  function pushTransaction(fields) {
    const txn = {
      id: nextTxnRowId(),
      transaction_id: nextTransactionId(),
      item_id: fields.item_id,
      transaction_type: fields.transaction_type,
      quantity: fields.quantity,
      reference: fields.reference || '',
      supplier: fields.supplier || '',
      issued_to: fields.issued_to || '',
      work_order: fields.work_order || '',
      area: fields.area || '',
      reason: fields.reason || '',
      user: fields.user || '',
      remarks: fields.remarks || '',
      transaction_date: fields.transaction_date,
      created_at: nowISO(),
    };
    db.transactions.push(txn);
    save();
    const item = findItem(txn.item_id);
    return {
      transaction: { ...txn, item_code: item.item_code, item_name: item.item_name, unit: item.unit, category: item.category },
      balance: balanceOf(item),
    };
  }

  function stockIn(data) {
    const v = validateMovementPayload(data);
    return pushTransaction({
      item_id: v.item_id,
      transaction_type: 'STOCK_IN',
      quantity: v.quantity,
      reference: v.reference,
      supplier: v.supplier,
      user: v.received_by || v.user || 'Storekeeper',
      remarks: v.remarks,
      transaction_date: v.transaction_date,
    });
  }

  function stockOut(data) {
    const v = validateMovementPayload(data);
    const available = balanceOf(v.item);
    if (v.quantity > available) {
      throw new HttpError(
        400,
        `Stock Out failed. Only ${available} ${v.item.unit} of "${v.item.item_code}" are currently available.`,
        { available, requested: v.quantity, unit: v.item.unit, item_code: v.item.item_code }
      );
    }
    return pushTransaction({
      item_id: v.item_id,
      transaction_type: 'STOCK_OUT',
      quantity: v.quantity,
      reference: v.reference || v.work_order,
      issued_to: v.issued_to,
      work_order: v.work_order,
      area: v.area,
      reason: v.reason,
      user: v.issued_by || v.user || 'BMS Technician',
      remarks: v.remarks,
      transaction_date: v.transaction_date,
    });
  }

  function adjust(data) {
    const raw = data || {};
    if (raw.physical_stock === undefined || raw.physical_stock === null || raw.physical_stock === '') {
      throw new HttpError(400, 'Physical Stock is required.');
    }
    const itemId = intField(raw.item_id, 'Item', { min: 1 });
    const physical = intField(raw.physical_stock, 'Physical Stock');
    const reason = reqStr(raw.reason, 'Reason');
    const transactionDate = dateField(raw.transaction_date || raw.date);
    const item = findItem(itemId);
    if (!item) throw new HttpError(404, 'Item not found. Please select a valid item.');

    const systemStock = balanceOf(item);
    const difference = physical - systemStock;
    if (difference === 0) {
      throw new HttpError(
        400,
        `No adjustment needed. Physical stock matches system stock (${systemStock} ${item.unit}).`,
        { system_stock: systemStock, physical_stock: physical }
      );
    }
    const r = pushTransaction({
      item_id: itemId,
      transaction_type: 'ADJUSTMENT',
      quantity: difference, // signed
      reference: optStr(raw.reference) || 'STOCK-TAKE',
      reason,
      user: optStr(raw.user) || 'Storekeeper',
      remarks: optStr(raw.remarks),
      transaction_date: transactionDate,
    });
    return {
      ...r,
      system_stock: systemStock,
      physical_stock: physical,
      difference,
    };
  }

  /* ---------- dashboard & meta ---------- */
  function dashboard() {
    const today = todayISO();
    const rows = db.items.map(withStatus);
    let totalStock = 0;
    let lowCount = 0;
    let outCount = 0;
    const byCat = new Map();
    for (const r of rows) {
      totalStock += r.balance;
      if (r.status === 'LOW STOCK') lowCount += 1;
      if (r.status === 'OUT OF STOCK') outCount += 1;
      const c = byCat.get(r.category) || { category: r.category, item_count: 0, total_stock: 0 };
      c.item_count += 1;
      c.total_stock += r.balance;
      byCat.set(r.category, c);
    }
    const sum = (type, date) =>
      db.transactions
        .filter((t) => t.transaction_type === type && (!date || t.transaction_date === date))
        .reduce((s, t) => s + t.quantity, 0);

    const totals = {
      total_in: sum('STOCK_IN'),
      total_out: sum('STOCK_OUT'),
      total_adjustment: sum('ADJUSTMENT'),
      total_transactions: db.transactions.length,
    };

    return {
      total_items: db.items.length,
      total_stock: totalStock,
      low_stock_count: lowCount,
      out_of_stock_count: outCount,
      stock_in_today: sum('STOCK_IN', today),
      stock_out_today: sum('STOCK_OUT', today),
      totals,
      stock_overview: { stock_in: totals.total_in, stock_out: totals.total_out, balance: totalStock },
      by_category: [...byCat.values()].sort((a, b) => b.total_stock - a.total_stock),
      low_stock_items: rows
        .filter((i) => i.status !== 'NORMAL')
        .sort((a, b) => a.balance - b.balance)
        .slice(0, 10),
      recent_transactions: listTransactions({}).slice(0, 10),
    };
  }

  function meta() {
    const distinct = (key) =>
      [...new Set(db.items.map((i) => i[key]).filter((v) => v && v !== ''))].sort((a, b) => a.localeCompare(b));
    return { brands: distinct('brand'), locations: distinct('location'), units: distinct('unit') };
  }

  function resetDemo() {
    if (!seedData) throw new HttpError(500, 'Demo dataset not loaded.');
    db = clone(seedData);
    save();
    return { ok: true, message: 'Demo data restored.' };
  }

  /* ---------- fetch shim: same REST API as server.js ---------- */
  function jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  }

  async function handleApi(method, url, body) {
    await ensureLoaded();
    const path = url.pathname;
    const q = Object.fromEntries(url.searchParams.entries());
    try {
      let m;
      if (method === 'GET' && path === '/api/health') {
        return jsonResponse(200, { status: 'ok', app: 'BMS IMS', version: VERSION, database: 'localStorage (browser demo)' });
      }
      if (method === 'GET' && path === '/api/dashboard') return jsonResponse(200, dashboard());
      if (method === 'GET' && path === '/api/meta') return jsonResponse(200, meta());
      if (method === 'GET' && path === '/api/items') return jsonResponse(200, listItems(q));
      if (method === 'POST' && path === '/api/items') return jsonResponse(200, createItem(body));
      if ((m = path.match(/^\/api\/items\/(\d+)$/))) {
        if (method === 'GET') return jsonResponse(200, itemDetail(m[1]));
        if (method === 'PUT') return jsonResponse(200, updateItem(m[1], body));
      }
      if (method === 'GET' && path === '/api/categories') return jsonResponse(200, listCategories());
      if (method === 'POST' && path === '/api/categories') return jsonResponse(200, createCategory(body));
      if ((m = path.match(/^\/api\/categories\/(\d+)$/))) {
        if (method === 'PUT') return jsonResponse(200, updateCategory(m[1], body));
        if (method === 'DELETE') return jsonResponse(200, deleteCategory(m[1], q.force === 'true' || q.force === '1'));
      }
      if (method === 'GET' && path === '/api/transactions') return jsonResponse(200, listTransactions(q));
      if (method === 'POST' && path === '/api/transactions/stock-in') return jsonResponse(200, stockIn(body));
      if (method === 'POST' && path === '/api/transactions/stock-out') return jsonResponse(200, stockOut(body));
      if (method === 'POST' && path === '/api/transactions/adjustment') return jsonResponse(200, adjust(body));
      if (method === 'POST' && path === '/api/reset') return jsonResponse(200, resetDemo());
      return jsonResponse(404, { error: 'API endpoint not found.' });
    } catch (e) {
      if (e instanceof HttpError) return jsonResponse(e.status, { error: e.message, ...(e.extra || {}) });
      console.error('[bms-ims local]', e);
      return jsonResponse(500, { error: 'Internal error.' });
    }
  }

  window.fetch = function (input, init) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (url.pathname.startsWith('/api/')) {
      const method = (init && init.method) || 'GET';
      let body = {};
      if (init && init.body) {
        try { body = JSON.parse(init.body); } catch { body = {}; }
      }
      return handleApi(method, url, body);
    }
    return realFetch(input, init);
  };
})();
