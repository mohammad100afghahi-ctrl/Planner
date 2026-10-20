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
/* The approved editor has no reminder or repeat fields, so they sit in their
   own block under the subtasks, built from the editor's own parts. */
function renderTaskReminderFields(ed){
  const d=ed.draft, weekly=d.recurring.enabled;
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const box='w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all';
  const hint=d.reminderKind==='always' && !weekly ? 'تا انجام کار، در بخش امروز نمایش داده می‌شود.'
    : weekly ? 'در هر نوبت تکرار، به وقت بغداد هشدار داده می‌شود.'
    : `زمان هشدار جدا از تاریخ انجام کار است؛ به وقت دستگاه (${escapeHtml(timezone)}).`;
  return `
    ${toggleRow(fa('bell','text-indigo-400 ml-1')+' یادآوری','این کار یادآوری داشته باشد', d.reminderEnabled, `taskReminderToggle(${!d.reminderEnabled})`)}
    ${d.reminderEnabled ? `<div class="space-y-4 bg-indigo-600/5 border border-indigo-500/20 p-4 rounded-2xl">
      ${!weekly ? field('نوع یادآوری', segmented(Object.entries(REMINDER_KIND_LABEL), d.reminderKind, k => `state.taskEditor.draft.reminderKind='${k}'; render()`)) : ''}
      <div class="grid grid-cols-2 gap-4">
        ${weekly ? field('چند روز قبل', `<input class="${box}" type="number" min="0" max="30" aria-label="روزهای قبل از تسک" value="${d.reminderDaysBefore || 0}" onchange="state.taskEditor.draft.reminderDaysBefore=Math.min(30,Math.max(0,Number(this.value)||0))">`)
          : d.reminderKind!=='always' ? field('تاریخ هشدار', `<button type="button" onclick="taskReminderCalendarToggle()" class="${box} flex items-center justify-between"><span>${d.reminderDate ? formatDateShort(d.reminderDate) : 'انتخاب از تقویم'}</span>${fa('calendar-day','text-indigo-500')}</button>`) : ''}
        ${weekly || d.reminderKind!=='always' ? field('ساعت هشدار', `<input type="time" aria-label="ساعت هشدار" value="${escapeHtml(d.reminderTime)}" onchange="state.taskEditor.draft.reminderTime=this.value" class="${box}">`) : ''}
      </div>
      ${!weekly && ed.reminderCalendarOpen && d.reminderKind!=='always' ? renderPickCalendar({jy:ed.reminderJY,jm:ed.reminderJM,date:d.reminderDate,prev:'taskReminderCalendarPrev',next:'taskReminderCalendarNext',pick:'taskReminderCalendarPick'}) : ''}
      <p class="text-[10px] text-slate-400 leading-relaxed">${hint}${!weekly && d.reminderKind==='yearly' ? ' پس از انجام، نوبت بعد در همان روز شمسی سال آینده ساخته می‌شود.' : ''}</p>
      ${state.pushStatus!=='on' && (weekly || d.reminderKind!=='always') ? `<p class="text-[10px] text-amber-400/80 leading-relaxed">برای دریافت هشدار روی گوشی، «اعلان‌های مرورگر» را در تنظیمات روشن کن.</p>` : ''}
    </div>` : ''}`;
}
function renderRecurringReminderFields(ed){
  const box='w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all';
  return `
    ${toggleRow(fa('bell','text-indigo-400 ml-1')+' یادآوری','این کار یادآوری داشته باشد', ed.reminderEnabled, `recurringEditorCapture();state.recurringEditor.reminderEnabled=${!ed.reminderEnabled};render()`)}
    ${ed.reminderEnabled ? `<div class="space-y-4 bg-indigo-600/5 border border-indigo-500/20 p-4 rounded-2xl">
      <div class="grid grid-cols-2 gap-4">
        ${field('ساعت هشدار', `<input type="time" aria-label="ساعت هشدار تکرارشونده" value="${escapeHtml(ed.reminderTime.slice(0,5))}" onchange="state.recurringEditor.reminderTime=this.value" class="${box}">`)}
        ${field('چند روز قبل', `<input type="number" min="0" max="30" aria-label="روزهای قبل از تسک" value="${ed.reminderDaysBefore}" onchange="state.recurringEditor.reminderDaysBefore=Math.min(30,Math.max(0,Number(this.value)||0))" class="${box}">`)}
      </div>
      <p class="text-[10px] text-slate-400 leading-relaxed">در هر نوبت تکرار، به وقت بغداد هشدار داده می‌شود.</p>
    </div>` : ''}`;
}
function taskReminderLabel(t){
  if(t.reminderKind==='always') return 'یادآوری تا انجام کار';
  if(!t.reminderAt) return '';
  const dt=new Date(t.reminderAt);
  return 'یادآوری '+formatDateShort(dateKey(dt))+'، '+toFaDigits(String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'))+(t.reminderKind==='yearly'?' · سالانه':'');
}
// Keep an already-open Today page current when an alarm time passes.
let taskReminderVisibleSignature='';
setInterval(()=>{
  if(!appStarted || state.view!=='today' || document.hidden || document.querySelector('.modal-overlay')) return;
  const signature=state.tasks.filter(t=>!t.done && (t.reminderKind==='always' || (t.reminderAt && Date.parse(t.reminderAt)<=Date.now()))).map(t=>t.id).sort().join(',');
  if(signature!==taskReminderVisibleSignature){taskReminderVisibleSignature=signature;render();}
},30000);
