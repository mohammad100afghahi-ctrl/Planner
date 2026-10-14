/* Task-owned reminders. Instants are stored in UTC; inputs use the device's timezone. */
function taskReminderFromRow(row){
  return { reminderAt:row.reminder_at || null, reminderKind:row.reminder_kind || 'once',
    reminderLeadDays:row.reminder_lead_days || 0, legacyReminderId:row.legacy_reminder_id || null };
}
function newTaskReminderDraft(){
  return { reminderEnabled:false, reminderDate:'', reminderTime:'09:00', reminderKind:'once', reminderLeadDays:0, reminderDaysBefore:0 };
}
function taskReminderDraft(t){
  const at = t.reminderAt ? new Date(t.reminderAt) : null;
  return { ...newTaskReminderDraft(), reminderEnabled:!!at || t.reminderKind === 'always',
    reminderDate:at ? dateKey(at) : '', reminderTime:at ? String(at.getHours()).padStart(2,'0')+':'+String(at.getMinutes()).padStart(2,'0') : '09:00',
    reminderKind:t.reminderKind || 'once', reminderLeadDays:t.reminderLeadDays || 0 };
}
function taskReminderToggle(on){
  const d = state.taskEditor.draft;
  d.reminderEnabled = on;
  if(on && !d.reminderDate){
    const next = new Date(Date.now()+3600000);
    d.reminderDate = d.date || dateKey(next);
    d.reminderTime = String(next.getHours()).padStart(2,'0')+':'+String(next.getMinutes()).padStart(2,'0');
  }
  render();
}
function taskReminderCalendarToggle(){
  const ed=state.taskEditor;
  ed.reminderCalendarOpen = !ed.reminderCalendarOpen;
  const j=window.jalaali.toJalaali(new Date((ed.draft.reminderDate || dateKey(new Date()))+'T12:00:00'));
  ed.reminderJY=j.jy; ed.reminderJM=j.jm;
  render();
}
function taskReminderCalendarPrev(){ const e=state.taskEditor; if(--e.reminderJM<1){e.reminderJM=12;e.reminderJY--;} render(); }
function taskReminderCalendarNext(){ const e=state.taskEditor; if(++e.reminderJM>12){e.reminderJM=1;e.reminderJY++;} render(); }
function taskReminderCalendarPick(y,m,d){
  const g=window.jalaali.toGregorian(y,m,d), e=state.taskEditor;
  e.draft.reminderDate=dateKey(new Date(g.gy,g.gm-1,g.gd)); e.reminderCalendarOpen=false; render();
}
function taskReminderRow(d){
  if(!d.reminderEnabled) return { reminder_at:null, reminder_kind:'once', reminder_lead_days:0 };
  const weekly=d.recurring.enabled;
  if(!weekly && d.reminderKind === 'always') return {reminder_at:null, reminder_kind:'always', reminder_lead_days:0};
  if(!/^\d{2}:\d{2}$/.test(d.reminderTime || '') || (!weekly && !d.reminderDate)){
    showInfoToast('تاریخ و ساعت یادآوری را انتخاب کن.'); return null;
  }
  const at=weekly ? null : new Date(d.reminderDate+'T'+d.reminderTime+':00');
  if(at && !Number.isFinite(at.getTime())){ showInfoToast('زمان یادآوری معتبر نیست.'); return null; }
  // An existing expired reminder can be edited without forcing the user to reschedule it.
  const original=state.taskEditor.mode==='edit' && state.tasks.find(t=>t.id===state.taskEditor.taskId);
  if(at && at.getTime()<=Date.now() && (!original || original.reminderAt!==at.toISOString())){
    showInfoToast('برای هشدار جدید، زمانی در آینده انتخاب کن.'); return null;
  }
  if(!weekly && d.reminderKind==='yearly' && !d.date){ showInfoToast('برای تکرار سالانه، تاریخ انجام کار را هم انتخاب کن.'); return null; }
  return {reminder_at:at ? at.toISOString() : null, reminder_kind:weekly ? 'once' : d.reminderKind, reminder_lead_days:d.reminderLeadDays || 0};
}
function recurringTaskReminderAt(tpl, day){
  if(!tpl.reminderTime) return null;
  const base=new Date(day+'T12:00:00Z');
  base.setUTCDate(base.getUTCDate()-(tpl.reminderDaysBefore || 0));
  return new Date(base.toISOString().slice(0,10)+'T'+tpl.reminderTime.slice(0,5)+':00+03:00').toISOString();
}
function renderTaskReminderFields(ed){
  const d=ed.draft, weekly=d.recurring.enabled;
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `<div class="modal-section">
    <label class="recurring-toggle"><input type="checkbox" ${d.reminderEnabled?'checked':''} onchange="taskReminderToggle(this.checked)">${icon('bell',15)} این کار یادآوری داشته باشد</label>
    ${d.reminderEnabled ? `<div class="quick-group" style="margin-top:10px">
      ${!weekly ? `<label>نوع <select aria-label="نوع یادآوری" onchange="state.taskEditor.draft.reminderKind=this.value;render()">${Object.entries(REMINDER_KIND_LABEL).map(([k,v])=>`<option value="${k}" ${d.reminderKind===k?'selected':''}>${v}</option>`).join('')}</select></label>` : ''}
      ${weekly ? `<label>چند روز قبل <input class="num-text" type="number" min="0" max="30" aria-label="روزهای قبل از تسک" value="${d.reminderDaysBefore || 0}" onchange="state.taskEditor.draft.reminderDaysBefore=Math.min(30,Math.max(0,Number(this.value)||0))"></label>` : d.reminderKind!=='always' ? `<button type="button" class="date-picker-btn" onclick="taskReminderCalendarToggle()">${icon('calendar',13)} ${d.reminderDate ? formatDateShort(d.reminderDate) : 'تاریخ هشدار'}</button>` : ''}
      ${weekly || d.reminderKind!=='always' ? `<label>ساعت <input type="time" aria-label="ساعت هشدار" value="${escapeHtml(d.reminderTime)}" onchange="state.taskEditor.draft.reminderTime=this.value"></label>` : ''}
    </div>
    ${!weekly && ed.reminderCalendarOpen && d.reminderKind!=='always' ? renderPickCalendar({jy:ed.reminderJY,jm:ed.reminderJM,date:d.reminderDate,prev:'taskReminderCalendarPrev',next:'taskReminderCalendarNext',pick:'taskReminderCalendarPick'}) : ''}
    <div class="reminder-kind-hint">${d.reminderKind==='always' && !weekly ? 'تا انجام کار، در بخش امروز نمایش داده می‌شود.' : weekly ? 'در هر نوبت تکرار، به وقت بغداد هشدار داده می‌شود.' : `زمان هشدار جدا از تاریخ انجام کار است؛ به وقت دستگاه (${escapeHtml(timezone)}).`}
    ${!weekly && d.reminderKind==='yearly' ? ' پس از انجام، نوبت بعد در همان روز شمسی سال آینده ساخته می‌شود.' : ''}</div>
    ${state.pushStatus!=='on' && (weekly || d.reminderKind!=='always') ? `<div class="reminder-kind-hint">برای دریافت هشدار روی گوشی، «اعلان روی گوشی» را در تنظیمات روشن کن.</div>` : ''}` : ''}
  </div>`;
}
function renderRecurringReminderFields(ed){
  return `<div class="modal-section"><label class="recurring-toggle"><input type="checkbox" ${ed.reminderEnabled?'checked':''} onchange="recurringEditorCapture();state.recurringEditor.reminderEnabled=this.checked;render()">${icon('bell',15)} این کار یادآوری داشته باشد</label>
    ${ed.reminderEnabled ? `<div class="quick-group" style="margin-top:10px"><label>ساعت <input type="time" aria-label="ساعت هشدار تکرارشونده" value="${escapeHtml(ed.reminderTime.slice(0,5))}" onchange="state.recurringEditor.reminderTime=this.value"></label><label>چند روز قبل <input type="number" min="0" max="30" class="num-text" aria-label="روزهای قبل از تسک" value="${ed.reminderDaysBefore}" onchange="state.recurringEditor.reminderDaysBefore=Math.min(30,Math.max(0,Number(this.value)||0))"></label></div><div class="reminder-kind-hint">در هر نوبت تکرار، به وقت بغداد هشدار داده می‌شود.</div>` : ''}</div>`;
}
function taskReminderLabel(t){
  if(t.reminderKind==='always') return 'یادآوری تا انجام کار';
  if(!t.reminderAt) return '';
  const dt=new Date(t.reminderAt);
  return 'یادآوری '+formatDateShort(dateKey(dt))+'، '+toFaDigits(String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'))+(t.reminderKind==='yearly'?' · سالانه':'');
}
function renderTaskReminderBadge(t, compact){
  const label=taskReminderLabel(t);
  if(!label || t.done) return '';
  return `<span class="summary-text" title="${escapeHtml(label)}">${icon('bell',13)}${compact?'':` ${escapeHtml(label)}`}</span>`;
}
function renderTaskReminderAlert(){
  const list=state.tasks.filter(t=>!t.done && (t.reminderKind==='always' || (t.reminderAt && Date.parse(t.reminderAt)<=Date.now())));
  if(!list.length) return '';
  list.sort((a,b)=>(Date.parse(a.reminderAt)||0)-(Date.parse(b.reminderAt)||0));
  return renderTodayFold('reminders',{icon:'bell',title:'کارهای یادآوری‌شده',color:'var(--accent)',summary:toFaDigits(list.length)+' کار',
    body:list.map(t=>`<div class="reminder-line"><button class="reminder-tick" onclick="toggleTaskDone('${t.id}',event)" aria-label="انجام کار">${icon('check',14)}</button><div class="reminder-line-main"><button class="edit-link reminder-line-title" onclick="openTaskEditorEdit('${t.id}')">${escapeHtml(t.title)}</button><div class="reminder-line-meta">${escapeHtml(taskReminderLabel(t))}</div></div></div>`).join('')+`<div class="mother-card-actions"><button onclick="navigateTo('tasks')">همهٔ کارها</button></div>`});
}
// Keep an already-open Today page current when an alarm time passes.
let taskReminderVisibleSignature='';
setInterval(()=>{
  if(!appStarted || state.view!=='today' || document.hidden || document.querySelector('.modal-overlay')) return;
  const signature=state.tasks.filter(t=>!t.done && (t.reminderKind==='always' || (t.reminderAt && Date.parse(t.reminderAt)<=Date.now()))).map(t=>t.id).sort().join(',');
  if(signature!==taskReminderVisibleSignature){taskReminderVisibleSignature=signature;render();}
},30000);
