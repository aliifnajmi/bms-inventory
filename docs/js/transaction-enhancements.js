'use strict';
/* Transaction detail preview + supporting files for BMS IMS. */
(function () {
  function txnEsc(v) { return String(v == null ? '' : v).replace(/[&<>\"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]; }); }
  function txnIcon() { return '<svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>'; }
  function openTxnPreview(t, refresh) {
    var sb = window.bmsSupabase; if (!sb) return alert('Supabase attachment service is not connected. Refresh the page.');
    var root = document.getElementById('modalRoot');
    var reference = String(t.reference || '').trim();
    var body = '<div class="txn-preview"><div class="txn-preview-top"><strong>' + txnEsc(t.transaction_id) + '</strong><span>' + txnEsc(t.transaction_date) + '</span></div>' +
      '<div class="txn-detail-grid">' +
      '<div><span>Type</span><strong>' + txnEsc(t.transaction_type) + '</strong></div>' +
      '<div><span>Item</span><strong>' + txnEsc(t.item_code) + ' — ' + txnEsc(t.item_name) + '</strong></div>' +
      '<div><span>Quantity</span><strong>' + txnEsc((t.transaction_type === 'STOCK_IN' ? '+' : t.transaction_type === 'STOCK_OUT' ? '−' : (Number(t.quantity)>0?'+':'')) + t.quantity + ' ' + (t.unit || '')) + '</strong></div>' +
      '<div><span>Reference</span><strong>' + txnEsc(reference || '—') + '</strong></div>' +
      '<div><span>Supplier</span><strong>' + txnEsc(t.supplier || '—') + '</strong></div>' +
      '<div><span>Issued To / Received By</span><strong>' + txnEsc(t.issued_to || t.received_by || '—') + '</strong></div>' +
      '<div><span>Work Order</span><strong>' + txnEsc(t.work_order || '—') + '</strong></div>' +
      '<div><span>Area</span><strong>' + txnEsc(t.area || '—') + '</strong></div>' +
      '<div class="full"><span>Reason / Remarks</span><strong>' + txnEsc([t.reason,t.remarks].filter(Boolean).join(' · ') || '—') + '</strong></div></div>' +
      '<div class="txn-reference-preview" id="txnRefPreview"></div>' +
      '<section class="txn-attachments"><div class="txn-attachments-head"><div><h4>Attachments</h4><p>Upload DO, PO, work order, photos or other evidence (10 MB max per file).</p></div><span class="badge normal" id="txnAttachCount">Loading…</span></div>' +
      '<div class="txn-upload-row"><input type="file" id="txnAttachmentInput" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx"><button type="button" class="btn btn-primary" id="txnAttachmentUpload">' + txnIcon() + ' Upload files</button></div>' +
      '<div id="txnAttachmentList" class="txn-attachment-list">Loading attachments…</div></section></div>';
    root.innerHTML = '<div class="modal-backdrop" id="txnModalBackdrop"><div class="modal wide" role="dialog" aria-modal="true"><div class="modal-header"><h3>Transaction Preview</h3><button class="icon-btn" id="txnModalClose">×</button></div><div class="modal-body">' + body + '</div><div class="modal-footer"><button class="btn" id="txnModalDone">Close</button></div></div></div>';
    function close() { root.innerHTML = ''; }
    document.getElementById('txnModalClose').onclick = close; document.getElementById('txnModalDone').onclick = close;
    document.getElementById('txnModalBackdrop').onclick = function(e) { if (e.target.id === 'txnModalBackdrop') close(); };
    var refBox = document.getElementById('txnRefPreview');
    if (/^https?:\/\//i.test(reference)) {
      var valid = ''; try { var u = new URL(reference); if (u.protocol === 'https:' || u.protocol === 'http:') valid = u.href; } catch (_) {}
      if (valid) { var image = /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(valid); refBox.innerHTML = '<div class="reference-preview-head"><strong>Reference Preview</strong><a class="btn btn-sm" href="' + txnEsc(valid) + '" target="_blank" rel="noopener noreferrer">Open reference ↗</a></div>' + (image ? '<img class="reference-image-preview" src="' + txnEsc(valid) + '" alt="Reference preview">' : '<iframe class="reference-iframe" title="Reference preview" loading="lazy" referrerpolicy="no-referrer" src="' + txnEsc(valid) + '"></iframe><p class="hint">If the website blocks embedded preview, select Open reference.</p>'); }
    } else { refBox.innerHTML = '<strong>Reference</strong><p>' + txnEsc(reference || 'No reference recorded. Supporting documents can be attached below.') + '</p>'; }
    async function loadFiles() {
      var list = document.getElementById('txnAttachmentList'), count = document.getElementById('txnAttachCount');
      var q = await sb.from('transaction_attachments').select('*').eq('transaction_id', Number(t.id)).order('created_at', {ascending:false});
      if (q.error) { list.innerHTML = '<p class="form-error">Could not load files: ' + txnEsc(q.error.message) + '</p>'; count.textContent = 'Error'; return; }
      var files = q.data || []; count.textContent = files.length + ' file(s)';
      if (!files.length) { list.innerHTML = '<div class="txn-empty-files">No attachments yet. Add the first supporting document above.</div>'; return; }
      var rows = await Promise.all(files.map(async function(f) { var signed = await sb.storage.from('transaction-attachments').createSignedUrl(f.storage_path, 900); return {f:f,url:signed.error ? '' : signed.data.signedUrl}; }));
      list.innerHTML = rows.map(function(row) { var f=row.f, url=row.url, size=Number(f.size_bytes)<1048576 ? Math.max(1,Math.round(Number(f.size_bytes)/1024))+' KB' : (Number(f.size_bytes)/1048576).toFixed(1)+' MB'; var im=String(f.mime_type||'').indexOf('image/')===0; var pdf=f.mime_type==='application/pdf'; return '<article class="txn-attachment"><div class="txn-attachment-info"><strong>'+txnEsc(f.file_name)+'</strong><span>'+txnEsc(size)+' · '+txnEsc(new Date(f.created_at).toLocaleString())+'</span></div>'+(url?'<a class="btn btn-sm" href="'+txnEsc(url)+'" target="_blank" rel="noopener noreferrer">'+(im||pdf?'Preview':'Open')+'</a><a class="btn btn-sm" href="'+txnEsc(url)+'" download="'+txnEsc(f.file_name)+'">Download</a>':'<span>Link unavailable</span>')+'<button class="icon-btn txn-delete-file" type="button" data-delete-file="'+txnEsc(f.id)+'" aria-label="Delete attachment">×</button>'+(im&&url?'<a class="txn-attachment-thumb" href="'+txnEsc(url)+'" target="_blank" rel="noopener noreferrer"><img src="'+txnEsc(url)+'" alt="'+txnEsc(f.file_name)+'"></a>':'')+'</article>'; }).join('');
      Array.from(list.querySelectorAll('[data-delete-file]')).forEach(function(btn) { btn.onclick=async function() { var f=files.find(function(x){return String(x.id)===String(btn.dataset.deleteFile);}); if(!f||!confirm('Delete attachment '+f.file_name+'?')) return; var rem=await sb.storage.from('transaction-attachments').remove([f.storage_path]); if(rem.error) return alert(rem.error.message); var del=await sb.from('transaction_attachments').delete().eq('id',f.id); if(del.error) return alert(del.error.message); await loadFiles(); if(refresh) refresh(); }; });
    }
    document.getElementById('txnAttachmentUpload').onclick = async function() {
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
