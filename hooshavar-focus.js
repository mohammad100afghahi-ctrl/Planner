/* ---------- هوشاور › تمرکز ۲۵ دقیقه ----------
   One plan per date, written on the card for today or tomorrow: «ساعت [ ]، در
   [ ]، [ ] رو انجام می‌دم.». A session: «موبایل رو بردی یه اتاق دیگه؟» (tick
   «آره، بردم») → «الان اضطرابت چنده؟» 0–10 → 25-minute timer («متوقف کن»
   saves the minutes done: «X دقیقه هم حسابه.») → the same question again →
   «یادداشت: چی کمک کرد؟ چی مانع شد؟» (may be skipped). The after-question
   waits on the card until it is answered or the day ends. Several sessions a
   day are fine; the summary counts days. send-push (hooshavar-focus.ts) rings
   at the planned time, and at 25 minutes closes the session on the server and
   sends «۲۵ دقیقه تموم شد.».

   The timer is started_at on the server, so it keeps running with the app
   closed and shows the same on every device. Tables: hooshavar_focus_plan,
   hooshavar_focus_sessions (hooshavar_focus.sql). Remove: see hooshavar.js. */
const HV_FOCUS_MIN = 25;
const hvFocus = {
  plans:{},      // day → { day, time, place, task }
  sessions:[],   // newest first
  flow:null,     // { step:'check'|'before'|'run'|'after'|'note', phoneAway, sessionId, note }
  editor:null,   // { day, time, place, task }
};
const hvFocusFromRow = r => ({
  id:r.id, day:r.day, plannedTime:r.planned_time, place:r.place, task:r.task, startedAt:r.started_at, delay:r.delay_min,
  endedAt:r.ended_at, minutes:r.minutes, completed:r.completed, before:r.anxiety_before, after:r.anxiety_after,
  note:r.note, afterDone:r.after_done,
});
const hvSentence = p => `ساعت ${fd(p.time)}، در ${p.place || '…'}، ${p.task || '…'} رو انجام می‌دم.`;
const hvToday = () => dateKey(new Date());
const hvTomorrow = () => dateKey(tomorrowDate());
const hvRunning = () => hvFocus.sessions.find(s => !s.endedAt);
const hvElapsedMs = s => Date.now() - Date.parse(s.startedAt);
// today's finished session still waiting for «الان اضطرابت چنده؟» — gone once the day ends
const hvPendingAfter = () => hvFocus.sessions.find(s => s.endedAt && !s.afterDone && s.day === hvToday());

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

/* ---------- a session ---------- */
async function hvFocusStart(before){
  const day = hvToday();
  const plan = hvFocus.plans[day];
  const now = new Date();
  let delay = null;
  if(plan){
    const [h, m] = plan.time.split(':').map(Number);
    const at = new Date(now); at.setHours(h, m, 0, 0);
    delay = Math.round((now - at) / 60_000);
  }
  const s = { id:crypto.randomUUID(), day, plannedTime:plan ? plan.time : null, place:plan ? plan.place : '', task:plan ? plan.task : '',
    startedAt:now.toISOString(), delay, endedAt:null, minutes:null, completed:false, before, after:null, note:null, afterDone:false };
  hvFocus.sessions.unshift(s);
  hvFocus.flow = { step:'run', sessionId:s.id };
  render();
  hvSyncTimer();
  const { error } = await sb.from('hooshavar_focus_sessions').insert({ id:s.id, day, planned_time:s.plannedTime, place:s.place, task:s.task,
    started_at:s.startedAt, delay_min:delay, anxiety_before:before });
  if(error) writeFailed('hooshavar focus start', error);
}
// full = the 25 minutes ran out; otherwise «متوقف کن»
async function hvFocusFinish(s, full){
  if(!s || s.endedAt) return;
  const end = full ? Date.parse(s.startedAt) + HV_FOCUS_MIN * 60_000 : Date.now();
  s.endedAt = new Date(end).toISOString();
  s.minutes = Math.min(HV_FOCUS_MIN, Math.floor((end - Date.parse(s.startedAt)) / 60_000));
  s.completed = !!full;
  hvFocus.flow = { step:'after', sessionId:s.id };
  hvSyncTimer();
  render();
  // .is(ended_at, null): the server may already have closed it at 25 minutes
  const { error } = await sb.from('hooshavar_focus_sessions').update({ ended_at:s.endedAt, minutes:s.minutes, completed:s.completed }).eq('id', s.id).is('ended_at', null);
  if(error) writeFailed('hooshavar focus finish', error);
}
const hvFlowSession = () => hvFocus.sessions.find(x => x.id === hvFocus.flow?.sessionId) || hvPendingAfter();
async function hvFocusAfter(n){
  const s = hvFlowSession();
  if(!s){ hvFocus.flow = null; render(); return; }
  s.after = n;
  s.afterDone = true;
  hvFocus.flow = { step:'note', sessionId:s.id, note:'' };
  render();
  const { error } = await sb.from('hooshavar_focus_sessions').update({ anxiety_after:n, after_done:true }).eq('id', s.id);
  if(error) writeFailed('hooshavar focus after', error);
}
async function hvFocusNote(save){
  const s = hvFlowSession() || hvFocus.sessions.find(x => x.id === hvFocus.flow?.sessionId);
  const note = save ? (hvFocus.flow.note || '').trim() : '';
  hvFocus.flow = null;
  render();
  if(!s || !note) return;
  s.note = note;
  const { error } = await sb.from('hooshavar_focus_sessions').update({ note }).eq('id', s.id);
  if(error) writeFailed('hooshavar focus note', error);
}
function hvFocusOpen(){
  const s = hvRunning();
  const p = hvPendingAfter();
  hvFocus.flow = s ? { step:'run', sessionId:s.id } : p ? { step:'after', sessionId:p.id } : { step:'check', phoneAway:false };
  render();
}
function hvFocusClose(){ hvFocus.flow = null; render(); }

/* ---------- the plan ---------- */
function hvPlanOpen(day){
  const p = hvFocus.plans[day];
  hvFocus.editor = p ? { ...p } : { day, time:'', place:'', task:'' };
  render();
}
function hvPlanPickDay(day){
  const ed = hvFocus.editor;
  const p = hvFocus.plans[day];
  // switching day shows that day's plan if there is one, else keeps what was typed
  hvFocus.editor = p ? { ...p } : { ...ed, day };
  render();
}
function hvPlanClose(){ hvFocus.editor = null; render(); }
async function hvPlanSave(){
  const ed = hvFocus.editor;
  const time = toEnDigits(ed.time || '').trim();
  if(!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)){ showSaveError('ساعت رو بنویس، مثلاً ۱۷:۰۰'); return; }
  const p = { day:ed.day, time:time.padStart(5, '0'), place:(ed.place || '').trim(), task:(ed.task || '').trim() };
  hvFocus.plans[p.day] = p;
  hvFocus.editor = null;
  render();
  // a changed time may ring again; pushed_on only guards the time it was sent for
  const { error } = await sb.from('hooshavar_focus_plan').upsert({ day:p.day, at_time:p.time, place:p.place, task:p.task, pushed_on:null }, { onConflict:'user_id,day' });
  if(error) writeFailed('hooshavar plan save', error);
}
function hvPlanDelete(){
  const day = hvFocus.editor.day;
  const old = hvFocus.plans[day];
  hvFocus.editor = null;
  if(!old){ render(); return; }
  delete hvFocus.plans[day];
  let undone = false;
  showUndoToast(`برنامهٔ ${day === hvToday() ? 'امروز' : 'فردا'} پاک شد`, () => { undone = true; hvFocus.plans[day] = old; render(); });
  setTimeout(async () => {
    if(undone) return;
    const { error } = await sb.from('hooshavar_focus_plan').delete().eq('day', day);
    if(error) writeFailed('hooshavar plan delete', error);
  }, 5200);
}

/* ---------- drawing ---------- */
function hvScale(onclickFor){
  return `<div class="grid grid-cols-6 gap-2">${Array.from({ length:11 }, (_, n) => `
    <button type="button" onclick="${onclickFor(n)}" class="aspect-square rounded-xl text-sm font-black border transition-all active:scale-95 bg-slate-900 text-slate-300 border-slate-800 hover:border-indigo-500/50">${fd(n)}</button>`).join('')}
  </div>
  <div class="flex justify-between text-[9px] font-bold text-slate-600 px-1"><span>۰ = آروم</span><span>۱۰ = خیلی زیاد</span></div>`;
}
function hvFocusDialog(){
  const f = hvFocus.flow;
  if(!f) return '';
  if(f.step === 'check') return renderDialog({
    title:'تمرکز ۲۵ دقیقه', onClose:'hvFocusClose()',
    body:`
      <p class="text-sm font-black text-white">موبایل رو بردی یه اتاق دیگه؟</p>
      <button type="button" onclick="hvFocus.flow.phoneAway=!hvFocus.flow.phoneAway; render()" aria-pressed="${f.phoneAway}"
        class="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${f.phoneAway ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}">
        <span class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${f.phoneAway ? 'bg-emerald-500 text-slate-950' : 'border-2 border-slate-700'}">${f.phoneAway ? fa('check', 'text-xs') : ''}</span>
        <span class="text-sm font-black ${f.phoneAway ? 'text-emerald-300' : 'text-white'} flex-1 text-right">آره، بردم</span>
        ${fa('mobile-screen', f.phoneAway ? 'text-emerald-400' : 'text-slate-600')}
      </button>`,
    footer: dlgPrimary('بعدی', "hvFocus.flow.step='before'; render()", f.phoneAway ? '' : 'disabled') + dlgSecondary('انصراف', 'hvFocusClose()'),
  });
  if(f.step === 'before') return renderDialog({
    title:'تمرکز ۲۵ دقیقه', onClose:'hvFocusClose()',
    body:`<p class="text-sm font-black text-white">الان اضطرابت چنده؟</p>${hvScale(n => `hvFocusStart(${n})`)}`,
  });
  if(f.step === 'run'){
    const s = hvRunning();
    if(!s){ hvFocus.flow = null; return ''; }
    return renderDialog({
      title:'تمرکز ۲۵ دقیقه', onClose:'hvFocusClose()',
      body:`
        ${s.task ? `<p class="text-xs font-bold text-slate-400 leading-relaxed" dir="auto">${esc(s.task)}</p>` : ''}
        <div class="text-center py-6"><span data-hv-clock class="text-6xl font-black text-white tabular-nums">${hvClockLeft(s)}</span></div>`,
      footer: dlgSecondary('متوقف کن', 'hvFocusFinish(hvRunning(), false)', 'style="flex:1"'),
    });
  }
  const s = hvFlowSession();
  if(f.step === 'after'){
    if(!s){ hvFocus.flow = null; return ''; }
    return renderDialog({
      title: s.completed ? '۲۵ دقیقه تموم شد.' : `${fd(s.minutes)} دقیقه هم حسابه.`, onClose:'hvFocusClose()',
      body:`<p class="text-sm font-black text-white">الان اضطرابت چنده؟</p>${hvScale(n => `hvFocusAfter(${n})`)}`,
    });
  }
  if(f.step === 'note') return renderDialog({
    title:'یادداشت', onClose:'hvFocusNote(false)',
    body:`
      <p class="text-sm font-black text-white">چی کمک کرد؟ چی مانع شد؟</p>
      <textarea id="hvNote" dir="auto" oninput="hvFocus.flow.note=this.value" class="${textareaCls()}">${esc(f.note || '')}</textarea>`,
    footer: dlgPrimary('ثبت', 'hvFocusNote(true)') + dlgSecondary('رد شو', 'hvFocusNote(false)'),
  });
  return '';
}
function hvPlanEditor(){
  const ed = hvFocus.editor;
  if(!ed) return '';
  return renderDialog({
    title:'برنامهٔ تمرکز', onClose:'hvPlanClose()',
    body:`
      ${segmented([[hvToday(), 'امروز'], [hvTomorrow(), 'فردا']], ed.day, d => `hvPlanPickDay('${d}')`)}
      <div class="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-300 leading-loose">
        <span>ساعت</span>
        <input id="hvPlanTime" type="time" value="${ea(ed.time)}" oninput="hvFocus.editor.time=this.value" class="${inputCls} !w-32 !p-3" dir="ltr">
        <span>، در</span>
        <input id="hvPlanPlace" type="text" dir="auto" value="${ea(ed.place)}" oninput="hvFocus.editor.place=this.value" class="${inputCls} !w-40 !p-3">
        <span>،</span>
        <input id="hvPlanTask" type="text" dir="auto" value="${ea(ed.task)}" oninput="hvFocus.editor.task=this.value" class="${inputCls} !p-3">
        <span>رو انجام می‌دم.</span>
      </div>
      <p class="text-[10px] font-bold text-slate-600 leading-relaxed">مثلاً: ساعت ۵ عصر، در اتاقم پشت میز، ۱۵ لغت جدید انگلیسی رو با جمله یاد می‌گیرم.</p>`,
    footer: dlgPrimary('ذخیره', 'hvPlanSave()') + (hvFocus.plans[ed.day] ? dlgSecondary('پاک کن', 'hvPlanDelete()') : dlgSecondary('انصراف', 'hvPlanClose()')),
  });
}

hooshavarRegister({
  id:'focus',
  order:2,
  async load(){
    const [plans, sessions] = await Promise.all([
      sb.from('hooshavar_focus_plan').select('*').order('day', { ascending:false }).limit(60),
      sb.from('hooshavar_focus_sessions').select('*').order('started_at', { ascending:false }).limit(400),
    ]);
    if(plans.error) throw plans.error;
    if(sessions.error) throw sessions.error;
    hvFocus.plans = {};
    plans.data.forEach(r => { hvFocus.plans[r.day] = { day:r.day, time:r.at_time, place:r.place, task:r.task }; });
    hvFocus.sessions = sessions.data.map(hvFocusFromRow);
    hvSyncTimer();
  },
  card(mob){
    const today = hvToday();
    const plan = hvFocus.plans[today];
    const next = hvFocus.plans[hvTomorrow()];
    const running = hvRunning();
    const pending = !running && hvPendingAfter();
    const todays = hvFocus.sessions.filter(s => s.day === today && s.endedAt);
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'} space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('stopwatch', 'text-indigo-500')} تمرکز ۲۵ دقیقه</h4>
          ${todays.length ? `<span class="text-[10px] font-black text-slate-500">امروز ${fd(todays.reduce((a, s) => a + (s.minutes || 0), 0))} دقیقه</span>` : ''}
        </div>
        <button type="button" onclick="hvPlanOpen('${today}')" class="w-full flex items-center gap-3 p-4 rounded-2xl border text-right transition-all bg-slate-900 border-slate-800 hover:border-slate-700">
          <span class="flex-1 min-w-0 text-sm font-black ${plan ? 'text-white' : 'text-slate-400'} leading-relaxed" dir="auto">${plan ? esc(hvSentence(plan)) : 'برنامهٔ امروزت چیه؟'}</span>
          ${fa(plan ? 'pen' : 'plus', 'text-[10px] text-slate-500 shrink-0')}
        </button>
        ${running ? `
          <button type="button" onclick="hvFocusOpen()" class="w-full flex items-center justify-between p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl">
            <span class="text-xs font-black text-indigo-300">${fa('hourglass-half', 'ml-1')} در جریانه</span>
            <span data-hv-clock class="text-2xl font-black text-white tabular-nums">${hvClockLeft(running)}</span>
          </button>`
        : pending ? `
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <p class="text-xs font-black text-white">${pending.completed ? '۲۵ دقیقه تموم شد.' : `${fd(pending.minutes)} دقیقه هم حسابه.`} الان اضطرابت چنده؟</p>
            ${hvScale(n => `hvFocus.flow={step:'after',sessionId:'${pending.id}'}; hvFocusAfter(${n})`)}
          </div>`
        : `<button type="button" onclick="hvFocusOpen()" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-900/40 transition-all">${fa('play', 'ml-1')} شروع</button>`}
        <button type="button" onclick="hvPlanOpen('${hvTomorrow()}')" class="w-full text-right text-[11px] font-bold ${next ? 'text-slate-400' : 'text-slate-600'} hover:text-slate-200 transition-colors" dir="auto">${next ? `فردا: ${esc(hvSentence(next))}` : `${fa('plus', 'ml-1 text-[9px]')} برنامهٔ فردا`}</button>
      </div>`;
  },
  overlay(){ return hvPlanEditor() + hvFocusDialog(); },
  summary(days){
    const done = hvFocus.sessions.filter(s => s.endedAt && s.minutes > 0 && days.includes(s.day));
    const avg = (vals, dec) => vals.length ? hvNum(vals.reduce((a, n) => a + n, 0) / vals.length, dec) : '—';
    // the delay is the day's first session against that day's plan
    const firsts = [...new Set(done.map(s => s.day))].map(d => done.filter(s => s.day === d).sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0]);
    return [
      `تمرکز ۲۵ دقیقه: ${fd(new Set(done.map(s => s.day)).size)} روز از ۷ — کل دقیقه‌ها: ${fd(done.reduce((a, s) => a + s.minutes, 0))}`,
      `میانگین اضطراب قبل: ${avg(done.map(s => s.before).filter(n => n != null), 1)} / بعد: ${avg(done.map(s => s.after).filter(n => n != null), 1)}`,
      `میانگین تأخیر شروع نسبت به برنامه: ${avg(firsts.map(s => s.delay).filter(n => n != null), 0)} دقیقه`,
    ];
  },
});
