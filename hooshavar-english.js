/* ---------- هوشاور › یه تمرین انگلیسی ----------
   Starting English made so small there's nothing to fight, and done before
   Instagram and YouTube. (Replaced «۱۰ دقیقه انگلیسی» on 2026-11-14; its
   timer is gone, its sessions stay in hooshavar_english_sessions and still
   show in the summary of the weeks they belong to.)

   The card says «قبل از اینستا و یوتیوب: فقط یه تمرین انگلیسی. بعدش آزادی.»
   with «انجامش دادم». Right after لنگر صبح is finished the same card opens
   as a dialog (hv-morning-done event — the only link between the two files),
   with «بعداً», which closes it for the day. «انجامش دادم» saves the day at
   once, then asks «قبل از اینستا و یوتیوب انجامش دادی؟» (required to go on,
   but leaving there keeps the day with that answer empty), then minutes
   (1–120) and a short text, both skippable, then a closing line.

   A day runs 07:00 → 07:00, as لنگر صبح. Two in a day are both kept; the day
   counts once and its minutes add up. A missed yesterday puts «دیروز نشد…» on
   top of the card. send-push (hooshavar-english.ts) rings once a day at the
   time set on the card (default 16:30) unless the day is already done.
   Tables: hooshavar_english_logs, hooshavar_english_prefs (hooshavar_english.sql).
   Remove: see hooshavar.js. */
const HV_EN_START = '2026-11-14'; // a day before this was not part of this exercise: never «نشد»
const HV_EN_DAY_START_H = 7;
const HV_EN_PROMPT_KEY = 'medar-hv-english-prompt';
const HV_EN_TITLE = 'یه تمرین انگلیسی';
const HV_EN_TEXT = 'قبل از اینستا و یوتیوب: فقط یه تمرین انگلیسی. بعدش آزادی.';
const HV_EN_NOTIFY_DEFAULT = '16:30';
const hvEn = {
  logs:[],       // newest first
  old:[],        // «۱۰ دقیقه انگلیسی» sessions, for the summary only
  notifyAt:HV_EN_NOTIFY_DEFAULT,
  flow:null,     // { step:'phone'|'details'|'end', logId, minutes, note }
  prompt:null,   // the day whose after-لنگر dialog is still due
};
try{ hvEn.prompt = localStorage.getItem(HV_EN_PROMPT_KEY); }catch(_e){}
function hvEnSetPrompt(day){
  hvEn.prompt = day;
  try{ day ? localStorage.setItem(HV_EN_PROMPT_KEY, day) : localStorage.removeItem(HV_EN_PROMPT_KEY); }catch(_e){}
}
document.addEventListener('hv-morning-done', e => hvEnSetPrompt(e.detail.day));

const hvEnFromRow = r => ({ id:r.id, day:r.day, loggedAt:r.logged_at, before:r.before_phone, minutes:r.minutes, note:r.note });
const hvEnDay = () => dateKey(new Date(Date.now() - HV_EN_DAY_START_H * 3600_000));
const hvEnShift = (day, n) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return dateKey(d); };
const hvEnById = id => hvEn.logs.find(l => l.id === id);
const hvEnOn = day => hvEn.logs.filter(l => l.day === day);
const hvEnMissed = day => day >= HV_EN_START && !hvEnOn(day).length;
const hvEnSumMin = list => list.reduce((a, l) => a + (l.minutes || 0), 0);

/* ---------- a record ---------- */
async function hvEnDone(){
  hvEnSetPrompt(null);
  const l = { id:crypto.randomUUID(), day:hvEnDay(), loggedAt:new Date().toISOString(), before:null, minutes:null, note:null };
  hvEn.logs.unshift(l);
  hvEn.flow = { step:'phone', logId:l.id, minutes:'', note:'' };
  render();
  const { error } = await sb.from('hooshavar_english_logs').insert({ id:l.id, day:l.day, logged_at:l.loggedAt });
  if(error) writeFailed('hooshavar english log', error);
}
async function hvEnPhone(before){
  const l = hvEnById(hvEn.flow?.logId);
  if(!l) return hvEnClose();
  l.before = before;
  hvEn.flow.step = 'details';
  render();
  const { error } = await sb.from('hooshavar_english_logs').update({ before_phone:before }).eq('id', l.id);
  if(error) writeFailed('hooshavar english before', error);
}
async function hvEnDetails(save){
  const f = hvEn.flow;
  const l = hvEnById(f?.logId);
  if(!l) return hvEnClose();
  f.step = 'end';
  const min = parseInt(toEnDigits(String(f.minutes || '')).trim(), 10);
  const minutes = save && min >= 1 && min <= 120 ? min : null;
  const note = save ? (f.note || '').trim() || null : null;
  render();
  if(minutes == null && note == null) return;
  l.minutes = minutes;
  l.note = note;
  render();
  const { error } = await sb.from('hooshavar_english_logs').update({ minutes, note }).eq('id', l.id);
  if(error) writeFailed('hooshavar english details', error);
}
function hvEnClose(){ hvEn.flow = null; render(); }
function hvEnPromptClose(){ hvEnSetPrompt(null); render(); }
async function hvEnSetNotify(v){
  const t = toEnDigits(v || '').trim();
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t) || t === hvEn.notifyAt) return;
  hvEn.notifyAt = t;
  render();
  const { error } = await sb.from('hooshavar_english_prefs').upsert({ notify_at:t }, { onConflict:'user_id' });
  if(error) writeFailed('hooshavar english notify time', error);
}

/* ---------- drawing ---------- */
function hvEnDialog(){
  const f = hvEn.flow;
  if(!f){
    if(hvEn.prompt !== hvEnDay() || hvEnOn(hvEnDay()).length) return '';
    return renderDialog({
      title:HV_EN_TITLE, onClose:'hvEnPromptClose()',
      body:`<p class="text-sm font-black text-white leading-relaxed">${HV_EN_TEXT}</p>`,
      footer: dlgPrimary('انجامش دادم', 'hvEnDone()') + dlgSecondary('بعداً', 'hvEnPromptClose()'),
    });
  }
  const l = hvEnById(f.logId);
  if(!l){ hvEn.flow = null; return ''; }
  if(f.step === 'phone') return renderDialog({
    title:HV_EN_TITLE, onClose:'hvEnClose()',
    body:`
      <p class="text-sm font-black text-white">قبل از اینستا و یوتیوب انجامش دادی؟</p>
      <div class="space-y-2">
        <button type="button" onclick="hvEnPhone(true)" class="w-full p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-sm font-black text-white text-right transition-all active:scale-[0.98]">آره، قبلش</button>
        <button type="button" onclick="hvEnPhone(false)" class="w-full p-4 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-sm font-black text-white text-right transition-all active:scale-[0.98]">نه، اول رفتم سراغ گوشی</button>
      </div>`,
  });
  if(f.step === 'details') return renderDialog({
    title:HV_EN_TITLE, onClose:'hvEnDetails(false)',
    body:`
      <div class="space-y-2">
        <p class="text-sm font-black text-white">تقریباً چند دقیقه شد؟</p>
        <input id="hvEnMin" type="number" inputmode="numeric" min="1" max="120" dir="ltr" value="${ea(f.minutes)}" oninput="hvEn.flow.minutes=this.value" class="${inputCls}">
      </div>
      <div class="space-y-2">
        <p class="text-sm font-black text-white">چی کار کردی؟</p>
        <textarea id="hvEnNote" dir="auto" oninput="hvEn.flow.note=this.value" class="${textareaCls()}">${esc(f.note || '')}</textarea>
      </div>`,
    footer: dlgPrimary('ثبت', 'hvEnDetails(true)') + dlgSecondary('رد شو', 'hvEnDetails(false)'),
  });
  return renderDialog({
    title:HV_EN_TITLE, onClose:'hvEnClose()',
    body:`<p class="text-sm font-black text-white leading-relaxed">${l.before === false ? 'مهم اینه که برگشتی و انجامش دادی. ثبت شد.' : 'ثبت شد. امروز کارت رو کردی.'}</p>`,
    footer: dlgPrimary('باشه', 'hvEnClose()'),
  });
}

/* ---------- the summary of the old «۱۰ دقیقه انگلیسی», for the weeks it ran ---------- */
function hvEnOldSummary(days){
  const ended = hvEn.old.filter(s => s.ended_at && days.includes(s.day));
  if(!ended.length) return [];
  const daily = days.map(d => {
    const list = ended.filter(s => s.day === d).sort((a, b) => a.started_at.localeCompare(b.started_at));
    if(!list.length) return null;
    const notes = list.map(s => (s.note || '').replace(/\s+/g, ' ').trim()).filter(Boolean).join('؛ ');
    return [
      WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()],
      `شروع ${hvClock(list[0].started_at)}`,
      `${fd(list.reduce((a, s) => a + (s.minutes || 0), 0))} دقیقه`,
      ...(list.some(s => s.completed) ? [] : ['ناقص']),
      ...(notes ? [notes] : []),
    ].join(' — ');
  }).filter(Boolean);
  return [
    '۱۰ دقیقه انگلیسی',
    `روزهای انجام‌شده: ${fd(new Set(ended.filter(s => s.completed).map(s => s.day)).size)} از ۷ — کل دقیقه‌ها: ${fd(ended.reduce((a, s) => a + (s.minutes || 0), 0))}`,
    ...daily,
  ];
}

hooshavarRegister({
  id:'english',
  order:2,
  async load(){
    const [logs, prefs, old] = await Promise.all([
      sb.from('hooshavar_english_logs').select('*').order('logged_at', { ascending:false }).limit(800),
      sb.from('hooshavar_english_prefs').select('notify_at').maybeSingle(),
      sb.from('hooshavar_english_sessions').select('day, started_at, ended_at, minutes, completed, note').order('started_at', { ascending:false }).limit(400),
    ]);
    if(logs.error) throw logs.error;
    hvEn.logs = logs.data.map(hvEnFromRow);
    if(!prefs.error && prefs.data) hvEn.notifyAt = prefs.data.notify_at;
    if(!old.error) hvEn.old = old.data;
  },
  card(mob){
    const today = hvEnDay();
    const todays = hvEnOn(today);
    const yesterday = hvEnShift(today, -1);
    const cells = Array.from({ length:7 }, (_, i) => hvEnShift(today, i - 6)).map(d => {
      const done = hvEnOn(d).length > 0;
      const tone = done ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
        : d === today || d < HV_EN_START ? 'bg-slate-900/40 text-slate-700 border-slate-800/50'
        : 'bg-slate-900 text-slate-600 border-slate-800';
      return `
        <div class="flex flex-col items-center gap-1.5">
          <span class="text-[9px] font-black text-slate-600">${WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()][0]}</span>
          <span class="w-full h-10 rounded-xl border flex items-center justify-center text-[10px] font-black ${tone}">${done ? fa('check') : ''}</span>
        </div>`;
    }).join('');
    const todayMin = hvEnSumMin(todays);
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'} space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('language', 'text-indigo-500')} ${HV_EN_TITLE}</h4>
          ${todays.length ? `<span class="text-[10px] font-black text-emerald-400">${fa('check', 'ml-1')}امروز${todayMin ? ` ${fd(todayMin)} دقیقه` : ''}</span>` : ''}
        </div>
        ${!todays.length && hvEnMissed(yesterday) ? `<p class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs font-black text-amber-300">دیروز نشد. امروز فقط همون یه تمرین.</p>` : ''}
        <p class="text-sm font-black text-white leading-relaxed">${HV_EN_TEXT}</p>
        <button type="button" onclick="hvEnDone()" class="w-full py-4 ${todays.length ? 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'} rounded-2xl text-sm font-black transition-all">${fa('check', 'ml-1')} انجامش دادم</button>
        <div class="grid grid-cols-7 gap-1.5">${cells}</div>
        <label class="flex items-center justify-between gap-3 pt-1">
          <span class="text-[11px] font-bold text-slate-500">${fa('bell', 'ml-1')}اعلان روزانه</span>
          <input type="time" dir="ltr" value="${ea(hvEn.notifyAt)}" onchange="hvEnSetNotify(this.value)" class="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-slate-200 focus:outline-none focus:border-indigo-500/50">
        </label>
      </div>`;
  },
  overlay(){ return hvEnDialog(); },
  summary(days){
    const today = hvEnDay();
    const done = days.filter(d => hvEnOn(d).length);
    // a day's before/after is its first answered record: a second one later can't make it «قبلش»
    const answer = d => { const l = hvEnOn(d).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)).find(x => x.before != null); return l ? l.before : null; };
    const before = done.filter(d => answer(d) === true);
    // runs of 2+ missed days in a row, counting only days that are over
    let runs = 0, streak = 0;
    days.forEach(d => {
      if(d < today && hvEnMissed(d)){ streak++; if(streak === 2) runs++; }
      else streak = 0;
    });
    const daily = done.map(d => {
      const list = hvEnOn(d).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
      const min = list.some(l => l.minutes) ? `${fd(hvEnSumMin(list))} دقیقه` : 'دقیقه ثبت نشد';
      const ph = answer(d) === true ? 'قبل از گوشی' : answer(d) === false ? 'بعد از گوشی' : 'قبل/بعد جواب داده نشد';
      const notes = list.map(l => (l.note || '').replace(/\s+/g, ' ').trim()).filter(Boolean).join('؛ ');
      return [WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()], `ساعت ${hvClock(list[0].loggedAt)}`, min, ph, ...(notes ? [notes] : [])].join(' — ');
    });
    const lines = done.length || days.some(d => d >= HV_EN_START) ? [
      `${HV_EN_TITLE}: ${fd(done.length)} روز از ۷`,
      `قبل از اینستا و یوتیوب: ${fd(before.length)} از ${fd(done.length)}`,
      `دو روز پشت سر هم نشده: ${fd(runs)} بار`,
      `کل دقیقه‌ها: ${fd(done.reduce((a, d) => a + hvEnSumMin(hvEnOn(d)), 0))}`,
      ...daily,
    ] : [];
    const old = hvEnOldSummary(days);
    return lines.length && old.length ? [...lines, '', ...old] : [...lines, ...old];
  },
});
