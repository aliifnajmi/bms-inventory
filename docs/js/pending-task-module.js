(function () {
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const db = () => window.bmsSupabase;
const PEOPLE = ['Pak Yhoni','Eng Kan Wai','SV Don','Snr Tech Tajudin','Tech Iskanda','Tech Afiqah','Tech Aliif','Tech Zaim','Action Centre','ACMV','P&D','Others'];
const SECTIONS = ['BMS Operations','Action Centre','ACMV','P&D','Others'];
const STATUSES = ['Pending','In Progress','On Hold','Completed'];
const PRIORITIES = ['Low','Normal','High','Urgent'];
const TYPES = ['Task','Reminder','Event'];
const LANES = [
 {key:'Pending',label:'To Do',hint:'Ready for action'},
 {key:'In Progress',label:'In Progress',hint:'Being handled'},
 {key:'On Hold',label:'On Hold',hint:'Waiting / follow-up'},
 {key:'Completed',label:'Completed',hint:'Work closed'}
];

let tasks = [];
let filters = {section:'All',from:'All',to:'All',priority:'All',type:'All',search:''};
let busy = false;
let pollTimer = null;
let reminderTimer = null;

const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
const nowIso = () => new Date().toISOString();
const shortTime = v => v ? String(v).slice(0,5) : '';
const prettyDate = v => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-MY',{day:'2-digit',month:'short',year:'numeric'}) : 'No date';
const localDateTime = v => { if (!v) return ''; const d = new Date(v); if (Number.isNaN(d.getTime())) return ''; return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };
const toIso = v => v ? new Date(v).toISOString() : null;
const isOverdue = t => t.status !== 'Completed' && t.due_date && t.due_date < today();
const isDueToday = t => t.status !== 'Completed' && t.due_date === today();
const scheduledAt = t => t.task_type === 'Reminder' && t.reminder_at ? new Date(t.reminder_at) : new Date((t.due_date || today()) + 'T' + (t.due_time || '23:59:00'));
const sortTasks = a => [...a].sort((x,y) => String(x.due_date || '9999-12-31').localeCompare(String(y.due_date || '9999-12-31')) || String(x.due_time || '23:59').localeCompare(String(y.due_time || '23:59')) || String(x.created_at || '').localeCompare(String(y.created_at || '')));

const css = '.pt-wrap{color:#172536;font-family:inherit}.pt-wrap *{box-sizing:border-box}.pt-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 18px}.pt-heading{display:flex;gap:12px}.pt-mark{width:40px;height:40px;display:grid;place-items:center;border-radius:10px;background:#e8f2f2;color:#087f78;flex:none}.pt-mark svg{width:21px;height:21px}.pt-heading h2{font-size:22px;letter-spacing:-.035em;margin:0 0 5px;font-weight:780}.pt-subtitle{font-size:12px;color:#728196;line-height:1.5}.pt-live{display:flex;align-items:center;gap:7px;margin-top:8px;font-size:10px;font-weight:750;letter-spacing:.07em;text-transform:uppercase;color:#507064}.pt-live:before{content:"";width:6px;height:6px;border-radius:50%;background:#16a37b;box-shadow:0 0 0 3px #16a37b1c}.pt-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.pt-btn{border:1px solid #d8e1e9;background:#fff;color:#344255;border-radius:8px;padding:9px 12px;font:inherit;font-size:11px;font-weight:700;min-height:36px;cursor:pointer;transition:background .15s,border-color .15s}.pt-btn:hover{background:#f7fafc;border-color:#aebdca}.pt-btn:focus-visible,.pt-filter:focus-visible,.pt-form input:focus-visible,.pt-form select:focus-visible,.pt-form textarea:focus-visible{outline:3px solid #0d948855;outline-offset:2px}.pt-btn.primary{background:#087f78;color:#fff;border-color:#087f78}.pt-btn.primary:hover{background:#066d67}.pt-btn.quiet{background:transparent}.pt-btn.danger{color:#b42318}.pt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 16px}.pt-stat{position:relative;overflow:hidden;background:#fff;border:1px solid #e3e9ef;border-radius:10px;padding:12px 14px;min-height:78px}.pt-stat span{display:block;color:#718096;font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.pt-stat strong{display:block;margin-top:5px;font-size:24px;line-height:1;font-weight:780;letter-spacing:-.04em;font-variant-numeric:tabular-nums}.pt-stat small{display:block;margin-top:5px;color:#8794a4;font-size:10px}.pt-stat:after{content:"";position:absolute;right:0;top:0;bottom:0;width:3px;background:#cbd5e1}.pt-stat[data-tone="teal"]:after{background:#0d9488}.pt-stat[data-tone="blue"]:after{background:#4384c7}.pt-stat[data-tone="red"]:after{background:#d05a55}.pt-stat[data-tone="green"]:after{background:#39966d}.pt-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px}.pt-search{position:relative;flex:1 1 230px;min-width:190px}.pt-search input{width:100%;height:37px;border:1px solid #dce4eb;border-radius:8px;background:#fff;padding:0 12px 0 35px;font:inherit;font-size:12px;color:#253448}.pt-search svg{position:absolute;left:11px;top:10px;width:16px;height:16px;color:#8291a2}.pt-filter{height:37px;min-width:125px;border:1px solid #dce4eb;border-radius:8px;background:#fff;padding:0 26px 0 10px;color:#46566a;font:inherit;font-size:11px}.pt-agenda{background:#fff;border:1px solid #e3e9ef;border-radius:10px;margin:0 0 14px;overflow:hidden}.pt-agenda-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-bottom:1px solid #edf1f4}.pt-agenda-head h3{font-size:11px;margin:0;font-weight:800;color:#35465a}.pt-agenda-head p{font-size:10px;color:#8190a0;margin-top:2px}.pt-agenda-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0}.pt-agenda-item{display:flex;gap:10px;padding:12px 14px;min-width:0;border-right:1px solid #edf1f4}.pt-agenda-item:last-child{border-right:0}.pt-agenda-date{width:38px;flex:none;text-align:center;padding:5px 3px;border-radius:7px;background:#eef4f5;color:#526779}.pt-agenda-date b{display:block;font-size:14px;line-height:1.1}.pt-agenda-date span{font-size:8px;text-transform:uppercase;font-weight:800}.pt-agenda-copy{min-width:0}.pt-agenda-copy strong{display:block;font-size:10px;color:#26384b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pt-agenda-copy span{display:block;font-size:9px;color:#7b8999;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pt-agenda-empty{padding:13px 14px;color:#8592a1;font-size:10px}.pt-board-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 0 9px;color:#7b8999;font-size:10px}.pt-board-meta strong{color:#425166}.pt-board{display:grid;grid-template-columns:repeat(4,minmax(235px,1fr));gap:11px;align-items:start;overflow-x:auto;padding:1px 1px 12px;scrollbar-width:thin}.pt-lane{min-width:235px;background:#edf2f6;border:1px solid #e4eaf0;border-radius:10px;padding:9px;min-height:270px;transition:background .15s,border-color .15s}.pt-lane.is-over{background:#e4f3f1;border-color:#6ab6ac}.pt-lane-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 2px 10px}.pt-lane-title{display:flex;align-items:center;gap:8px;min-width:0}.pt-lane-dot{width:8px;height:8px;border-radius:50%;background:#8292a5;flex:none}.pt-lane[data-lane="In Progress"] .pt-lane-dot{background:#4384c7}.pt-lane[data-lane="On Hold"] .pt-lane-dot{background:#d69b3e}.pt-lane[data-lane="Completed"] .pt-lane-dot{background:#39966d}.pt-lane-head h3{font-size:11px;margin:0;font-weight:800}.pt-lane-count{display:inline-grid;place-items:center;min-width:21px;height:20px;padding:0 6px;border-radius:6px;background:#fff;color:#637286;font-size:10px;font-weight:800}.pt-lane-hint{font-size:9px;color:#8592a1;margin:3px 0 0}.pt-lane-add{border:0;background:transparent;color:#748396;border-radius:6px;width:27px;height:27px;font-size:17px;cursor:pointer}.pt-lane-add:hover{background:#fff;color:#087f78}.pt-lane-cards{display:flex;flex-direction:column;gap:8px;min-height:205px}.pt-card{position:relative;background:#fff;border:1px solid #e1e7ed;border-radius:8px;padding:11px;box-shadow:0 1px 2px #20304708;cursor:grab;transition:transform .15s,box-shadow .15s,border-color .15s}.pt-card:hover{border-color:#bdcbd7;box-shadow:0 4px 14px #2030470d;transform:translateY(-1px)}.pt-card:active{cursor:grabbing}.pt-card.is-dragging{opacity:.42;transform:rotate(1deg)}.pt-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.pt-section{font-size:9px;color:#69798c;font-weight:750;letter-spacing:.045em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pt-priority{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:800;white-space:nowrap}.pt-priority:before{content:"";width:5px;height:5px;border-radius:50%;background:#91a0b0}.pt-priority.high,.pt-priority.urgent{color:#b54742}.pt-priority.high:before,.pt-priority.urgent:before{background:#d05a55}.pt-priority.low{color:#758397}.pt-card-title{font-size:12px;line-height:1.45;font-weight:760;color:#203047;margin:0 0 5px;overflow-wrap:anywhere}.pt-card-desc{font-size:10px;line-height:1.5;color:#728196;margin:0 0 9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pt-card-location{font-size:10px;color:#69798c;margin:0 0 9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pt-card-foot{border-top:1px solid #eef1f4;padding-top:8px;display:flex;align-items:center;justify-content:space-between;gap:7px}.pt-due{font-size:9px;color:#718096;line-height:1.35}.pt-due strong{display:block;font-size:10px;color:#46566a;font-weight:750}.pt-due.overdue strong{color:#bd403b}.pt-due.today strong{color:#a66b1b}.pt-assignee{display:flex;align-items:center;gap:5px;min-width:0;font-size:9px;color:#617185}.pt-avatar{width:21px;height:21px;border-radius:50%;display:grid;place-items:center;background:#e8edf2;color:#43546a;font-size:8px;font-weight:850;flex:none}.pt-assignee span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:85px}.pt-card-actions{display:flex;align-items:center;gap:5px;margin-top:8px}.pt-card-actions button,.pt-card-actions select{height:27px;border:1px solid #e1e7ed;border-radius:6px;background:#fff;color:#657488;font:inherit;font-size:10px;padding:0 7px;cursor:pointer}.pt-card-actions button:hover,.pt-card-actions select:hover{border-color:#aebdca;color:#24364b}.pt-card-actions select{flex:1;min-width:0}.pt-card-badges{display:flex;gap:5px;flex-wrap:wrap;margin:0 0 7px}.pt-chip{display:inline-flex;align-items:center;border-radius:4px;padding:3px 5px;background:#f1f4f7;color:#637286;font-size:8px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.pt-chip.overdue{background:#fff0ef;color:#b54742}.pt-chip.today{background:#fff5df;color:#98631a}.pt-chip.handover{background:#eaf2fb;color:#416b9a}.pt-chip.reminder{background:#fef4df;color:#94651b}.pt-chip.event{background:#eaf2fb;color:#416b9a}.pt-chip.task{background:#edf2f6;color:#637286}.pt-empty{border:1px dashed #cbd5df;border-radius:7px;padding:22px 10px;text-align:center;color:#8a97a6;font-size:10px;line-height:1.5}.pt-empty strong{display:block;color:#69798c;font-size:11px;margin-bottom:3px}.pt-message{margin:0 0 10px;padding:9px 11px;border-radius:7px;background:#eaf5f2;color:#176b5d;font-size:11px}.pt-message[hidden]{display:none}.pt-modal{position:fixed;inset:0;z-index:9999;background:#101d2db5;display:grid;place-items:center;padding:16px}.pt-dialog{width:min(700px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:12px;box-shadow:0 24px 80px #0f172a40}.pt-dialog-head,.pt-dialog-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid #e9edf1}.pt-dialog-head h3{font-size:15px;margin:0;font-weight:800}.pt-dialog-foot{justify-content:flex-end;border:0;border-top:1px solid #e9edf1}.pt-form{padding:16px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.pt-field{display:flex;flex-direction:column;gap:5px;font-size:10px;color:#5f6f82;font-weight:750}.pt-field.full{grid-column:1/-1}.pt-form input,.pt-form select,.pt-form textarea{width:100%;min-height:37px;border:1px solid #d9e1e8;border-radius:7px;padding:8px 10px;font:inherit;font-size:12px;color:#26374a;background:#fff}.pt-form textarea{min-height:70px;resize:vertical}.pt-required{color:#b54742}.pt-modal-note{font-size:10px;color:#7a8999;line-height:1.5;padding:0 18px 12px}.pt-alert-note{font-size:10px;color:#7b8999;line-height:1.5;padding:10px 14px;border-top:1px solid #edf1f4}@media(max-width:900px){.pt-board{grid-template-columns:repeat(4,minmax(250px,1fr))}.pt-agenda-list{grid-template-columns:1fr}.pt-agenda-item{border-right:0;border-bottom:1px solid #edf1f4}.pt-agenda-item:last-child{border-bottom:0}}@media(max-width:600px){.pt-heading h2{font-size:19px}.pt-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pt-stat{min-height:72px;padding:10px 12px}.pt-stat strong{font-size:22px}.pt-filter{flex:1;min-width:calc(50% - 6px)}.pt-board{grid-template-columns:repeat(4,minmax(265px,82vw));gap:9px}.pt-form{grid-template-columns:1fr}.pt-field.full{grid-column:auto}.pt-dialog-head,.pt-dialog-foot{padding:12px 14px}.pt-form{padding:14px}.pt-actions .pt-btn{padding:8px 10px}}@media(prefers-reduced-motion:reduce){.pt-wrap *{transition:none!important;scroll-behavior:auto!important}}';

function wrap(html) {
 return '<div class="pt-wrap"><style>'+css+'</style><div id="ptMsg" class="pt-message" hidden role="status" aria-live="polite"></div>'+html+'</div>';
}
function notify(text,error) {
 const node=$('#ptMsg'); if(!node)return;
 node.textContent=text; node.hidden=false;
 node.style.background=error?'#fff0ef':'#eaf5f2';
 node.style.color=error?'#a53631':'#176b5d';
}
function options(values,selected) {
 return values.map(v=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(v)+'</option>').join('');
}
async function loadTasks() {
 const c=db(); if(!c)throw Error('Supabase connection is unavailable.');
 const r=await c.from('bms_pending_tasks').select('*').order('due_date',{ascending:true}).order('due_time',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});
 if(r.error)throw r.error; tasks=r.data||[];
}
function visibleTasks() {
 const q=filters.search.trim().toLowerCase();
 return sortTasks(tasks.filter(t=>(filters.section==='All'||t.section===filters.section)&&(filters.from==='All'||t.assigned_from===filters.from)&&(filters.to==='All'||t.assigned_to===filters.to)&&(filters.priority==='All'||t.priority===filters.priority)&&(filters.type==='All'||(t.task_type||'Task')===filters.type)&&(!q||[t.task_title,t.description,t.location,t.section,t.assigned_from,t.assigned_to,t.handover_note].join(' ').toLowerCase().includes(q))));
}
function stat(label,value,note,tone) {
 return '<div class="pt-stat" data-tone="'+tone+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+note+'</small></div>';
}
function agenda(list) {
 const now=new Date(),limit=new Date(now.getTime()+7*86400000);
 const items=list.filter(t=>t.status!=='Completed'&&((t.task_type==='Reminder'&&t.reminder_enabled&&t.reminder_at)||t.task_type==='Event'))
  .map(t=>({task:t,at:t.task_type==='Reminder'?new Date(t.reminder_at):scheduledAt(t)}))
  .filter(x=>!Number.isNaN(x.at.getTime())&&x.at>=new Date(now.getTime()-3600000)&&x.at<=limit)
  .sort((a,b)=>a.at-b.at).slice(0,3);
 if(!items.length)return '<div class="pt-agenda-empty">No reminders or events scheduled in the next 7 days. Add one with <strong>New task</strong>.</div>';
 return '<div class="pt-agenda-list">'+items.map(x=>'<div class="pt-agenda-item"><div class="pt-agenda-date"><b>'+x.at.toLocaleDateString('en-MY',{day:'2-digit'})+'</b><span>'+x.at.toLocaleDateString('en-MY',{month:'short'})+'</span></div><div class="pt-agenda-copy"><strong>'+esc(x.task.task_title)+'</strong><span>'+esc(x.task.task_type)+' · '+x.at.toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'})+' · '+esc(x.task.assigned_to||'Unassigned')+'</span></div></div>').join('')+'</div>';
}
function card(t) {
 const late=isOverdue(t),due=isDueToday(t),person=t.assigned_to||'Unassigned';
 const initials=person.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'—';
 const dueClass=late?'overdue':due?'today':'',dueLabel=late?'OVERDUE':due?'DUE TODAY':'DUE DATE';
 const type=t.task_type||'Task';
 const location=t.location?'<div class="pt-card-location">'+esc(t.location)+'</div>':'';
 const desc=t.description?'<p class="pt-card-desc">'+esc(t.description)+'</p>':'';
 const badges=(late?'<span class="pt-chip overdue">Overdue</span>':due?'<span class="pt-chip today">Due today</span>':'')+
  (type==='Reminder'?'<span class="pt-chip reminder">Reminder</span>':type==='Event'?'<span class="pt-chip event">Event</span>':'<span class="pt-chip task">Task</span>')+
  (t.reminder_enabled&&t.reminder_at?'<span class="pt-chip handover">Alert set</span>':'')+
  (t.handover_note?'<span class="pt-chip handover">Handover note</span>':'');
 const next=STATUSES.filter(s=>s!==t.status);
 const reminderLine=t.reminder_enabled&&t.reminder_at?'<div class="pt-card-location">Reminder · '+new Date(t.reminder_at).toLocaleString('en-MY',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+'</div>':'';
 return '<article class="pt-card" draggable="true" tabindex="0" data-task-card="'+esc(t.id)+'" aria-label="'+esc(t.task_title)+', '+esc(t.status)+'"><div class="pt-card-top"><span class="pt-section">'+esc(t.section||'BMS Operations')+'</span><span class="pt-priority '+esc((t.priority||'Normal').toLowerCase())+'">'+esc(t.priority||'Normal')+'</span></div><div class="pt-card-badges">'+badges+'</div><h4 class="pt-card-title">'+esc(t.task_title)+'</h4>'+desc+location+reminderLine+'<div class="pt-card-foot"><div class="pt-due '+dueClass+'"><span>'+dueLabel+'</span><strong>'+esc(prettyDate(t.due_date))+(t.due_time?' · '+esc(shortTime(t.due_time)):'')+'</strong></div><div class="pt-assignee" title="Assigned to '+esc(person)+'"><span class="pt-avatar">'+esc(initials)+'</span><span>'+esc(person)+'</span></div></div><div class="pt-card-actions"><button type="button" data-edit="'+esc(t.id)+'">Open details</button><select data-move="'+esc(t.id)+'" aria-label="Move task to another status"><option value="" selected>Move to…</option>'+options(next,'')+'</select></div></article>';
}
function lane(info,list) {
 const cards=list.length?list.map(card).join(''):'<div class="pt-empty"><strong>No tasks here</strong>Drop a task into this lane or add a new one.</div>';
 return '<section class="pt-lane" data-lane="'+esc(info.key)+'" aria-label="'+esc(info.label)+' tasks"><div class="pt-lane-head"><div class="pt-lane-title"><span class="pt-lane-dot"></span><div><h3>'+esc(info.label)+'</h3><div class="pt-lane-hint">'+esc(info.hint)+'</div></div><span class="pt-lane-count">'+list.length+'</span></div><button type="button" class="pt-lane-add" data-add-lane="'+esc(info.key)+'" aria-label="Add task to '+esc(info.label)+'">+</button></div><div class="pt-lane-cards" data-dropzone="'+esc(info.key)+'">'+cards+'</div></section>';
}
function page() {
 const open=tasks.filter(t=>t.status!=='Completed').length;
 const progress=tasks.filter(t=>t.status==='In Progress').length;
 const overdue=tasks.filter(isOverdue).length;
 const completed=tasks.filter(t=>t.status==='Completed').length;
 const shown=visibleTasks();
 const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>';
 const boardIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>';
 return wrap('<header class="pt-head"><div class="pt-heading"><div class="pt-mark" aria-hidden="true">'+boardIcon+'</div><div><h2>BMS Operations Board</h2><div class="pt-subtitle">Shared shift work, reminders and upcoming building operations</div><div class="pt-live">Shared operations board · auto refresh</div></div></div><div class="pt-actions"><button type="button" class="pt-btn" id="ptEnableAlerts">Enable alerts</button><button type="button" class="pt-btn" id="ptRefresh">Refresh</button><button type="button" class="pt-btn quiet danger" id="ptClear">Clear completed</button><button type="button" class="pt-btn primary" id="ptAdd">+ New item</button></div></header><section class="pt-stats" aria-label="Task summary">'+stat('Open items',open,'Awaiting closure','teal')+stat('In progress',progress,'Currently being handled','blue')+stat('Overdue',overdue,'Past due date','red')+stat('Completed',completed,'Closed items','green')+'</section><section class="pt-agenda"><div class="pt-agenda-head"><div><h3>Upcoming · Next 7 days</h3><p>Scheduled reminders and operational events</p></div><span class="pt-lane-count">'+tasks.filter(t=>t.status!=='Completed'&&(t.task_type==='Reminder'||t.task_type==='Event')).length+' scheduled</span></div>'+agenda(tasks)+'<div class="pt-alert-note">Browser notifications are delivered only while this board is open in a supported browser. Keep this tab open and allow notifications for timed alerts.</div></section><div class="pt-toolbar"><label class="pt-search">'+searchIcon+'<input id="ptSearch" type="search" placeholder="Search task, equipment, location or operator…" value="'+esc(filters.search)+'" aria-label="Search tasks"></label><select class="pt-filter" id="ptType"><option value="All">All item types</option>'+options(TYPES,filters.type)+'</select><select class="pt-filter" id="ptSection"><option value="All">All sections</option>'+options(SECTIONS,filters.section)+'</select><select class="pt-filter" id="ptFrom"><option value="All">All assigned from</option>'+options(PEOPLE,filters.from)+'</select><select class="pt-filter" id="ptTo"><option value="All">All assigned to</option>'+options(PEOPLE,filters.to)+'</select><select class="pt-filter" id="ptPriority"><option value="All">All priorities</option>'+options(PRIORITIES,filters.priority)+'</select></div><div class="pt-board-meta"><span><strong>'+shown.length+'</strong> items shown · Drag cards between columns to update status</span><span>Sorted by due date ↑</span></div><section class="pt-board" aria-label="Kanban board">'+LANES.map(l=>lane(l,shown.filter(t=>t.status===l.key))).join('')+'</section>');
}
function field(label,name,value,type,required,full) {
 return '<label class="pt-field'+(full?' full':'')+'"><span>'+label+(required?' <b class="pt-required">*</b>':'')+'</span><input name="'+name+'" type="'+(type||'text')+'" value="'+esc(value||'')+'"'+(required?' required':'')+'></label>';
}
function selectField(label,name,values,value) {
 return '<label class="pt-field"><span>'+label+'</span><select name="'+name+'">'+options(values,value)+'</select></label>';
}
function textareaField(label,name,value) {
 return '<label class="pt-field full"><span>'+label+'</span><textarea name="'+name+'">'+esc(value||'')+'</textarea></label>';
}
function openTaskModal(task,defaultStatus) {
 const item=task||{};
 const body=selectField('Item type','task_type',TYPES,item.task_type||'Task')+
  field('Title','task_title',item.task_title,'text',true,true)+
  textareaField('Description / details','description',item.description)+
  selectField('Section','section',SECTIONS,item.section||'BMS Operations')+
  field('Due date / event date','due_date',item.due_date||today(),'date',true,false)+
  field('Due time / event start','due_time',shortTime(item.due_time),'time',false,false)+
  field('Event end','event_end_at',localDateTime(item.event_end_at),'datetime-local',false,false)+
  selectField('Priority','priority',PRIORITIES,item.priority||'Normal')+
  selectField('Status','status',STATUSES,item.status||defaultStatus||'Pending')+
  selectField('Assigned from','assigned_from',PEOPLE,item.assigned_from||'Tech Aliif')+
  selectField('Assigned to','assigned_to',PEOPLE,item.assigned_to||'Others')+
  field('Location / equipment','location',item.location,'text',false,false)+
  selectField('Browser reminder','reminder_enabled',['Off','On'],item.reminder_enabled?'On':'Off')+
  field('Reminder date & time','reminder_at',localDateTime(item.reminder_at),'datetime-local',false,false)+
  textareaField('Handover note','handover_note',item.handover_note);
 const modal=document.createElement('div');
 modal.className='pt-modal';
 modal.innerHTML='<section class="pt-dialog" role="dialog" aria-modal="true" aria-labelledby="ptDialogTitle"><div class="pt-dialog-head"><h3 id="ptDialogTitle">'+(item.id?'Update board item':'Create board item')+'</h3><button type="button" class="pt-btn" data-dismiss>Close</button></div><form id="ptTaskForm" class="pt-form">'+body+'</form><div class="pt-modal-note">Use Reminder for timed follow-ups, Event for scheduled activities, and Task for day-to-day work. Reminder alerts require browser permission and an open board tab.</div><div class="pt-dialog-foot"><button type="button" class="pt-btn" data-dismiss>Cancel</button><button type="submit" form="ptTaskForm" class="pt-btn primary">Save item</button></div></section>';
 document.body.appendChild(modal);
 const close=()=>modal.remove();
 modal.querySelectorAll('[data-dismiss]').forEach(b=>b.addEventListener('click',close));
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 modal.querySelector('#ptTaskForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const data=Object.fromEntries(new FormData(e.currentTarget));
  if(!data.task_title.trim()||!data.due_date){notify('Title and due date are required.',true);return;}
  if(data.reminder_enabled==='On'&&!data.reminder_at){notify('Set a reminder date and time, or switch browser reminder Off.',true);return;}
  await saveTask(item.id?item:null,data,modal);
 });
 const title=modal.querySelector('[name="task_title"]');if(title)title.focus();
}
async function saveTask(old,data,modal) {
 const now=nowIso();
 const payload={
  task_title:data.task_title.trim(),description:data.description||'',due_date:data.due_date,due_time:data.due_time||null,
  priority:data.priority,status:data.status,section:data.section,location:data.location||'',
  assigned_from:data.assigned_from,assigned_to:data.assigned_to,handover_from:data.assigned_from,handover_to:data.assigned_to,
  handover_note:data.handover_note||'',task_type:data.task_type||'Task',reminder_enabled:data.reminder_enabled==='On',
  reminder_at:toIso(data.reminder_at),event_end_at:toIso(data.event_end_at),
  updated_by:null,updated_by_name:data.assigned_from||'BMS Operator',updated_at:now
 };
 if(!old){payload.created_by=null;payload.created_by_name=data.assigned_from||'BMS Operator';payload.completed_at=data.status==='Completed'?now:null;}
 else payload.completed_at=data.status==='Completed'?(old.completed_at||now):null;
 const r=old?await db().from('bms_pending_tasks').update(payload).eq('id',old.id):await db().from('bms_pending_tasks').insert(payload);
 if(r.error){notify('Unable to save item: '+r.error.message,true);return;}
 modal.remove();await refreshBoard();notify(old?'Board item updated.':'New item added to the board.');
}
async function moveTask(id,status) {
 if(!STATUSES.includes(status))return;
 const task=tasks.find(t=>String(t.id)===String(id));
 if(!task||task.status===status||busy)return;
 busy=true;const now=nowIso();
 const r=await db().from('bms_pending_tasks').update({status,completed_at:status==='Completed'?now:null,updated_at:now,updated_by_name:task.assigned_to||'BMS Operator'}).eq('id',id);
 busy=false;
 if(r.error){notify('Status update failed: '+r.error.message,true);return;}
 await refreshBoard();notify('Moved "'+task.task_title+'" to '+status+'.');
}
async function clearClosed() {
 const count=tasks.filter(t=>t.status==='Completed').length;
 if(!count){notify('There are no completed items to clear.');return;}
 if(!window.confirm('Permanently delete '+count+' completed item(s)? This cannot be undone.'))return;
 const r=await db().from('bms_pending_tasks').delete().eq('status','Completed');
 if(r.error){notify('Unable to clear completed items: '+r.error.message,true);return;}
 await refreshBoard();notify(count+' completed item(s) removed.');
}
function firedReminderIds() {
 try{return JSON.parse(localStorage.getItem('bms-pending-task-reminders-fired')||'{}');}catch(_){return {};}
}
function markReminderFired(id) {
 const fired=firedReminderIds();fired[String(id)]=Date.now();
 try{localStorage.setItem('bms-pending-task-reminders-fired',JSON.stringify(fired));}catch(_){}
}
function checkReminders() {
 if(location.hash.indexOf('/pending-tasks')===-1)return;
 const fired=firedReminderIds(),now=Date.now();
 tasks.filter(t=>t.status!=='Completed'&&t.reminder_enabled&&t.reminder_at&&new Date(t.reminder_at).getTime()<=now&&!fired[String(t.id)]).forEach(t=>{
  markReminderFired(t.id);
  const body=(t.location?t.location+' · ':'')+(t.assigned_to?'Assigned to '+t.assigned_to:'BMS Operations');
  if('Notification' in window&&Notification.permission==='granted'){
   const n=new Notification('BMS reminder: '+t.task_title,{body,tag:'bms-task-'+t.id});
   n.onclick=()=>{window.focus();n.close();};
  } else notify('Reminder due: '+t.task_title+(t.location?' · '+t.location:''),false);
 });
}
function startMonitors() {
 if(!reminderTimer)reminderTimer=window.setInterval(checkReminders,30000);
 if(!pollTimer)pollTimer=window.setInterval(async()=>{
  if(location.hash.indexOf('/pending-tasks')===-1)return;
  const root=$('#content');if(!root)return;
  try{await loadTasks();root.innerHTML=page();bindBoard(root);checkReminders();}catch(_){}
 },60000);
}
function bindBoard(root) {
 const draw=()=>{root.innerHTML=page();bindBoard(root);};
 $('#ptAdd',root).addEventListener('click',()=>openTaskModal(null,'Pending'));
 $('#ptRefresh',root).addEventListener('click',async()=>{await refreshBoard();notify('Board refreshed.');});
 $('#ptClear',root).addEventListener('click',clearClosed);
 $('#ptEnableAlerts',root).addEventListener('click',async()=>{
  if(!('Notification' in window)){notify('This browser does not support desktop notifications.',true);return;}
  if(Notification.permission==='granted'){notify('Browser notifications are already enabled.');return;}
  const permission=await Notification.requestPermission();
  notify(permission==='granted'?'Browser notifications enabled for this device.':'Notifications were not enabled. You can still see reminders while the board is open.',permission!=='granted');
 });
 $('#ptSearch',root).addEventListener('input',e=>{filters.search=e.target.value;const pos=e.target.selectionStart;draw();const input=$('#ptSearch',root);if(input){input.focus();input.setSelectionRange(pos,pos);}});
 [['ptType','type'],['ptSection','section'],['ptFrom','from'],['ptTo','to'],['ptPriority','priority']].forEach(([id,key])=>$('#'+id,root).addEventListener('change',e=>{filters[key]=e.target.value;draw();}));
 root.querySelectorAll('[data-add-lane]').forEach(b=>b.addEventListener('click',()=>openTaskModal(null,b.dataset.addLane)));
 root.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openTaskModal(tasks.find(t=>String(t.id)===String(b.dataset.edit)));}));
 root.querySelectorAll('[data-move]').forEach(s=>s.addEventListener('change',()=>{if(s.value)moveTask(s.dataset.move,s.value);}));
 root.querySelectorAll('[data-task-card]').forEach(node=>{
  node.addEventListener('dblclick',()=>openTaskModal(tasks.find(t=>String(t.id)===String(node.dataset.taskCard))));
  node.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===node){e.preventDefault();openTaskModal(tasks.find(t=>String(t.id)===String(node.dataset.taskCard)));}});
  node.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',node.dataset.taskCard);e.dataTransfer.effectAllowed='move';node.classList.add('is-dragging');});
  node.addEventListener('dragend',()=>{node.classList.remove('is-dragging');root.querySelectorAll('.pt-lane.is-over').forEach(l=>l.classList.remove('is-over'));});
 });
 root.querySelectorAll('[data-dropzone]').forEach(zone=>{
  zone.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';zone.closest('.pt-lane').classList.add('is-over');});
  zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.closest('.pt-lane').classList.remove('is-over');});
  zone.addEventListener('drop',e=>{e.preventDefault();zone.closest('.pt-lane').classList.remove('is-over');moveTask(e.dataTransfer.getData('text/plain'),zone.dataset.dropzone);});
 });
}
async function refreshBoard() {
 const root=$('#content');
 try{await loadTasks();root.innerHTML=page();bindBoard(root);startMonitors();checkReminders();}
 catch(error){root.innerHTML=wrap('<div class="pt-empty"><strong>Unable to load BMS Operations Board</strong>'+esc(error.message)+'<div style="margin-top:12px"><button class="pt-btn" id="ptRetry">Try again</button></div></div>');const retry=$('#ptRetry',root);if(retry)retry.addEventListener('click',refreshBoard);}
}
async function render() {
 try{await loadTasks();return {html:page(),bind:()=>{bindBoard($('#content'));startMonitors();checkReminders();}};}
 catch(error){return {html:wrap('<div class="pt-empty"><strong>Unable to load BMS Operations Board</strong>'+esc(error.message)+'</div>')};}
}
window.BMSPendingTasks={render,refresh:refreshBoard};
})();