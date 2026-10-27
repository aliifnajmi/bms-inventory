(function () {
  'use strict';
  const SAMPLE = [
    '22:00\t23:00\tL47-2A-06','20:00\t21:00\tL47-2A-05','20:00\t23:59\tL16-2A-006','20:00\t23:59\tL16-2A-007',
    '19:00\t21:00\tL77-1A-1','19:00\t21:00\tL77-1A-2','19:00\t21:00\tL77-2A-3','19:00\t21:00\tL77-2A-4',
    '19:00\t21:00\tL76-1A-001','19:00\t21:00\tL76-1A-002','19:00\t21:00\tL76-1A-004',
    '19:00\t21:00\tL75-1A-001','19:00\t21:00\tL75-1A-002','19:00\t21:00\tL75-1A-003','19:00\t21:00\tL75-1A-004',
    '19:00\t21:00\tL73-1A-01','19:00\t21:00\tL73-1A-02','19:00\t21:00\tL73-1A-03','19:00\t21:00\tL73-1A-04',
    '19:00\t21:00\tL72-1A-01','19:00\t21:00\tL72-1A-02','19:00\t21:00\tL72-2A-03','19:00\t21:00\tL72-2A-004',
    '18:00\t20:00\tL71-1A-01','18:00\t21:00\tL76-1A-003','18:00\t20:00\tL48-1A-01',
    '18:00\t19:00\tL50-1A-01','18:00\t19:00\tL50-1A-02','18:00\t19:00\tL50-1A-03','18:00\t19:00\tL50-1A-04',
    '18:00\t23:00\tL50-2A-05','18:00\t23:00\tL50-2A-06'
  ].join('\n');
  const esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); };
  const dateKey = function () { const d = new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  const minutes = function (s) { const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(s || '').trim()); return m ? Number(m[1])*60+Number(m[2]) : null; };
  let records = [], checks = {}, standbyChecks = {}, view = 'matrix', clockTimer;
  const storeKey = function () { return 'bms-fcu-checks:'+dateKey(); };
  const standbyKey = function () { return 'bms-fcu-standby:'+dateKey(); };
  const active = function (r) {
    const start = minutes(r.start); let end = minutes(r.end);
    if (start === null || end === null) return false;
    const now = new Date().getHours()*60+new Date().getMinutes();
    if (end < start) return now >= start || now <= end;
    return now >= start && now <= end;
  };
  const parse = function (raw) {
    const rows = [], errors = [], seen = {};
    String(raw || '').split(/\r?\n/).forEach(function (line, i) {
      const p = line.trim().split(/\s+/); if (!line.trim()) return;
      if (p.length < 3 || minutes(p[0]) === null || minutes(p[1]) === null || !/^L\d+/i.test(p[2])) { errors.push('Baris '+(i+1)+': '+line.trim()); return; }
      const code = p[2].toUpperCase();
      if (seen[code]) { errors.push('Kod pendua: '+code); return; } seen[code] = true;
      const b = code.split('-'), m = /^L(\d+)/i.exec(b[0]);
      rows.push({id:code,start:p[0],end:p[1],code:code,level:b[0].toUpperCase(),levelNum:m?Number(m[1]):0,zone:b[1]||'—',unit:b.slice(2).join('-')||'—'});
    });
    rows.sort(function(a,b){return a.levelNum-b.levelNum || a.zone.localeCompare(b.zone,undefined,{numeric:true}) || a.unit.localeCompare(b.unit,undefined,{numeric:true});});
    return {rows:rows,errors:errors};
  };
  const notify = function (msg) { const n=document.getElementById('fcuNotice'); if(n){n.textContent=msg;n.hidden=false;setTimeout(function(){n.hidden=true;},3000);} };
  const save = function () { try { localStorage.setItem(storeKey(),JSON.stringify(checks)); } catch(e) {} };
  const load = function () { try { checks=JSON.parse(localStorage.getItem(storeKey())||'{}')||{}; standbyChecks=JSON.parse(localStorage.getItem(standbyKey())||'{}')||{}; } catch(e) { checks={}; standbyChecks={}; } };
  const saveStandby = function () { try { localStorage.setItem(standbyKey(),JSON.stringify(standbyChecks)); } catch(e) {} };
  const report = function () {
    const out=['LAPORAN SEMAKAN TENANT FCU EXTENSION — EXCHANGE 106','Tarikh: '+new Date().toLocaleDateString('en-GB'),'Masa: '+new Date().toLocaleTimeString('en-GB'),'Jumlah: '+records.length+' | Verified: '+records.filter(function(r){return checks[r.id];}).length,'Nota: Verified ialah rekod semakan operator, bukan status live BMS.',''];
    let last=''; records.forEach(function(r){if(last!==r.level){last=r.level;out.push('['+last+']');}out.push((checks[r.id]?'[VERIFIED]':'[PENDING]')+' '+r.start+' - '+r.end+' | '+r.zone+' | '+r.code);});
    return out.join('\n');
  };
  const filtered = function () {
    const q=(document.getElementById('fcuSearch').value||'').toLowerCase().trim(), status=document.getElementById('fcuStatus').value;
    return records.filter(function(r){const match=[r.code,r.level,r.zone,r.unit,r.start,r.end].some(function(v){return String(v).toLowerCase().includes(q);});
      return match && (status==='all'||(status==='active'&&active(r))||(status==='verified'&&checks[r.id])||(status==='pending'&&!checks[r.id]));});
  };
  const status = function(r){return checks[r.id]?'<span class="fcu-pill verified">VERIFIED</span>':active(r)?'<span class="fcu-pill active">SCHEDULED NOW</span>':'<span class="fcu-pill pending">PENDING</span>';};
  const draw = function () {
    const data=filtered(), levels={};
    data.forEach(function(r){(levels[r.level]||(levels[r.level]=[])).push(r);});
    document.getElementById('fcuTotal').textContent=data.length;
    document.getElementById('fcuActive').textContent=data.filter(active).length;
    document.getElementById('fcuVerified').textContent=data.filter(function(r){return checks[r.id];}).length;
    document.getElementById('fcuPending').textContent=data.filter(function(r){return !checks[r.id];}).length;
    document.getElementById('fcuResultCount').textContent=data.length+' shown';
    document.getElementById('fcuProgress').style.width=(data.length?data.filter(function(r){return checks[r.id];}).length/data.length*100:0)+'%';
    let matrix='';
    Object.keys(levels).forEach(function(level){matrix+='<section class="fcu-level"><header><b>'+esc(level)+'</b><span>'+levels[level].length+' unit</span></header><div class="fcu-grid">';
      levels[level].forEach(function(r){matrix+='<article class="fcu-unit '+(checks[r.id]?'verified':active(r)?'active':'')+'"><div class="fcu-unit-title"><b>'+esc(r.code)+'</b><i class="'+(checks[r.id]?'blue':active(r)?'green':'')+'"></i></div><div class="fcu-meta"><span>ZONE</span><b>'+esc(r.zone)+'</b><span>FCU NO.</span><b>'+esc(r.unit)+'</b></div><div class="fcu-meta"><span>START</span><b>'+esc(r.start)+'</b><span>STOP</span><b>'+esc(r.end)+'</b></div><div class="fcu-foot"><label><input type="checkbox" data-standby="'+esc(r.id)+'" '+(standbyChecks[r.id]?'checked':'')+'> Standby</label><button class="fcu-btn '+(checks[r.id]?'blue':'primary')+'" data-verify="'+esc(r.id)+'">'+(checks[r.id]?'Verified ✓':'Mark Verified')+'</button></div><div style="margin-top:8px">'+status(r)+'</div></article>';});
      matrix+='</div></section>';});
    document.getElementById('fcuMatrix').innerHTML=matrix||'<div class="fcu-empty">No FCUs to display.</div>';
    document.getElementById('fcuTableBody').innerHTML=data.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(r.level)+'</td><td>'+esc(r.zone)+'</td><td>'+esc(r.unit)+'</td><td><b>'+esc(r.code)+'</b></td><td>'+esc(r.start)+' – '+esc(r.end)+'<br>'+status(r)+'</td><td><input type="checkbox" data-standby="'+esc(r.id)+'" '+(standbyChecks[r.id]?'checked':'')+' aria-label="Standby"></td><td><button class="fcu-btn '+(checks[r.id]?'blue':'primary')+'" data-verify="'+esc(r.id)+'">'+(checks[r.id]?'Verified ✓':'Mark Verified')+'</button></td></tr>';}).join('')||'<tr><td colspan="8" class="fcu-empty">No matching FCUs.</td></tr>';
    document.getElementById('fcuMatrixWrap').hidden=view!=='matrix'; document.getElementById('fcuTableWrap').hidden=view!=='table';
    document.querySelectorAll('[data-view]').forEach(function(b){b.classList.toggle('selected',b.dataset.view===view);});
  };
  const process = function () {
    const result=parse(document.getElementById('fcuRaw').value); records=result.rows; load();
    const e=document.getElementById('fcuErrors'); e.hidden=!result.errors.length; e.textContent=result.errors.length?'Baris tidak diproses: '+result.errors.join(' | '):(records.length?'Semua baris sah berjaya diproses.':'Tiada baris sah ditemui.');
    draw(); notify(records.length+' rekod disusun mengikut level, zone dan unit.');
  };
  function render() {
    const html = [
      '<div class="fcu-page"><style>',
      '.fcu-page{color:var(--text);font-size:14px}.fcu-page *{box-sizing:border-box}.fcu-hero{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:22px 24px;border-radius:16px;background:linear-gradient(125deg,#0d293b,#12516a 65%,#0d9488);color:#fff;margin-bottom:16px}.fcu-hero h1{font-size:clamp(22px,3vw,30px);color:#fff;margin:5px 0}.fcu-hero p{font-size:13px;color:#d7e8f0}.fcu-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#a8e8e2;font-weight:800}.fcu-clock{background:#061c2b55;border:1px solid #ffffff2b;border-radius:12px;padding:10px 14px;white-space:nowrap}.fcu-clock b{display:block;font-size:22px}.fcu-clock span{font-size:11px;color:#c3dce7}.fcu-note{padding:11px 13px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:10px;margin-bottom:16px;font-size:12px;line-height:1.55}.fcu-notice{padding:10px 13px;background:#eff6ff;color:#1d4ed8;border-radius:9px;margin-bottom:12px}.fcu-notice[hidden],.fcu-errors[hidden]{display:none}.fcu-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.fcu-stat{background:#fff;border:1px solid var(--border);border-radius:12px;padding:15px;box-shadow:var(--shadow)}.fcu-stat span{display:block;font-size:11px;color:var(--muted);font-weight:800;text-transform:uppercase}.fcu-stat strong{display:block;font-size:27px;margin-top:4px}.fcu-progress{height:5px;background:#e8eef3;border-radius:99px;margin-top:8px;overflow:hidden}.fcu-progress i{display:block;height:100%;background:#0d9488;width:0}.fcu-card{background:#fff;border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);margin-bottom:16px;overflow:hidden}.fcu-card-head{padding:15px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:12px;align-items:center}.fcu-card-head h2{font-size:15px}.fcu-card-head p,.fcu-help{font-size:12px;color:var(--muted);margin-top:3px}.fcu-body{padding:16px 18px}.fcu-raw{width:100%;min-height:125px;resize:vertical;padding:12px;border:1px solid #cbd8e2;border-radius:10px;background:#f8fafc;color:#18364a;font:12px/1.7 ui-monospace,Consolas,monospace}.fcu-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.fcu-btn{border:1px solid var(--border);border-radius:9px;padding:9px 12px;font-size:12px;font-weight:750;cursor:pointer;background:#f8fafc;color:#28465b}.fcu-btn.primary{background:#0d9488;border-color:#0d9488;color:#fff}.fcu-btn.blue{background:#2563eb;color:#fff}.fcu-btn.danger{color:#b91c1c}.fcu-errors{margin-top:10px;padding:10px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:9px;font-size:12px}.fcu-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 16px;border-bottom:1px solid var(--border)}.fcu-search{flex:1 1 210px;min-width:0;padding:9px 11px;border:1px solid var(--border);border-radius:9px}.fcu-select{padding:9px;border:1px solid var(--border);border-radius:9px;background:#fff}.fcu-switch{display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:9px}.fcu-switch button{border:0;background:transparent;padding:7px 9px;border-radius:6px;font-size:11px;font-weight:800;cursor:pointer}.fcu-switch button.selected{background:#fff;color:#0f766e}.fcu-result{font-size:11px;color:var(--muted)}.fcu-level{border:1px solid var(--border);border-radius:11px;overflow:hidden;margin-bottom:12px}.fcu-level header{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f1f6f9;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted)}.fcu-level header b{background:#123047;color:#fff;border-radius:7px;padding:5px 9px;font-size:12px}.fcu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:10px;padding:12px}.fcu-unit{border:1px solid var(--border);border-radius:10px;padding:11px;background:#fff;min-width:0}.fcu-unit.active{border-color:#86d7b8;background:#f6fdf9}.fcu-unit.verified{border-color:#93c5fd;background:#f5f9ff}.fcu-unit-title{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #edf2f6;padding-bottom:8px}.fcu-unit-title b{font:800 13px ui-monospace,Consolas,monospace;overflow-wrap:anywhere}.fcu-unit-title i{width:9px;height:9px;background:#94a3b8;border-radius:50%;flex:none}.fcu-unit-title i.green{background:#16a34a;box-shadow:0 0 0 4px #16a34a1a}.fcu-unit-title i.blue{background:#2563eb;box-shadow:0 0 0 4px #2563eb1a}.fcu-meta{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:6px;align-items:center;margin-top:10px}.fcu-meta span{font-size:9px;color:var(--muted);font-weight:800}.fcu-meta b{font:700 11px ui-monospace,Consolas,monospace}.fcu-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:11px;padding-top:9px;border-top:1px solid #edf2f6}.fcu-foot label,.fcu-table label{font-size:10px;font-weight:750;white-space:nowrap}.fcu-foot input,.fcu-table input{accent-color:#2563eb}.fcu-pill{display:inline-block;padding:4px 7px;border-radius:99px;font-size:9px;font-weight:900;white-space:nowrap}.fcu-pill.verified{background:#dbeafe;color:#1d4ed8}.fcu-pill.active{background:#dcfce7;color:#166534}.fcu-pill.pending{background:#f1f5f9;color:#64748b}.fcu-table-wrap{overflow:auto}.fcu-table{width:100%;border-collapse:collapse;font-size:12px}.fcu-table th{background:#f8fafc;color:#63798b;text-align:left;font-size:10px;text-transform:uppercase;padding:11px;white-space:nowrap}.fcu-table td{padding:11px;border-top:1px solid var(--border);white-space:nowrap}.fcu-empty{text-align:center;padding:28px;color:var(--muted);font-size:12px}@media(max-width:800px){.fcu-hero{align-items:flex-start;flex-direction:column;padding:18px}.fcu-clock{width:100%;display:flex;justify-content:space-between;align-items:center}.fcu-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.fcu-card-head{align-items:flex-start;flex-direction:column}.fcu-body{padding:12px}.fcu-toolbar{padding:11px}.fcu-result{margin-left:0}}@media(max-width:420px){.fcu-grid{grid-template-columns:1fr}.fcu-stat{padding:12px}.fcu-stat strong{font-size:23px}}',
      '</style>',
      '<section class="fcu-hero"><div><div class="fcu-eyebrow">BMS DAILY OPERATIONS</div><h1>Tenant FCU Extension</h1><p>Daily schedule review and operator verification.</p></div><div class="fcu-clock"><b id="fcuClock">--:--:--</b><span id="fcuDate"></span></div></section>',
      '<div class="fcu-notice" id="fcuNotice" hidden></div><div class="fcu-note"><b>Operator note:</b> This page does not display live Honeywell/BMS status or send ON/OFF commands. Confirm each FCU on the BMS. Verification records are saved locally in this browser for the current date.</div>',
      '<section class="fcu-stats"><div class="fcu-stat"><span>Scheduled FCUs</span><strong id="fcuTotal">0</strong></div><div class="fcu-stat"><span>In Schedule Window</span><strong id="fcuActive">0</strong></div><div class="fcu-stat"><span>Verified</span><strong id="fcuVerified">0</strong><div class="fcu-progress"><i id="fcuProgress"></i></div></div><div class="fcu-stat"><span>Pending Checks</span><strong id="fcuPending">0</strong></div></section>',
      '<section class="fcu-card"><div class="fcu-card-head"><div><h2>1. Import Schedule</h2><p>Paste start time, stop time and FCU code from iFACILITY.</p></div></div><div class="fcu-body"><textarea id="fcuRaw" class="fcu-raw" spellcheck="false" placeholder="18:00    20:00    L47-2A-05"></textarea><p class="fcu-help">Format: START TIME · STOP TIME · FCU CODE. Tabs or spaces are accepted; invalid rows and duplicate codes are flagged.</p><div class="fcu-actions"><button class="fcu-btn primary" id="fcuProcess">↕ Process &amp; Sort</button><button class="fcu-btn" id="fcuSample">Load Sample</button><button class="fcu-btn danger" id="fcuClear">Clear</button></div><div class="fcu-errors" id="fcuErrors" hidden></div></div></section>',
      '<section class="fcu-card"><div class="fcu-card-head"><div><h2>2. Daily FCU Checklist</h2><p>Sorted by level, zone and FCU number. Schedule indicators use your device clock.</p></div><div class="fcu-actions" style="margin:0"><button class="fcu-btn" id="fcuCopy">Copy Report</button><button class="fcu-btn" id="fcuExport">Export CSV</button></div></div>',
      '<div class="fcu-toolbar"><input id="fcuSearch" class="fcu-search" type="search" placeholder="Search level, zone, FCU code or time…"><select id="fcuStatus" class="fcu-select"><option value="all">All statuses</option><option value="active">In schedule window</option><option value="pending">Pending</option><option value="verified">Verified</option></select><div class="fcu-switch"><button data-view="matrix" class="selected">Matrix</button><button data-view="table">Table</button></div><span id="fcuResultCount" class="fcu-result">0 dipaparkan</span></div>',
      '<div class="fcu-body" id="fcuMatrixWrap"><div id="fcuMatrix"></div></div><div class="fcu-table-wrap" id="fcuTableWrap" hidden><table class="fcu-table"><thead><tr><th>No.</th><th>Level</th><th>Zone</th><th>FCU No.</th><th>FCU Code</th><th>Start–Stop / Status</th><th>Standby</th><th>Verification</th></tr></thead><tbody id="fcuTableBody"></tbody></table></div>',
      '<div class="fcu-body" style="border-top:1px solid var(--border)"><div class="fcu-actions"><button class="fcu-btn blue" id="fcuMarkAll">Mark All Verified</button><button class="fcu-btn danger" id="fcuReset">Reset Today’s Checks</button></div><p class="fcu-help">Mark all only after every FCU has been checked on the BMS.</p></div></section></div>'
    ].join('');
    return {html:html,bind:bind};
  }
  function bind() {
    const raw=document.getElementById('fcuRaw');
    document.getElementById('fcuProcess').onclick=process;
    document.getElementById('fcuSample').onclick=function(){raw.value=SAMPLE;process();};
    document.getElementById('fcuClear').onclick=function(){if(raw.value.trim()&&!window.confirm('Kosongkan jadual?'))return;raw.value='';records=[];checks={};standbyChecks={};save();saveStandby();draw();document.getElementById('fcuErrors').hidden=true;};
    document.getElementById('fcuSearch').oninput=draw;document.getElementById('fcuStatus').onchange=draw;
    document.querySelectorAll('[data-view]').forEach(function(b){b.onclick=function(){view=b.dataset.view;draw();};});
    const toggle=function(e){const b=e.target.closest('[data-standby]');if(!b)return;standbyChecks[b.dataset.standby]=b.checked;saveStandby();draw();};
    const verify=function(e){const b=e.target.closest('[data-verify]');if(!b)return;checks[b.dataset.verify]=!checks[b.dataset.verify];save();draw();};
    document.getElementById('fcuMatrix').addEventListener('change',toggle);document.getElementById('fcuTableBody').addEventListener('change',toggle);document.getElementById('fcuMatrix').addEventListener('click',verify);document.getElementById('fcuTableBody').addEventListener('click',verify);
    document.getElementById('fcuCopy').onclick=async function(){if(!records.length)return notify('Tiada data untuk disalin.');try{await navigator.clipboard.writeText(report());notify('Laporan disalin.');}catch(e){const t=document.createElement('textarea');t.value=report();document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();notify('Laporan disalin.');}};
    document.getElementById('fcuExport').onclick=function(){if(!records.length)return notify('Tiada data untuk dieksport.');const rows=[['Level','Zone/DB','Unit','FCU Code','Start','Stop','Operator Check']].concat(records.map(function(r){return [r.level,r.zone,r.unit,r.code,r.start,r.end,checks[r.id]?'VERIFIED':'PENDING'];}));const csv=rows.map(function(row){return row.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');}).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));a.download='FCU-Extension-Check-'+dateKey()+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);};
    document.getElementById('fcuReset').onclick=function(){if(!window.confirm('Reset semua tanda semakan hari ini?'))return;checks={};standbyChecks={};save();saveStandby();draw();notify('Today’s checks reset.');};
    document.getElementById('fcuMarkAll').onclick=function(){if(!records.length)return notify('Tiada rekod.');if(!window.confirm('Tandakan semua Verified? Pastikan semua unit telah disemak.'))return;records.forEach(function(r){checks[r.id]=true;});save();draw();notify('Semua rekod ditanda Verified.');};
    if(clockTimer)clearInterval(clockTimer);
    const clock=function(){const c=document.getElementById('fcuClock'),d=document.getElementById('fcuDate');if(c)c.textContent=new Date().toLocaleTimeString('en-GB');if(d)d.textContent=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});if(records.length)draw();};
    clock();clockTimer=setInterval(clock,30000);raw.value=SAMPLE;process();
  }
  window.BMSFcuExtension={render:render};
})();