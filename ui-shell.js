/* ---------- مدار UI: shell ----------
   The interface follows the approved UX Pilot screens (Tailwind + Font Awesome,
   classes copied from the exported HTML). Desktop (≥1200px — the design is drawn at 1440 and gets cramped below) and phone are two
   separate layouts, each built from its own reference, so every view renders
   the markup of the layout that is on screen; crossing the breakpoint repaints.
   The data and every write stay in index.html — these files only draw. */
const UI_DESKTOP_MQ = window.matchMedia('(min-width: 1200px)');
const isDesk = () => UI_DESKTOP_MQ.matches;
UI_DESKTOP_MQ.addEventListener('change', () => { if(appStarted) render(); });

const fa = (name, cls = '') => `<i class="fa-solid fa-${name} ${cls}"></i>`;
const fd = s => toFaDigits(s);
const esc = s => escapeHtml(s == null ? '' : String(s));
const ea = s => escapeAttr(s == null ? '' : String(s));
/* Tag colours are the user's own hex values, so tag chips take them inline at
   the same strengths the reference uses for its palette chips (text / 10–20% fill). */
function tagTint(color, fill = '1a', line = '1a'){
  const c = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#6366f1';
  return `color:${c};background-color:${c}${fill};border-color:${c}${line}`;
}
const tagById = id => state.tags.find(t => t.id === id);
const PRIORITY_TEXT = { high:'text-rose-500', medium:'text-amber-500', low:'text-slate-500' };
function jDate(key, withYear){
  if(!key) return '';
  const d = new Date(String(key).length <= 10 ? key + 'T00:00:00' : key);
  const j = window.jalaali.toJalaali(d);
  return `${fd(j.jd)} ${MONTHS_JALALI[j.jm - 1]}${withYear ? ' ' + fd(j.jy) : ''}`;
}
const fmtMin = m => `${fd(m || 0)} دقیقه`;

/* ---------- navigation ---------- */
const NAV_GROUPS = [
  { label:'برنامه‌ریزی', items:[['today','امروز','calendar-day'], ['tasks','تسک‌ها','list-check'], ['calendar','تقویم جلالی','calendar-days'], ['english','انگلیسی','language']] },
  { label:'محتوا', items:[['ideas','ایده‌ها','lightbulb'], ['prompts','پرامپت‌ها','terminal']] },
  { label:'مالی', items:[['purchases','خریدها','cart-shopping'], ['subscriptions','اشتراک‌ها','credit-card']] },
  { label:'شخصی', items:[['wins','تونستم','trophy'], ['mother','مادر','heart'], ['repairs','تعمیرات','hammer']] },
  { label:'سیستم', items:[['settings','تنظیمات','gear'], ['archive','آرشیو','box-archive'], ['ai-reports','گزارش هوشمند','wand-magic-sparkles']] },
];
// the active item's colours and icon tint, exactly as each reference page draws its own entry
const NAV_ACTIVE = {
  english:['bg-amber-500/10 text-amber-400 border-amber-500/20', ''],
  mother:['bg-rose-500/10 text-rose-400 border-rose-500/20', 'text-rose-500'],
};
const NAV_ICON_TINT = new Set(['tasks','calendar','ideas','prompts','subscriptions','wins','archive','ai-reports']);
let resetScrollOnRender = false;
function navigateTo(view){
  if(state.view !== view) resetScrollOnRender = true;
  state.moreMenuOpen = false;
  if(!isDesk() && state.view !== view) window.scrollTo(0, 0);
  setView(view);
}
function navBadge(id){
  if(id === 'ai-reports'){
    const waiting = state.aiReports.reduce((n, r) => n + reviewPending(r).length, 0);
    if(waiting || state.aiReports.some(r => !r.seenAt)) return `<span class="mr-auto w-2 h-2 bg-indigo-500 rounded-full" title="گزارش یا پیشنهاد تازه"></span>`;
  }
  if(id === 'settings' && backupOverdue()) return `<span class="mr-auto w-2 h-2 bg-rose-500 rounded-full" title="مدتیه پشتیبان دانلود نکردی"></span>`;
  return '';
}
function renderSidebar(){
  return `
    <aside id="sidebar" class="w-64 bg-slate-950 border-l border-slate-800 flex flex-col h-full z-20 shrink-0">
      <div class="p-6 overflow-y-auto custom-scrollbar flex-1">
        <div class="flex items-center gap-3 mb-8 px-2">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">${fa('circle-notch', 'text-xl')}</div>
          <span class="text-2xl font-black text-white tracking-tight">مَدار</span>
        </div>
        <nav class="space-y-6">
          ${NAV_GROUPS.map(g => `
            <div>
              <p class="text-[10px] font-black text-slate-600 mb-3 px-4 uppercase tracking-widest">${g.label}</p>
              <div class="space-y-1">
                ${g.items.map(([id, label, ic]) => {
                  const on = state.view === id;
                  const [act, tint] = NAV_ACTIVE[id] || ['bg-indigo-500/10 text-indigo-400 border-indigo-500/20', NAV_ICON_TINT.has(id) ? 'text-indigo-500' : ''];
                  return `<button type="button" onclick="navigateTo('${id}')" ${on ? 'aria-current="page"' : ''}
                    class="w-full flex items-center gap-3 px-4 py-2 ${on ? `${act} rounded-xl font-bold transition-all border` : 'text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl transition-all'}">
                    ${fa(ic, `w-5 text-center ${on ? tint : ''}`)}
                    <span class="text-sm">${label}</span>${navBadge(id)}
                  </button>`;
                }).join('')}
              </div>
            </div>`).join('')}
        </nav>
      </div>
      ${state.view === 'calendar' ? renderCalendarSidebarFooter() : ''}
    </aside>`;
}
const MOBILE_TABS = [['today','امروز','calendar-day'], ['tasks','تسک‌ها','list-check'], ['calendar','تقویم','calendar-days'], ['ai-reports','گزارش','wand-magic-sparkles']];
function renderMobileNav(){
  const inTabs = MOBILE_TABS.some(([id]) => id === state.view);
  const tab = (id, label, ic, on, click) => `
    <button type="button" onclick="${click}" class="flex flex-col items-center gap-1 ${on ? 'active-tab' : 'text-slate-500'}" ${on ? 'aria-current="page"' : ''}>
      ${fa(ic, 'text-lg')}
      <span class="text-[9px] ${on ? 'font-black' : 'font-bold'}">${label}</span>
    </button>`;
  return `
    <nav class="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50 pb-safe z-50">
      <div class="flex items-center justify-around h-20 px-2">
        ${MOBILE_TABS.map(([id, label, ic]) => tab(id, label, ic, state.view === id && !state.moreMenuOpen, `navigateTo('${id}')`)).join('')}
        ${tab('more', 'بیشتر', 'ellipsis', !inTabs || state.moreMenuOpen, 'toggleMoreMenu()')}
      </div>
    </nav>`;
}
function toggleMoreMenu(){ state.moreMenuOpen = !state.moreMenuOpen; render(); }
/* «بیشتر» has no screen of its own in the reference; it opens the same groups
   as the desktop sidebar, as a sheet above the bar. */
function renderMoreMenu(){
  return `
    <div class="modal-overlay fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" onclick="if(event.target===this) toggleMoreMenu()">
      <div class="absolute inset-x-0 bottom-20 bg-slate-950 border-t border-slate-800 rounded-t-3xl p-5 max-h-[75vh] overflow-y-auto no-scrollbar">
        ${NAV_GROUPS.map(g => `
          <p class="text-[10px] font-black text-slate-600 mb-3 mt-1 px-1 uppercase tracking-widest">${g.label}</p>
          <div class="grid grid-cols-3 gap-2 mb-5">
            ${g.items.map(([id, label, ic]) => `
              <button type="button" onclick="navigateTo('${id}')" class="relative flex flex-col items-center gap-2 p-3 rounded-2xl border ${state.view === id ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-900 text-slate-400 border-slate-800'}">
                ${fa(ic, 'text-lg')}<span class="text-[10px] font-black">${label}</span>
                ${navBadge(id) ? `<span class="absolute top-2 left-2 w-2 h-2 rounded-full ${id === 'settings' ? 'bg-rose-500' : 'bg-indigo-500'}"></span>` : ''}
              </button>`).join('')}
          </div>`).join('')}
      </div>
    </div>`;
}

/* ---------- page frames ---------- */
function initialOf(email){ return esc(((email || '?').trim()[0] || '?').toUpperCase()); }
// the reference header's profile block, with the signed-in account instead of a stock person
function deskProfile(sub){
  const email = state.userEmail || '';
  return `
    <div class="flex items-center gap-3 pr-6 border-r border-slate-800">
      <div class="text-right leading-tight">
        <p class="text-xs font-bold text-white max-w-[180px] truncate" dir="ltr" title="${ea(email)}">${esc(email || 'حساب شما')}</p>
        <p class="text-[10px] text-slate-500">${sub || ''}</p>
      </div>
      <div class="w-10 h-10 rounded-xl ring-2 ring-slate-800 bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-sm font-black" aria-hidden="true">${initialOf(email)}</div>
    </div>`;
}
function deskHeader({ icon, iconBox, title, sub, right = '', profile }){
  return `
    <header id="header" class="h-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
      <div class="flex items-center gap-4">
        ${icon ? `<div class="w-12 h-12 ${iconBox || 'bg-indigo-600/10 text-indigo-400'} rounded-2xl flex items-center justify-center">${fa(icon, 'text-xl')}</div>` : ''}
        <div>
          <h1 class="text-xl font-black text-white tracking-tight">${title}</h1>
          ${sub ? `<p class="text-xs text-slate-500 font-medium">${sub}</p>` : ''}
        </div>
      </div>
      <div class="flex items-center gap-6">${right}${profile === false ? '' : deskProfile(profile)}</div>
    </header>`;
}
function deskMain({ header, body, fab = '' }){
  return `
    <main class="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/30">
      ${header}
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar" data-scroll="main">
        ${renderStatusBars()}
        ${body}
      </div>
      ${fab}
    </main>`;
}
const FAB_TONES = {
  indigo:'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/60',
  amber:'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/60',
  rose:'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/60',
};
function deskFab(onclick, tone = 'indigo', label = 'افزودن'){
  return `<button type="button" onclick="${onclick}" aria-label="${label}" class="fixed bottom-10 left-10 w-14 h-14 ${FAB_TONES[tone]} rounded-2xl shadow-2xl flex items-center justify-center transition-all transform hover:-translate-y-1 active:scale-95 group z-50">${fa('plus', 'text-xl transition-transform group-hover:rotate-90')}</button>`;
}
function mobFab(onclick, label = 'افزودن'){
  return `<button type="button" onclick="${onclick}" aria-label="${label}" class="fixed bottom-24 left-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-950/80 flex items-center justify-center z-50 active:scale-90 transition-transform">${fa('plus', 'text-xl')}</button>`;
}
function mobHeader(left, right = '', cls = 'px-4 py-4 flex items-center justify-between'){
  return `<header id="header" class="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 ${cls}">${left}${right}</header>`;
}
const mobTitle = (title, pill = '') => `<div class="flex items-center gap-3"><h1 class="text-lg font-black text-white">${title}</h1>${pill}</div>`;
const mobIconBtn = (ic, onclick, label, tone = 'plain') => tone === 'primary'
  ? `<button type="button" onclick="${onclick}" aria-label="${label}" class="w-9 h-9 flex items-center justify-center text-white bg-indigo-600 rounded-lg shadow-lg shadow-indigo-900/20">${fa(ic, 'text-xs')}</button>`
  : `<button type="button" onclick="${onclick}" aria-label="${label}" class="w-9 h-9 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">${fa(ic, 'text-xs')}</button>`;

/* offline, load failure and هوشواره outage: shown on every page, above its content */
function renderStatusBars(){
  let out = '';
  const pending = outbox.length, offline = isOfflineNow();
  if(offline || pending || usingLocalCopy){
    const count = pending ? ` · ${fd(pending)} تغییر در صف` : '';
    const text = offline ? `آفلاینی — تغییراتت روی گوشی نگه داشته می‌شن و با وصل شدن اینترنت ذخیره می‌شن${count}`
      : pending ? `در حال همگام‌سازی${count}…` : 'داری نسخه‌ی ذخیره‌شده روی دستگاه رو می‌بینی — در حال گرفتن تازه‌ترین داده‌ها…';
    out += `<div class="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3 text-[11px] font-bold text-amber-400" role="status"><span class="w-2 h-2 bg-amber-500 rounded-full ${offline ? '' : 'animate-pulse'} shrink-0"></span><span>${text}</span></div>`;
  }
  if(loadError) out += `<div class="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-[11px] font-bold text-rose-400" role="alert">اتصال به دیتابیس برقرار نشد — اینترنتت رو چک کن و صفحه رو رفرش کن.</div>`;
  return out;
}
function renderAIHealthBanner({ dismissible = true } = {}){
  const h = aiHealthProblem();
  if(!h) return '';
  if(dismissible){
    let dismissed = null;
    try{ dismissed = localStorage.getItem(AI_HEALTH_DISMISS_KEY); }catch(_e){}
    if(dismissed === h.errorAt) return '';
  }
  return `
    <div class="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden" role="alert">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shrink-0">${fa('triangle-exclamation', 'text-xl')}</div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-black text-white mb-1">هوشواره متوقف شده</h3>
          <p class="text-xs text-slate-400 leading-relaxed">${esc(h.errorMessage || '')}</p>
          <p class="text-[10px] text-slate-500 mt-2">مرور هفتگی و جمله‌ی روزانه تا اون موقع متوقفن.</p>
        </div>
        ${dismissible ? `<button type="button" onclick="dismissAIHealth()" aria-label="بستن" class="text-slate-500 hover:text-white transition-colors">${fa('xmark')}</button>` : ''}
      </div>
    </div>`;
}

/* ---------- forms: shared atoms from the task editor reference ---------- */
const fieldLabel = text => `<label class="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">${text}</label>`;
const inputCls = 'w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-600';
const titleInputCls = () => isDesk()
  ? 'w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-lg font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all'
  : 'w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all';
const textareaCls = () => `w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 ${isDesk() ? 'text-xs' : 'text-[11px]'} text-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all min-h-[100px] resize-none leading-relaxed`;
const PRIORITY_SEG_ON = {
  desk:{ high:'bg-rose-500/20 text-rose-500 border border-rose-500/20', medium:'bg-amber-500/20 text-amber-500 border border-amber-500/20', low:'bg-slate-700/40 text-slate-300 border border-slate-600/40' },
  mob:{ high:'bg-rose-500 text-white shadow-lg shadow-rose-900/20', medium:'bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/20', low:'bg-slate-700 text-white' },
};
const GRID_COLS = { 2:'grid-cols-2', 3:'grid-cols-3', 4:'grid-cols-4' };
/* three-way priority picker; `fn` is the handler name, called with the level */
function prioritySeg(current, fn, levels = ['high','medium','low'], labels = PRIORITY_LABEL){
  const d = isDesk();
  return `
    <div class="grid ${GRID_COLS[levels.length]} gap-1 p-1 bg-slate-900 border border-slate-800 ${d ? 'rounded-2xl' : 'rounded-xl'}">
      ${levels.map((lv, i) => `<button type="button" onclick="${fn}('${lv}')" class="py-2 ${d ? 'text-[10px] rounded-xl' : 'text-[9px] rounded-lg'} font-black ${current === lv ? PRIORITY_SEG_ON[d ? 'desk' : 'mob'][['high','medium','low'][i] || 'medium'] : 'text-slate-500 hover:bg-slate-800 transition-colors'}">${labels[lv]}</button>`).join('')}
    </div>`;
}
// one choice among several (cycle, kind, room…): the tag-chip look from the editor
function choiceChip(label, on, onclick, extra = ''){
  return `<button type="button" onclick="${onclick}" ${extra} class="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${on ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/10' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'}">${label}</button>`;
}
const chipBox = inner => `<div class="flex flex-wrap gap-1.5 p-3 bg-slate-900 border border-slate-800 rounded-2xl min-h-[50px]">${inner}</div>`;
function switchBtn(on, onclick, label, tone = 'indigo'){
  const onCls = tone === 'rose' ? 'switch-on-rose' : 'switch-on';
  return `<button type="button" role="switch" aria-checked="${!!on}" aria-label="${label}" onclick="${onclick}" class="w-10 h-5 ${on ? onCls : 'switch-off'} rounded-full relative transition-colors shrink-0"><span class="absolute ${on ? 'left-1 bg-white' : 'right-1 bg-slate-400'} top-1 w-3 h-3 rounded-full"></span></button>`;
}
// a labelled on/off row, the way the settings reference lays out each notification switch
function toggleRow(title, sub, on, onclick, tone){
  return `
    <div class="flex items-center justify-between gap-4">
      <div><p class="text-sm font-black text-slate-200">${title}</p>${sub ? `<p class="text-[10px] text-slate-600">${sub}</p>` : ''}</div>
      ${switchBtn(on, onclick, sub || '', tone)}
    </div>`;
}
// one of a few options, drawn like the editor's priority picker in the neutral accent
function segmented(options, current, onclickFor){
  const d = isDesk();
  return `
    <div class="grid ${GRID_COLS[options.length] || 'grid-cols-4'} gap-1 p-1 bg-slate-900 border border-slate-800 ${d ? 'rounded-2xl' : 'rounded-xl'}">
      ${options.map(([v, l]) => `<button type="button" onclick="${onclickFor(v)}" class="py-2 ${d ? 'text-[10px] rounded-xl' : 'text-[9px] rounded-lg'} font-black ${current === v ? (d ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20') : 'text-slate-500 hover:bg-slate-800 transition-colors'}">${l}</button>`).join('')}
    </div>`;
}
function weekdayBtns(selected, onclickFor, tone = 'indigo', size = 'w-8 h-8'){
  const on = { indigo:'bg-indigo-600 text-white', amber:'bg-amber-500 text-slate-950', rose:'bg-rose-500 text-white' }[tone];
  return WEEKDAY_DISPLAY_ORDER.map(d => `<button type="button" onclick="${onclickFor(d)}" title="${WEEKDAYS_FA[d]}" aria-pressed="${selected.includes(d)}"
    class="${size} flex items-center justify-center rounded-lg text-[10px] font-black transition-all ${selected.includes(d) ? on : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}">${WEEKDAYS_FA[d][0]}</button>`).join('');
}

/* Jalali month grid for picking one day, styled after the phone calendar
   reference. prev/next/pick name global handlers; dots marks days with tasks. */
function renderPickCalendar({ jy, jm, date, prev, next, pick, dots }){
  const monthLen = window.jalaali.jalaaliMonthLength(jy, jm);
  const firstG = window.jalaali.toGregorian(jy, jm, 1);
  const startOffset = (new Date(firstG.gy, firstG.gm - 1, firstG.gd).getDay() + 1) % 7;
  const todayJ = window.jalaali.toJalaali(new Date());
  const selJ = date ? window.jalaali.toJalaali(new Date(date + 'T00:00:00')) : null;
  const cells = [];
  for(let i = 0; i < startOffset; i++) cells.push('<span class="aspect-square"></span>');
  for(let d = 1; d <= monthLen; d++){
    const isToday = jy === todayJ.jy && jm === todayJ.jm && d === todayJ.jd;
    const isSel = selJ && jy === selJ.jy && jm === selJ.jm && d === selJ.jd;
    const friday = (startOffset + d - 1) % 7 === 6;
    const g = window.jalaali.toGregorian(jy, jm, d);
    const key = dateKey(new Date(g.gy, g.gm - 1, g.gd));
    const dot = dots && dots(key);
    cells.push(`<button type="button" onclick="${pick}(${jy},${jm},${d})" class="aspect-square flex items-center justify-center rounded-xl text-xs relative ${isSel ? 'font-black bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : `font-bold ${isToday ? 'bg-slate-800/50 border border-slate-700' : 'hover:bg-slate-800'} ${friday ? 'text-rose-500' : 'text-slate-200'}`}">${fd(d)}${dot ? `<span class="absolute bottom-1.5 w-1 h-1 ${isSel ? 'bg-white' : 'bg-indigo-400'} rounded-full"></span>` : ''}</button>`);
  }
  return `
    <div class="bg-slate-900/50 border border-slate-800 rounded-3xl p-4">
      <div class="flex items-center justify-between mb-4">
        <button type="button" onclick="${prev}()" aria-label="ماه قبل" class="w-9 h-9 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">${fa('chevron-right', 'text-xs')}</button>
        <span class="text-sm font-black text-white">${MONTHS_JALALI[jm - 1]} ${fd(jy)}</span>
        <button type="button" onclick="${next}()" aria-label="ماه بعد" class="w-9 h-9 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">${fa('chevron-left', 'text-xs')}</button>
      </div>
      <div class="grid grid-cols-7 gap-1 mb-4 text-center">
        ${['ش','ی','د','س','چ','پ','ج'].map((w, i) => `<span class="text-[9px] font-black ${i === 6 ? 'text-rose-900' : 'text-slate-600'} uppercase tracking-widest">${w}</span>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1 text-center">${cells.join('')}</div>
    </div>`;
}

/* ---------- editors: drawer on desktop, full page on the phone ----------
   Every open editor carries .modal-overlay: the service worker's update reload
   and the reminder refresh both wait while one is on screen.
   The task editor reference is the only form in the set, so every editor uses
   its frame: header with title (and delete), labelled fields, save/cancel. */
function renderEditorFrame({ title, body, onClose, onSave, saveLabel = 'ذخیره', onDelete, extraHead = '', inline }){
  if(isDesk()){
    const aside = `
      <aside class="${inline ? 'modal-overlay w-[520px] shrink-0 h-full relative z-30' : 'absolute inset-y-0 left-0 w-[520px] max-w-full'} bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden shadow-2xl" role="dialog" aria-label="${ea(title)}">
        <header class="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 bg-slate-950">
          <h2 class="text-base font-black text-white">${title}</h2>
          <div class="flex items-center gap-2">
            ${extraHead}
            ${onDelete ? `<button type="button" onclick="${onDelete}" aria-label="حذف" class="w-9 h-9 rounded-xl border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all flex items-center justify-center">${fa('trash-can', 'text-sm')}</button>` : ''}
            <button type="button" onclick="${onClose}" aria-label="بستن" class="text-slate-600 hover:text-white transition-colors">${fa('xmark', 'text-xl')}</button>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8" data-scroll="editor">${body}</div>
        <div class="p-8 border-t border-slate-800 bg-slate-950 flex items-center gap-4 shrink-0">
          <button type="button" onclick="${onSave}" class="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-900/40 transition-all">${saveLabel}</button>
          <button type="button" onclick="${onClose}" class="px-6 py-4 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-2xl font-black transition-all">انصراف</button>
        </div>
      </aside>`;
    return inline ? aside : `<div class="modal-overlay fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm" onclick="if(event.target===this) ${onClose}">${aside}</div>`;
  }
  return `
    <div class="modal-overlay fixed inset-0 z-[60] bg-[#020617] overflow-y-auto" role="dialog" aria-label="${ea(title)}">
      <header class="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button type="button" onclick="${onClose}" aria-label="بازگشت" class="w-9 h-9 flex items-center justify-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">${fa('arrow-right', 'text-xs')}</button>
          <h1 class="text-base font-black text-white">${title}</h1>
        </div>
        <div class="flex items-center gap-2">
          ${extraHead}
          ${onDelete ? `<button type="button" onclick="${onDelete}" aria-label="حذف" class="w-9 h-9 flex items-center justify-center text-rose-500 bg-rose-500/10 rounded-lg border border-rose-500/20">${fa('trash-can', 'text-xs')}</button>` : ''}
        </div>
      </header>
      <main class="safe-area-bottom-sm p-4">
        <div class="space-y-6">${body}</div>
        <div class="mt-10 pb-10">
          <button type="button" onclick="${onSave}" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-900/40 active:scale-[0.98] transition-all">${saveLabel}</button>
          <button type="button" onclick="${onClose}" class="w-full py-4 mt-3 bg-slate-900 text-slate-500 rounded-2xl font-black border border-slate-800">انصراف</button>
        </div>
      </main>
    </div>`;
}
const field = (label, inner, cls = 'space-y-2') => `<div class="${cls}">${label ? fieldLabel(label) : ''}${inner}</div>`;

/* small question cards (time spent, cost, picker…): centred on desktop, a sheet on the phone */
function renderDialog({ title, body, footer = '', onClose, wide }){
  const d = isDesk();
  return `
    <div class="modal-overlay fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm ${d ? 'flex items-center justify-center p-8' : ''}" onclick="if(event.target===this) ${onClose}">
      <div role="dialog" aria-label="${ea(title)}" class="${d ? `w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-3xl max-h-[85vh]` : 'absolute inset-x-0 bottom-0 rounded-t-3xl max-h-[88vh] pb-[max(20px,env(safe-area-inset-bottom))]'} bg-slate-950 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        <header class="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 class="text-sm font-black text-white">${title}</h3>
          <button type="button" onclick="${onClose}" aria-label="بستن" class="text-slate-600 hover:text-white transition-colors">${fa('xmark', 'text-lg')}</button>
        </header>
        <div class="p-6 overflow-y-auto custom-scrollbar space-y-6">${body}</div>
        ${footer ? `<div class="px-6 pb-6 flex items-center gap-3 shrink-0">${footer}</div>` : ''}
      </div>
    </div>`;
}
const dlgPrimary = (label, onclick, attrs = '') => `<button type="button" onclick="${onclick}" ${attrs} class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all disabled:opacity-50">${label}</button>`;
const dlgSecondary = (label, onclick, attrs = '') => `<button type="button" onclick="${onclick}" ${attrs} class="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-black transition-all">${label}</button>`;

/* ---------- toasts ---------- */
function toastFrame(inner, tone = ''){
  return `<div class="fixed z-[80] ${isDesk() ? 'bottom-10 left-1/2 -translate-x-1/2' : 'bottom-24 inset-x-4'} ${tone === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-200' : 'bg-slate-900/95 border-slate-700 text-slate-200'} border backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 text-xs font-bold" role="status">${inner}</div>`;
}
function renderUndoToast(){
  return toastFrame(`<span class="flex-1">${esc(state.undoToast.message)}</span>
    <button type="button" onclick="triggerUndo()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black">واگرد</button>
    <button type="button" onclick="dismissUndoToast()" aria-label="بستن" class="text-slate-500 hover:text-white">${fa('xmark')}</button>`);
}
function renderSaveErrorToast(){
  return toastFrame(`${fa('triangle-exclamation', 'text-rose-400')}<span class="flex-1">${esc(state.saveError.message)}</span>
    <button type="button" onclick="dismissSaveError()" aria-label="بستن" class="text-rose-300 hover:text-white">${fa('xmark')}</button>`, 'error');
}
function renderInfoToast(){
  return toastFrame(`${fa('circle-check', 'text-emerald-400')}<span class="flex-1">${esc(state.infoToast.message)}</span>
    <button type="button" onclick="dismissInfoToast()" aria-label="بستن" class="text-slate-500 hover:text-white">${fa('xmark')}</button>`);
}

/* ---------- render ---------- */
const DESKTOP_VIEWS = {
  today:() => renderTodayDesktop(), tasks:() => renderTasksDesktop(), calendar:() => renderCalendarDesktop(),
  english:() => renderEnglishDesktop(), ideas:() => renderIdeasDesktop(), prompts:() => renderPromptsDesktop(),
  purchases:() => renderPurchasesDesktop(), subscriptions:() => renderSubscriptionsDesktop(), wins:() => renderWinsDesktop(),
  mother:() => renderMotherDesktop(), repairs:() => renderRepairsDesktop(), settings:() => renderSettingsDesktop(),
  archive:() => renderArchiveDesktop(), 'ai-reports':() => renderAIReportsDesktop(),
};
const MOBILE_VIEWS = {
  today:() => renderTodayMobile(), tasks:() => renderTasksMobile(), calendar:() => renderCalendarMobile(),
  english:() => renderEnglishMobile(), ideas:() => renderIdeasMobile(), prompts:() => renderPromptsMobile(),
  purchases:() => renderPurchasesMobile(), subscriptions:() => renderSubscriptionsMobile(), wins:() => renderWinsMobile(),
  mother:() => renderMotherMobile(), repairs:() => renderRepairsMobile(), settings:() => renderSettingsMobile(),
  archive:() => renderArchiveMobile(), 'ai-reports':() => renderAIReportsMobile(),
};
function renderOverlays(){
  const desk = isDesk();
  return [
    // on the tasks page the desktop editor is part of the page, not a drawer
    state.taskEditor && (!desk || state.view !== 'tasks') ? renderTaskEditor() : '',
    state.recurringEditor ? renderRecurringEditorModal() : '',
    state.subscriptionEditor ? renderSubscriptionEditorModal() : '',
    state.purchaseEditor ? renderPurchaseEditorModal() : '',
    state.newPurchaseOpen ? renderNewPurchaseModal() : '',
    state.ideaEditor ? renderIdeaEditorModal() : '',
    state.promptEditor ? renderPromptEditorModal() : '',
    state.winEditor ? renderWinEditorModal() : '',
    state.motherEditor ? renderMotherEditorModal() : '',
    state.repairEditor ? renderRepairEditorModal() : '',
    state.newRepairOpen ? renderNewRepairModal() : '',
    state.maintEditor ? renderMaintEditorModal() : '',
    state.repairDoneModal ? renderRepairDoneModal() : '',
    state.moveTaskPicker ? renderMoveTaskPicker() : '',
    state.restorePreview && !(state.view === 'settings') ? renderRestoreModal() : '',
    state.taskCompletionModal ? renderTaskCompletionModal() : '',
    state.streakPanel ? renderStreakPanel() : '',
    state.winSos ? renderWinSos() : '',
    !desk && state.moreMenuOpen ? renderMoreMenu() : '',
    state.undoToast ? renderUndoToast() : '',
    state.saveError ? renderSaveErrorToast() : '',
    state.infoToast && !state.saveError && !state.undoToast ? renderInfoToast() : '',
  ].join('');
}
/* Desktop pages scroll inside their own panes, which a repaint would reset to
   the top; their positions are carried across (and dropped when the page changes). */
function saveScrolls(){
  const out = {};
  document.querySelectorAll('[data-scroll]').forEach(el => { out[el.dataset.scroll] = el.scrollTop; });
  return out;
}
function restoreScrolls(saved){
  if(resetScrollOnRender){ resetScrollOnRender = false; return; }
  document.querySelectorAll('[data-scroll]').forEach(el => { if(saved[el.dataset.scroll]) el.scrollTop = saved[el.dataset.scroll]; });
}
function render(){
  const ev = window.event;
  if(preservedFieldFocused() && !(ev && USER_EVENT_TYPES.has(ev.type))){ renderDeferred = true; return; }
  renderDeferred = false;
  scheduleSnapshot();
  const app = document.getElementById('app');
  // boot renders (push status, backups) can arrive before the first data load
  if(!state.tasks){ app.innerHTML = `<div class="min-h-screen flex items-center justify-center text-xs font-bold text-slate-500">در حال بارگذاری…</div>`; return; }
  const scrolls = saveScrolls();
  const desk = isDesk();
  document.body.className = desk ? 'text-slate-100 overflow-hidden' : 'text-slate-100 bg-[#020617] selection:bg-indigo-500/30';
  const view = (desk ? DESKTOP_VIEWS : MOBILE_VIEWS)[state.view] || (desk ? DESKTOP_VIEWS : MOBILE_VIEWS).today;
  // a repaint rebuilds every field; the one being typed in gets its focus and caret back
  const ae = document.activeElement;
  const focusId = ae && ae.id && /^(INPUT|TEXTAREA)$/.test(ae.tagName) ? ae.id : null;
  let caret = null;
  try{ if(focusId) caret = [ae.selectionStart, ae.selectionEnd]; }catch(_e){}
  app.innerHTML = desk
    ? `<div class="flex h-screen">${renderSidebar()}${view()}</div>${renderOverlays()}${state.view === 'today' ? renderTodayPrintSheet() : ''}`
    : `${view()}${state.taskEditor ? '' : renderMobileNav()}${renderOverlays()}${state.view === 'today' ? renderTodayPrintSheet() : ''}`;
  restoreScrolls(scrolls);
  if(focusId){
    const el = document.getElementById(focusId);
    if(el && el !== document.activeElement){
      el.focus({ preventScroll:true });
      try{ if(caret && caret[0] != null) el.setSelectionRange(caret[0], caret[1]); }catch(_e){}
    }
  }
}

/* ---------- sign-in (no screen in the reference: built from its form parts) ---------- */
function renderLogin(){
  loginShown = true;
  appStarted = false; // an early-painted local copy must not render over the form
  appBooted = false;
  document.body.className = 'text-slate-100 bg-[#020617]';
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4">
      <form class="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl" onsubmit="submitLogin(event)">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">${fa('circle-notch', 'text-xl')}</div>
          <div>
            <span class="text-2xl font-black text-white tracking-tight">مَدار</span>
            <p class="text-[10px] text-slate-500 font-medium">برای دیدن برنامه‌هات وارد شو</p>
          </div>
        </div>
        <div class="space-y-1.5">${fieldLabel('ایمیل')}<input id="loginEmail" type="email" autocomplete="username" required dir="ltr" class="${inputCls}"></div>
        <div class="space-y-1.5">${fieldLabel('رمز عبور')}<input id="loginPassword" type="password" autocomplete="current-password" required dir="ltr" class="${inputCls}"></div>
        <button type="submit" id="loginSubmit" class="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50">ورود</button>
        <div class="text-[11px] font-bold text-rose-400 min-h-[1em]" id="loginError" role="alert"></div>
      </form>
    </div>`;
}
