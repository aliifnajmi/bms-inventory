'use strict';

/**
 * Demo dataset for BMS IMS.
 * 30 items, 10 categories, 50+ transactions (incl. today's movements,
 * a physical-count adjustment and items that are low / out of stock).
 */

const { nowISO } = require('./db');

const CATEGORIES = [
  ['BMS', 'Building Management System components — sensors, controllers, relays, power supplies, control cables'],
  ['Electrical', 'Electrical components — MCBs, relays, contactors, cables'],
  ['ACMV', 'Air-Conditioning & Mechanical Ventilation — filters, belts, actuators, pressure sensors'],
  ['ELV', 'Extra Low Voltage systems — PIR sensors, power supplies, access control spares'],
  ['Fire Protection', 'Fire alarm & protection spares — detectors, batteries, call points'],
  ['Plumbing', 'Plumbing spares — valves, taps, fittings'],
  ['Tools', 'Maintenance tools & test equipment'],
  ['Consumables', 'Consumable items — cable ties, tapes, labels'],
  ['Safety', 'Safety & PPE items'],
  ['Others', 'Miscellaneous items'],
];

/* code, name, description, category, subcategory, brand, model, part_number,
   unit, location, min, max, opening_stock, supplier, remarks */
const ITEMS = [
  ['BMS-SEN-001', 'Temperature Sensor', 'Duct/room temperature sensor, 10k NTC, 0-50°C', 'BMS', 'Sensors', 'Honeywell', 'T7411A1004', 'T7411A1004', 'PCS', 'Store A', 5, 30, 10, 'ABC Engineering', 'For AHU and FCU monitoring'],
  ['BMS-SEN-002', 'Humidity Sensor', 'Duct humidity sensor, 0-100% RH, 4-20mA output', 'BMS', 'Sensors', 'Honeywell', 'H7080B1103', 'H7080B1103', 'PCS', 'Store A', 5, 20, 8, 'ABC Engineering', ''],
  ['BMS-CTRL-001', 'DDC Controller', 'Standalone DDC controller, 16 UI / 8 UO, BACnet', 'BMS', 'Controllers', 'Siemens', 'Climatix POL424', 'POL424.XX/STD', 'PCS', 'Store A', 2, 8, 3, 'Siemens Pte Ltd', 'Field controller for AHU/FCU'],
  ['BMS-CTRL-002', 'I/O Module', 'Expansion I/O module, 8 UI / 6 DO', 'BMS', 'Controllers', 'Siemens', 'Climatix POL638', 'POL638.70/STD', 'PCS', 'Store A', 3, 10, 5, 'Siemens Pte Ltd', ''],
  ['BMS-REL-001', 'Relay Module', 'Interface relay module, 230VAC coil, 2CO, DIN rail', 'BMS', 'Relays', 'Finder', '38.51.7.024.0050', '38.51.7.024.0050', 'PCS', 'Store A', 3, 15, 6, 'Finder Components', ''],
  ['BMS-PWR-001', '24VDC Power Supply', 'DIN rail power supply 24VDC 5A for field devices', 'BMS', 'Power Supply', 'Siemens', 'SITOP PSU100S', '6EP1333-2BA20', 'PCS', 'Store A', 2, 8, 4, 'Siemens Pte Ltd', 'For DDC controllers and actuators'],
  ['BMS-CAB-001', 'Belden Control Cable', 'Shielded control cable 2x0.75mm², sold by the metre', 'BMS', 'Cables', 'Belden', '8760 009U', '8760-009U', 'MTR', 'Store C', 50, 500, 200, 'Lapp Kabel', ''],
  ['BMS-VAL-001', 'Globe Valve 2 Inch', 'Bronze globe valve, PN16, flanged, 2 inch', 'BMS', 'Valves', 'Belimo', 'G2Q-050', 'G2Q-050', 'PCS', 'Store B', 2, 6, 3, 'Belimo Asia', 'For chilled water lines'],
  ['ACMV-FLT-001', 'AHU Filter 24x24x2', 'Pleated panel filter 24x24x2 inch, MERV 8', 'ACMV', 'Filters', 'Filtrex', 'FX-P24-M8', 'FX-P24-M8', 'PCS', 'Store B', 10, 60, 30, 'Filtrex Asia', 'Quarterly replacement'],
  ['ACMV-BLT-001', 'AHU Fan Belt', 'Classical V-belt, B-section, 68 inch', 'ACMV', 'Belts', 'Gates', 'B68', 'B-68', 'PCS', 'Store B', 2, 10, 4, 'Power Transmission Co', ''],
  ['ACMV-SEN-001', 'Differential Pressure Sensor', 'Air differential pressure sensor, 0-500Pa, 4-20mA', 'ACMV', 'Sensors', 'Dwyer', 'MS-311-LCD', 'MS-311-LCD', 'PCS', 'Store A', 3, 10, 5, 'Dwyer Instruments', 'For filter & fan status monitoring'],
  ['ACMV-ACT-001', 'Damper Actuator', 'Spring-return damper actuator, 24VAC, 10Nm', 'ACMV', 'Actuators', 'Belimo', 'LM24A', 'LM24A', 'PCS', 'Store A', 2, 8, 4, 'Belimo Asia', ''],
  ['ELEC-MCB-001', 'MCB 10A 1P', 'Miniature circuit breaker 10A, 1 pole, 6kA', 'Electrical', 'Circuit Breakers', 'Schneider', 'Easy9 C120N', 'EZ9F56110', 'PCS', 'Store A', 10, 80, 40, 'Schneider Electric', ''],
  ['ELEC-MCB-002', 'MCB 16A 1P', 'Miniature circuit breaker 16A, 1 pole, 6kA', 'Electrical', 'Circuit Breakers', 'Schneider', 'Easy9 C120N', 'EZ9F56116', 'PCS', 'Store A', 10, 60, 25, 'Schneider Electric', ''],
  ['ELEC-REL-001', 'Relay 230VAC', 'Plug-in relay 230VAC coil, 3PDT, 10A with base', 'Electrical', 'Relays', 'Finder', '55.34.9.230.0040', '55.34.9.230.0040', 'PCS', 'Store A', 5, 30, 12, 'Finder Components', ''],
  ['ELEC-CAB-001', 'Cable 2.5mm² 3C', 'PVC insulated cable 2.5mm², 3-core, sold by the metre', 'Electrical', 'Cables', 'Lapp', 'NYY 3C2.5', 'NYY-3C2.5', 'MTR', 'Store C', 100, 1000, 500, 'Lapp Kabel', ''],
  ['ELEC-CT-001', 'Contactor 18A', 'Magnetic contactor, 18A, 230VAC coil, 3P + NO', 'Electrical', 'Contactors', 'Schneider', 'LC1K0910', 'LC1K0910B7', 'PCS', 'Store A', 3, 12, 5, 'Schneider Electric', ''],
  ['ELV-SEN-001', 'PIR Motion Sensor', 'Ceiling PIR motion sensor, 360° coverage, 12m range', 'ELV', 'Sensors', 'Bosch', 'DS936', 'DS936', 'PCS', 'Store B', 4, 20, 10, 'Bosch Security', ''],
  ['ELV-PSU-001', '12VDC 5A Power Supply', 'Switch-mode PSU 12VDC 5A, DIN rail mount', 'ELV', 'Power Supply', 'Mean Well', 'LRS-75-12', 'LRS-75-12', 'PCS', 'Store A', 3, 10, 6, 'Mean Well Asia', ''],
  ['PLB-VAL-001', 'Ball Valve 1 Inch', 'Brass ball valve, full bore, BSP thread, 1 inch', 'Plumbing', 'Valves', 'Genebre', '3001', 'GEN-3001-1', 'PCS', 'Store B', 3, 15, 8, 'PlumbTech Supplies', ''],
  ['PLB-TAP-001', 'Basin Tap Cartridge', 'Ceramic cartridge for basin mixer tap', 'Plumbing', 'Fittings', 'Grohe', 'iperf 96710', '96710000', 'PCS', 'Store B', 5, 20, 6, 'PlumbTech Supplies', ''],
  ['FP-SEN-001', 'Smoke Detector Head', 'Photoelectric smoke detector head, addressable', 'Fire Protection', 'Detectors', 'Edwards', 'Series 65', '55000-122AP', 'PCS', 'Store B', 5, 25, 12, 'Edwards Fire', ''],
  ['FP-BAT-001', 'Battery 12V 7Ah', 'Sealed lead-acid battery 12V 7Ah for panels', 'Fire Protection', 'Batteries', 'Yuasa', 'NP7-12', 'NP7-12', 'PCS', 'Store B', 4, 16, 8, 'Edwards Fire', 'For fire alarm & UPS panels'],
  ['TOOL-001', 'Multimeter', 'Digital multimeter, CAT III 600V, true RMS', 'Tools', 'Test Equipment', 'Fluke', '117', 'FLUKE-117', 'PCS', 'Tool Crib', 2, 6, 3, 'Fluke Singapore', 'Calibrated'],
  ['TOOL-002', 'Clamp Meter', 'True RMS AC/DC clamp meter, 600A, Bluetooth', 'Tools', 'Test Equipment', 'Fluke', '376 FC', 'FLUKE-376-FC', 'PCS', 'Tool Crib', 1, 4, 2, 'Fluke Singapore', 'Calibrated'],
  ['TOOL-003', 'FLUKE 922 Airflow Meter', 'Airflow meter with pressure & temperature measurement', 'Tools', 'Test Equipment', 'Fluke', '922', 'FLUKE-922', 'PCS', 'Tool Crib', 1, 2, 1, 'Fluke Singapore', 'For AHU airflow balancing'],
  ['CON-CAB-001', 'Cable Tie 200mm', 'Nylon cable ties 200mm x 4.8mm, bag of 100', 'Consumables', 'Fasteners', 'Panduit', 'PLT20H', 'PLT20H-L0', 'BAG', 'Store C', 5, 40, 20, 'Hardware Hub', ''],
  ['CON-TAP-001', 'PTFE Tape 12mm', 'PTFE thread seal tape, 12mm x 12m roll', 'Consumables', 'Sealants', 'Loctite', '5080', 'LOCTITE-5080', 'ROLL', 'Store C', 10, 50, 15, 'Hardware Hub', ''],
  ['SAF-GLV-001', 'Safety Gloves', 'Cut-resistant work gloves, size L, box of 12 pairs', 'Safety', 'PPE', 'Ansell', 'HyFlex 11-542', '11-542-L', 'BOX', 'Store B', 5, 30, 12, 'SafetyFirst Pte Ltd', ''],
  ['OTH-LBL-001', 'Cable Label Roll', 'Self-laminating cable marker roll, 1000 labels', 'Others', 'Labels', 'HellermannTyton', 'TAGWM-4', 'TAGWM-4', 'ROLL', 'Store C', 3, 12, 5, 'Hardware Hub', ''],
];

/* item, type, qty (signed for ADJUSTMENT), date, extra fields */
const TXNS = [
  // BMS-SEN-001 Temperature Sensor  (opening 10 -> 22)
  ['BMS-SEN-001', 'STOCK_IN', 15, '2026-09-05', { reference: 'PO-2026-088', supplier: 'ABC Engineering', user: 'Siti Rahman', remarks: 'Quarterly replenishment' }],
  ['BMS-SEN-001', 'STOCK_OUT', 13, '2026-09-22', { work_order: 'WO-2026-041', issued_to: 'BMS Team - Level 35', area: 'Level 35', reason: 'Replacement of faulty temperature sensors', user: 'John Tan' }],
  ['BMS-SEN-001', 'STOCK_IN', 10, '2026-10-08', { reference: 'DO-2026-001', supplier: 'ABC Engineering', user: 'BMS Technician', remarks: 'Urgent restock' }],
  // BMS-SEN-002 Humidity Sensor (opening 8 -> 2 LOW)
  ['BMS-SEN-002', 'STOCK_OUT', 6, '2026-09-12', { work_order: 'WO-2026-033', issued_to: 'AHU Team', area: 'Level 12 AHU', reason: 'Sensor drift replacement', user: 'Ahmad Faiz' }],
  // BMS-CTRL-001 DDC Controller (opening 3 -> 0 OUT)
  ['BMS-CTRL-001', 'STOCK_OUT', 3, '2026-08-28', { work_order: 'WO-2026-019', issued_to: 'BMS Team', area: 'BAS Room', reason: 'Controller failure replacement', user: 'John Tan' }],
  // BMS-CTRL-002 I/O Module (opening 5 -> 3 LOW)
  ['BMS-CTRL-002', 'STOCK_IN', 4, '2026-09-10', { reference: 'PO-2026-071', supplier: 'Siemens Pte Ltd', user: 'Siti Rahman' }],
  ['BMS-CTRL-002', 'STOCK_OUT', 3, '2026-09-25', { work_order: 'WO-2026-052', issued_to: 'BMS Team', area: 'Level 20', reason: 'I/O module fault replacement', user: 'Ahmad Faiz' }],
  ['BMS-CTRL-002', 'STOCK_OUT', 3, '2026-10-02', { work_order: 'WO-2026-058', issued_to: 'BMS Team', area: 'Level 28', reason: 'Expansion works', user: 'John Tan' }],
  // BMS-REL-001 Relay Module (opening 6 -> 0 OUT)
  ['BMS-REL-001', 'STOCK_OUT', 6, '2026-09-18', { work_order: 'WO-2026-047', issued_to: 'Electrical Team', area: 'Lift Motor Room', reason: 'Burnt relay replacement', user: 'BMS Technician' }],
  // BMS-PWR-001 24VDC PSU (opening 4 -> 5)
  ['BMS-PWR-001', 'STOCK_IN', 2, '2026-09-08', { reference: 'PO-2026-079', supplier: 'Siemens Pte Ltd', user: 'Siti Rahman' }],
  ['BMS-PWR-001', 'STOCK_OUT', 1, '2026-09-30', { work_order: 'WO-2026-055', issued_to: 'BMS Team', area: 'Level 8', reason: 'PSU failure replacement', user: 'Ahmad Faiz' }],
  // BMS-CAB-001 Belden Cable (opening 200 -> 120)
  ['BMS-CAB-001', 'STOCK_IN', 100, '2026-09-02', { reference: 'PO-2026-066', supplier: 'Lapp Kabel', user: 'Siti Rahman', remarks: '1 drum = 305m, issued by metre' }],
  ['BMS-CAB-001', 'STOCK_OUT', 80, '2026-09-14', { work_order: 'WO-2026-038', issued_to: 'BMS Team', area: 'Level 15', reason: 'BAS rewiring works', user: 'John Tan' }],
  ['BMS-CAB-001', 'STOCK_OUT', 60, '2026-09-26', { work_order: 'WO-2026-049', issued_to: 'BMS Team', area: 'Level 22', reason: 'New sensor installation', user: 'Ahmad Faiz' }],
  ['BMS-CAB-001', 'STOCK_OUT', 40, '2026-10-05', { work_order: 'WO-2026-061', issued_to: 'BMS Team', area: 'Level 30', reason: 'Retrofit works', user: 'BMS Technician' }],
  // BMS-VAL-001 Globe Valve (opening 3 -> 2 LOW)
  ['BMS-VAL-001', 'STOCK_OUT', 1, '2026-09-20', { work_order: 'WO-2026-044', issued_to: 'Mechanical Team', area: 'CHW Pump Room', reason: 'Leaking valve replacement', user: 'John Tan' }],
  // ACMV-FLT-001 AHU Filter (opening 30 -> 22)
  ['ACMV-FLT-001', 'STOCK_IN', 20, '2026-09-06', { reference: 'PO-2026-084', supplier: 'Filtrex Asia', user: 'Siti Rahman' }],
  ['ACMV-FLT-001', 'STOCK_OUT', 18, '2026-09-16', { work_order: 'WO-2026-042', issued_to: 'ACMV Team', area: 'AHU Level 10', reason: 'Quarterly filter change', user: 'Ahmad Faiz' }],
  ['ACMV-FLT-001', 'STOCK_OUT', 10, '2026-10-01', { work_order: 'WO-2026-059', issued_to: 'ACMV Team', area: 'AHU Level 18', reason: 'Quarterly filter change', user: 'John Tan' }],
  // ACMV-BLT-001 Fan Belt (opening 4 -> 0 OUT)
  ['ACMV-BLT-001', 'STOCK_OUT', 4, '2026-09-21', { work_order: 'WO-2026-046', issued_to: 'ACMV Team', area: 'AHU Level 6', reason: 'Worn belt replacement', user: 'BMS Technician' }],
  // ACMV-SEN-001 DP Sensor (opening 5 -> 3 LOW)
  ['ACMV-SEN-001', 'STOCK_IN', 3, '2026-09-11', { reference: 'PO-2026-077', supplier: 'Dwyer Instruments', user: 'Siti Rahman' }],
  ['ACMV-SEN-001', 'STOCK_OUT', 5, '2026-09-29', { work_order: 'WO-2026-053', issued_to: 'BMS Team', area: 'AHU Level 14', reason: 'DP sensor failure replacement', user: 'Ahmad Faiz' }],
  // ACMV-ACT-001 Damper Actuator (opening 4 -> 2 LOW)
  ['ACMV-ACT-001', 'STOCK_OUT', 2, '2026-09-24', { work_order: 'WO-2026-050', issued_to: 'BMS Team', area: 'Level 16 AHU', reason: 'Stuck actuator replacement', user: 'John Tan' }],
  // ELEC-MCB-001 MCB 10A (opening 40 -> 43)
  ['ELEC-MCB-001', 'STOCK_IN', 50, '2026-09-03', { reference: 'PO-2026-070', supplier: 'Schneider Electric', user: 'Siti Rahman' }],
  ['ELEC-MCB-001', 'STOCK_OUT', 20, '2026-09-09', { work_order: 'WO-2026-031', issued_to: 'Electrical Team', area: 'DB Level 5', reason: 'MCB trip replacement', user: 'Ahmad Faiz' }],
  ['ELEC-MCB-001', 'STOCK_OUT', 15, '2026-09-19', { work_order: 'WO-2026-045', issued_to: 'Electrical Team', area: 'DB Level 9', reason: 'Circuit upgrade works', user: 'John Tan' }],
  ['ELEC-MCB-001', 'STOCK_OUT', 10, '2026-10-08', { work_order: 'WO-2026-067', issued_to: 'Electrical Team', area: 'DB Level 12', reason: 'MCB replacement', user: 'BMS Technician' }],
  ['ELEC-MCB-001', 'ADJUSTMENT', -2, '2026-09-30', { reference: 'STOCK-TAKE', reason: 'Physical stock verification', user: 'Siti Rahman', remarks: '2 units found damaged in store' }],
  // ELEC-MCB-002 MCB 16A (opening 25 -> 5 LOW)
  ['ELEC-MCB-002', 'STOCK_OUT', 20, '2026-09-23', { work_order: 'WO-2026-048', issued_to: 'Electrical Team', area: 'DB Level 7', reason: 'Overload replacement', user: 'Ahmad Faiz' }],
  // ELEC-REL-001 Relay (opening 12 -> 10)
  ['ELEC-REL-001', 'STOCK_IN', 8, '2026-09-07', { reference: 'PO-2026-081', supplier: 'Finder Components', user: 'Siti Rahman' }],
  ['ELEC-REL-001', 'STOCK_OUT', 10, '2026-09-27', { work_order: 'WO-2026-051', issued_to: 'Electrical Team', area: 'HVAC Panel Room', reason: 'Relay replacement', user: 'John Tan' }],
  // ELEC-CAB-001 2.5mm² Cable (opening 500 -> 150)
  ['ELEC-CAB-001', 'STOCK_OUT', 200, '2026-09-13', { work_order: 'WO-2026-037', issued_to: 'Electrical Team', area: 'Level 17', reason: 'Lighting circuit rewiring', user: 'BMS Technician' }],
  ['ELEC-CAB-001', 'STOCK_OUT', 150, '2026-10-04', { work_order: 'WO-2026-063', issued_to: 'Electrical Team', area: 'Level 25', reason: 'Power circuit works', user: 'Ahmad Faiz' }],
  // ELEC-CT-001 Contactor (opening 5 -> 0 OUT)
  ['ELEC-CT-001', 'STOCK_OUT', 5, '2026-09-17', { work_order: 'WO-2026-043', issued_to: 'Electrical Team', area: 'Chiller Panel Room', reason: 'Contactor failure replacement', user: 'John Tan' }],
  // ELV-SEN-001 PIR Sensor (opening 10 -> 8)
  ['ELV-SEN-001', 'STOCK_IN', 6, '2026-09-04', { reference: 'PO-2026-073', supplier: 'Bosch Security', user: 'Siti Rahman' }],
  ['ELV-SEN-001', 'STOCK_OUT', 8, '2026-09-28', { work_order: 'WO-2026-054', issued_to: 'ELV Team', area: 'Level 21', reason: 'Faulty PIR replacement', user: 'Ahmad Faiz' }],
  // ELV-PSU-001 12VDC PSU (opening 6 -> 2 LOW)
  ['ELV-PSU-001', 'STOCK_OUT', 4, '2026-09-15', { work_order: 'WO-2026-039', issued_to: 'ELV Team', area: 'ELV Room', reason: 'PSU failure replacement', user: 'BMS Technician' }],
  // PLB-VAL-001 Ball Valve (opening 8 -> 9)
  ['PLB-VAL-001', 'STOCK_IN', 10, '2026-09-09', { reference: 'PO-2026-082', supplier: 'PlumbTech Supplies', user: 'Siti Rahman' }],
  ['PLB-VAL-001', 'STOCK_OUT', 9, '2026-09-25', { work_order: 'WO-2026-050', issued_to: 'Plumbing Team', area: 'Toilet Level 11', reason: 'Leaking ball valve replacement', user: 'John Tan' }],
  // PLB-TAP-001 Tap Cartridge (opening 6 -> 0 OUT)
  ['PLB-TAP-001', 'STOCK_OUT', 6, '2026-09-22', { work_order: 'WO-2026-047', issued_to: 'Plumbing Team', area: 'Pantry Level 8', reason: 'Tap cartridge replacement', user: 'Ahmad Faiz' }],
  // FP-SEN-001 Smoke Detector (opening 12 -> 10)
  ['FP-SEN-001', 'STOCK_IN', 10, '2026-09-05', { reference: 'PO-2026-075', supplier: 'Edwards Fire', user: 'Siti Rahman' }],
  ['FP-SEN-001', 'STOCK_OUT', 12, '2026-09-26', { work_order: 'WO-2026-050', issued_to: 'Fire Team', area: 'Level 19', reason: 'Detector replacement after false alarms', user: 'John Tan' }],
  // FP-BAT-001 Battery (opening 8 -> 3 LOW)
  ['FP-BAT-001', 'STOCK_OUT', 5, '2026-09-19', { work_order: 'WO-2026-044', issued_to: 'Fire Team', area: 'Fire Panel Room', reason: 'Battery replacement', user: 'BMS Technician' }],
  // TOOL-001 Multimeter (opening 3 -> 2 LOW)
  ['TOOL-001', 'STOCK_OUT', 1, '2026-09-08', { work_order: 'WO-2026-035', issued_to: 'Site Team', area: 'Site', reason: 'Tool issued to site team', user: 'John Tan' }],
  // TOOL-003 Airflow Meter (opening 1 -> 0 OUT)
  ['TOOL-003', 'STOCK_OUT', 1, '2026-08-30', { work_order: 'WO-2026-021', issued_to: 'Commissioning Team', area: 'Site', reason: 'Airflow measurement job', user: 'Ahmad Faiz' }],
  // CON-CAB-001 Cable Ties (opening 20 -> 30)
  ['CON-CAB-001', 'STOCK_IN', 30, '2026-09-01', { reference: 'PO-2026-068', supplier: 'Hardware Hub', user: 'Siti Rahman' }],
  ['CON-CAB-001', 'STOCK_OUT', 25, '2026-09-27', { work_order: 'WO-2026-052', issued_to: 'BMS Team', area: 'Level 24', reason: 'Cable termination works', user: 'BMS Technician' }],
  ['CON-CAB-001', 'ADJUSTMENT', 5, '2026-10-06', { reference: 'STOCK-TAKE', reason: 'Physical stock verification', user: 'Siti Rahman', remarks: 'Found 5 bags in Store B' }],
  // CON-TAP-001 PTFE Tape (opening 15 -> 7 LOW)
  ['CON-TAP-001', 'STOCK_OUT', 8, '2026-09-24', { work_order: 'WO-2026-048', issued_to: 'Mechanical Team', area: 'AHU Level 13', reason: 'Pipe jointing works', user: 'John Tan' }],
  // SAF-GLV-001 Safety Gloves (opening 12 -> 14)
  ['SAF-GLV-001', 'STOCK_IN', 20, '2026-09-03', { reference: 'PO-2026-069', supplier: 'SafetyFirst Pte Ltd', user: 'Siti Rahman' }],
  ['SAF-GLV-001', 'STOCK_OUT', 18, '2026-09-29', { work_order: 'WO-2026-056', issued_to: 'Site Team', area: 'Site', reason: 'PPE issuance to site team', user: 'Ahmad Faiz' }],
  // OTH-LBL-001 Cable Labels (opening 5 -> 2 LOW)
  ['OTH-LBL-001', 'STOCK_OUT', 3, '2026-09-16', { work_order: 'WO-2026-040', issued_to: 'BMS Team', area: 'BAS Room', reason: 'Cable labelling works', user: 'BMS Technician' }],
];

function isEmpty(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM items').get().n === 0;
}

function seedDemoData(db) {
  const ts = nowISO();

  const catStmt = db.prepare('INSERT INTO categories (name, description, created_at) VALUES (?,?,?)');
  for (const [name, description] of CATEGORIES) catStmt.run(name, description, ts);

  const itemStmt = db.prepare(
    `INSERT INTO items
      (item_code, item_name, description, category, subcategory, brand, model, part_number,
       unit, location, minimum_stock, maximum_stock, opening_stock, supplier, remarks, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  const itemIds = {};
  for (const it of ITEMS) {
    const r = itemStmt.run(...it, ts, ts);
    itemIds[it[0]] = Number(r.lastInsertRowid);
  }

  const txnStmt = db.prepare(
    `INSERT INTO transactions
      (transaction_id, item_id, transaction_type, quantity, reference, supplier,
       issued_to, work_order, area, reason, user, remarks, transaction_date, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  TXNS.forEach(([code, type, qty, date, extra], i) => {
    const txnId = `TXN-2026-${String(i + 1).padStart(6, '0')}`;
    txnStmt.run(
      txnId,
      itemIds[code],
      type,
      qty,
      extra.reference || '',
      extra.supplier || '',
      extra.issued_to || '',
      extra.work_order || '',
      extra.area || '',
      extra.reason || '',
      extra.user || '',
      extra.remarks || '',
      date,
      ts
    );
  });

  return { items: ITEMS.length, transactions: TXNS.length, categories: CATEGORIES.length };
}

module.exports = { seedDemoData, isEmpty, CATEGORIES, ITEMS, TXNS };
