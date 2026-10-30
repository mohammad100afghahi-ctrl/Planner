/* ---------- هوشاور › لنگر صبح ----------
   The first time the app comes to the front each day (the day starts at
   07:00) the whole app is replaced by «صبح بخیر. قبل از هر چیز این دو تا:» —
   «صورتم رو شستم» and «یه چیزی خوردم» — then «ساعت چند بیدار شدی؟» (may stay
   empty) and «قبل از این دو تا سراغ موبایل رفتی؟» (نه / یه کم / آره), and a
   closing line with «بریم سراغ روز». «امروز نشد، رد می‌شم» opens the app
   straight away. Answers are kept only when finished: closing the app half-way
   brings the lock back from the start. A day with no row is «باز نشد».
   Between 00:00 and 07:00 it is still last night: no lock, nothing saved.
   Table: hooshavar_morning (hooshavar_morning.sql).

   Today's row is also kept on the device (HV_MORNING_KEY), so the lock opens
   at once on the next launch and works offline; whatever the server lacks is
   written again on the next load. Remove: see hooshavar.js. */
const HV_DAY_START_H = 7;
const HV_MORNING_KEY = 'medar-hv-morning-v2';
const HV_PHONE = [['no', 'نه'], ['little', 'یه کم'], ['yes', 'آره']];
const hvMorning = {
  rows:{},       // day → { day, openedAt, washedAt, ateAt, wokeTime, phone, skipped, doneAt }
  loaded:false,
  firstSeen:null,
  flow:null,     // the lock in progress: { day, washedAt, ateAt, wake, end } — not saved until finished
};

const hvMorningDay = () => dateKey(new Date(Date.now() - HV_DAY_START_H * 3600_000));
// an open between midnight and 07:00 is not waking up
const hvNight = (t = Date.now()) => new Date(t).getHours() < HV_DAY_START_H;
const hvMorningFromRow = r => ({ day:r.day, openedAt:r.opened_at, washedAt:r.washed_at, ateAt:r.ate_at,
  wokeTime:r.woke_time, phone:r.phone, skipped:r.skipped, doneAt:r.done_at });
const hvMorningToRow = m => ({ day:m.day, opened_at:m.openedAt, washed_at:m.washedAt || null, ate_at:m.ateAt || null,
  woke_time:m.wokeTime || null, phone:m.phone || null, skipped:!!m.skipped, done_at:m.doneAt || null });
function hvMorningLocal(){
  let m = null;
  try{ m = JSON.parse(localStorage.getItem(HV_MORNING_KEY) || 'null'); }catch(_e){}
  return m && m.openedAt && !hvNight(m.openedAt) ? m : null;
}
function hvMorningKeep(m){ try{ localStorage.setItem(HV_MORNING_KEY, JSON.stringify(m)); }catch(_e){} }

// the moment the app was first in front of the user today — the open time
// (its day is worked out later: this file runs before index.html defines dateKey)
if(document.visibilityState === 'visible') hvMorning.firstSeen = { day:null, at:new Date().toISOString() };
function hvMorningSeen(){
  const day = hvMorningDay();
  const f = hvMorning.firstSeen;
  if(f && f.day === null) f.day = dateKey(new Date(Date.parse(f.at) - HV_DAY_START_H * 3600_000));
  if(!f || f.day !== day) hvMorning.firstSeen = { day, at:new Date().toISOString() };
  return hvMorning.firstSeen;
}
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible'){ hvMorningSeen(); if(appStarted) render(); } });
// a desktop left open overnight: the lock comes up once 07:00 passes
setInterval(() => { if(appStarted && document.visibilityState === 'visible' && !hvNight() && !hvMorning.rows[hvMorningDay()]) render(); }, 60_000);

async function hvMorningSave(m){
  hvMorning.rows[m.day] = m;
  hvMorningKeep(m);
  const { error } = await sb.from('hooshavar_morning').upsert(hvMorningToRow(m), { onConflict:'user_id,day' });
  if(error) console.error('hooshavar_morning save', error); // kept on the device; the next load writes it again
}
function hvMorningFlow(day){
  if(!hvMorning.flow || hvMorning.flow.day !== day) hvMorning.flow = { day, washedAt:null, ateAt:null, wake:'', end:null };
  return hvMorning.flow;
}

/* ---------- the lock's actions ---------- */
function hvMorningTick(key){
  const f = hvMorningFlow(hvMorningDay());
  f[key] = f[key] ? null : new Date().toISOString(); // a second tap unticks
  render();
}
function hvMorningAnswer(phone){
  const day = hvMorningDay();
  const f = hvMorningFlow(day);
  const wake = toEnDigits(f.wake || '').trim();
  hvMorningSave({ ...hvMorning.rows[day], washedAt:f.washedAt, ateAt:f.ateAt,
    wokeTime: /^([01]?\d|2[0-3]):[0-5]\d$/.test(wake) ? wake.padStart(5, '0') : null,
    phone, skipped:false, doneAt:new Date().toISOString() });
  f.end = phone;
  render();
}
function hvMorningSkip(){
  const day = hvMorningDay();
  hvMorningSave({ ...hvMorning.rows[day], washedAt:null, ateAt:null, wokeTime:null, phone:null, skipped:true, doneAt:new Date().toISOString() });
  hvMorning.flow = null;
  render();
}
function hvMorningClose(){ hvMorning.flow = null; render(); }

hooshavarRegister({
  id:'morning',
  order:1,
  async load(){
    const { data, error } = await sb.from('hooshavar_morning').select('*').order('day', { ascending:false }).limit(120);
    if(error) throw error;
    hvMorning.rows = {};
    data.forEach(r => {
      // an open saved between midnight and 07:00 is a leftover (an old app's copy sent again): drop it
      if(hvNight(r.opened_at)){
        sb.from('hooshavar_morning').delete().eq('day', r.day).then(({ error }) => { if(error) console.error('hooshavar_morning cleanup', error); });
        return;
      }
      hvMorning.rows[r.day] = hvMorningFromRow(r);
    });
    hvMorning.loaded = true;
    // what this device saved while offline (or before the server answered)
    const local = hvMorningLocal();
    if(local && local.day){
      const srv = hvMorning.rows[local.day];
      const merged = !srv ? local
        : srv.doneAt || !local.doneAt ? { ...srv, openedAt: local.openedAt < srv.openedAt ? local.openedAt : srv.openedAt }
        : { ...local, openedAt: local.openedAt < srv.openedAt ? local.openedAt : srv.openedAt };
      if(JSON.stringify(merged) !== JSON.stringify(srv)) await hvMorningSave(merged);
      else hvMorningKeep(merged);
    }
  },
  gate(){
    if(hvNight()) return '';
    const day = hvMorningDay();
    let m = hvMorning.rows[day];
    if(!m){
      const local = hvMorningLocal();
      if(local && local.day === day) m = hvMorning.rows[day] = local;
    }
    const f = hvMorning.flow && hvMorning.flow.day === day ? hvMorning.flow : null;
    if(m && m.doneAt && !(f && f.end)) return '';
    if(!m){
      m = { day, openedAt:hvMorningSeen().at, washedAt:null, ateAt:null, wokeTime:null, phone:null, skipped:false, doneAt:null };
      if(hvMorning.loaded) hvMorningSave(m);
      else{ hvMorning.rows[day] = m; hvMorningKeep(m); }
    }
    document.body.className = 'text-slate-100 bg-[#020617]';
    const frame = inner => `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">${fa('sun', 'text-lg')}</div>
            <span class="text-lg font-black text-white tracking-tight">لنگر صبح</span>
          </div>
          ${inner}
        </div>
      </div>`;

    if(f && f.end) return frame(`
      <p class="text-sm font-black text-white leading-relaxed">${f.end === 'no' ? 'لنگر امروز انداخته شد.' : 'ثبت شد. فردا دوباره.'}</p>
      <button type="button" onclick="hvMorningClose()" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-900/40 transition-all">بریم سراغ روز</button>`);

    const fl = hvMorningFlow(day);
    const item = (key, label, icon) => {
      const on = !!fl[key];
      return `
        <button type="button" onclick="hvMorningTick('${key}')" aria-pressed="${on}"
          class="w-full flex items-center gap-4 p-5 rounded-2xl border transition-all active:scale-[0.98] ${on ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}">
          <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-emerald-500 text-slate-950' : 'border-2 border-slate-700'}">${on ? fa('check', 'text-sm') : ''}</span>
          <span class="text-sm font-black ${on ? 'text-emerald-300' : 'text-white'} flex-1 text-right">${label}</span>
          ${fa(icon, `text-lg ${on ? 'text-emerald-400' : 'text-slate-600'}`)}
        </button>`;
    };
    const rest = fl.washedAt && fl.ateAt ? `
      <div class="space-y-2">
        <p class="text-sm font-black text-white">ساعت چند بیدار شدی؟</p>
        <input id="hvWake" type="time" dir="ltr" value="${ea(fl.wake)}" oninput="hvMorning.flow.wake=this.value" class="${inputCls}">
      </div>
      <div class="space-y-2">
        <p class="text-sm font-black text-white">قبل از این دو تا سراغ موبایل رفتی؟</p>
        <div class="grid grid-cols-3 gap-2">${HV_PHONE.map(([v, l]) => `<button type="button" onclick="hvMorningAnswer('${v}')" class="py-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-sm font-black text-slate-200 transition-all active:scale-95">${l}</button>`).join('')}</div>
      </div>` : '';
    return frame(`
      <p class="text-sm font-bold text-slate-300 leading-relaxed">صبح بخیر. قبل از هر چیز این دو تا:</p>
      <div class="space-y-3">${item('washedAt', 'صورتم رو شستم', 'droplet')}${item('ateAt', 'یه چیزی خوردم', 'mug-hot')}</div>
      ${rest}
      <button type="button" onclick="hvMorningSkip()" class="w-full pt-2 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors">امروز نشد، رد می‌شم</button>`);
  },
  card(mob){
    const today = hvMorningDay();
    const cells = hvWeekDays(0).map(d => {
      const r = hvMorning.rows[d];
      const future = d > today;
      const [tone, text] = !r || !r.doneAt ? [future || d === today ? 'bg-slate-900/40 text-slate-700 border-slate-800/50' : 'bg-slate-900 text-slate-600 border-slate-800', '—']
        : r.skipped ? ['bg-slate-900 text-slate-500 border-slate-800', 'رد']
        : r.phone === 'no' ? ['bg-emerald-500/15 text-emerald-300 border-emerald-500/20', r.wokeTime ? fd(r.wokeTime) : fa('check')]
        : ['bg-amber-500/10 text-amber-300 border-amber-500/20', r.wokeTime ? fd(r.wokeTime) : fa('check')];
      return `
        <div class="flex flex-col items-center gap-1.5">
          <span class="text-[9px] font-black text-slate-600">${WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()][0]}</span>
          <span class="w-full h-10 rounded-xl border flex items-center justify-center text-[10px] font-black ${tone}">${text}</span>
        </div>`;
    }).join('');
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'}">
        <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">${fa('sun', 'text-emerald-500')} لنگر صبح</h4>
        <div class="grid grid-cols-7 gap-1.5">${cells}</div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[9px] font-bold text-slate-500">
          <span><span class="inline-block w-2 h-2 rounded-full bg-emerald-500 ml-1"></span>بدون موبایل</span>
          <span><span class="inline-block w-2 h-2 rounded-full bg-amber-500 ml-1"></span>با موبایل</span>
          <span>عدد = ساعت بیداری</span>
        </div>
      </div>`;
  },
  summary(days){
    const rows = days.map(d => hvMorning.rows[d]).filter(r => r && r.doneAt);
    const done = rows.filter(r => !r.skipped);
    const n = v => fd(done.filter(r => r.phone === v).length);
    const wakes = done.map(r => r.wokeTime).filter(Boolean).map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; });
    const avg = wakes.length ? Math.round(wakes.reduce((a, x) => a + x, 0) / wakes.length) : null;
    return [
      `لنگر صبح: ${fd(done.length)} روز از ۷ (بدون موبایل: ${n('no')}، یه کم: ${n('little')}، با موبایل: ${n('yes')}، رد شده: ${fd(rows.length - done.length)})`,
      `میانگین ساعت بیداری: ${avg == null ? '—' : fd(`${Math.floor(avg / 60)}:${String(avg % 60).padStart(2, '0')}`)}`,
    ];
  },
});
