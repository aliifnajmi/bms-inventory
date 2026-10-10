'use strict';
/* Transaction detail preview + supporting files for BMS IMS. */
(function () {
  function txnEsc(v) { return String(v == null ? '' : v).replace(/[&<>\"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]; }); }
  function txnIcon() { return '<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'; }
  function ensureReportStyles() {
    if (document.getElementById('txnReportStyles')) return;
    var style = document.createElement('style'); style.id = 'txnReportStyles';
    style.textContent = '.txn-report-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 14px;padding:12px;border:1px solid var(--border);border-radius:10px;background:#f8fafc}.txn-report-controls label{font-weight:700;font-size:12px}.txn-report-controls select{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:#fff}.txn-report-controls span{font-size:12px;color:var(--muted)}.txn-report-paper{margin:0 auto 14px;background:#fff;color:#172033;border:1px solid #dbe3ec;border-radius:12px;padding:20px;box-shadow:0 5px 20px rgba(15,23,42,.07);box-sizing:border-box}.txn-paper-a4{width:100%;max-width:740px;min-height:600px}.txn-paper-square{width:min(100%,420px);min-height:0;padding:14px}.txn-report-heading{display:flex;justify-content:space-between;gap:14px;padding-bottom:14px;margin-bottom:14px;border-bottom:2px solid #1c375a}.txn-report-heading small{font-size:9px;letter-spacing:.08em;color:#64748b;font-weight:800}.txn-report-heading h2{font-size:17px;line-height:1.25;margin:6px 0;color:#1c375a}.txn-report-heading p{font-size:12px;color:#64748b;margin:0}.txn-report-code{text-align:right;min-width:92px}.txn-report-code>strong{display:block;font-size:12px;overflow-wrap:anywhere}.txn-report-code>span{display:block;font-size:9px;color:#64748b;margin:3px 0 8px}.txn-qr-box{width:84px;height:84px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:4px;box-sizing:border-box;margin-left:auto}.txn-qr-box canvas,.txn-qr-box img{max-width:100%;max-height:100%}.txn-signatures{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:28px;padding-top:12px;border-top:1px solid #cbd5e1}.txn-signature{padding-top:28px;border-bottom:1px solid #64748b;min-height:1px}.txn-signature-label{font-size:9px;color:#475569;margin-top:6px}.txn-company-logo{max-width:115px;max-height:48px;object-fit:contain;object-position:left center;margin-bottom:7px}.txn-paper-square .txn-signatures{grid-template-columns:1fr;gap:10px}.txn-paper-square .txn-signature{padding-top:16px}.txn-paper-square .txn-report-heading h2{font-size:13px}.txn-paper-square .txn-report-heading{gap:8px}.txn-paper-square .txn-detail-grid{grid-template-columns:1fr;padding:10px;gap:9px}.txn-paper-square .txn-detail-grid .full{grid-column:auto}.txn-paper-square .txn-preview-top{margin-bottom:9px}@media(max-width:600px){.txn-report-paper{padding:12px}.txn-paper-a4{min-height:0}.txn-report-heading h2{font-size:14px}.txn-report-code{min-width:78px}}';
    document.head.appendChild(style);
  }
  function openTxnPreview(t, refresh) {
    ensureReportStyles();
    var sb = window.bmsSupabase || null;
    var root = document.getElementById('modalRoot');
    var reference = String(t.reference || '').trim();
    var body = '<div class="txn-report-controls"><label for="txnReportSize">Report layout</label><select id="txnReportSize"><option value="a4">A4 — Print / File</option><option value="square">Square — Compact card</option></select><span>Transaction ID is used as the Work Order reference.</span></div>' +
      '<div class="txn-report-paper txn-paper-a4" id="txnReportPaper"><div class="txn-report-heading"><div><img class="txn-company-logo" src="https://raw.githubusercontent.com/aliifnajmi/bms-inventory/main/docs/images/mulia.png" alt="Mulia Property Development logo"><small>MULIA PROPERTY DEVELOPMENT SDN BHD · MULIA GROUP</small><h2>WORK ORDER / TRANSACTION REPORT</h2><p>Building Management System · Stock movement record</p></div><div class="txn-report-code"><strong>' + txnEsc(t.transaction_id) + '</strong><span>WORK ORDER ID</span><div class="txn-qr-box" id="txnQrCode" aria-label="QR code linking to this transaction"></div><span>Scan to open transaction</span></div></div>' +
      '<div class="txn-preview"><div class="txn-preview-top"><strong>' + txnEsc(t.transaction_id) + '</strong><span>' + txnEsc(t.transaction_date) + '</span></div>' +
      '<div class="txn-detail-grid">' +
      '<div><span>Type</span><strong>' + txnEsc(t.transaction_type) + '</strong></div>' +
      '<div><span>Item</span><strong>' + txnEsc(t.item_code) + ' — ' + txnEsc(t.item_name) + '</strong></div>' +
      '<div><span>Quantity</span><strong>' + txnEsc((t.transaction_type === 'STOCK_IN' ? '+' : t.transaction_type === 'STOCK_OUT' ? '−' : (Number(t.quantity)>0?'+':'')) + t.quantity + ' ' + (t.unit || '')) + '</strong></div>' +
      '<div><span>Reference</span><strong>' + txnEsc(reference || '—') + '</strong></div>' +
      '<div><span>Supplier</span><strong>' + txnEsc(t.supplier || '—') + '</strong></div>' +
      '<div><span>Issued To / Received By</span><strong>' + txnEsc(t.issued_to || t.received_by || '—') + '</strong></div>' +
      '<div><span>Recorded By (Audit Trail)</span><strong>' + txnEsc(t.user_name || t.user || t.issued_by || t.received_by || 'Not recorded') + '</strong></div>' +
      '<div><span>Created At</span><strong>' + txnEsc(t.created_at ? new Date(t.created_at).toLocaleString() : 'Not available') + '</strong></div>' +
      '<div><span>Work Order</span><strong>' + txnEsc(t.work_order || '—') + '</strong></div>' +
      '<div><span>Area</span><strong>' + txnEsc(t.area || '—') + '</strong></div>' +
      '<div class="full"><span>Reason / Remarks</span><strong>' + txnEsc([t.reason,t.remarks].filter(Boolean).join(' · ') || '—') + '</strong></div></div>' +
      '<div class="txn-signatures"><div><div class="txn-signature"></div><div class="txn-signature-label">Prepared By / Technician</div></div><div><div class="txn-signature"></div><div class="txn-signature-label">Checked By / Supervisor</div></div><div><div class="txn-signature"></div><div class="txn-signature-label">Approved By / Engineer</div></div></div><p style="font-size:9px;color:#64748b;margin-top:14px">Generated from the BMS IMS transaction record. Signatures confirm the details above have been checked.</p><div class="txn-reference-preview" id="txnRefPreview"></div>' +
      '<section class="txn-attachments"><div class="txn-attachments-head"><div><h4>Attachments</h4><p>Upload DO, PO, work order, photos or other evidence (10 MB max per file).</p></div><span class="badge normal" id="txnAttachCount">Loading…</span></div>' +
      '<div class="txn-upload-row"><input type="file" id="txnAttachmentInput" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"><button type="button" class="btn btn-primary" id="txnAttachmentUpload">' + txnIcon() + ' Upload files</button></div>' +
      '<div id="txnAttachmentList" class="txn-attachment-list">Loading attachments…</div></section></div></div>';
    root.innerHTML = '<div class="modal-backdrop" id="txnModalBackdrop"><div class="modal wide" role="dialog" aria-modal="true"><div class="modal-header"><h3>Work Order Report Preview</h3><button class="icon-btn" id="txnModalClose">×</button></div><div class="modal-body">' + body + '</div><div class="modal-footer"><button class="btn" id="txnDownloadExcel">Download Excel</button><button class="btn btn-primary" id="txnDownloadPdf">Download PDF</button><button class="btn" id="txnModalDone">Close</button></div></div></div>';
    var txnUrl = window.location.origin + window.location.pathname + '#/transactions/' + encodeURIComponent(t.id);
    var qrBox = document.getElementById('txnQrCode');
    if (qrBox && window.QRCode) new QRCode(qrBox, { text: txnUrl, width: 76, height: 76, correctLevel: QRCode.CorrectLevel.M });
    else if (qrBox) qrBox.innerHTML = '<span style="font-size:8px;text-align:center;color:#b91c1c">QR library unavailable</span>';
    function close() { root.innerHTML = ''; }
    document.getElementById('txnModalClose').onclick = close; document.getElementById('txnModalDone').onclick = close;
    var pdfButton = document.getElementById('txnDownloadPdf');
    if (pdfButton) pdfButton.onclick = async function () {
      var jsPDF = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDF) return alert('PDF library did not load. Refresh the page and try again.');
      var size = document.getElementById('txnReportSize') ? document.getElementById('txnReportSize').value : 'a4';
      var doc = new jsPDF(size === 'square' ? {orientation:'portrait',unit:'mm',format:[100,100]} : {orientation:'portrait',unit:'mm',format:'a4'});
      var pageWidth = doc.internal.pageSize.getWidth();
      var logoImage = new Image(); logoImage.crossOrigin = 'anonymous'; logoImage.src = 'https://raw.githubusercontent.com/aliifnajmi/bms-inventory/main/docs/images/mulia.png';
      try { await new Promise(function(resolve,reject){ logoImage.onload=resolve; logoImage.onerror=reject; }); doc.addImage(logoImage,'PNG',margin,margin,24,11); } catch (_) {}
      var margin = size === 'square' ? 7 : 14;
      var usableWidth = pageWidth - margin * 2;
      doc.setFontSize(size === 'square' ? 10 : 15); doc.text('MULIA PROPERTY DEVELOPMENT SDN BHD · MULIA GROUP',margin+27,margin+4); doc.setFontSize(size === 'square' ? 9 : 13); doc.text('WORK ORDER / TRANSACTION REPORT',margin+27,margin+10);
      doc.setFontSize(8); doc.text('Work Order / Transaction ID: '+String(t.transaction_id||''),margin,margin+11);
      doc.text('Date: '+String(t.transaction_date||'—')+'  |  Generated: '+new Date().toLocaleDateString(),margin,margin+16);
      var rows = [
        ['Work Order ID',t.transaction_id||'—'],['Transaction Date',t.transaction_date],['Transaction Type',t.transaction_type],
        ['Item Code',t.item_code],['Item Name',t.item_name],
        ['Quantity',String(t.transaction_type==='STOCK_OUT'?'−':t.transaction_type==='STOCK_IN'?'+':'')+String(t.quantity)+' '+String(t.unit||'')],
        ['Reference',t.reference||'—'],['Supplier',t.supplier||'—'],
        ['Issued To',t.issued_to||'—'],['Received By',t.received_by||'—'],
        ['Work Order Details',t.work_order||'—'],['Area',t.area||'—'],['Reason',t.reason||'—'],
        ['Remarks',t.remarks||'—'],['Recorded By',t.user_name||t.user||t.issued_by||t.received_by||'Not recorded'],
        ['Created At',t.created_at?new Date(t.created_at).toLocaleString():'Not available']
      ];
      if (typeof doc.autoTable === 'function') doc.autoTable({startY:margin+21,margin:{left:margin,right:margin},tableWidth:usableWidth,head:[['Field','Work Order Details']],body:rows.map(function(r){return [String(r[0]),String(r[1]||'—')];}),styles:{fontSize:size==='square'?5.5:9,cellPadding:size==='square'?1.5:3,overflow:'linebreak'},headStyles:{fillColor:[28,55,90]},columnStyles:{0:{cellWidth:size==='square'?29:45},1:{cellWidth:'auto'}}});
      else { var y=margin+25; rows.forEach(function(r){doc.setFontSize(7);doc.text(String(r[0])+': '+String(r[1]||'—').slice(0,70),margin,y); y+=5; if(y>doc.internal.pageSize.getHeight()-margin){doc.addPage();y=margin;}}); }
      var qrCanvas=document.querySelector('#txnQrCode canvas'); if(qrCanvas){try{doc.addImage(qrCanvas.toDataURL('image/png'),'PNG',pageWidth-margin-(size==='square'?20:25),margin+2,size==='square'?17:22,size==='square'?17:22);}catch(_){}}
      var signY=(doc.lastAutoTable&&doc.lastAutoTable.finalY?doc.lastAutoTable.finalY:margin+80)+18;if(signY>doc.internal.pageSize.getHeight()-28){doc.addPage();signY=22;}var signGap=usableWidth/3;[['Prepared By / Technician',0],['Checked By / Supervisor',1],['Approved By / Engineer',2]].forEach(function(sg){var x=margin+sg[1]*signGap;doc.setDrawColor(100,116,139);doc.line(x,signY,x+signGap-5,signY);doc.setFontSize(7);doc.text(sg[0],x,signY+5);});
      doc.save(String(t.transaction_id||'work-order')+'-'+size+'.pdf');
    };
    var sizeSelect = document.getElementById('txnReportSize');
    if (sizeSelect) sizeSelect.onchange = function() {
      var paper = document.getElementById('txnReportPaper');
      if (paper) paper.className = 'txn-report-paper ' + (sizeSelect.value === 'square' ? 'txn-paper-square' : 'txn-paper-a4');
    };
    var excelButton = document.getElementById('txnDownloadExcel');
    if (excelButton) excelButton.onclick = function() {
      if (!window.XLSX) return alert('Excel library did not load. Refresh the page and try again.');
      var rows = [
        ['Field','Work Order / Transaction Details'],
        ['Work Order ID',t.transaction_id||'—'],['Transaction Date',t.transaction_date||'—'],['Transaction Type',t.transaction_type||'—'],
        ['Item Code',t.item_code||'—'],['Item Name',t.item_name||'—'],
        ['Quantity',(t.transaction_type==='STOCK_OUT'?'−':t.transaction_type==='STOCK_IN'?'+':'')+String(t.quantity||'')+' '+String(t.unit||'')],
        ['Reference',t.reference||'—'],['Supplier',t.supplier||'—'],['Issued To',t.issued_to||'—'],['Received By',t.received_by||'—'],
        ['Work Order Details',t.work_order||'—'],['Area',t.area||'—'],['Reason',t.reason||'—'],['Remarks',t.remarks||'—'],
        ['Recorded By',t.user_name||t.user||t.issued_by||t.received_by||'Not recorded'],['Created At',t.created_at||'—']
      ];
      var wb = XLSX.utils.book_new();
      var ws = XLSX.utils.aoa_to_sheet([['BMS IMS — Work Order / Transaction Report'],['Generated',new Date().toLocaleString()],[],...rows]);
      ws['!cols'] = [{wch:24},{wch:54}];
      XLSX.utils.book_append_sheet(wb,ws,'Work Order');
      XLSX.writeFile(wb,String(t.transaction_id||'work-order')+'-report.xlsx');
    };
    document.getElementById('txnModalBackdrop').onclick = function(e) { if (e.target.id === 'txnModalBackdrop') close(); };
    var refBox = document.getElementById('txnRefPreview');
    if (/^https?:\/\//i.test(reference)) {
      var valid = ''; try { var u = new URL(reference); if (u.protocol === 'https:' || u.protocol === 'http:') valid = u.href; } catch (_) {}
      if (valid) { var image = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(valid); refBox.innerHTML = '<div class="reference-preview-head"><strong>Reference Preview</strong><a class="btn btn-sm" href="' + txnEsc(valid) + '" target="_blank" rel="noopener noreferrer">Open reference ↗</a></div>' + (image ? '<img class="reference-image-preview" src="' + txnEsc(valid) + '" alt="Reference preview">' : '<iframe class="reference-iframe" title="Reference preview" loading="lazy" referrerpolicy="no-referrer" src="' + txnEsc(valid) + '"></iframe><p class="hint">If the website blocks embedded preview, select Open reference.</p>'); }
    } else { refBox.innerHTML = '<strong>Reference</strong><p>' + txnEsc(reference || 'No reference recorded. Supporting documents can be attached below.') + '</p>'; }
    async function loadFiles() {
      var list = document.getElementById('txnAttachmentList'), count = document.getElementById('txnAttachCount');
      if (!sb || !sb.storage || typeof sb.from !== 'function') { list.innerHTML = '<p class="hint">Attachment storage is unavailable in this session. Report preview and exports remain available.</p>'; count.textContent = 'Unavailable'; var upBtn=document.getElementById('txnAttachmentUpload'); if(upBtn) upBtn.disabled=true; return; }
      var q = await sb.from('transaction_attachments').select('*').eq('transaction_id', Number(t.id)).order('created_at', {ascending:false});
      if (q.error) { list.innerHTML = '<p class="form-error">Could not load files: ' + txnEsc(q.error.message) + '</p>'; count.textContent = 'Error'; return; }
      var files = q.data || []; count.textContent = files.length + ' file(s)';
      if (!files.length) { list.innerHTML = '<div class="txn-empty-files">No attachments yet. Add the first supporting document above.</div>'; return; }
      var rows = await Promise.all(files.map(async function(f) { var signed = await sb.storage.from('transaction-attachments').createSignedUrl(f.storage_path, 900); return {f:f,url:signed.error ? '' : signed.data.signedUrl}; }));
      list.innerHTML = rows.map(function(row) { var f=row.f, url=row.url, size=Number(f.size_bytes)<1048576 ? Math.max(1,Math.round(Number(f.size_bytes)/1024))+' KB' : (Number(f.size_bytes)/1048576).toFixed(1)+' MB'; var im=String(f.mime_type||'').indexOf('image/')===0; var pdf=f.mime_type==='application/pdf'; return '<article class="txn-attachment"><div class="txn-attachment-info"><strong>'+txnEsc(f.file_name)+'</strong><span>'+txnEsc(size)+' · '+txnEsc(new Date(f.created_at).toLocaleString())+'</span></div>'+(url?'<a class="btn btn-sm" href="'+txnEsc(url)+'" target="_blank" rel="noopener noreferrer">'+(im||pdf?'Preview':'Open')+'</a><a class="btn btn-sm" href="'+txnEsc(url)+'" download="'+txnEsc(f.file_name)+'">Download</a>':'<span>Link unavailable</span>')+'<button class="icon-btn txn-delete-file" type="button" data-delete-file="'+txnEsc(f.id)+'" aria-label="Delete attachment">×</button>'+(im&&url?'<a class="txn-attachment-thumb" href="'+txnEsc(url)+'" target="_blank" rel="noopener noreferrer"><img src="'+txnEsc(url)+'" alt="'+txnEsc(f.file_name)+'"></a>':'')+'</article>'; }).join('');
      Array.from(list.querySelectorAll('[data-delete-file]')).forEach(function(btn) { btn.onclick=async function() { var f=files.find(function(x){return String(x.id)===String(btn.dataset.deleteFile);}); if(!f||!confirm('Delete attachment '+f.file_name+'?')) return; var rem=await sb.storage.from('transaction-attachments').remove([f.storage_path]); if(rem.error) return alert(rem.error.message); var del=await sb.from('transaction_attachments').delete().eq('id',f.id); if(del.error) return alert(del.error.message); await loadFiles(); if(refresh) refresh(); }; });
    }
    document.getElementById('txnAttachmentUpload').onclick = async function() {
      if (!sb || !sb.storage || typeof sb.from !== 'function') return alert('Attachment storage is unavailable. Report preview and exports can still be used.');
      var input=document.getElementById('txnAttachmentInput'), files=Array.from(input.files||[]); if(!files.length) return alert('Choose files first.');
      if(files.some(function(f){return f.size>10*1024*1024;})) return alert('Each file must be 10 MB or smaller.');
      var allowed=/^(application\/pdf|image\/(jpeg|png|webp)|text\/(plain|csv)|application\/(vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|msword|vnd\.ms-excel))$/i;
      if(files.some(function(f){return !allowed.test(f.type||'application/octet-stream');})) return alert('Allowed types: PDF, JPG, PNG, WEBP, TXT, CSV, DOC/DOCX and XLS/XLSX.');
      var button=this; button.disabled=true; button.textContent='Uploading…';
      try { for(var i=0;i<files.length;i++){var f=files[i], safe=f.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)||'attachment', path=t.transaction_id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'-'+safe; var up=await sb.storage.from('transaction-attachments').upload(path,f,{contentType:f.type||'application/octet-stream',upsert:false}); if(up.error) throw up.error; var ins=await sb.from('transaction_attachments').insert({transaction_id:Number(t.id),file_name:f.name,storage_path:path,mime_type:f.type||'application/octet-stream',size_bytes:f.size,uploaded_by:'BMS Technician'}); if(ins.error){await sb.storage.from('transaction-attachments').remove([path]);throw ins.error;} } input.value=''; alert(files.length+' file(s) uploaded.'); await loadFiles(); if(refresh) refresh(); } catch(e){alert(e.message||'Upload failed.');} finally {button.disabled=false;button.innerHTML=txnIcon()+' Upload files';}
    };
    loadFiles();
  }
  window.bmsOpenTransactionPreview = openTxnPreview;
  window.bmsTransactionAttachmentUiReady = true;
})();

/* Replace the legacy transaction renderer while keeping existing filters and export. */
renderTransactions = async function () {
  var f = state.txn;
  var typeOpts = ['<option value="">All Types</option>'].concat(['STOCK_IN','STOCK_OUT','ADJUSTMENT'].map(function(t){return '<option value="'+t+'" '+(f.type===t?'selected':'')+'>'+t.replace('_',' ')+'</option>'; })).join('');
  var itemOpts = ['<option value="">All Items</option>'].concat(state.items.map(function(i){return '<option value="'+i.id+'" '+(String(f.item_id)===String(i.id)?'selected':'')+'>'+esc(i.item_code)+' — '+esc(i.item_name)+'</option>'; })).join('');
  var catOpts = ['<option value="">All Categories</option>'].concat(state.categories.map(function(c){return '<option value="'+esc(c.name)+'" '+(f.category===c.name?'selected':'')+'>'+esc(c.name)+'</option>'; })).join('');
  var html = '<div class="card"><div class="toolbar"><div class="search-box">'+icon('search',17)+'<input id="txnSearch" placeholder="Search ID, reference, work order, item…" value="'+esc(f.search)+'"></div><select id="txnType">'+typeOpts+'</select><select id="txnItem">'+itemOpts+'</select><select id="txnCat">'+catOpts+'</select><input type="text" id="txnUser" placeholder="User…" value="'+esc(f.user)+'" style="padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px;max-width:140px"><input type="date" id="txnFrom" value="'+esc(f.from)+'" title="From date" style="padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px"><input type="date" id="txnTo" value="'+esc(f.to)+'" title="To date" style="padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px"><div class="toolbar-actions"><button class="btn" id="btnExportTxn">'+icon('file',16)+' Export CSV</button></div></div><div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Transaction ID</th><th>Type</th><th>Item Code</th><th>Item Name</th><th class="num">Quantity</th><th>Reference preview</th><th>Attachments</th><th>User</th></tr></thead><tbody id="txnBody"></tbody></table></div><div class="card-foot" id="txnCount"></div></div>';
  var txns = [];
  async function load() {
    var qs = new URLSearchParams(); Object.entries(state.txn).forEach(function(pair){if(pair[1]) qs.set(pair[0],pair[1]);});
    txns = await api('/api/transactions?' + qs);
    var counts = {};
    if(window.bmsSupabase && txns.length) { var ids=txns.map(function(t){return Number(t.id);}); var q=await window.bmsSupabase.from('transaction_attachments').select('transaction_id').in('transaction_id',ids); if(!q.error)(q.data||[]).forEach(function(a){counts[a.transaction_id]=(counts[a.transaction_id]||0)+1;}); }
    document.getElementById('txnBody').innerHTML = txns.length ? txns.map(function(t){
      var qty=(t.transaction_type==='STOCK_IN'?'+':t.transaction_type==='STOCK_OUT'?'−':Number(t.quantity)>0?'+':'')+t.quantity;
      return '<tr><td style="white-space:nowrap">'+esc(t.transaction_date)+'</td><td><a class="link txn-id-link" href="#/transactions/'+encodeURIComponent(t.id)+'" title="View transaction details"><strong>'+esc(t.transaction_id)+'</strong></a><span class="sub">View details ↗</span></td><td>'+typeBadge(t.transaction_type)+'</td><td><a class="link" href="#/items/'+t.item_id+'">'+esc(t.item_code)+'</a></td><td>'+esc(t.item_name)+(t.work_order?'<span class="sub">'+esc(t.work_order)+(t.area?' · '+esc(t.area):'')+'</span>':'')+'</td><td class="num">'+esc(qty)+' '+esc(t.unit)+'</td><td>'+(t.reference?'<button class="reference-preview-link" type="button" data-txn-id="'+t.id+'">'+esc(t.reference)+'</button>':esc(t.work_order||'—'))+'</td><td><button class="btn btn-sm" type="button" data-txn-id="'+t.id+'">'+icon('file',14)+' '+(counts[t.id]||0)+' file(s)</button></td><td>'+esc(t.user||t.user_name||'—')+'</td></tr>';
    }).join('') : emptyRow(9);
    document.getElementById('txnCount').textContent=txns.length+' transaction(s) · Select Transaction ID or Reference to preview details and files';
    Array.from(document.querySelectorAll('[data-txn-id]')).forEach(function(b){b.onclick=function(){window.bmsOpenTransactionPreview(txns.find(function(t){return Number(t.id)===Number(b.dataset.txnId);}),load);};});
  }
  return {html:html,bind:function(){
    load().catch(function(e){toast(e.message,'error');});
    document.getElementById('txnSearch').addEventListener('input',debounce(function(e){state.txn.search=e.target.value.trim();load();},300));
    document.getElementById('txnType').onchange=function(e){state.txn.type=e.target.value;load();};
    document.getElementById('txnItem').onchange=function(e){state.txn.item_id=e.target.value;load();};
    document.getElementById('txnCat').onchange=function(e){state.txn.category=e.target.value;load();};
    document.getElementById('txnUser').addEventListener('input',debounce(function(e){state.txn.user=e.target.value.trim();load();},300));
    document.getElementById('txnFrom').onchange=function(e){state.txn.from=e.target.value;load();};
    document.getElementById('txnTo').onchange=function(e){state.txn.to=e.target.value;load();};
    document.getElementById('btnExportTxn').onclick=function(){downloadCsv('bms-transactions-'+todayStr()+'.csv',['Date','Transaction ID','Type','Item Code','Item Name','Quantity','Unit','Reference','Supplier','Issued To','Work Order','Area','Reason','User','Remarks'],txns.map(function(t){return [t.transaction_date,t.transaction_id,t.transaction_type,t.item_code,t.item_name,t.transaction_type==='STOCK_OUT'?-t.quantity:t.quantity,t.unit,t.reference,t.supplier,t.issued_to,t.work_order,t.area,t.reason,t.user||t.user_name,t.remarks];}));};
  }};
};
