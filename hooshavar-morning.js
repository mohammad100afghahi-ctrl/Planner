/* ---------- هوشاور › لنگر صبح ----------
   The first time the app comes to the front each day (the day starts at
   05:00), the whole app is replaced by two ticks — «صورتم رو شستم» and «یه
   چیزی خوردم» — until both are done. That first open is saved as the day's
   wake time. Table: hooshavar_morning (hooshavar_morning.sql).

   Today's row is also kept on the device (HV_MORNING_KEY), so the lock opens
   at once on the next launch, and works offline: whatever the server lacks is
   written again on the next load. Between 00:00 and 05:00 it is still last
   night: no lock and no wake time, whatever the day's state. Remove: see hooshavar.js. */
const HV_DAY_START_H = 5;
const HV_MORNING_KEY = 'medar-hv-morning-v1';
const hvMorning = { rows:{}, loaded:false, firstSeen:null }; // rows: day → { day, wokeAt, washedAt, ateAt, doneAt }

const hvMorningDay = () => dateKey(new Date(Date.now() - HV_DAY_START_H * 3600_000));
// an open (or a saved wake time) between midnight and 05:00 is not waking up
const hvNight = (t = Date.now()) => new Date(t).getHours() < HV_DAY_START_H;
const hvMorningFromRow = r => ({ day:r.day, wokeAt:r.woke_at, washedAt:r.washed_at, ateAt:r.ate_at, doneAt:r.done_at });
const hvMorningToRow = m => ({ day:m.day, woke_at:m.wokeAt, washed_at:m.washedAt || null, ate_at:m.ateAt || null, done_at:m.doneAt || null });
function hvMorningLocal(){
  let m = null;
  try{ m = JSON.parse(localStorage.getItem(HV_MORNING_KEY) || 'null'); }catch(_e){}
  return m && m.wokeAt && !hvNight(m.wokeAt) ? m : null;
}
function hvMorningKeep(m){ try{ localStorage.setItem(HV_MORNING_KEY, JSON.stringify(m)); }catch(_e){} }

// the moment the app was first in front of the user today — that is the wake time
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
// a desktop left open overnight: the lock comes up once 05:00 passes
setInterval(() => { if(appStarted && document.visibilityState === 'visible' && !hvMorning.rows[hvMorningDay()]) render(); }, 60_000);

async function hvMorningSave(m){
  hvMorning.rows[m.day] = m;
  hvMorningKeep(m);
  const { error } = await sb.from('hooshavar_morning').upsert(hvMorningToRow(m), { onConflict:'user_id,day' });
  if(error) console.error('hooshavar_morning save', error); // kept on the device; the next load writes it again
}

hooshavarRegister({
  id:'morning',
  order:1,
  async load(){
    const { data, error } = await sb.from('hooshavar_morning').select('*').order('day', { ascending:false }).limit(120);
    if(error) throw error;
    hvMorning.rows = {};
    data.forEach(r => { hvMorning.rows[r.day] = hvMorningFromRow(r); });
    hvMorning.loaded = true;
    // what this device saved while offline (or before the server answered)
    const local = hvMorningLocal();
    if(local && local.day){
      const srv = hvMorning.rows[local.day];
      const merged = srv ? {
        ...srv,
        wokeAt: local.wokeAt < srv.wokeAt ? local.wokeAt : srv.wokeAt,
        washedAt: srv.washedAt || local.washedAt, ateAt: srv.ateAt || local.ateAt, doneAt: srv.doneAt || local.doneAt,
      } : local;
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
    if(m && m.doneAt) return '';
    if(!m){
      m = { day, wokeAt:hvMorningSeen().at, washedAt:null, ateAt:null, doneAt:null };
      if(hvMorning.loaded) hvMorningSave(m);
      else{ hvMorning.rows[day] = m; hvMorningKeep(m); }
    }
    const item = (key, label, icon) => {
      const on = !!m[key];
      return `
        <button type="button" onclick="hvMorningTick('${key}')" aria-pressed="${on}"
          class="w-full flex items-center gap-4 p-5 rounded-2xl border transition-all active:scale-[0.98] ${on ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}">
          <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-emerald-500 text-slate-950' : 'border-2 border-slate-700'}">${on ? fa('check', 'text-sm') : ''}</span>
          <span class="text-sm font-black ${on ? 'text-emerald-300' : 'text-white'} flex-1 text-right">${label}</span>
          ${fa(icon, `text-lg ${on ? 'text-emerald-400' : 'text-slate-600'}`)}
        </button>`;
    };
    document.body.className = 'text-slate-100 bg-[#020617]';
    return `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">${fa('sun', 'text-lg')}</div>
            <div>
              <span class="text-lg font-black text-white tracking-tight">لنگر صبح</span>
              <p class="text-[10px] text-slate-500 font-medium">بیدار شدی ساعت ${hvClock(m.wokeAt)}</p>
            </div>
          </div>
          <p class="text-sm font-bold text-slate-300 leading-relaxed">اول این دو تا، بعد بقیهٔ روز.</p>
          <div class="space-y-3">${item('washedAt', 'صورتم رو شستم', 'droplet')}${item('ateAt', 'یه چیزی خوردم', 'mug-hot')}</div>
        </div>
      </div>`;
  },
  card(mob){
    const today = hvMorning.rows[hvMorningDay()];
    const days = hvWeekDays(0);
    const cells = days.map(d => {
      const r = hvMorning.rows[d];
      const future = d > hvMorningDay();
      return `
        <div class="flex flex-col items-center gap-1.5">
          <span class="text-[9px] font-black text-slate-600">${WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()][0]}</span>
          <span class="w-full h-10 rounded-xl flex items-center justify-center text-[10px] font-black ${r && r.doneAt ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : r ? 'bg-slate-900 text-slate-400 border border-slate-800' : future ? 'bg-slate-900/40 text-slate-700 border border-slate-800/50' : 'bg-slate-900 text-slate-600 border border-slate-800'}" title="${r ? 'بیدار ' + hvClock(r.wokeAt) : ''}">${r ? hvClock(r.wokeAt) : '—'}</span>
        </div>`;
    }).join('');
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'}">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('sun', 'text-emerald-500')} لنگر صبح</h4>
          ${today && today.doneAt ? `<span class="text-[10px] font-black text-emerald-400">${fa('check', 'ml-1')} امروز انجام شد · ${hvClock(today.doneAt)}</span>` : ''}
        </div>
        <p class="text-[10px] font-bold text-slate-500 mb-3">ساعت بیدار شدن این هفته</p>
        <div class="grid grid-cols-7 gap-1.5">${cells}</div>
      </div>`;
  },
  summary(days){
    const today = hvMorningDay();
    const past = days.filter(d => d <= today);
    if(!past.length) return [];
    const rows = past.map(d => hvMorning.rows[d]);
    return [
      'ساعت بیدار شدن:',
      ...past.map((d, i) => `${WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()]}: ${rows[i] ? hvClock(rows[i].wokeAt) : '—'}`),
      `لنگر صبح انجام‌شده: ${fd(rows.filter(r => r && r.doneAt).length)} از ${fd(past.length)} روز`,
    ];
  },
});

function hvMorningTick(key){
  const m = { ...hvMorning.rows[hvMorningDay()] };
  m[key] = m[key] ? null : new Date().toISOString(); // a second tap unticks
  m.doneAt = m.washedAt && m.ateAt ? new Date().toISOString() : null;
  hvMorningSave(m);
  render();
}
