/* ---------- هوشاور › جلسهٔ تمرکز ----------
   A 25-minute session behind an implementation intention: «ساعت …، در …، …
   رو انجام می‌دم», one per weekday, repeated every week. Starting it goes
   through «موبایل رو بردم اتاق دیگه؟», then «اضطرابت از ۰ تا ۱۰ چنده؟»; the
   same question comes back when the 25 minutes are up. Stopping early just
   saves the minutes done. send-push (hooshavar-focus.ts) rings at the planned
   time and when the timer ends.

   The timer is started_at on the server, so it keeps running with the app
   closed and shows the same on every device. Tables: hooshavar_focus_plan,
   hooshavar_focus_sessions (hooshavar_focus.sql). Remove: see hooshavar.js. */
const HV_FOCUS_MIN = 25;
const hvFocus = {
  plans:{},      // weekday (getDay()) → { weekday, time, place, task }
  sessions:[],   // newest first
  flow:null,     // { step:'check'|'before'|'run'|'after', phoneAway, sessionId }
  editor:null,   // { weekday, time, place, task, isNew }
  skippedAfter:new Set(), // sessions whose «بعدش» question was dismissed on this visit
};
const hvFocusFromRow = r => ({
  id:r.id, day:r.day, intention:r.intention, startedAt:r.started_at, endedAt:r.ended_at, minutes:r.minutes,
  completed:r.completed, before:r.anxiety_before, after:r.anxiety_after,
});
const hvIntention = p => p ? `ساعت ${fd(p.time)}، در ${p.place || '…'}، ${p.task || '…'} رو انجام می‌دم.` : '';
const hvTodayPlan = () => hvFocus.plans[new Date().getDay()];
const hvRunning = () => hvFocus.sessions.find(s => !s.endedAt);
const hvElapsedMs = s => Date.now() - Date.parse(s.startedAt);

/* ---------- timer ---------- */
let hvTick = null;
function hvSyncTimer(){
  const s = hvRunning();
  if(s && hvElapsedMs(s) >= HV_FOCUS_MIN * 60_000){ hvFocusFinish(s, true); return; }
  if(s && !hvTick) hvTick = setInterval(() => {
    const cur = hvRunning();
    if(!cur){ clearInterval(hvTick); hvTick = null; return; }
    if(hvElapsedMs(cur) >= HV_FOCUS_MIN * 60_000){ hvFocusFinish(cur, true); return; }
    // only the clock digits change each second; a full repaint would fight with typing elsewhere
    document.querySelectorAll('[data-hv-clock]').forEach(el => { el.textContent = hvClockLeft(cur); });
  }, 1000);
  if(!s && hvTick){ clearInterval(hvTick); hvTick = null; }
}
function hvClockLeft(s){
  const left = Math.max(0, HV_FOCUS_MIN * 60 - Math.floor(hvElapsedMs(s) / 1000));
  return fd(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
}

async function hvFocusStart(before){
  const plan = hvTodayPlan();
  const s = { id:crypto.randomUUID(), day:dateKey(new Date()), intention:hvIntention(plan), startedAt:new Date().toISOString(),
    endedAt:null, minutes:null, completed:false, before, after:null };
  hvFocus.sessions.unshift(s);
  hvFocus.flow = { step:'run', sessionId:s.id };
  render();
  hvSyncTimer();
  const { error } = await sb.from('hooshavar_focus_sessions').insert({ id:s.id, day:s.day, intention:s.intention, started_at:s.startedAt, anxiety_before:before });
  if(error) writeFailed('hooshavar focus start', error);
}
// full = the 25 minutes ran out; otherwise the user stopped it
async function hvFocusFinish(s, full){
  if(s.endedAt) return;
  const end = full ? Date.parse(s.startedAt) + HV_FOCUS_MIN * 60_000 : Date.now();
  s.endedAt = new Date(end).toISOString();
  s.minutes = Math.min(HV_FOCUS_MIN, Math.floor((end - Date.parse(s.startedAt)) / 60_000));
  s.completed = !!full;
  hvFocus.flow = { step:'after', sessionId:s.id };
  hvSyncTimer();
  render();
  const { error } = await sb.from('hooshavar_focus_sessions').update({ ended_at:s.endedAt, minutes:s.minutes, completed:s.completed }).eq('id', s.id);
  if(error) writeFailed('hooshavar focus finish', error);
}
async function hvFocusAfter(n){
  const s = hvFocus.sessions.find(x => x.id === hvFocus.flow?.sessionId) || hvPendingAfter();
  hvFocus.flow = null;
  if(!s){ render(); return; }
  s.after = n;
  render();
  const { error } = await sb.from('hooshavar_focus_sessions').update({ anxiety_after:n }).eq('id', s.id);
  if(error) writeFailed('hooshavar focus after', error);
}
function hvFocusSkipAfter(){
  const id = hvFocus.flow?.sessionId || hvPendingAfter()?.id;
  if(id) hvFocus.skippedAfter.add(id);
  hvFocus.flow = null;
  render();
}
// a session from today that ended while the app was closed and still has no «بعدش»
const hvPendingAfter = () => hvFocus.sessions.find(s => s.endedAt && s.after == null && s.day === dateKey(new Date()) && !hvFocus.skippedAfter.has(s.id));

function hvFocusOpen(){
  const s = hvRunning();
  hvFocus.flow = s ? { step:'run', sessionId:s.id } : { step:'check', phoneAway:false };
  render();
}
function hvFocusClose(){ hvFocus.flow = null; render(); }

/* ---------- weekly plan editor ---------- */
function hvPlanOpen(weekday){
  const p = hvFocus.plans[weekday];
  hvFocus.editor = p ? { ...p, isNew:false } : { weekday, time:'', place:'', task:'', isNew:true };
  render();
}
function hvPlanClose(){ hvFocus.editor = null; render(); }
async function hvPlanSave(){
  const ed = hvFocus.editor;
  const time = toEnDigits(ed.time || '').trim();
  if(!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)){ showSaveError('ساعت رو بنویس، مثلاً ۱۰:۳۰'); return; }
  const p = { weekday:ed.weekday, time:time.padStart(5, '0'), place:(ed.place || '').trim(), task:(ed.task || '').trim() };
  hvFocus.plans[p.weekday] = p;
  hvFocus.editor = null;
  render();
  // a changed time may ring again today; pushed_on only guards the time it was sent for
  const { error } = await sb.from('hooshavar_focus_plan').upsert({ weekday:p.weekday, at_time:p.time, place:p.place, task:p.task, pushed_on:null }, { onConflict:'user_id,weekday' });
  if(error) writeFailed('hooshavar plan save', error);
}
function hvPlanDelete(){
  const weekday = hvFocus.editor.weekday;
  const old = hvFocus.plans[weekday];
  hvFocus.editor = null;
  if(!old){ render(); return; }
  delete hvFocus.plans[weekday];
  let undone = false;
  showUndoToast(`جملهٔ ${WEEKDAYS_FA[weekday]} پاک شد`, () => { undone = true; hvFocus.plans[weekday] = old; render(); });
  setTimeout(async () => {
    if(undone) return;
    const { error } = await sb.from('hooshavar_focus_plan').delete().eq('weekday', weekday);
    if(error) writeFailed('hooshavar plan delete', error);
  }, 5200);
}

/* ---------- drawing ---------- */
function hvScale(onclickFor, picked){
  return `<div class="grid grid-cols-6 gap-2">${Array.from({ length:11 }, (_, n) => `
    <button type="button" onclick="${onclickFor(n)}" class="aspect-square rounded-xl text-sm font-black border transition-all active:scale-95 ${picked === n ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'}">${fd(n)}</button>`).join('')}
  </div>
  <div class="flex justify-between text-[9px] font-bold text-slate-600 px-1"><span>۰ = آروم</span><span>۱۰ = خیلی زیاد</span></div>`;
}
function hvFocusDialog(){
  const f = hvFocus.flow;
  if(!f) return '';
  const plan = hvTodayPlan();
  const intent = plan ? `<p class="text-xs font-bold text-slate-300 leading-relaxed bg-slate-900 border border-slate-800 rounded-2xl p-4" dir="auto">${esc(hvIntention(plan))}</p>` : '';
  if(f.step === 'check') return renderDialog({
    title:'جلسهٔ تمرکز', onClose:'hvFocusClose()',
    body:`${intent}
      <button type="button" onclick="hvFocus.flow.phoneAway=!hvFocus.flow.phoneAway; render()" aria-pressed="${f.phoneAway}"
        class="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${f.phoneAway ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}">
        <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${f.phoneAway ? 'bg-emerald-500 text-slate-950' : 'border-2 border-slate-700'}">${f.phoneAway ? fa('check', 'text-xs') : ''}</span>
        <span class="text-sm font-black ${f.phoneAway ? 'text-emerald-300' : 'text-white'} flex-1 text-right">موبایل رو بردم اتاق دیگه؟</span>
        ${fa('mobile-screen', f.phoneAway ? 'text-emerald-400' : 'text-slate-600')}
      </button>`,
    footer: dlgPrimary('بعدی', "hvFocus.flow.step='before'; render()", f.phoneAway ? '' : 'disabled') + dlgSecondary('انصراف', 'hvFocusClose()'),
  });
  if(f.step === 'before') return renderDialog({
    title:'قبل از شروع', onClose:'hvFocusClose()',
    body:`<p class="text-sm font-black text-white">اضطرابت از ۰ تا ۱۰ چنده؟</p>${hvScale(n => `hvFocusStart(${n})`, null)}`,
  });
  if(f.step === 'run'){
    const s = hvRunning();
    if(!s){ hvFocus.flow = null; return ''; }
    return renderDialog({
      title:'جلسهٔ تمرکز', onClose:'hvFocusClose()',
      body:`
        ${s.intention ? `<p class="text-xs font-bold text-slate-400 leading-relaxed" dir="auto">${esc(s.intention)}</p>` : ''}
        <div class="text-center py-6"><span data-hv-clock class="text-6xl font-black text-white tabular-nums">${hvClockLeft(s)}</span></div>`,
      footer: dlgSecondary('تموم کن', `hvFocusFinish(hvRunning(), false)`, 'style="flex:1"'),
    });
  }
  if(f.step === 'after'){
    const s = hvFocus.sessions.find(x => x.id === f.sessionId);
    return renderDialog({
      title: s && s.completed ? '۲۵ دقیقه تموم شد' : `${fd(s ? s.minutes : 0)} دقیقه ثبت شد`, onClose:'hvFocusSkipAfter()',
      body:`<p class="text-sm font-black text-white">اضطرابت الان از ۰ تا ۱۰ چنده؟</p>${hvScale(n => `hvFocusAfter(${n})`, null)}`,
      footer: dlgSecondary('بعداً', 'hvFocusSkipAfter()', 'style="flex:1"'),
    });
  }
  return '';
}

hooshavarRegister({
  id:'focus',
  order:2,
  async load(){
    const [plans, sessions] = await Promise.all([
      sb.from('hooshavar_focus_plan').select('*'),
      sb.from('hooshavar_focus_sessions').select('*').order('started_at', { ascending:false }).limit(400),
    ]);
    if(plans.error) throw plans.error;
    if(sessions.error) throw sessions.error;
    hvFocus.plans = {};
    plans.data.forEach(r => { hvFocus.plans[r.weekday] = { weekday:r.weekday, time:r.at_time, place:r.place, task:r.task }; });
    hvFocus.sessions = sessions.data.map(hvFocusFromRow);
    hvSyncTimer();
  },
  card(mob){
    const plan = hvTodayPlan();
    const running = hvRunning();
    const pending = !running && hvPendingAfter();
    const today = dateKey(new Date());
    const todays = hvFocus.sessions.filter(s => s.day === today && s.endedAt);
    const week = WEEKDAY_DISPLAY_ORDER.map(d => {
      const p = hvFocus.plans[d];
      return `
        <button type="button" onclick="hvPlanOpen(${d})" class="w-full flex items-center gap-3 p-3 rounded-2xl border text-right transition-all ${d === new Date().getDay() ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}">
          <span class="w-14 shrink-0 text-[10px] font-black ${d === new Date().getDay() ? 'text-indigo-400' : 'text-slate-500'}">${WEEKDAYS_FA[d]}</span>
          <span class="flex-1 min-w-0 text-[11px] font-bold ${p ? 'text-slate-300' : 'text-slate-600'} truncate" dir="auto">${p ? esc(hvIntention(p)) : 'جمله‌ای ننوشتی'}</span>
          ${fa('pen', 'text-[10px] text-slate-600 shrink-0')}
        </button>`;
    }).join('');
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'} space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('stopwatch', 'text-indigo-500')} جلسهٔ تمرکز ${fd(HV_FOCUS_MIN)} دقیقه‌ای</h4>
          ${todays.length ? `<span class="text-[10px] font-black text-slate-500">امروز ${fd(todays.reduce((a, s) => a + (s.minutes || 0), 0))} دقیقه</span>` : ''}
        </div>
        ${plan ? `<p class="text-sm font-black text-white leading-relaxed" dir="auto">${esc(hvIntention(plan))}</p>` : ''}
        ${running ? `
          <button type="button" onclick="hvFocusOpen()" class="w-full flex items-center justify-between p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl">
            <span class="text-xs font-black text-indigo-300">${fa('hourglass-half', 'ml-1')} در جریانه</span>
            <span data-hv-clock class="text-2xl font-black text-white tabular-nums">${hvClockLeft(running)}</span>
          </button>`
        : pending ? `
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <p class="text-xs font-black text-white">جلسه تموم شد — اضطرابت الان از ۰ تا ۱۰ چنده؟</p>
            ${hvScale(n => `hvFocusAfter(${n})`, null)}
            <button type="button" onclick="hvFocusSkipAfter()" class="text-[10px] font-bold text-slate-500">بعداً</button>
          </div>`
        : `<button type="button" onclick="hvFocusOpen()" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-900/40 transition-all">${fa('play', 'ml-1')} شروع جلسه</button>`}
        <div>
          <p class="text-[10px] font-bold text-slate-500 mb-2">برنامهٔ هفته — هر هفته تکرار می‌شه</p>
          <div class="space-y-2">${week}</div>
        </div>
      </div>`;
  },
  overlay(){
    const ed = hvFocus.editor;
    const editor = ed ? renderDialog({
      title:`جلسهٔ ${WEEKDAYS_FA[ed.weekday]}`, onClose:'hvPlanClose()',
      body:`
        <div class="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-300 leading-loose">
          <span>ساعت</span>
          <input id="hvPlanTime" type="time" value="${ea(ed.time)}" oninput="hvFocus.editor.time=this.value" class="${inputCls} !w-32 !p-3" dir="ltr">
          <span>، در</span>
          <input id="hvPlanPlace" type="text" dir="auto" placeholder="مکان" value="${ea(ed.place)}" oninput="hvFocus.editor.place=this.value" class="${inputCls} !w-40 !p-3">
          <span>،</span>
          <input id="hvPlanTask" type="text" dir="auto" placeholder="کار مشخص" value="${ea(ed.task)}" oninput="hvFocus.editor.task=this.value" class="${inputCls} !p-3">
          <span>رو انجام می‌دم.</span>
        </div>`,
      footer: dlgPrimary('ذخیره', 'hvPlanSave()') + (ed.isNew ? dlgSecondary('انصراف', 'hvPlanClose()') : dlgSecondary('پاک کن', 'hvPlanDelete()')),
    }) : '';
    return editor + hvFocusDialog();
  },
  summary(days){
    const done = hvFocus.sessions.filter(s => s.endedAt && days.includes(s.day));
    const avg = key => {
      const v = done.map(s => s[key]).filter(n => n != null);
      return v.length ? hvNum(v.reduce((a, n) => a + n, 0) / v.length, 1) : '—';
    };
    return [
      `جلسه‌های تمرکز: ${fd(done.length)} جلسه · ${fd(done.reduce((a, s) => a + (s.minutes || 0), 0))} دقیقه`,
      `میانگین اضطراب: قبل ${avg('before')} · بعد ${avg('after')}`,
    ];
  },
});
