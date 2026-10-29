/* ---------- هوشاور ----------
   Practice exercises from the counsellor, most of them meant for a few weeks
   only. Each exercise is a self-contained file (hooshavar-*.js) with its own
   tables (hooshavar_*.sql) that registers itself here; this file only draws
   the tab and gathers what the exercises give it. The rest of the app knows
   nothing about any one exercise — it calls the hooks at the bottom
   (hooshavarLoad, hooshavarGate, hooshavarOverlays, the two page renders).

   To remove an exercise: delete its file, its <script> line in index.html and
   its entry in sw.js, then run the «حذف تمرین» lines at the top of its .sql.
   Nothing else refers to it.

   An exercise is { id, order, load(), gate(), card(mob), overlay(), summary(days) }:
     load()        async — fetch its own data (called on boot and whenever the app comes back)
     gate()        optional — html that replaces the whole app while it returns one
     card(mob)     its card on the هوشاور page
     overlay()     optional — its open dialog, if any
     summary(days) optional — lines for «خلاصهٔ هفته»; days = the week's date keys, شنبه → جمعه */
const HOOSHAVAR = [];
function hooshavarRegister(ex){
  HOOSHAVAR.push(ex);
  HOOSHAVAR.sort((a, b) => (a.order || 0) - (b.order || 0));
}

const hvState = { weekOffset:0 };
// numbers in the copied text: Persian digits, one decimal with «٫»
const hvNum = (n, dec = 0) => fd(dec ? (Math.round(n * 10) / 10).toString().replace('.', '٫') : Math.round(n));
// HH:MM from a timestamp, in Persian digits
function hvClock(ts){
  if(!ts) return '';
  const d = new Date(ts);
  return fd(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
}
// the Saturday that starts the week `offset` weeks from this one
function hvWeekDays(offset){
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - (d.getDay() + 1) % 7 + offset * 7);
  return Array.from({ length:7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return dateKey(x); });
}

/* ---------- خلاصهٔ هفته ---------- */
function hvSummaryText(days){
  const lines = [`خلاصهٔ هفته — ${jDate(days[0])} تا ${jDate(days[6], true)}`];
  HOOSHAVAR.forEach(ex => {
    const part = ex.summary ? ex.summary(days) : [];
    if(part.length) lines.push('', ...part);
  });
  return lines.join('\n');
}
async function hvCopySummary(){
  const text = hvSummaryText(hvWeekDays(hvState.weekOffset));
  try{
    await navigator.clipboard.writeText(text);
  }catch(_e){
    // older Android WebViews: copy through a selected textarea
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(_e2){}
    ta.remove();
  }
  showInfoToast('خلاصه کپی شد');
}
function hvShiftWeek(n){ hvState.weekOffset = Math.min(0, hvState.weekOffset + n); render(); }
function hvSummaryCard(mob){
  const days = hvWeekDays(hvState.weekOffset);
  const text = hvSummaryText(days);
  const nav = (ic, n, label, off) => `<button type="button" onclick="hvShiftWeek(${n})" aria-label="${label}" ${off ? 'disabled' : ''} class="w-9 h-9 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800 disabled:opacity-30">${fa(ic, 'text-xs')}</button>`;
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'}">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('clipboard-list', 'text-indigo-500')} خلاصهٔ هفته</h4>
        <div class="flex items-center gap-2">${nav('chevron-right', -1, 'هفتهٔ قبل', false)}${nav('chevron-left', 1, 'هفتهٔ بعد', hvState.weekOffset >= 0)}</div>
      </div>
      <pre dir="rtl" class="whitespace-pre-wrap font-[inherit] bg-slate-900 border border-slate-800 rounded-2xl p-4 ${mob ? 'text-[11px]' : 'text-xs'} text-slate-300 leading-relaxed">${esc(text)}</pre>
      <button type="button" onclick="hvCopySummary()" class="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all">${fa('copy', 'ml-1')} کپی برای مرور هفتگی</button>
    </div>`;
}

/* ---------- the page ---------- */
const hvEmpty = () => `<div class="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-8 text-center text-xs font-bold text-slate-500">فعلاً تمرینی از مشاور اینجا نیست.</div>`;
function renderHooshavarDesktop(){
  const cards = HOOSHAVAR.map(ex => ex.card(false)).join('');
  return deskMain({
    header: deskHeader({ icon:'seedling', iconBox:'bg-emerald-600/10 text-emerald-400', title:'هوشاور', sub:'تمرین‌های مشاور' }),
    body: HOOSHAVAR.length ? `
      <div class="grid grid-cols-12 gap-8">
        <div class="col-span-7 space-y-6">${cards}</div>
        <div class="col-span-5">${hvSummaryCard(false)}</div>
      </div>` : hvEmpty(),
  });
}
function renderHooshavarMobile(){
  return `
    ${mobHeader(mobTitle('هوشاور'))}
    <main class="safe-area-bottom p-4 space-y-4">
      ${renderStatusBars()}
      ${HOOSHAVAR.length ? HOOSHAVAR.map(ex => ex.card(true)).join('') + hvSummaryCard(true) : hvEmpty()}
    </main>`;
}

/* ---------- hooks the app calls ---------- */
async function hooshavarLoad(){
  await Promise.all(HOOSHAVAR.map(ex => Promise.resolve().then(() => ex.load()).catch(e => console.error('hooshavar load', ex.id, e))));
  if(appStarted) render();
}
function hooshavarGate(){
  for(const ex of HOOSHAVAR){
    const html = ex.gate && ex.gate();
    if(html) return html;
  }
  return '';
}
const hooshavarOverlays = () => HOOSHAVAR.map(ex => ex.overlay ? ex.overlay() : '').join('');
// a PWA can stay open for days: fresh data whenever it comes back to the front
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible' && appBooted) hooshavarLoad(); });
