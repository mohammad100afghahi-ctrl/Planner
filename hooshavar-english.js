/* ---------- هوشاور › ۱۰ دقیقه انگلیسی ----------
   Makes starting English small enough not to avoid. Right after لنگر صبح is
   finished a card asks «صبحونه خوردی؟ وقت ۱۰ دقیقه انگلیسیه.» (hv-morning-done
   event; the only link between the two files). «شروع» → 10-minute timer →
   «تموم شد. می‌خوای ادامه بدی؟» → «ادامه می‌دم» (20 more, can be stopped) or
   «همین کافیه» → optional «امروز چی کار کردی؟».

   Stopping inside the first 10 keeps the minutes done and makes the day «ناقص»
   unless another session that day finishes. Late or repeated sessions are fine;
   a missed day says nothing. After HV_EN_LAST_DAY the card only adds «هفته تموم
   شد» and everything keeps working.

   The timers are timestamps on the server, so they run with the app closed;
   send-push (hooshavar-english.ts) closes them and rings at the end. Table:
   hooshavar_english_sessions (hooshavar_english.sql). Remove: see hooshavar.js. */
const HV_EN_FIRST_MIN = 10;
const HV_EN_MORE_MIN = 20;
const HV_EN_LAST_DAY = '2026-11-12';
const HV_EN_DAY_START_H = 7; // as لنگر صبح: a session at 01:00 belongs to the day before
const HV_EN_PROMPT_KEY = 'medar-hv-english-prompt';
const HV_EN_TITLE = '۱۰ دقیقه انگلیسی';
const hvEn = {
  sessions:[],   // newest first
  flow:null,     // { step:'run'|'ask'|'note', sessionId, note }
  prompt:null,   // the day whose after-لنگر card is still due
};
try{ hvEn.prompt = localStorage.getItem(HV_EN_PROMPT_KEY); }catch(_e){}
function hvEnSetPrompt(day){
  hvEn.prompt = day;
  try{ day ? localStorage.setItem(HV_EN_PROMPT_KEY, day) : localStorage.removeItem(HV_EN_PROMPT_KEY); }catch(_e){}
}
document.addEventListener('hv-morning-done', e => hvEnSetPrompt(e.detail.day));

const hvEnFromRow = r => ({ id:r.id, day:r.day, startedAt:r.started_at, extendedAt:r.extended_at, endedAt:r.ended_at,
  minutes:r.minutes, completed:r.completed, decided:r.decided, note:r.note, noteDone:r.note_done });
const hvEnDay = () => dateKey(new Date(Date.now() - HV_EN_DAY_START_H * 3600_000));
const hvEnRunning = () => hvEn.sessions.find(s => !s.endedAt);
const hvEnById = id => hvEn.sessions.find(s => s.id === id);
// today's finished session still waiting for an answer — gone once the day ends
const hvEnPending = () => hvEn.sessions.find(s => s.endedAt && s.day === hvEnDay() && (!s.decided || !s.noteDone));
const hvEnDeadline = s => s.extendedAt
  ? Date.parse(s.extendedAt) + HV_EN_MORE_MIN * 60_000
  : Date.parse(s.startedAt) + HV_EN_FIRST_MIN * 60_000;
const hvEnNextStep = s => s.decided ? { step:'note', sessionId:s.id, note:'' } : { step:'ask', sessionId:s.id };

/* ---------- timer ---------- */
let hvEnTick = null;
function hvEnLeft(s){
  const left = Math.max(0, Math.ceil((hvEnDeadline(s) - Date.now()) / 1000));
  return fd(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
}
function hvEnSync(){
  const s = hvEnRunning();
  if(s && Date.now() >= hvEnDeadline(s)){ hvEnFinish(s, true); return; }
  if(s && !hvEnTick) hvEnTick = setInterval(() => {
    const cur = hvEnRunning();
    if(!cur){ clearInterval(hvEnTick); hvEnTick = null; return; }
    if(Date.now() >= hvEnDeadline(cur)){ hvEnFinish(cur, true); return; }
    // only the clock digits change each second; a full repaint would fight with typing elsewhere
    document.querySelectorAll('[data-hv-en-clock]').forEach(el => { el.textContent = hvEnLeft(cur); });
  }, 1000);
  if(!s && hvEnTick){ clearInterval(hvEnTick); hvEnTick = null; }
}

/* ---------- a session ---------- */
async function hvEnStart(){
  hvEnSetPrompt(null);
  const s = { id:crypto.randomUUID(), day:hvEnDay(), startedAt:new Date().toISOString(), extendedAt:null, endedAt:null,
    minutes:null, completed:false, decided:false, note:null, noteDone:false };
  hvEn.sessions.unshift(s);
  hvEn.flow = { step:'run', sessionId:s.id };
  render();
  hvEnSync();
  const { error } = await sb.from('hooshavar_english_sessions').insert({ id:s.id, day:s.day, started_at:s.startedAt });
  if(error) writeFailed('hooshavar english start', error);
}
// full = the timer ran out; otherwise «متوقف کن»
async function hvEnFinish(s, full){
  if(!s || s.endedAt) return;
  const deadline = hvEnDeadline(s);
  const end = full ? deadline : Math.min(Date.now(), deadline);
  const from = Date.parse(s.extendedAt || s.startedAt);
  const worked = Math.floor((end - from) / 60_000);
  s.endedAt = new Date(end).toISOString();
  if(s.extendedAt) s.minutes = HV_EN_FIRST_MIN + worked; // the first 10 stay complete however the rest goes
  else{
    s.minutes = worked;
    s.completed = !!full;
    s.decided = !full; // stopped early: nothing to continue, straight to the note
  }
  // a timer that ran out on an earlier day stays quiet
  hvEn.flow = s.day === hvEnDay() ? hvEnNextStep(s) : null;
  hvEnSync();
  render();
  // .is(ended_at, null): the server may already have closed it
  const { error } = await sb.from('hooshavar_english_sessions')
    .update({ ended_at:s.endedAt, minutes:s.minutes, completed:s.completed, decided:s.decided })
    .eq('id', s.id).is('ended_at', null);
  if(error) writeFailed('hooshavar english finish', error);
}
async function hvEnContinue(id){
  const s = hvEnById(id);
  if(!s) return;
  s.extendedAt = new Date().toISOString();
  s.endedAt = null;
  s.decided = true;
  hvEn.flow = { step:'run', sessionId:s.id };
  render();
  hvEnSync();
  const { error } = await sb.from('hooshavar_english_sessions').update({ extended_at:s.extendedAt, ended_at:null, decided:true }).eq('id', s.id);
  if(error) writeFailed('hooshavar english continue', error);
}
async function hvEnEnough(id){
  const s = hvEnById(id);
  if(!s) return;
  s.decided = true;
  hvEn.flow = hvEnNextStep(s);
  render();
  const { error } = await sb.from('hooshavar_english_sessions').update({ decided:true }).eq('id', s.id);
  if(error) writeFailed('hooshavar english decide', error);
}
async function hvEnNote(save){
  const s = hvEnById(hvEn.flow?.sessionId);
  const note = save ? (hvEn.flow.note || '').trim() : '';
  hvEn.flow = null;
  if(!s){ render(); return; }
  s.noteDone = true;
  if(note) s.note = note;
  render();
  const { error } = await sb.from('hooshavar_english_sessions').update({ note:note || null, note_done:true }).eq('id', s.id);
  if(error) writeFailed('hooshavar english note', error);
}
function hvEnOpen(){
  const s = hvEnRunning();
  const p = hvEnPending();
  hvEn.flow = s ? { step:'run', sessionId:s.id } : p ? hvEnNextStep(p) : null;
  render();
}
function hvEnClose(){ hvEn.flow = null; render(); }
function hvEnPromptClose(){ hvEnSetPrompt(null); render(); }

/* ---------- drawing ---------- */
const hvEnAskButtons = id => dlgPrimary('ادامه می‌دم', `hvEnContinue('${id}')`) + dlgSecondary('همین کافیه', `hvEnEnough('${id}')`);
function hvEnDialog(){
  const f = hvEn.flow;
  if(!f){
    if(hvEn.prompt !== hvEnDay() || hvEnRunning()) return '';
    return renderDialog({
      title:HV_EN_TITLE, onClose:'hvEnPromptClose()',
      body:`<p class="text-sm font-black text-white leading-relaxed">صبحونه خوردی؟ وقت ۱۰ دقیقه انگلیسیه.</p>`,
      footer: dlgPrimary('شروع', 'hvEnStart()') + dlgSecondary('بعداً', 'hvEnPromptClose()'),
    });
  }
  const s = hvEnById(f.sessionId);
  if(!s){ hvEn.flow = null; return ''; }
  if(f.step === 'run') return renderDialog({
    title:HV_EN_TITLE, onClose:'hvEnClose()',
    body:`<div class="text-center py-6"><span data-hv-en-clock class="text-6xl font-black text-white tabular-nums">${hvEnLeft(s)}</span></div>`,
    footer: dlgSecondary('متوقف کن', 'hvEnFinish(hvEnRunning(), false)', 'style="flex:1"'),
  });
  if(f.step === 'ask') return renderDialog({
    title:HV_EN_TITLE, onClose:'hvEnClose()',
    body:`<p class="text-sm font-black text-white">تموم شد. می‌خوای ادامه بدی؟</p>`,
    footer: hvEnAskButtons(s.id),
  });
  return renderDialog({
    title: s.completed ? HV_EN_TITLE : `${fd(s.minutes)} دقیقه هم حسابه.`, onClose:'hvEnNote(false)',
    body:`
      <p class="text-sm font-black text-white">امروز چی کار کردی؟</p>
      <textarea id="hvEnNote" dir="auto" oninput="hvEn.flow.note=this.value" class="${textareaCls()}">${esc(f.note || '')}</textarea>`,
    footer: dlgPrimary('ثبت', 'hvEnNote(true)') + dlgSecondary('رد شو', 'hvEnNote(false)'),
  });
}

hooshavarRegister({
  id:'english',
  order:2,
  async load(){
    const { data, error } = await sb.from('hooshavar_english_sessions').select('*').order('started_at', { ascending:false }).limit(400);
    if(error) throw error;
    hvEn.sessions = data.map(hvEnFromRow);
    // the server closed the timer that was on screen: on to the next question
    const open = hvEn.flow && hvEn.flow.step === 'run' && hvEnById(hvEn.flow.sessionId);
    if(open && open.endedAt) hvEn.flow = open.day === hvEnDay() ? hvEnNextStep(open) : null;
    hvEnSync();
  },
  card(mob){
    const today = hvEnDay();
    const ended = hvEn.sessions.filter(s => s.endedAt);
    const running = hvEnRunning();
    const pending = !running && hvEnPending();
    const todayMin = ended.filter(s => s.day === today).reduce((a, s) => a + (s.minutes || 0), 0);
    const cells = hvWeekDays(0).map(d => {
      const list = ended.filter(s => s.day === d);
      const [tone, text] = !list.length ? ['bg-slate-900 text-slate-600 border-slate-800', '—']
        : list.some(s => s.completed) ? ['bg-emerald-500/15 text-emerald-300 border-emerald-500/20', fd(list.reduce((a, s) => a + (s.minutes || 0), 0))]
        : ['bg-amber-500/10 text-amber-300 border-amber-500/20', 'ناقص'];
      return `
        <div class="flex flex-col items-center gap-1.5">
          <span class="text-[9px] font-black text-slate-600">${WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()][0]}</span>
          <span class="w-full h-10 rounded-xl border flex items-center justify-center text-[10px] font-black ${tone}">${text}</span>
        </div>`;
    }).join('');
    return `
      <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'} space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('stopwatch', 'text-indigo-500')} ${HV_EN_TITLE}</h4>
          ${todayMin ? `<span class="text-[10px] font-black text-slate-500">امروز ${fd(todayMin)} دقیقه</span>` : ''}
        </div>
        ${today > HV_EN_LAST_DAY ? `<p class="text-xs font-black text-slate-400">هفته تموم شد</p>` : ''}
        ${running ? `
          <button type="button" onclick="hvEnOpen()" class="w-full flex items-center justify-between p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl">
            <span class="text-xs font-black text-indigo-300">${fa('hourglass-half', 'ml-1')} در جریانه</span>
            <span data-hv-en-clock class="text-2xl font-black text-white tabular-nums">${hvEnLeft(running)}</span>
          </button>`
        : pending && !pending.decided ? `
          <div class="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <p class="text-xs font-black text-white">تموم شد. می‌خوای ادامه بدی؟</p>
            <div class="flex items-center gap-3">${hvEnAskButtons(pending.id)}</div>
          </div>`
        : pending ? `
          <button type="button" onclick="hvEnOpen()" class="w-full flex items-center justify-between gap-3 p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-right transition-all">
            <span class="text-sm font-black text-slate-400">امروز چی کار کردی؟</span>
            ${fa('pen', 'text-[10px] text-slate-500 shrink-0')}
          </button>`
        : `<button type="button" onclick="hvEnStart()" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-900/40 transition-all">${fa('play', 'ml-1')} شروع</button>`}
        <div class="grid grid-cols-7 gap-1.5">${cells}</div>
      </div>`;
  },
  overlay(){ return hvEnDialog(); },
  summary(days){
    const ended = hvEn.sessions.filter(s => s.endedAt && days.includes(s.day));
    const done = new Set(ended.filter(s => s.completed).map(s => s.day)).size;
    // one line per day with a session: the first start, the day's minutes, «ناقص», the text
    const daily = days.map(d => {
      const list = ended.filter(s => s.day === d).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
      if(!list.length) return null;
      const notes = list.map(s => (s.note || '').replace(/\s+/g, ' ').trim()).filter(Boolean).join('؛ ');
      return [
        WEEKDAYS_FA[new Date(d + 'T12:00:00').getDay()],
        `شروع ${hvClock(list[0].startedAt)}`,
        `${fd(list.reduce((a, s) => a + (s.minutes || 0), 0))} دقیقه`,
        ...(list.some(s => s.completed) ? [] : ['ناقص']),
        ...(notes ? [notes] : []),
      ].join(' — ');
    }).filter(Boolean);
    return [
      HV_EN_TITLE,
      `روزهای انجام‌شده: ${fd(done)} از ۷ — کل دقیقه‌ها: ${fd(ended.reduce((a, s) => a + (s.minutes || 0), 0))}`,
      ...daily,
    ];
  },
});
