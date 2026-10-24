/* ---------- مدار UI: انگلیسی، تعمیرات، خریدها، اشتراک‌ها، ایده‌ها، پرامپت‌ها، تونستم، مادر ----------
   Each page follows its desktop and phone reference (ids in manifest.json):
   English 0JsBelTVsnwmPmQACPti / Lm0ifwh8bSfvcwL8PPbz · Repairs QxkPUjlI3Jlux5Ws1agh / Qowg3sRpt1C2DimUCSZO
   Purchases UafyUnVmot8LKLayuxUl / afAKa3J9dNyrJ2neqHqK · Subscriptions Mcam1FJozcsT1tb17yFr / 4qjypGrVaQYkjZmQo5Bm
   Ideas txrmQJTW8toKbIJFSKVI / nMGbQ9Jr5wJcgaWv9ETx · Prompts acJm4qIhsysAGJSjrsfP / jvOsjBUBYcR2xv6yDhVP
   Wins 5IWKDBaSdoRXX8n2j0c8 / bf3mnGCh46lUfHMQYJ74 · Mother 2RuTmbO9zj6nnkhOvZxu / oH1yNuPz7gKHYIEIrQsl */
const DINARS = '<span class="text-[10px] text-slate-500">DINARS</span>';
const segTabs = (tabs, current, onclickFor, on = 'bg-indigo-500/10 text-indigo-400') => `
  <div class="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
    ${tabs.map(([id, label]) => `<button type="button" onclick="${onclickFor(id)}" class="px-4 py-1.5 ${current === id ? on : 'text-slate-500 hover:text-slate-300'} rounded-xl text-[10px] font-black">${label}</button>`).join('')}
  </div>`;
const sectionTitle = (text, icon, iconCls) => `<h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">${icon ? fa(icon, iconCls) : ''}${text}</h3>`;
const cardTitle = (text, icon, iconCls) => `<h4 class="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">${fa(icon, iconCls)} ${text}</h4>`;
const emptyNote = (text, icon) => `<div class="py-10 flex flex-col items-center justify-center text-slate-600">${icon ? fa(icon, 'text-4xl mb-3 opacity-30') : ''}<p class="text-[11px] font-bold text-center leading-relaxed max-w-md">${text}</p></div>`;
const focusEl = id => { const el = document.getElementById(id); if(el){ el.focus(); el.scrollIntoView({ block:'center', behavior:'smooth' }); } };

/* ================= انگلیسی ================= */
function enDueChoices(){
  const s = englishSettings(), today = dateKey(new Date()), out = [];
  if(s.classDays.length){ for(let k = enUpcomingClass(); k && out.length < 3; k = enNextClass(k)) out.push([k, enDayLabel(k)]); }
  else out.push([enAddDays(today, 7), 'یه هفته دیگه'], [enAddDays(today, 3), '۳ روز دیگه']);
  return out;
}
function enStats(){
  const chunks = state.englishChunks || [];
  const done = chunks.filter(c => c.done);
  const minutes = done.reduce((n, c) => n + (c.actualMin || c.minutes), 0);
  return { pct: chunks.length ? Math.round(done.length / chunks.length * 100) : 0, minutes };
}
// minutes practised on each day of this week (Sat→Fri): chunks finished that day, or 5 for the ticked minimum
function enWeekBars(){
  const { start } = getCurrentWeekRange();
  const ticked = new Set((state.englishPractice || []).map(p => p.day));
  const out = [];
  for(let i = 0; i < 7; i++){
    const k = enAddDays(start, i);
    let m = (state.englishChunks || []).filter(c => c.done && c.doneAt && dateKey(new Date(c.doneAt)) === k).reduce((n, c) => n + (c.actualMin || c.minutes), 0);
    if(!m && ticked.has(k)) m = 5;
    out.push({ key:k, minutes:m });
  }
  return out;
}
function enTodayProgress(){
  const chunks = enTodayChunks();
  const doneMin = chunks.filter(c => c.done).reduce((n, c) => n + (c.actualMin || c.minutes), 0);
  const openMin = chunks.filter(c => !c.done).reduce((n, c) => n + c.minutes, 0);
  const minTicked = (state.englishPractice || []).some(p => p.day === dateKey(new Date()));
  const pct = doneMin + openMin ? Math.round(doneMin / (doneMin + openMin) * 100) : (minTicked ? 100 : 0);
  return { pct, openMin, minTicked };
}
function englishHwForm(mob){
  const nh = state.newHomework;
  const due = enDueChoices();
  const dueOn = due.some(([k]) => k === nh.dueOn) ? nh.dueOn : due[0][0];
  const askFor = enNeedsHomeworkPrompt();
  const s = englishSettings();
  return `
    ${askFor ? `<p class="text-[11px] font-bold text-amber-400 mb-3">کلاسِ ${enDayLabel(askFor)} تموم شد — تکلیف چی بود؟ <button type="button" onclick="enNoHomework()" class="text-slate-500 hover:text-white font-black mr-2">این جلسه تکلیف نداشتیم</button></p>` : ''}
    <div class="space-y-4">
      <textarea id="new-hw-title" data-preserve rows="${mob ? 2 : 3}" placeholder="متن تکلیف یا موضوع را اینجا وارد کنید..." oninput="state.newHomework.title=this.value"
        class="w-full bg-slate-900/50 border border-slate-800 rounded-2xl p-4 ${mob ? 'text-[11px]' : 'text-sm'} text-slate-200 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600">${esc(nh.title)}</textarea>
      <div class="space-y-2">
        <label class="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">ریز کارها <span class="font-bold text-slate-700">(اختیاری)</span></label>
        ${(nh.subs || []).map((t, i) => `
          <div class="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-3 rounded-xl group">
            <div class="w-4 h-4 border border-slate-700 bg-slate-950 rounded shrink-0"></div>
            <span class="${mob ? 'text-[11px]' : 'text-xs'} text-slate-300 flex-1" dir="auto">${esc(t)}</span>
            <button type="button" onclick="enRemoveNewSub(${i})" aria-label="حذف" class="${mob ? '' : 'opacity-0 group-hover:opacity-100 reveal'} text-slate-600 hover:text-rose-500 transition-all">${fa('xmark', 'text-xs')}</button>
          </div>`).join('')}
        <div class="flex items-center gap-3 bg-slate-900/30 border border-dashed border-slate-800 p-3 rounded-xl">
          ${fa('plus', 'text-slate-700 text-xs')}
          <input type="text" id="new-hw-sub" data-preserve dir="auto" placeholder="ریز کار جدید…" onkeydown="if(event.key==='Enter'){event.preventDefault(); enAddNewSub();}"
            class="flex-1 min-w-0 bg-transparent text-xs text-slate-300 focus:outline-none placeholder:text-slate-600">
          <button type="button" onclick="enAddNewSub()" class="text-[10px] font-black text-amber-400">افزودن</button>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          ${(() => { const i = Math.max(0, due.findIndex(([k]) => k === dueOn)); const next = due[(i + 1) % due.length][0];
            return `<button type="button" onclick="state.newHomework.dueOn='${next}'; render()" title="${due.length > 1 ? 'برای مهلت بعدی بزن' : ''}" class="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">${fa('calendar', 'text-[10px] text-slate-500')}<span class="text-[10px] text-slate-400">مهلت: ${due[i][1]}</span>${due.length > 1 ? fa('rotate', 'text-[8px] text-slate-600') : ''}</button>`; })()}
          <input type="text" data-preserve placeholder="یونیت / درس" value="${ea(nh.unit)}" oninput="state.newHomework.unit=this.value" class="w-28 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-slate-300 focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600">
        </div>
        <button type="button" onclick="addEnglishHomework()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-2">ثبت تکلیف</button>
      </div>
      ${!s.classDays.length ? `<p class="text-[10px] text-slate-500">روزهای کلاست رو انتخاب کن تا مهلت هر تکلیف خودکار «جلسه‌ی بعد» بشه و بعد از کلاس یادت بندازم.</p>` : ''}
    </div>`;
}
function renderEnglishHwEditorModal(){
  const ed = state.enHwEditor;
  const due = enDueChoices();
  if(!due.some(([k]) => k === ed.dueOn)) due.unshift([ed.dueOn, enDayLabel(ed.dueOn)]);
  return renderEditorFrame({ title:'ویرایش تکلیف', onClose:'closeEnglishHwEditor()', onSave:'confirmEnglishHwEditor()', onDelete:`const id=state.enHwEditor.hwId; closeEnglishHwEditor(); deleteEnglishHomework(id)`,
    body:`
      ${field('متن تکلیف', `<textarea dir="auto" placeholder="متن تکلیف…" oninput="state.enHwEditor.title=this.value" class="${textareaCls()}">${esc(ed.title)}</textarea>`)}
      ${field('یونیت / درس', `<input type="text" dir="auto" value="${ea(ed.unit)}" oninput="state.enHwEditor.unit=this.value" class="${inputCls}">`)}
      ${field('مهلت', chipBox(due.map(([k, label]) => choiceChip(label, ed.dueOn === k, `state.enHwEditor.dueOn='${k}'; render()`)).join('')))}
      ${field('ریز کارها', `<div class="space-y-2">${ed.chunks.map((c, i) => `
        <div class="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-3 rounded-xl ${c.done ? 'opacity-60' : ''}">
          <input type="text" dir="auto" value="${ea(c.title)}" oninput="state.enHwEditor.chunks[${i}].title=this.value" aria-label="عنوان ریز کار" class="flex-1 min-w-0 bg-transparent text-xs text-slate-300 focus:outline-none">
          <span class="flex items-center gap-1 text-[10px] font-bold text-slate-500 shrink-0"><input type="text" inputmode="numeric" value="${ea(c.minutes)}" oninput="state.enHwEditor.chunks[${i}].minutes=normalizeNumericInput(this)" aria-label="دقیقه" class="w-10 bg-slate-950 border border-slate-800 rounded-lg px-1 py-0.5 text-center text-slate-200"> دقیقه</span>
          <button type="button" onclick="enEditorRemoveSub(${i})" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-all shrink-0">${fa('xmark', 'text-xs')}</button>
        </div>`).join('')}
        <div class="flex items-center gap-3 bg-slate-900/30 border border-dashed border-slate-800 p-3 rounded-xl">
          ${fa('plus', 'text-slate-700 text-xs')}
          <input type="text" id="en-editor-sub" dir="auto" placeholder="ریز کار جدید…" onkeydown="if(event.key==='Enter'){event.preventDefault(); enEditorAddSub();}" class="flex-1 min-w-0 bg-transparent text-xs text-slate-300 focus:outline-none placeholder:text-slate-600">
          <button type="button" onclick="enEditorAddSub()" class="text-[10px] font-black text-amber-400">افزودن</button>
        </div></div>`)}`,
  });
}
function enChunkCard(c, i, n){
  return `
    <div class="bg-slate-800/40 p-5 rounded-3xl border border-slate-800 hover:border-amber-500/30 transition-all group relative overflow-hidden ${c.done ? 'opacity-60' : ''}">
      <div class="flex items-start justify-between relative z-10">
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-bold ${c.done ? 'text-slate-400 line-through' : 'text-slate-200'} mb-1" dir="auto">${esc(c.title)}</h4>
          <p class="text-[11px] text-slate-500 mb-4">ریز کار ${fd(i + 1)} از ${fd(n)}</p>
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/10">${fmtMin(c.done && c.actualMin ? c.actualMin : c.minutes)}</span>
            ${c.done ? `<span class="text-[10px] font-bold text-slate-500">انجام شد</span>` : ''}
            ${c.done && c.difficulty ? `<span class="text-[10px] font-bold text-slate-500">${DIFFICULTY_LABEL[c.difficulty]}</span>` : ''}
          </div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <button type="button" onclick="toggleEnglishChunk('${c.id}')" aria-label="${c.done ? 'برگردون' : 'انجامش دادم'}" class="w-8 h-8 rounded-xl ${c.done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-700 bg-slate-950 hover:border-emerald-500'} flex items-center justify-center group/btn transition-colors">${fa('check', `text-xs ${c.done ? '' : 'text-emerald-500 opacity-0 group-hover/btn:opacity-100'}`)}</button>
          <button type="button" onclick="deleteEnglishChunk('${c.id}')" aria-label="حذف ریز کار" class="reveal opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all">${fa('xmark', 'text-xs')}</button>
        </div>
      </div>
      ${fa('puzzle-piece', 'absolute -bottom-4 -left-4 text-5xl text-white/5 -rotate-12')}
    </div>`;
}
function englishOpenHomework(){
  const isOpen = h => enChunksOf(h.id).some(c => !c.done);
  return (state.englishHomework || []).filter(isOpen).sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}
function englishDoneHomework(){
  return (state.englishHomework || []).filter(h => !enChunksOf(h.id).some(c => !c.done)).sort((a, b) => b.dueOn.localeCompare(a.dueOn));
}
function enToggleDone(id){ state.enDoneOpen = state.enDoneOpen || {}; state.enDoneOpen[id] = !state.enDoneOpen[id]; render(); }
// the last few classes whose deadline has come, and how much of each homework was done by then
function englishClassHistory(){
  const today = dateKey(new Date());
  return (state.englishHomework || []).filter(h => h.dueOn <= today && enChunksOf(h.id).length).sort((a, b) => b.dueOn.localeCompare(a.dueOn)).slice(0, 6);
}
function englishStatsCards(){
  const past = englishClassHistory();
  if(!past.length) return `<div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">${emptyNote('هنوز چیزی برای نشون دادن نیست. بعد از اولین کلاسی که مهلت تکلیفش برسه، اینجا معلوم می‌شه تا روز کلاس چقدرش رو انجام داده بودی.', 'chart-line')}</div>`;
  const bar = (label, pct, value, tone) => `<div class="flex items-center gap-3"><span class="w-24 text-[11px] text-slate-400 shrink-0">${label}</span><div class="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden"><div class="${tone} h-full rounded-full" style="width:${Math.max(3, pct)}%"></div></div><span class="text-[11px] font-black text-slate-300 w-10 text-left">${value}</span></div>`;
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">${cardTitle('وضعیت قبل از هر کلاس', 'graduation-cap', 'text-indigo-400')}<div class="space-y-3">${past.map(h => { const ch = enChunksOf(h.id); const on = ch.filter(c => c.done && c.doneAt && dateKey(new Date(c.doneAt)) <= h.dueOn).length; return bar(jDate(h.dueOn), Math.round(on / ch.length * 100), `${fd(on)}/${fd(ch.length)}`, 'bg-indigo-500'); }).join('')}</div><p class="text-[10px] text-slate-500 mt-4">ریز کارهایی که تا روز کلاس انجام شده بودن، از کل ریز کارهای اون تکلیف.</p></div>`;
}
function englishSettingsCard(mob){
  const s = englishSettings();
  const box = 'bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none focus:border-amber-500/50';
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'} space-y-6">
      ${cardTitle('زمان کلاس‌ها', 'graduation-cap', 'text-indigo-400').replace('mb-6', 'mb-0')}
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1"><p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">روزهای کلاس</p><span class="text-[10px] font-black text-amber-500">${s.classDays.length ? `هفته‌ای ${fd(s.classDays.length)} جلسه` : 'انتخاب نشده'}</span></div>
        <div class="flex gap-1 justify-between">${weekdayBtns(s.classDays, d => `toggleEnglishClassDay(${d})`, 'amber', 'w-9 h-9')}</div>
      </div>
      ${s.classDays.length ? `<div class="space-y-3">${fieldLabel('ساعت شروع کلاس')}<div class="grid ${mob ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-3'}">${WEEKDAY_DISPLAY_ORDER.filter(d => s.classDays.includes(d)).map(d => `<label class="flex items-center justify-between gap-2 p-3 bg-slate-900/50 rounded-2xl border border-slate-800 text-[11px] text-slate-400 min-w-0"><span class="shrink-0">${WEEKDAYS_FA[d]}</span><input type="time" value="${ea(enClassTime(d))}" onchange="if(this.value) setEnglishClassTime(${d}, this.value)" class="${box} ${mob ? 'min-w-0' : ''}"></label>`).join('')}</div></div>` : ''}
      <div class="grid ${mob ? 'grid-cols-1' : 'grid-cols-2'} gap-4">
        ${field('ساعت تمرین روزانه', `<input type="time" value="${ea(s.practiceTime)}" onchange="if(this.value) saveEnglishSettings({ practiceTime:this.value })" class="${box} w-full min-w-0 p-3">`)}
        ${field('کلاس چقدر طول می‌کشه؟', segmented([[60, 'یک ساعت'], [90, '۹۰ دقیقه'], [120, 'دو ساعت']], s.classMinutes, m => `saveEnglishSettings({ classMinutes:${m} })`))}
      </div>
      <div class="border-t border-slate-800 pt-6 space-y-3">
        ${toggleRow('اعلان‌های انگلیسی روی گوشی', 'بعد از کلاس، سر ساعت تمرین، و ساعت ۹ شبِ قبل از کلاس', s.push, `saveEnglishSettings({ push:${!s.push} })`)}
        ${state.pushStatus === 'on' ? '' : `<p class="text-[10px] text-amber-400/80 leading-relaxed">اعلان‌ها روی این دستگاه خاموشه — از «تنظیمات» روشنش کن.</p>`}
      </div>
    </div>`;
}
function englishRightColumn(){
  const { streak, atRisk } = englishStreak();
  const p = enTodayProgress();
  const bars = enWeekBars();
  const max = Math.max(5, ...bars.map(b => b.minutes));
  const avg = Math.round(bars.reduce((n, b) => n + b.minutes, 0) / 7);
  const todayK = dateKey(new Date());
  const r = 40, circ = 251;
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      <div class="flex items-center justify-between mb-6">
        <h4 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('fire', 'text-amber-500')} هدف روزانه تمرین</h4>
        <span class="text-[10px] font-black text-amber-500">${fd(p.pct)}٪</span>
      </div>
      <div class="space-y-6">
        <div class="relative h-24 flex items-center justify-center">
          <svg class="w-24 h-24 transform -rotate-90" aria-hidden="true">
            <circle cx="48" cy="48" r="${r}" stroke="currentColor" stroke-width="8" fill="transparent" class="text-slate-800" />
            <circle cx="48" cy="48" r="${r}" stroke="currentColor" stroke-width="8" fill="transparent" stroke-dasharray="${circ}" stroke-dashoffset="${Math.round(circ * (1 - p.pct / 100))}" class="text-amber-500" stroke-linecap="round" />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-xl font-black text-white">${fd(p.openMin)}</span>
            <span class="text-[8px] text-slate-500 uppercase font-black">دقیقه باقی‌مانده</span>
          </div>
        </div>
        <div class="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-center">
          <p class="text-[10px] text-slate-500 mb-1">حداقل تمرین روزانه:</p>
          <p class="text-sm font-black text-white">۵ دقیقه</p>
          <p class="text-[10px] text-slate-500 mt-2 leading-relaxed">${EN_MIN_IDEAS[new Date().getDay()]}</p>
        </div>
        <button type="button" onclick="toggleEnglishMin()" class="w-full py-3 ${p.minTicked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/10'} rounded-xl text-[10px] font-black transition-all border tracking-widest uppercase">${p.minTicked ? `${fa('check', 'ml-1')} ۵ دقیقه‌ی امروز ثبت شد` : 'ثبت ۵ دقیقه تمرین'}</button>
        ${atRisk ? `<p class="text-[10px] font-bold text-rose-400 leading-relaxed">دیروز جا افتاد — امروز نذار دوتا بشه، وگرنه زنجیره‌ی ${fd(streak)} روزه‌ت می‌شکنه.</p>` : ''}
      </div>
    </div>
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      <h4 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">${fa('chart-line', 'text-indigo-400')} الگوی مطالعه</h4>
      <div class="space-y-4">
        <div class="flex items-center justify-between px-2"><span class="text-[11px] text-slate-500">میانگین هفتگی</span><span class="text-[11px] font-bold text-slate-300">${fd(avg)} دقیقه/روز</span></div>
        <div class="flex items-center justify-between px-2"><span class="text-[11px] text-slate-500">زنجیره</span><span class="text-[11px] font-bold text-amber-500">${fd(streak)} روز</span></div>
        <div class="flex items-end justify-between h-20 px-2 gap-1">
          ${bars.map(b => `<div class="w-full ${b.minutes ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : enIsClassDay(b.key) ? 'bg-indigo-500/30' : 'bg-slate-900'} rounded-t-lg ${b.key === todayK ? 'ring-1 ring-amber-400/40' : ''}" style="height:${Math.max(12, Math.round(b.minutes / max * 100))}%" title="${ea(enDayLabel(b.key))}: ${fd(b.minutes)} دقیقه"></div>`).join('')}
        </div>
        <div class="grid grid-cols-7 gap-1 px-2">${['SAT','SUN','MON','TUE','WED','THU','FRI'].map(d => `<span class="text-[8px] text-center text-slate-600 font-bold uppercase">${d}</span>`).join('')}</div>
      </div>
    </div>`;
}
function renderEnglishDesktop(){
  const tab = state.englishTab === 'done' ? 'hw' : state.englishTab;
  const { streak } = englishStreak();
  const s = englishSettings();
  const openHw = englishOpenHomework();
  const doneHw = englishDoneHomework();
  const header = deskHeader({ title:'یادگیری انگلیسی', sub:'مدیریت تکالیف و تمرین‌های روزانه', profile:`زنجیره ${fd(streak)} روز`,
    right: segTabs([['hw','تکالیف'], ['stats','روند پیشرفت'], ['settings','تنظیمات']], tab, id => `state.englishTab='${id}'; render()`, 'bg-amber-500/10 text-amber-400') });
  const hwBody = `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      <div class="flex items-center justify-between mb-6">
        ${sectionTitle('ثبت تکلیف جدید', 'plus-circle', 'text-amber-500')}
        <div class="flex items-center gap-3">
          <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">روزهای کلاس:</span>
          <div class="flex gap-1">${WEEKDAY_DISPLAY_ORDER.map(d => `<button type="button" onclick="toggleEnglishClassDay(${d})" title="${WEEKDAYS_FA[d]}" aria-pressed="${s.classDays.includes(d)}" class="w-7 h-7 flex items-center justify-center rounded-lg ${s.classDays.includes(d) ? 'bg-amber-500 text-slate-950' : `bg-slate-900 ${d === 5 ? 'text-rose-900/40' : 'text-slate-500'} hover:bg-slate-800`} text-[10px] font-black transition-all">${WEEKDAYS_FA[d][0]}</button>`).join('')}</div>
        </div>
      </div>
      ${englishHwForm(false)}
    </div>
    ${openHw.length ? openHw.map(h => {
      const chunks = enChunksOf(h.id);
      return `
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-black text-white uppercase tracking-widest">ریز کارهای تکلیف</h3>
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-bold text-slate-500" dir="auto">بر اساس تکلیف: "${esc(h.title)}"${h.unit ? ` · ${esc(h.unit)}` : ''} · <span class="${daysUntil(h.dueOn) < 0 ? 'text-rose-400' : ''}">${enDueLabel(h)}</span></span>
              <button type="button" onclick="openEnglishHwEditor('${h.id}')" title="ویرایش" aria-label="ویرایش تکلیف" class="text-slate-600 hover:text-white transition-colors">${fa('pen', 'text-[10px]')}</button>
              <button type="button" onclick="deleteEnglishHomework('${h.id}')" title="حذف تکلیف" aria-label="حذف تکلیف" class="text-slate-600 hover:text-rose-500 transition-colors">${fa('trash', 'text-[10px]')}</button>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">${chunks.map((c, i) => enChunkCard(c, i, chunks.length)).join('')}</div>
        </div>`;
    }).join('') : `<div class="bg-slate-950/50 border border-dashed border-slate-800 rounded-3xl p-6">${emptyNote('تکلیف بازی نداری. بعد از هر کلاس تکلیف رو همین بالا بنویس و اگه خواستی ریز کارهاش رو هم زیرش اضافه کن.', 'puzzle-piece')}</div>`}
    ${doneHw.length ? `
      <section id="completed-homework" class="border-t border-slate-800/50 pt-8">
        <h3 class="text-xs font-black text-slate-600 uppercase tracking-widest mb-6">تکالیف انجام شده قبلی</h3>
        <div class="space-y-3">
          ${doneHw.map(h => {
            const ch = enChunksOf(h.id), open = state.enDoneOpen && state.enDoneOpen[h.id];
            const last = ch.map(c => c.doneAt).filter(Boolean).sort().pop();
            return `
              <div class="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 group">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">${fa('circle-check')}</div>
                    <div>
                      <h4 class="text-sm font-bold text-slate-400" dir="auto">${esc(h.title)}</h4>
                      <p class="text-[10px] text-slate-600">${last ? `تکمیل شده در ${jDate(dateKey(new Date(last)))}` : 'تکمیل شده'} · ${fd(ch.length)} ریز کار${h.unit ? ` · ${esc(h.unit)}` : ''}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="enToggleDone('${h.id}')" aria-label="جزئیات" class="reveal opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-white transition-all">${fa(open ? 'eye-slash' : 'eye', 'text-xs')}</button>
                    <button type="button" onclick="openEnglishHwEditor('${h.id}')" title="ویرایش" aria-label="ویرایش" class="reveal opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-white transition-all">${fa('pen', 'text-xs')}</button>
                    <button type="button" onclick="deleteEnglishHomework('${h.id}')" aria-label="حذف" class="reveal opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-500 transition-all">${fa('trash', 'text-xs')}</button>
                  </div>
                </div>
                ${open ? `<div class="grid grid-cols-2 gap-3 mt-4">${ch.map((c, i) => enChunkCard(c, i, ch.length)).join('')}</div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </section>` : ''}`;
  const left = tab === 'settings' ? englishSettingsCard(false) : tab === 'stats' ? englishStatsCards() : hwBody;
  const body = `
    <div class="max-w-6xl mx-auto grid grid-cols-12 gap-8">
      <div class="col-span-8 space-y-8">${left}</div>
      <div class="col-span-4 space-y-8">${englishRightColumn()}</div>
    </div>`;
  return deskMain({ header, body, fab: deskFab(`state.englishTab='hw'; render(); focusEl('new-hw-title')`, 'amber', 'ثبت تکلیف') });
}
function renderEnglishMobile(){
  const { streak } = englishStreak();
  const st = enStats();
  const s = englishSettings();
  const openHw = englishOpenHomework();
  const doneHw = englishDoneHomework();
  const p = enTodayProgress();
  const askFor = enNeedsHomeworkPrompt();
  const formOpen = state.enAddOpen || !!askFor;
  const today = dateKey(new Date());
  const soonest = openHw[0];
  const chunkRow = c => c.done ? `
      <button type="button" onclick="toggleEnglishChunk('${c.id}')" class="w-full flex items-center justify-between p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
        <div class="flex items-center gap-3">${fa('circle-check', 'text-emerald-500 text-xs')}<span class="text-[11px] text-slate-300" dir="auto">${esc(c.title)}</span></div>
        <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">DONE</span>
      </button>` : `
      <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
        <button type="button" onclick="toggleEnglishChunk('${c.id}')" class="w-full flex items-center justify-between">
          <div class="flex items-center gap-3"><div class="w-4 h-4 border border-slate-700 rounded bg-slate-950 shrink-0"></div><span class="text-[11px] text-slate-300 font-bold" dir="auto">${esc(c.title)}</span></div>
          <span class="text-[8px] font-bold text-indigo-400 uppercase tracking-widest shrink-0">${fd(c.minutes)} MIN</span>
        </button>
      </div>`;
  const settingsView = state.englishTab === 'settings';
  return `
    ${mobHeader(mobTitle('انگلیسی', `<span class="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/10 uppercase">تمرین انگلیسی</span>`).replace('text-lg font-black text-white', 'text-lg font-black text-white uppercase tracking-tight'),
      mobIconBtn(settingsView ? 'xmark' : 'gear', `state.englishTab='${settingsView ? 'hw' : 'settings'}'; render()`, settingsView ? 'بستن تنظیمات' : 'تنظیمات'))}
    <main class="safe-area-bottom">
      <div class="p-4 space-y-6">
        ${renderStatusBars()}
        ${settingsView ? englishSettingsCard(true) : `
        <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xs font-black text-white flex items-center gap-2 uppercase tracking-widest">${fa('chart-simple', 'text-indigo-400')} وضعیت یادگیری</h3>
            <span class="text-[10px] font-black text-indigo-400 italic">روز ${fd(streak)} زنجیره</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-950/50 p-3 rounded-2xl border border-indigo-500/5"><p class="text-[9px] font-black text-slate-500 mb-1">تکالیف تکمیل شده</p><span class="text-lg font-black text-white">${fd(st.pct)}٪</span></div>
            <div class="bg-slate-950/50 p-3 rounded-2xl border border-indigo-500/5"><p class="text-[9px] font-black text-slate-500 mb-1">زمان کل تمرین</p><span class="text-lg font-black text-white">${st.minutes >= 60 ? `${fd(Math.round(st.minutes / 60))} ساعت` : fmtMin(st.minutes)}</span></div>
          </div>
        </div>
        <section id="homework">
          <div class="flex items-center justify-between mb-4 px-1">
            <h3 class="text-xs font-black text-white uppercase tracking-widest">تکالیف فعال (Homework)</h3>
            ${soonest ? `<span class="text-[9px] font-bold ${daysUntil(soonest.dueOn) <= 1 ? 'text-rose-400' : 'text-slate-500'}">Deadline: ${enDayLabel(soonest.dueOn)}</span>` : `<button type="button" onclick="state.enAddOpen=!state.enAddOpen; render()" class="text-[10px] font-black text-amber-400">+ ثبت تکلیف</button>`}
          </div>
          <div class="space-y-4">
            ${formOpen || !openHw.length ? `<div class="bg-slate-900 border border-slate-800 rounded-3xl p-5">${englishHwForm(true)}</div>` : ''}
            ${openHw.map(h => {
              const ch = enChunksOf(h.id);
              return `
                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                  <div class="mb-4 flex items-start justify-between gap-3">
                    <div><h4 class="text-xs font-bold text-slate-200 mb-1" dir="auto">${esc(h.title)}</h4><p class="text-[10px] text-slate-500 leading-relaxed">${h.unit ? `${esc(h.unit)} · ` : ''}${enDueLabel(h)}</p></div>
                    <div class="flex items-center gap-1 shrink-0"><button type="button" onclick="openEnglishHwEditor('${h.id}')" aria-label="ویرایش تکلیف" class="text-slate-600 p-1">${fa('pen', 'text-[10px]')}</button><button type="button" onclick="deleteEnglishHomework('${h.id}')" aria-label="حذف تکلیف" class="text-slate-600 p-1">${fa('trash-can', 'text-[10px]')}</button></div>
                  </div>
                  <div class="space-y-3">${ch.map(chunkRow).join('')}</div>
                </div>`;
            }).join('')}
            ${openHw.length && !formOpen ? `<button type="button" onclick="state.enAddOpen=true; render()" class="w-full py-3 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-[10px] font-black text-slate-500">+ ثبت تکلیف جدید</button>` : ''}
          </div>
        </section>
        <section id="practice">
          <div class="flex items-center justify-between mb-4 px-1">
            <h3 class="text-xs font-black text-white uppercase tracking-widest">جلسات تمرین</h3>
            <button type="button" onclick="state.englishTab='settings'; render()" class="text-[10px] font-black text-indigo-400">تغییر زمان‌بندی</button>
          </div>
          <div class="grid grid-cols-1 gap-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shrink-0">${fa('microphone', 'text-lg')}</div>
                <div class="min-w-0"><h4 class="text-xs font-bold text-white mb-0.5">حداقل تمرین روزانه</h4><p class="text-[9px] text-slate-500 leading-relaxed">روزانه ۵ دقیقه • ${fd(s.practiceTime)} — ${EN_MIN_IDEAS[new Date().getDay()]}</p></div>
              </div>
              <button type="button" onclick="toggleEnglishMin()" class="${p.minTicked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/20'} px-4 py-2 rounded-lg text-[9px] font-black shrink-0">${p.minTicked ? 'ثبت شد ✓' : 'ثبت تمرین'}</button>
            </div>
          </div>
        </section>
        <section id="schedule">
          <div class="bg-slate-950 border border-slate-800 rounded-3xl p-5">
            <h3 class="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">${fa('graduation-cap', 'text-indigo-400')} زمان کلاس‌ها</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between text-[11px] px-1"><span class="text-slate-400">روزهای هفته:</span><span class="text-white font-bold">${s.classDays.length ? WEEKDAY_DISPLAY_ORDER.filter(d => s.classDays.includes(d)).map(d => WEEKDAYS_FA[d]).join('، ') : 'تنظیم نشده'}</span></div>
              <div class="flex items-center justify-between text-[11px] px-1"><span class="text-slate-400">ساعت شروع:</span><span class="text-white font-bold">${s.classDays.length ? [...new Set(s.classDays.map(enClassTime))].map(fd).join('، ') : '—'}</span></div>
              <div class="flex items-center justify-between text-[11px] px-1"><span class="text-slate-400">مدت هر جلسه:</span><span class="text-white font-bold">${fmtMin(s.classMinutes)}</span></div>
            </div>
          </div>
        </section>
        ${doneHw.length ? `
          <section>
            <button type="button" onclick="state.enDoneListOpen=!state.enDoneListOpen; render()" class="flex items-center gap-2 text-slate-600 mb-4">${fa(state.enDoneListOpen ? 'chevron-down' : 'chevron-left', 'text-[10px]')}<span class="text-[10px] font-black uppercase tracking-widest">تکالیف انجام شده (${fd(doneHw.length)})</span></button>
            ${state.enDoneListOpen ? `<div class="space-y-2">${doneHw.map(h => `<div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3"><div class="flex items-center gap-3">${fa('circle-check', 'text-emerald-500 text-xs')}<span class="text-xs font-bold text-slate-400" dir="auto">${esc(h.title)}</span></div><div class="flex items-center gap-3 shrink-0"><button type="button" onclick="openEnglishHwEditor('${h.id}')" aria-label="ویرایش" class="text-slate-600">${fa('pen', 'text-[10px]')}</button><button type="button" onclick="deleteEnglishHomework('${h.id}')" aria-label="حذف" class="text-slate-600">${fa('trash-can', 'text-[10px]')}</button></div></div>`).join('')}</div>` : ''}
          </section>` : ''}`}
      </div>
    </main>`;
}

/* ================= تعمیرات خونه ================= */
const ROOM_ICON = { 'آشپزخونه':'faucet-drip', 'حموم و دستشویی':'shower', 'اتاق خواب':'bed', 'پذیرایی':'couch', 'راهرو':'door-open', 'حیاط و پشت‌بوم':'tree', 'پارکینگ و انباری':'warehouse', 'کل خونه':'house' };
const URGENCY_BOX = { urgent:'bg-rose-500/10 text-rose-500 border-rose-500/10', soon:'bg-amber-500/10 text-amber-500 border-amber-500/10', whenever:'bg-indigo-500/10 text-indigo-400 border-indigo-500/10' };
const URGENCY_PILL = { urgent:'text-rose-500 bg-rose-500/10 border-rose-500/10', soon:'text-amber-500 bg-amber-500/10 border-amber-500/10', whenever:'text-indigo-400 bg-indigo-500/10 border-indigo-500/10' };
const maintIcon = m => /پکیج|آبگرمکن/.test(m.title) ? 'fire-burner' : /فیلتر|آب/.test(m.title) ? 'droplet' : /کولر/.test(m.title) ? 'fan' : /گاز|کپسول/.test(m.title) ? 'fire-extinguisher' : 'screwdriver-wrench';
function maintTone(m){ const n = daysUntil(m.nextDue); return n < 0 ? 'text-rose-400' : n <= MAINT_DUE_SOON_DAYS ? 'text-amber-500' : 'text-emerald-400'; }
function repairStatusLine(r){
  return [r.room, whoLabel(r), r.status === 'waiting' ? 'منتظر استادکار/قطعه' : '', r.note ? `وضعیت: ${r.note}` : ''].filter(Boolean).map(esc).join(' · ') || REPAIR_URGENCY[r.urgency];
}
function repairCardDesk(r){
  const done = r.status === 'done';
  const parts = repairPartsOf(r.id);
  const task = !done && linkedOpenTask(r.taskId);
  const tile = (label, value) => `<div class="p-3 bg-slate-950/50 rounded-2xl border border-slate-800"><p class="text-[9px] text-slate-600 uppercase font-black mb-1">${label}</p>${value}</div>`;
  return `
    <div class="repair-item bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group ${done ? 'opacity-60' : ''}">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-4 min-w-0">
          <div class="w-12 h-12 ${done ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : URGENCY_BOX[r.urgency]} rounded-2xl flex items-center justify-center border shrink-0">${fa(done ? 'circle-check' : ROOM_ICON[r.room] || 'screwdriver-wrench', 'text-xl')}</div>
          <div class="min-w-0">
            <h4 class="text-base font-black ${done ? 'text-slate-400 line-through' : 'text-slate-200'}" dir="auto">${esc(r.title)}</h4>
            <p class="text-[10px] text-slate-500">${done ? `انجام شد ${r.doneAt ? jDate(dateKey(new Date(r.doneAt))) : ''}` : `<span class="${URGENCY_PILL[r.urgency].split(' ')[0]} font-black">${REPAIR_URGENCY[r.urgency]}</span> · ${repairStatusLine(r)}`}</p>
          </div>
        </div>
        <div class="repair-actions opacity-0 transition-opacity flex items-center gap-2 shrink-0">
          ${!done && !task ? `<button type="button" onclick="sendHomeJobToToday('repair', '${r.id}')" class="p-2 text-slate-500 hover:text-amber-400 transition-colors" title="بفرست به امروز" aria-label="بفرست به امروز">${fa('sun', 'text-[11px]')}</button>` : ''}
          <button type="button" onclick="openRepairEditor('${r.id}')" class="p-2 text-slate-500 hover:text-white transition-colors" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[11px]')}</button>
          <button type="button" onclick="toggleRepairDone('${r.id}')" class="p-2 text-slate-500 hover:text-emerald-500 transition-colors" title="${done ? 'برگردون به کارها' : 'تکمیل'}" aria-label="${done ? 'برگردون' : 'تکمیل'}">${fa(done ? 'rotate-left' : 'check', 'text-[11px]')}</button>
          <button type="button" onclick="deleteRepair('${r.id}')" class="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="حذف" aria-label="حذف">${fa('trash', 'text-[11px]')}</button>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-6">
        ${tile('هزینه تخمینی', `<p class="text-sm font-black text-slate-300">${r.estCost != null ? `${fmtPrice(r.estCost)} ${DINARS}` : '---'}</p>`)}
        ${tile('هزینه نهایی', `<p class="text-sm font-black text-emerald-400">${r.actualCost != null ? `${fmtPrice(r.actualCost)} ${DINARS}` : '---'}</p>`)}
        ${tile('تسک مرتبط', task ? `<button type="button" onclick="navigateTo('today')" class="text-sm font-black text-indigo-400 truncate block max-w-full text-right">${esc(task.title)} ${fa('link', 'text-[8px]')}</button>`
          : done ? `<p class="text-sm font-black text-slate-500">---</p>` : `<button type="button" onclick="sendHomeJobToToday('repair', '${r.id}')" class="text-[11px] font-black text-slate-400 hover:text-indigo-400 transition-colors">${fa('sun', 'text-[9px] ml-1')}ارسال به امروز</button>`)}
      </div>
      <div class="flex items-center justify-between pt-4 border-t border-slate-800/50 gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          ${parts.length ? `<span class="text-[10px] font-bold text-slate-500">قطعات مورد نیاز:</span>${parts.map(p => `<button type="button" onclick="toggleRepairPart('${p.id}')" class="text-[10px] bg-slate-800 ${p.bought ? 'text-slate-600 line-through' : 'text-slate-400'} px-2 py-0.5 rounded-lg border border-slate-700" title="${p.bought ? 'خریده شده' : 'خریدنی'}">${esc(p.name)}</button>`).join('')}` : `<span class="text-[10px] font-bold text-slate-600">قطعه‌ای ثبت نشده</span>`}
        </div>
        <button type="button" onclick="openRepairEditor('${r.id}')" class="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors shrink-0">مشاهده جزییات</button>
      </div>
    </div>`;
}
function maintCardDesk(m){
  const task = linkedOpenTask(m.taskId);
  const n = daysUntil(m.nextDue);
  const every = (MAINT_EVERY_CHOICES.find(([k]) => k === m.everyMonths) || [0, `هر ${fd(m.everyMonths)} ماه`])[1];
  return `
    <div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 relative overflow-hidden group">
      <div class="relative z-10">
        <div class="flex items-start justify-between mb-3 gap-2">
          <h4 class="text-sm font-bold text-slate-200 cursor-pointer" dir="auto" onclick="openMaintEditor('${m.id}')">${esc(m.title)}</h4>
          <div class="reveal opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
            ${n <= MAINT_DUE_SOON_DAYS && !task ? `<button type="button" onclick="sendHomeJobToToday('maint', '${m.id}')" class="p-1 text-slate-500 hover:text-amber-400" title="بفرست به امروز" aria-label="بفرست به امروز">${fa('sun', 'text-[10px]')}</button>` : ''}
            <button type="button" onclick="markMaintDone('${m.id}')" class="p-1 text-slate-500 hover:text-emerald-500" title="انجامش دادم" aria-label="انجامش دادم">${fa('check', 'text-[10px]')}</button>
            <button type="button" onclick="openMaintEditor('${m.id}')" class="p-1 text-slate-500 hover:text-white" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[10px]')}</button>
            <button type="button" onclick="deleteMaint('${m.id}')" class="p-1 text-slate-500 hover:text-rose-500" title="حذف" aria-label="حذف">${fa('trash', 'text-[10px]')}</button>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between items-center text-[10px]"><span class="text-slate-500 font-medium">آخرین انجام:</span><span class="text-slate-300 font-black">${m.lastDone ? jDate(m.lastDone, true) : '—'}</span></div>
          <div class="flex justify-between items-center text-[10px]"><span class="text-slate-500 font-medium">نوبت بعدی:</span><span class="${maintTone(m)} font-black">${jDate(m.nextDue, true)} <span class="font-bold opacity-70">(${maintDueLabel(m)})</span></span></div>
          <div class="flex justify-between items-center text-[10px]"><span class="text-slate-500 font-medium">تکرار:</span><span class="text-slate-400 font-bold">${every}${m.room ? ` · ${esc(m.room)}` : ''} · ${esc(whoLabel(m))}</span></div>
          ${task ? `<p class="text-[10px] font-black text-indigo-400">${fa('sun', 'text-[9px] ml-1')}توی امروز</p>` : ''}
        </div>
      </div>
      ${fa(maintIcon(m), 'absolute -bottom-4 -left-4 text-5xl text-white/5 -rotate-12 transition-transform group-hover:scale-110')}
    </div>`;
}
function repairsFilterChips(all){
  const f = state.repairsFilter;
  const rooms = [...new Set(all.map(r => r.room).filter(Boolean))];
  const trades = [...new Set(all.filter(r => r.who === 'pro').map(r => r.trade || 'استادکار'))];
  if(rooms.length < 2 && !trades.length) return '';
  return `
    <div class="flex items-center gap-2 flex-wrap">
      ${rooms.length > 1 ? `<span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">جا:</span>${rooms.map(r => choiceChip(esc(r), f.room === r, `setRepairsFilter('room', this.dataset.v)`, `data-v="${ea(r)}"`)).join('')}` : ''}
      ${trades.length ? `<span class="text-[10px] font-black text-slate-600 uppercase tracking-widest ${rooms.length > 1 ? 'mr-3' : ''}">استادکار:</span>${trades.map(t => choiceChip(`${esc(t)} (${fd(all.filter(r => r.who === 'pro' && (r.trade || 'استادکار') === t).length)})`, f.trade === t, `setRepairsFilter('trade', this.dataset.v)`, `data-v="${ea(t)}"`)).join('')}` : ''}
    </div>
    ${f.trade && trades.includes(f.trade) ? `<p class="text-[10px] text-indigo-400 font-bold">وقتی ${esc(f.trade)} اومد، همه‌ی این‌ها رو یه‌جا بهش بگو.</p>` : ''}`;
}
function filteredOpenRepairs(){
  const all = (state.homeRepairs || []).filter(r => r.status !== 'done');
  const f = state.repairsFilter;
  let list = all;
  if(f.room && all.some(r => r.room === f.room)) list = list.filter(r => r.room === f.room);
  if(f.trade) list = list.filter(r => r.who === 'pro' && (r.trade || 'استادکار') === f.trade);
  return { all, list: sortRepairs(list) };
}
function repairsRightColumn(){
  const open = (state.homeRepairs || []).filter(r => r.status !== 'done');
  const urgent = open.filter(r => r.urgency === 'urgent').length;
  const est = open.reduce((s, r) => s + (r.estCost || 0), 0);
  const parts = homePartsToBuy();
  const maintDue = (state.homeMaint || []).filter(m => daysUntil(m.nextDue) <= MAINT_DUE_SOON_DAYS).length;
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      ${cardTitle('لیست خرید قطعات', 'basket-shopping', 'text-amber-500')}
      <div class="space-y-3">
        ${parts.length ? parts.map(p => { const r = state.homeRepairs.find(x => x.id === p.repairId); return `
          <div class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800 group">
            <button type="button" onclick="toggleRepairPart('${p.id}')" aria-label="خریدم" class="w-5 h-5 border-2 border-slate-700 rounded bg-slate-950 flex items-center justify-center group-hover:border-indigo-500 shrink-0">${fa('check', 'text-[8px] text-indigo-500 opacity-0 group-hover:opacity-100')}</button>
            <span class="text-[11px] text-slate-300 font-medium flex-1" dir="auto">${esc(p.name)}</span>
            ${r ? `<span class="text-[9px] text-slate-600 truncate max-w-[90px]" title="${ea(r.title)}">${esc(r.title)}</span>` : ''}
          </div>`; }).join('') : `<p class="text-[11px] text-slate-600 text-center py-2">قطعه‌ای برای خرید نیست</p>`}
      </div>
      <button type="button" onclick="state.repairsTab='parts'; render()" class="w-full mt-6 py-3 bg-indigo-500/10 text-indigo-400 rounded-xl text-[10px] font-black border border-indigo-500/10 hover:bg-indigo-500/20 transition-all">افزودن قطعه ${fa('arrow-left', 'mr-1')}</button>
    </div>
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
      ${cardTitle('خلاصه وضعیت تعمیرات', 'chart-pie', 'text-indigo-400')}
      <div class="space-y-4">
        <div class="flex justify-between items-center"><span class="text-[10px] text-slate-500">تعمیرات باز:</span><span class="text-sm font-black text-white">${fd(open.length)} مورد</span></div>
        <div class="flex justify-between items-center"><span class="text-[10px] text-rose-500 font-bold">موارد فوری:</span><span class="text-sm font-black text-rose-500">${fd(urgent)} مورد</span></div>
        <div class="flex justify-between items-center"><span class="text-[10px] text-amber-500 font-bold">سرویس‌های نزدیک موعد:</span><span class="text-sm font-black text-amber-500">${fd(maintDue)} مورد</span></div>
        <div class="pt-4 border-t border-slate-800"><div class="flex justify-between items-center"><span class="text-[10px] text-slate-500">هزینه تخمینی باقی‌مانده:</span><span class="text-sm font-black text-indigo-400">${est ? fmtPrice(est) : '۰'} <span class="text-[9px]">DINARS</span></span></div></div>
      </div>
    </div>`;
}
function maintPresetsBlock(){
  const have = new Set((state.homeMaint || []).map(m => m.title));
  const presets = MAINT_PRESETS.map((p, i) => ({ p, i })).filter(({ p }) => !have.has(p.title));
  if(!presets.length) return '';
  return `
    <div class="space-y-3">
      ${fieldLabel('پیشنهادها — بزن تا اضافه‌ش کنی')}
      <div class="flex flex-wrap gap-1.5">${presets.map(({ p, i }) => choiceChip(`+ ${esc(p.title)}`, false, `openMaintEditor(null, ${i})`)).join('')}</div>
    </div>`;
}
function renderRepairsDesktop(){
  const tab = state.repairsTab;
  const { all, list } = filteredOpenRepairs();
  const maint = [...(state.homeMaint || [])].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const header = deskHeader({ icon:'hammer', title:'تعمیرات و نگهداری منزل', sub:'مدیریت پروژه‌های فنی و سرویس‌های دوره‌ای', profile:`${fd(all.length)} کار باز`,
    right: segTabs([['list','فعال'], ['maint','سرویس‌ها'], ['done','تکمیل شده'], ['parts','قطعات']], tab, id => `state.repairsTab='${id}'; render()`) });
  let left;
  if(tab === 'maint') left = `
    <section class="space-y-6">
      <div class="flex items-center justify-between">${sectionTitle('سرویس‌های دوره‌ای')}<button type="button" onclick="openMaintEditor(null)" class="flex items-center gap-2 text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl hover:bg-indigo-500/20 transition-all border border-indigo-500/10">${fa('plus')} کار دوره‌ای تازه</button></div>
      ${maint.length ? `<div class="grid grid-cols-2 gap-4">${maint.map(maintCardDesk).join('')}</div>` : `<div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">${emptyNote('هنوز کار دوره‌ای ثبت نکردی — کارهایی که هر چند ماه یه بار باید انجام بشن (سرویس پکیج، فیلتر تصفیه آب…). موعدشون که نزدیک بشه، از یه هفته قبل توی اعلان صبح یادت می‌ندازم.', 'rotate')}</div>`}
      ${maintPresetsBlock()}
    </section>`;
  else if(tab === 'done'){
    const done = (state.homeRepairs || []).filter(r => r.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
    const jy = window.jalaali.toJalaali(new Date()).jy;
    const spentYear = done.filter(r => r.doneAt && window.jalaali.toJalaali(new Date(r.doneAt)).jy === jy).reduce((s, r) => s + (r.actualCost || 0), 0);
    const spentAll = done.reduce((s, r) => s + (r.actualCost || 0), 0);
    left = `
      <section class="space-y-6">
        <div class="flex items-center justify-between">${sectionTitle('تعمیرات تکمیل شده')}${spentAll ? `<span class="text-[11px] font-black text-emerald-400">خرج امسال: ${fmtDinar(spentYear)}${spentAll !== spentYear ? ` · از اول: ${fmtDinar(spentAll)}` : ''}</span>` : ''}</div>
        <div class="space-y-4">${done.length ? done.map(repairCardDesk).join('') : emptyNote('هنوز تعمیری تموم نشده', 'circle-check')}</div>
      </section>`;
  } else if(tab === 'parts'){
    const open = sortRepairs(all);
    const np = state.newPart;
    const pickId = open.some(r => r.id === np.repairId) ? np.repairId : (open[0] && open[0].id);
    const groups = open.filter(r => repairPartsOf(r.id).length);
    left = `
      <section class="space-y-6">
        ${sectionTitle('قطعات')}
        ${open.length ? `
          <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
            <div class="grid grid-cols-12 gap-4">
              <div class="col-span-6 relative">${fa('screwdriver-wrench', 'absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500')}
                <input type="text" id="new-part-name" dir="auto" placeholder="چه قطعه‌ای باید بخری؟" value="${ea(np.name)}" oninput="state.newPart.name=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); addRepairPart();}" class="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pr-12 pl-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600"></div>
              <div class="col-span-5"><select onchange="state.newPart.repairId=this.value" class="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-[11px] font-black text-slate-400 focus:outline-none focus:border-indigo-500/50">${open.map(r => `<option value="${r.id}" ${r.id === pickId ? 'selected' : ''}>برای: ${esc(r.title)}</option>`).join('')}</select></div>
              <div class="col-span-1"><button type="button" onclick="addRepairPart()" aria-label="افزودن قطعه" class="w-full h-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-indigo-900/20">${fa('plus')}</button></div>
            </div>
          </div>` : ''}
        ${groups.length ? groups.map(r => `
          <div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
            <button type="button" onclick="openRepairEditor('${r.id}')" class="text-sm font-black text-slate-200 mb-4 block" dir="auto">${esc(r.title)}${r.room ? ` <span class="text-[10px] text-slate-500 font-bold">· ${esc(r.room)}</span>` : ''}</button>
            <div class="space-y-2">${repairPartsOf(r.id).sort((a, b) => (a.bought - b.bought) || (a.createdAt || '').localeCompare(b.createdAt || '')).map(p => `
              <div class="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800 group">
                <button type="button" onclick="toggleRepairPart('${p.id}')" aria-label="${p.bought ? 'خریده نشده' : 'خریدم'}" class="w-5 h-5 ${p.bought ? 'bg-emerald-500 text-white' : 'border-2 border-slate-700 bg-slate-950'} rounded flex items-center justify-center shrink-0">${p.bought ? fa('check', 'text-[8px]') : ''}</button>
                <span class="text-[11px] ${p.bought ? 'text-slate-500 line-through' : 'text-slate-300'} font-medium flex-1" dir="auto">${esc(p.name)}</span>
                <button type="button" onclick="deleteRepairPart('${p.id}')" aria-label="حذف" class="reveal opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all">${fa('xmark', 'text-xs')}</button>
              </div>`).join('')}</div>
          </div>`).join('') : emptyNote(open.length ? 'قطعه‌ای برای خرید نیست' : 'وقتی کار تعمیری داشته باشی، قطعه‌هاش این‌جا جمع می‌شن', 'basket-shopping')}
      </section>`;
  } else left = `
    <section id="urgent-tasks">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2"><span class="w-2 h-2 bg-rose-500 rounded-full ${all.some(r => r.urgency === 'urgent') ? 'animate-pulse' : 'opacity-30'}"></span> موارد فوری و باز</h3>
      </div>
      <div class="space-y-4">
        ${repairsFilterChips(all)}
        ${!all.length ? emptyNote('چیزی برای تعمیر نمونده — با دکمه‌ی + یه مورد تازه ثبت کن.', 'house-circle-check') : !list.length ? emptyNote('با این فیلتر چیزی نیست') : list.map(repairCardDesk).join('')}
      </div>
    </section>
    <section id="periodic-maintenance" class="pt-8 border-t border-slate-800/50">
      <div class="flex items-center justify-between mb-6">${sectionTitle('سرویس‌های دوره‌ای')}<button type="button" onclick="state.repairsTab='maint'; render()" class="text-[10px] font-black text-indigo-400">همه و افزودن</button></div>
      ${maint.length ? `<div class="grid grid-cols-2 gap-4">${maint.slice(0, 4).map(maintCardDesk).join('')}</div>` : emptyNote('هنوز سرویس دوره‌ای ثبت نکردی', 'rotate')}
    </section>`;
  const body = `<div class="max-w-6xl mx-auto grid grid-cols-12 gap-8"><div class="col-span-8 space-y-8">${left}</div><div class="col-span-4 space-y-8">${repairsRightColumn()}</div></div>`;
  return deskMain({ header, body, fab: deskFab('openNewRepair()', 'indigo', 'تعمیر تازه') });
}
function repairCardMob(r){
  const done = r.status === 'done';
  const parts = repairPartsOf(r.id);
  const task = !done && linkedOpenTask(r.taskId);
  return `
    <div class="bg-slate-900 border ${r.urgency === 'urgent' && !done ? 'border-rose-500/30' : 'border-slate-800'} rounded-3xl p-5 relative overflow-hidden ${done ? 'opacity-60' : ''}">
      <div class="flex items-start justify-between mb-4 relative z-10 gap-3">
        <div class="space-y-1 min-w-0">
          <span class="text-[8px] font-black ${done ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' : URGENCY_PILL[r.urgency]} px-1.5 py-0.5 rounded border uppercase">${done ? 'انجام شد' : REPAIR_URGENCY[r.urgency]}</span>
          <h4 class="text-sm font-black text-white" dir="auto">${esc(r.title)}</h4>
          <p class="text-[9px] text-slate-500">${repairStatusLine(r)}</p>
        </div>
        ${r.estCost != null || r.actualCost != null ? `<div class="flex flex-col items-end shrink-0"><span class="text-[10px] font-black text-indigo-400">${fmtPrice(done && r.actualCost != null ? r.actualCost : r.estCost)} <span class="text-[8px] opacity-50 uppercase">دینار</span></span><span class="text-[8px] font-bold text-slate-500 uppercase">${done && r.actualCost != null ? 'واقعی' : 'تخمینی'}</span></div>` : ''}
      </div>
      ${parts.length ? `<div class="space-y-2 mb-6 relative z-10">${parts.map(p => `
        <button type="button" onclick="toggleRepairPart('${p.id}')" class="w-full flex items-center gap-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
          ${p.bought ? `<div class="w-4 h-4 bg-emerald-500 text-white rounded flex items-center justify-center shrink-0">${fa('check', 'text-[8px]')}</div><span class="text-[10px] text-slate-500 line-through" dir="auto">${esc(p.name)}</span>` : `<div class="w-4 h-4 border border-slate-700 rounded bg-slate-950 shrink-0"></div><span class="text-[10px] text-slate-300" dir="auto">${esc(p.name)}</span>`}
        </button>`).join('')}</div>` : ''}
      <div class="flex items-center justify-between relative z-10">
        <button type="button" onclick="toggleRepairDone('${r.id}')" class="${done ? 'bg-slate-800 text-slate-300' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'} px-4 py-2 rounded-xl text-[9px] font-black">${done ? 'برگردون به کارها' : 'تکمیل و بایگانی'}</button>
        <div class="flex items-center gap-3">
          ${!done ? `<button type="button" onclick="sendHomeJobToToday('repair', '${r.id}')" aria-label="${task ? 'توی امروزه' : 'بفرست به امروز'}" class="${task ? 'text-indigo-400' : 'text-slate-600'} hover:text-white transition-colors">${fa('link', 'text-[10px]')}</button>` : ''}
          <button type="button" onclick="openRepairEditor('${r.id}')" aria-label="ویرایش" class="text-slate-600 hover:text-white transition-colors">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="deleteRepair('${r.id}')" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-colors">${fa('trash-can', 'text-[10px]')}</button>
        </div>
      </div>
    </div>`;
}
function maintCardMob(m){
  const task = linkedOpenTask(m.taskId);
  return `
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 opacity-90">
      <div class="flex items-start justify-between mb-4 gap-3" onclick="openMaintEditor('${m.id}')">
        <div class="space-y-1"><span class="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/10 uppercase">دوره‌ای</span><h4 class="text-sm font-black text-white" dir="auto">${esc(m.title)}</h4></div>
        ${fa('rotate', 'text-indigo-500/50 text-xs')}
      </div>
      <div class="grid grid-cols-2 gap-3 text-[10px]">
        <div class="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50"><span class="text-slate-600 block mb-1">آخرین انجام:</span><span class="text-slate-300 font-bold">${m.lastDone ? jDate(m.lastDone, true) : '—'}</span></div>
        <div class="bg-slate-950/50 p-2 rounded-xl border border-slate-800/50"><span class="text-slate-600 block mb-1">نوبت بعدی:</span><span class="${maintTone(m)} font-bold">${jDate(m.nextDue, true)}</span></div>
      </div>
      <div class="flex items-center justify-between mt-4">
        <span class="text-[9px] font-bold ${maintTone(m)}">${maintDueLabel(m)}${task ? ' · توی امروز' : ''}</span>
        <div class="flex items-center gap-3">
          ${daysUntil(m.nextDue) <= MAINT_DUE_SOON_DAYS && !task ? `<button type="button" onclick="sendHomeJobToToday('maint', '${m.id}')" aria-label="بفرست به امروز" class="text-slate-600">${fa('sun', 'text-[10px]')}</button>` : ''}
          <button type="button" onclick="markMaintDone('${m.id}')" class="text-[9px] font-black text-emerald-400">انجامش دادم</button>
          <button type="button" onclick="deleteMaint('${m.id}')" aria-label="حذف" class="text-slate-600">${fa('trash-can', 'text-[10px]')}</button>
        </div>
      </div>
    </div>`;
}
function renderRepairsMobile(){
  const { all, list } = filteredOpenRepairs();
  const urgent = all.filter(r => r.urgency === 'urgent').length;
  const est = all.reduce((s, r) => s + (r.estCost || 0), 0);
  const maint = [...(state.homeMaint || [])].sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const done = (state.homeRepairs || []).filter(r => r.status === 'done').sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));
  return `
    ${mobHeader(mobTitle('تعمیرات', `<span class="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/10">${fd(all.length)} مورد باز</span>`), mobIconBtn('plus', 'openNewRepair()', 'تعمیر تازه', 'primary'))}
    <div class="p-4 grid grid-cols-3 gap-3">
      <div class="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-center"><p class="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">فوری</p><span class="text-lg font-black text-white">${fd(urgent)}</span></div>
      <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-3 text-center col-span-2"><p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">هزینه تخمینی باقیمانده</p><div class="flex items-baseline justify-center gap-1"><span class="text-lg font-black text-white">${est ? fmtPrice(est) : '۰'}</span><span class="text-[8px] font-bold text-slate-500 uppercase">دینار</span></div></div>
    </div>
    <main class="safe-area-bottom px-4">
      ${renderStatusBars()}
      <section id="open-repairs" class="mb-8">
        <div class="flex items-center justify-between mb-4 px-1"><h3 class="text-xs font-black text-white uppercase tracking-widest">تعمیرات فعال</h3><span class="text-[9px] font-bold text-slate-500">سورت بر اساس فوریت</span></div>
        <div class="space-y-4">
          ${repairsFilterChips(all)}
          ${!all.length ? emptyNote('چیزی برای تعمیر نمونده', 'house-circle-check') : !list.length ? emptyNote('با این فیلتر چیزی نیست') : list.map(repairCardMob).join('')}
        </div>
      </section>
      <section class="mb-8">
        <div class="flex items-center justify-between mb-4 px-1"><h3 class="text-xs font-black text-white uppercase tracking-widest">سرویس‌های دوره‌ای</h3><button type="button" onclick="openMaintEditor(null)" class="text-[10px] font-black text-indigo-400">+ افزودن</button></div>
        <div class="space-y-4">${maint.map(maintCardMob).join('') || emptyNote('هنوز سرویس دوره‌ای ثبت نکردی', 'rotate')}${maintPresetsBlock()}</div>
      </section>
      ${done.length ? `
        <section class="mb-8">
          <button type="button" onclick="state.repairsDoneOpen=!state.repairsDoneOpen; render()" class="flex items-center gap-2 text-slate-600 mb-4">${fa(state.repairsDoneOpen ? 'chevron-down' : 'chevron-left', 'text-[10px]')}<span class="text-[10px] font-black uppercase tracking-widest">تکمیل شده (${fd(done.length)})</span></button>
          ${state.repairsDoneOpen ? `<div class="space-y-4">${done.map(repairCardMob).join('')}</div>` : ''}
        </section>` : ''}
    </main>`;
}
function openNewRepair(){ state.newRepair = { title:'', room:'', urgency:'soon' }; state.newRepairOpen = true; render(); }
function saveNewRepair(){
  const el = document.getElementById('new-repair-title');
  if(!((el && el.value) || state.newRepair.title || '').trim()){ if(el) el.focus(); return; }
  state.newRepairOpen = false;
  addRepair();
}
function renderNewRepairModal(){
  const nr = state.newRepair;
  return renderEditorFrame({ title:'تعمیر تازه', onClose:'state.newRepairOpen=false; render()', onSave:'saveNewRepair()', saveLabel:'افزودن',
    body:`
      ${field('چی باید درست بشه؟', `<input type="text" id="new-repair-title" dir="auto" value="${ea(nr.title)}" oninput="state.newRepair.title=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); saveNewRepair();}" class="${titleInputCls()}">`)}
      ${field('کجای خونه؟', chipBox(REPAIR_ROOMS.map(r => choiceChip(esc(r), nr.room === r, `state.newRepair.title=document.getElementById('new-repair-title').value; state.newRepair.room = state.newRepair.room===this.dataset.v ? '' : this.dataset.v; render()`, `data-v="${ea(r)}"`)).join('')))}
      ${field('فوریت', prioritySeg(nr.urgency, 'newRepairUrgency', ['urgent','soon','whenever'], REPAIR_URGENCY))}
      <p class="text-[10px] text-slate-500 leading-relaxed">بقیه‌ی جزئیات (استادکار، هزینه، قطعه‌ها) رو بعداً از «مشاهده جزییات» اضافه کن.</p>`,
  });
}
function newRepairUrgency(u){ state.newRepair.title = (document.getElementById('new-repair-title') || {}).value || state.newRepair.title; state.newRepair.urgency = u; render(); }
function renderRepairEditorModal(){
  const ed = state.repairEditor;
  const rooms = [...new Set([...REPAIR_ROOMS, ...state.homeRepairs.map(r => r.room), ...state.homeMaint.map(m => m.room)].filter(Boolean))];
  const trades = [...new Set([...REPAIR_TRADES, ...state.homeRepairs.map(r => r.trade), ...state.homeMaint.map(m => m.trade)].filter(Boolean))];
  const box = 'w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all pl-16';
  return renderEditorFrame({ title:'ویرایش تعمیر', onClose:'closeRepairEditor()', onSave:'confirmRepairEditor()', onDelete:`closeRepairEditor(); deleteRepair('${ed.repairId}')`,
    body:`
      ${field('عنوان', `<input type="text" dir="auto" value="${ea(ed.title)}" oninput="state.repairEditor.title=this.value" class="${titleInputCls()}">`)}
      ${field('کجای خونه؟', chipBox(rooms.map(r => choiceChip(esc(r), ed.room === r, "repairEditorPick('room', this.dataset.v)", `data-v="${ea(r)}"`)).join('')) + `<input type="text" dir="auto" placeholder="یا یه جای دیگه بنویس" value="${rooms.includes(ed.room) ? '' : ea(ed.room)}" oninput="state.repairEditor.room=this.value" class="${inputCls}">`)}
      <div class="grid grid-cols-2 gap-6">
        ${field('فوریت', prioritySeg(ed.urgency, "repairEditorUrgency", ['urgent','soon','whenever'], REPAIR_URGENCY))}
        ${ed.status !== 'done' ? field('وضعیت', segmented([['open','ثبت‌شده'], ['waiting','منتظر قطعه']], ed.status, v => `repairEditorPick('status', '${v}')`)) : '<div></div>'}
      </div>
      ${field('کی درستش می‌کنه؟', segmented([['self','خودم'], ['pro','استادکار']], ed.who, v => `repairEditorPick('who', '${v}')`) + (ed.who === 'pro' ? chipBox(trades.map(t => choiceChip(esc(t), ed.trade === t, "repairEditorPick('trade', this.dataset.v)", `data-v="${ea(t)}"`)).join('')) + `<input type="text" dir="auto" placeholder="یا یه استادکار دیگه بنویس" value="${trades.includes(ed.trade) ? '' : ea(ed.trade)}" oninput="state.repairEditor.trade=this.value" class="${inputCls}">` : ''))}
      <div class="grid grid-cols-2 gap-6">
        ${field('هزینه تخمینی', `<div class="relative"><input type="text" inputmode="numeric" value="${ea(ed.estCost)}" oninput="state.repairEditor.estCost=normalizeNumericInput(this)" class="${box}"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">DINARS</span></div>`)}
        ${field('هزینه واقعی', `<div class="relative"><input type="text" inputmode="numeric" value="${ea(ed.actualCost)}" oninput="state.repairEditor.actualCost=normalizeNumericInput(this)" class="${box}"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">DINARS</span></div>`)}
      </div>
      <div class="space-y-3">
        ${fieldLabel('قطعه‌هایی که باید بخری')}
        <div class="space-y-2">
          ${ed.parts.map((p, i) => `
            <div class="flex items-center gap-3 bg-slate-900/50 border border-slate-800 p-3 rounded-xl group">
              <button type="button" onclick="repairEditorTogglePart(${i})" aria-label="${p.bought ? 'خریده نشده' : 'خریدم'}" class="w-4 h-4 ${p.bought ? 'bg-emerald-500 text-white' : 'border border-slate-700 bg-slate-950'} rounded flex items-center justify-center shrink-0">${p.bought ? fa('check', 'text-[8px]') : ''}</button>
              <span class="text-xs ${p.bought ? 'text-slate-500 line-through' : 'text-slate-300'} flex-1" dir="auto">${esc(p.name)}</span>
              <button type="button" onclick="repairEditorRemovePart(${i})" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-all">${fa('xmark', 'text-xs')}</button>
            </div>`).join('')}
          <div class="flex items-center gap-3 bg-slate-900/30 border border-dashed border-slate-800 p-3 rounded-xl">
            ${fa('plus', 'text-slate-700 text-xs')}
            <input type="text" id="repair-ed-part" dir="auto" placeholder="مثلاً: شیر مخلوط، چسب آکواریوم" value="${ea(ed.newPart)}" oninput="state.repairEditor.newPart=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); repairEditorAddPart();}" class="flex-1 bg-transparent text-xs text-slate-300 focus:outline-none placeholder:text-slate-600">
            <button type="button" onclick="repairEditorAddPart()" class="text-[10px] font-black text-indigo-400">افزودن</button>
          </div>
        </div>
      </div>
      ${field('یادداشت', `<textarea dir="auto" placeholder="جزئیات، شماره‌ی استادکار، اندازه‌ها…" oninput="state.repairEditor.note=this.value" class="${textareaCls()}">${esc(ed.note)}</textarea>`)}`,
  });
}
function repairEditorUrgency(u){ repairEditorPick('urgency', u); }
function renderMaintEditorModal(){
  const ed = state.maintEditor;
  const rooms = [...new Set([...REPAIR_ROOMS, ...state.homeMaint.map(m => m.room)].filter(Boolean))];
  const trades = [...new Set([...REPAIR_TRADES, ...state.homeRepairs.map(r => r.trade), ...state.homeMaint.map(m => m.trade)].filter(Boolean))];
  const custom = !MAINT_EVERY_CHOICES.some(([k]) => k === ed.everyMonths);
  return renderEditorFrame({ title: ed.maintId ? 'ویرایش کار دوره‌ای' : 'کار دوره‌ای تازه', onClose:'closeMaintEditor()', onSave:'confirmMaintEditor()', onDelete: ed.maintId ? `closeMaintEditor(); deleteMaint('${ed.maintId}')` : '',
    body:`
      ${field('عنوان', `<input type="text" dir="auto" placeholder="مثلاً: سرویس پکیج" value="${ea(ed.title)}" oninput="state.maintEditor.title=this.value" class="${titleInputCls()}">`)}
      ${field('هر چند وقت یه بار؟', chipBox(MAINT_EVERY_CHOICES.map(([k, label]) => choiceChip(label, ed.everyMonths === k, `state.maintEditor.everyMonths=${k}; render()`)).join('') + `<span class="flex items-center gap-1 text-[10px] font-bold text-slate-500">هر <input type="text" inputmode="numeric" value="${custom ? fd(ed.everyMonths) : ''}" oninput="normalizeNumericInput(this)" onchange="const v=parseInt(this.value,10); if(v>=1 && v<=60){ state.maintEditor.everyMonths=v; render(); }" class="w-10 bg-slate-950 border border-slate-800 rounded-lg px-1 py-0.5 text-center text-slate-200"> ماه</span>`))}
      ${field(ed.maintId ? 'موعد بعدی' : 'اولین موعد', `<button type="button" onclick="toggleMaintCalendar()" class="w-full bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs font-bold text-slate-300 flex items-center justify-between hover:border-indigo-500/50 transition-colors"><span>${jDate(ed.nextDue, true)}</span>${fa('calendar-day', 'text-indigo-500')}</button>
        ${ed.calendarOpen ? renderPickCalendar({ jy:ed.calJY, jm:ed.calJM, date:ed.nextDue, prev:'maintCalPrevMonth', next:'maintCalNextMonth', pick:'maintCalPick' }) : ''}
        <p class="text-[10px] text-slate-500 leading-relaxed px-1">از یه هفته قبلِ موعد توی اعلان صبح میاد؛ وقتی بزنی «انجامش دادم»، موعد بعدی خودش جلو می‌ره.</p>`)}
      ${field('کجای خونه؟', chipBox(rooms.map(r => choiceChip(esc(r), ed.room === r, "maintEditorPick('room', this.dataset.v)", `data-v="${ea(r)}"`)).join('')))}
      ${field('کی انجامش می‌ده؟', segmented([['self','خودم'], ['pro','استادکار']], ed.who, v => `maintEditorPick('who', '${v}')`) + (ed.who === 'pro' ? chipBox(trades.map(t => choiceChip(esc(t), ed.trade === t, "maintEditorPick('trade', this.dataset.v)", `data-v="${ea(t)}"`)).join('')) : ''))}
      ${field('یادداشت', `<textarea dir="auto" placeholder="مدل فیلتر، شماره‌ی سرویس‌کار…" oninput="state.maintEditor.note=this.value" class="${textareaCls()}">${esc(ed.note)}</textarea>`)}`,
  });
}
function renderRepairDoneModal(){
  const m = state.repairDoneModal;
  const r = state.homeRepairs.find(x => x.id === m.id);
  if(!r) return '';
  return renderDialog({ title:`${fa('circle-check', 'text-emerald-500 ml-1')} درست شد`, onClose:'closeRepairDoneModal()', body:
    field(`«${esc(r.title)}» در کل چقدر خرج داشت؟`, `<div class="relative"><input type="text" inputmode="numeric" value="${ea(m.cost)}" oninput="state.repairDoneModal.cost=normalizeNumericInput(this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); saveRepairDoneCost();}" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:outline-none focus:border-indigo-500/50 pl-16"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">DINARS</span></div>`),
    footer: dlgPrimary('ذخیره', 'saveRepairDoneCost()') + dlgSecondary('بعداً', 'closeRepairDoneModal()') });
}

/* ================= خریدها ================= */
const PURCHASE_PILL = { high:'text-rose-500 bg-rose-500/10', medium:'text-amber-500 bg-amber-500/10', low:'text-slate-400 bg-slate-800' };
function purchaseItemDesk(p){
  return `
    <div class="purchase-item bg-slate-900/40 border border-slate-800 rounded-3xl p-5 hover:border-indigo-500/30 transition-all group flex items-center justify-between">
      <div class="flex items-center gap-4 min-w-0">
        <button type="button" onclick="togglePurchaseBought('${p.id}')" aria-label="خریدم" class="w-8 h-8 border-2 border-slate-700 rounded-xl bg-slate-950 flex items-center justify-center hover:border-indigo-500 transition-colors group/check shrink-0">${fa('check', 'text-indigo-500 opacity-0 group-hover/check:opacity-30')}</button>
        <div class="min-w-0">
          <h4 class="text-sm font-bold text-slate-200" dir="auto">${esc(p.title)}</h4>
          <div class="flex items-center gap-3 mt-1">
            ${p.priority ? `<span class="text-[9px] font-black ${PURCHASE_PILL[p.priority]} uppercase px-1.5 py-0.5 rounded">${PRIORITY_LABEL[p.priority]}</span>` : ''}
            ${p.price != null ? `<span class="text-[10px] font-bold text-slate-400">${fmtPrice(p.price)} <span class="text-[8px]">DINARS</span></span>` : ''}
            ${p.createdAt ? `<span class="text-[10px] text-slate-600">${jDate(dateKey(new Date(p.createdAt)))}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="purchase-actions opacity-0 transition-opacity flex items-center gap-2">
        <button type="button" onclick="openPurchaseEditor('${p.id}')" class="p-2 text-slate-500 hover:text-white transition-colors" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[10px]')}</button>
        <button type="button" onclick="deletePurchase('${p.id}')" class="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="حذف" aria-label="حذف">${fa('trash', 'text-[10px]')}</button>
      </div>
    </div>`;
}
function boughtItemDesk(p){
  return `
    <div class="purchase-item bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-5 flex items-center justify-between opacity-60 group">
      <div class="flex items-center gap-4 min-w-0">
        <div class="w-8 h-8 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center shrink-0">${fa('check', 'text-xs')}</div>
        <div class="min-w-0">
          <h4 class="text-sm font-bold text-slate-400 line-through" dir="auto">${esc(p.title)}</h4>
          <p class="text-[10px] text-slate-600">${p.boughtAt ? `خریداری شده در ${jDate(dateKey(new Date(p.boughtAt)))}` : 'خریداری شده'}${p.price != null ? ` · ${fmtPrice(p.price)} DINARS` : ''}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button type="button" onclick="deletePurchase('${p.id}')" title="حذف" aria-label="حذف" class="purchase-actions opacity-0 transition-opacity text-slate-600 hover:text-rose-500">${fa('trash', 'text-[10px]')}</button>
        <button type="button" onclick="togglePurchaseBought('${p.id}')" title="برگرداندن به لیست" aria-label="برگرداندن به لیست" class="text-slate-600 hover:text-rose-500 transition-colors">${fa('rotate-left', 'text-[10px]')}</button>
      </div>
    </div>`;
}
function renderPurchasesDesktop(){
  const pending = sortPurchases(state.purchases.filter(p => !p.bought));
  const bought = sortPurchases(state.purchases.filter(p => p.bought));
  const recent = state.purchases.filter(p => p.bought && p.boughtAt && Date.now() - new Date(p.boughtAt).getTime() < 30 * 86400000).sort((a, b) => b.boughtAt.localeCompare(a.boughtAt));
  const total = pending.reduce((s, p) => s + (p.price || 0), 0);
  const tab = state.purchasesTab;
  const sortBtn = (mode, label) => `<button type="button" onclick="setPurchaseSort('${mode}')" class="px-3 py-1 text-[9px] font-black ${state.purchaseSort === mode ? 'bg-slate-800 text-white rounded-lg' : 'text-slate-500 hover:text-slate-300'}">${label}</button>`;
  const header = deskHeader({ icon:'cart-shopping', title:'لیست خریدها', sub:'مدیریت کالاهای مورد نیاز و خریداری شده', profile:`${fd(pending.length)} مورد در لیست انتظار`,
    right: segTabs([['all','همه موارد'], ['bought','خریداری شده'], ['pending','نیاز به خرید']], tab, id => `state.purchasesTab='${id}'; render()`) });
  const body = `
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="space-y-6">
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <div class="grid grid-cols-12 gap-4">
            <div class="col-span-6 relative">
              ${fa('cart-plus', 'absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500')}
              <input type="text" id="new-purchase-title" placeholder="نام کالا..." value="${ea(state.newPurchaseTitle || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault(); addPurchase();}" class="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pr-12 pl-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600">
            </div>
            <div class="col-span-3 relative">
              <input type="text" id="new-purchase-price" inputmode="numeric" placeholder="قیمت..." value="${ea(state.newPurchasePrice || '')}" oninput="normalizeNumericInput(this)" onkeydown="if(event.key==='Enter'){event.preventDefault(); addPurchase();}" class="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] text-slate-600 font-black">DINARS</span>
            </div>
            <div class="col-span-2">
              <select aria-label="اولویت" onchange="state.newPurchasePriority=this.value||null" class="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 px-4 text-[10px] font-black text-slate-400 focus:outline-none focus:border-indigo-500/50 appearance-none">
                <option value="" ${!state.newPurchasePriority ? 'selected' : ''}>بدون اولویت</option>
                <option value="high" ${state.newPurchasePriority === 'high' ? 'selected' : ''}>اولویت بالا</option>
                <option value="medium" ${state.newPurchasePriority === 'medium' ? 'selected' : ''}>متوسط</option>
                <option value="low" ${state.newPurchasePriority === 'low' ? 'selected' : ''}>پایین</option>
              </select>
            </div>
            <div class="col-span-1"><button type="button" onclick="addPurchase()" aria-label="افزودن" class="w-full h-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-indigo-900/20">${fa('plus')}</button></div>
          </div>
        </div>
        <div class="flex items-center justify-between px-4">
          <div class="flex items-center gap-4">
            <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">مرتب‌سازی بر اساس:</span>
            <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">${sortBtn('priority', 'اولویت')}${sortBtn('cheapest', 'ارزان‌ترین')}${sortBtn('priciest', 'گران‌ترین')}</div>
          </div>
          <div class="text-right"><p class="text-[9px] text-slate-600 uppercase font-black">مجموع مبلغ لیست انتظار</p><p class="text-base font-black text-indigo-400">${fmtPrice(total) || '۰'} <span class="text-[10px]">DINARS</span></p></div>
        </div>
      </div>
      ${tab !== 'bought' ? `
        <div class="space-y-4">
          <div class="flex items-center justify-between px-2"><h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">لیست انتظار</h3></div>
          ${pending.length ? pending.map(purchaseItemDesk).join('') : emptyNote('فعلاً خریدی در انتظار نیست', 'cart-shopping')}
        </div>` : ''}
      ${tab === 'all' && recent.length ? `
        <div class="space-y-4 pt-8 border-t border-slate-800/50">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">خریداری شده اخیر</h3>
            <button type="button" onclick="state.archiveSection='purchases'; navigateTo('archive')" class="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">مشاهده در آرشیو</button>
          </div>
          ${recent.map(boughtItemDesk).join('')}
        </div>` : ''}
      ${tab === 'bought' ? `
        <div class="space-y-4">
          <div class="flex items-center justify-between px-2"><h3 class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">خریداری شده</h3></div>
          ${bought.length ? bought.map(boughtItemDesk).join('') : emptyNote('هنوز خریدی انجام نشده', 'bag-shopping')}
        </div>` : ''}
    </div>`;
  return deskMain({ header, body, fab: deskFab("focusEl('new-purchase-title')", 'indigo', 'خرید تازه') });
}
const PURCHASE_SORT_CYCLE = { priority:'cheapest', cheapest:'priciest', priciest:'default', default:'priority' };
const PURCHASE_SORT_LABEL = { priority:'اولویت‌بندی شده', cheapest:'ارزان‌ترین اول', priciest:'گران‌ترین اول', default:'جدیدترین اول' };
function renderPurchasesMobile(){
  const pending = sortPurchases(state.purchases.filter(p => !p.bought));
  const bought = state.purchases.filter(p => p.bought).sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || ''));
  const total = pending.reduce((s, p) => s + (p.price || 0), 0);
  const pill = p => p.priority === 'high' ? `<span class="text-[9px] font-black text-rose-500 flex items-center gap-1 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10 uppercase">بالا</span>`
    : p.priority === 'medium' ? `<span class="text-[9px] font-black text-amber-500 flex items-center gap-1 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 uppercase">متوسط</span>`
    : p.priority === 'low' ? `<span class="text-[9px] font-black text-slate-500 flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 uppercase">پایین</span>` : '';
  return `
    ${mobHeader(mobTitle('خریدها'), `<div class="flex items-center gap-2">${mobIconBtn('arrow-up-wide-short', `state.purchaseSort=PURCHASE_SORT_CYCLE[state.purchaseSort]||'priority'; render()`, 'مرتب‌سازی')}${mobIconBtn('plus', 'state.newPurchaseOpen=true; render()', 'خرید تازه', 'primary')}</div>`)}
    <div class="p-4">
      <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5 flex items-center justify-between">
        <div>
          <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">جمع خریدهای در انتظار</p>
          <div class="flex items-baseline gap-2"><span class="text-2xl font-black text-white">${fmtPrice(total) || '۰'}</span><span class="text-[10px] font-bold text-slate-500 uppercase">دینار</span></div>
        </div>
        <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-900/20">${fa('cart-shopping', 'text-xl')}</div>
      </div>
    </div>
    <main class="safe-area-bottom px-4">
      ${renderStatusBars()}
      <div class="flex items-center justify-between mb-4 px-1"><h3 class="text-xs font-black text-white uppercase tracking-widest">لیست خرید</h3><span class="text-[9px] font-bold text-slate-500">${PURCHASE_SORT_LABEL[state.purchaseSort] || ''}</span></div>
      <div class="space-y-3">
        ${pending.length ? pending.map(p => `
          <div class="purchase-card bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <button type="button" onclick="togglePurchaseBought('${p.id}')" aria-label="خریدم" class="w-6 h-6 border-2 ${p.priority === 'high' ? 'border-indigo-500/50' : 'border-slate-700'} rounded-lg bg-slate-950 flex items-center justify-center shrink-0"></button>
              <div class="min-w-0">
                <h4 class="text-xs font-bold text-slate-200 mb-1" dir="auto">${esc(p.title)}</h4>
                <div class="flex items-center gap-2">${pill(p)}${p.price != null ? `<span class="text-[10px] font-black text-indigo-400">${fmtPrice(p.price)}</span>` : ''}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button type="button" onclick="openPurchaseEditor('${p.id}')" aria-label="ویرایش" class="text-slate-600 hover:text-white transition-colors p-1">${fa('pen', 'text-[10px]')}</button>
              <button type="button" onclick="deletePurchase('${p.id}')" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-colors p-1">${fa('trash-can', 'text-[10px]')}</button>
            </div>
          </div>`).join('') : emptyNote('فعلاً خریدی در انتظار نیست', 'cart-shopping')}
      </div>
      ${bought.length ? `
        <section class="pt-6">
          <button type="button" onclick="state.purchasesBoughtOpen=!state.purchasesBoughtOpen; render()" class="flex items-center gap-2 text-slate-600 mb-4">${fa(state.purchasesBoughtOpen ? 'chevron-down' : 'chevron-left', 'text-[10px]')}<span class="text-[10px] font-black uppercase tracking-widest">خریداری شده (${fd(bought.length)})</span></button>
          ${state.purchasesBoughtOpen ? `<div class="space-y-2 opacity-60">${bought.map(p => `
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0"><button type="button" onclick="togglePurchaseBought('${p.id}')" aria-label="برگرداندن" class="w-5 h-5 bg-emerald-500 text-white rounded-md flex items-center justify-center shrink-0">${fa('check', 'text-[10px]')}</button><h4 class="text-xs font-bold text-slate-500 line-through" dir="auto">${esc(p.title)}</h4></div>
              <button type="button" onclick="deletePurchase('${p.id}')" aria-label="حذف" class="text-slate-600">${fa('trash-can', 'text-[10px]')}</button>
            </div>`).join('')}</div>` : ''}
        </section>` : ''}
    </main>`;
}
function renderNewPurchaseModal(){
  return renderEditorFrame({ title:'خرید تازه', onClose:'state.newPurchaseOpen=false; render()', onSave:"if((document.getElementById('new-purchase-title')||{}).value.trim()){ state.newPurchaseOpen=false; addPurchase(); }", saveLabel:'افزودن',
    body:`
      ${field('چی باید بخری؟', `<input type="text" id="new-purchase-title" dir="auto" value="${ea(state.newPurchaseTitle || '')}" class="${titleInputCls()}">`)}
      ${field('قیمت', `<div class="relative"><input type="text" id="new-purchase-price" inputmode="numeric" value="${ea(state.newPurchasePrice || '')}" oninput="normalizeNumericInput(this)" class="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-black text-white focus:outline-none focus:border-indigo-500/50 pl-12"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">دینار</span></div>`)}
      ${field('اولویت', prioritySeg(state.newPurchasePriority, 'setNewPurchasePriority'))}`,
  });
}
function renderPurchaseEditorModal(){
  const ed = state.purchaseEditor;
  return renderEditorFrame({ title:'ویرایش خرید', onClose:'closePurchaseEditor()', onSave:'confirmPurchaseEditor()', onDelete:`const id=state.purchaseEditor.id; closePurchaseEditor(); deletePurchase(id)`,
    body:`
      ${field('نام کالا', `<input type="text" id="purchase-editor-title" dir="auto" value="${ea(ed.title)}" oninput="state.purchaseEditor.title=this.value" class="${titleInputCls()}">`)}
      ${field('قیمت', `<div class="relative"><input type="text" id="purchase-editor-price" inputmode="numeric" value="${ea(ed.price ? fd(ed.price) : '')}" oninput="normalizeNumericInput(this); state.purchaseEditor.price=this.value" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:outline-none focus:border-indigo-500/50 pl-16"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">DINARS</span></div>`)}
      ${field('اولویت', prioritySeg(ed.priority, 'purchaseEditorSetPriority'))}`,
  });
}

/* ================= اشتراک‌ها ================= */
const SUB_BRANDS = [[/spotify/i,'spotify'], [/figma/i,'figma'], [/netflix/i,'netflix'], [/youtube/i,'youtube'], [/apple|icloud/i,'apple'], [/google/i,'google'], [/github/i,'github'], [/microsoft|office|xbox/i,'microsoft'], [/amazon|prime/i,'amazon'], [/telegram/i,'telegram'], [/playstation|psn/i,'playstation'], [/dropbox/i,'dropbox'], [/adobe/i,'adobe'], [/discord/i,'discord'], [/slack/i,'slack'], [/notion/i,'notion']];
function subIcon(sub, cls){
  const b = SUB_BRANDS.find(([re]) => re.test(sub.name));
  return b ? `<i class="fa-brands fa-${b[1]} ${cls}"></i>` : fa(/claude|chatgpt|openai|ai/i.test(sub.name) ? 'wand-magic-sparkles' : 'credit-card', cls);
}
function subCardDesk(sub){
  const st = subState(sub), due = subDueLabel(sub);
  const actions = `
    <div class="sub-actions opacity-0 transition-opacity flex items-center gap-1">
      ${sub.active ? `<button type="button" onclick="toggleSubActive('${sub.id}')" class="p-2 text-slate-500 hover:text-white transition-colors" title="غیرفعال کردن" aria-label="غیرفعال کردن">${fa('pause', 'text-[10px]')}</button>` : ''}
      <button type="button" onclick="openSubscriptionEditor('${sub.id}')" class="p-2 text-slate-500 hover:text-white transition-colors" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[10px]')}</button>
      <button type="button" onclick="deleteSubscription('${sub.id}')" class="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="حذف" aria-label="حذف">${fa('trash', 'text-[10px]')}</button>
    </div>`;
  const cycle = subCycle(sub.cycle).label;
  if(!sub.active) return `
    <div class="col-span-4 sub-card bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all group flex flex-col opacity-50 grayscale">
      <div class="flex items-start justify-between mb-6"><div class="w-12 h-12 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center">${subIcon(sub, 'text-2xl')}</div>${actions}</div>
      <h3 class="text-lg font-black text-white mb-1" dir="auto">${esc(sub.name)}</h3>
      <div class="flex items-center gap-2 mb-4"><span class="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">غیرفعال</span><span class="text-[10px] text-slate-500 font-bold">سیکل: ${cycle}</span></div>
      <button type="button" onclick="toggleSubActive('${sub.id}')" class="w-full py-3 mt-auto border border-slate-700 hover:border-indigo-500 hover:text-indigo-400 rounded-xl text-xs font-black transition-all">فعال‌سازی مجدد</button>
    </div>`;
  const warn = st === 'overdue' || st === 'due';
  return `
    <div class="col-span-4 sub-card ${warn ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40' : 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/30'} border rounded-3xl p-6 transition-all group flex flex-col relative overflow-hidden">
      <div class="flex items-start justify-between mb-6 relative z-10"><div class="w-12 h-12 ${warn ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'} rounded-2xl flex items-center justify-center">${subIcon(sub, 'text-2xl')}</div>${actions}</div>
      <h3 class="text-lg font-black text-white mb-1 relative z-10" dir="auto">${esc(sub.name)}</h3>
      <div class="flex items-center gap-2 mb-4 relative z-10">
        ${st === 'overdue' ? `<span class="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">منقضی شده</span>` : st === 'due' ? `<span class="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">نزدیک تمدید</span>` : `<span class="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border border-indigo-500/10">فعال</span>`}
        <span class="text-[10px] text-slate-500 font-bold">سیکل: ${cycle}</span>
      </div>
      <div class="p-4 bg-slate-900/50 rounded-2xl border border-slate-800 mb-6 relative z-10">
        <div class="flex justify-between items-center mb-2"><span class="text-[10px] text-slate-500">تاریخ تمدید بعدی:</span><span class="text-[11px] font-black ${warn ? 'text-rose-400' : 'text-white'}">${sub.nextRenewal ? `${jDate(sub.nextRenewal, !warn)}${warn ? ` (${daysUntil(sub.nextRenewal) < 0 ? `${fd(-daysUntil(sub.nextRenewal))} روز پیش` : due.text})` : ''}` : 'ثبت نشده'}</span></div>
        <div class="flex justify-between items-center"><span class="text-[10px] text-slate-500">${warn ? 'یادآوری:' : 'زمان باقی‌مانده:'}</span><span class="text-[11px] font-bold ${warn ? 'text-slate-300' : 'text-indigo-400'}">${warn ? `${fd(sub.notifyDaysBefore || 0)} روز قبل` : due.text}</span></div>
      </div>
      ${sub.note ? `<p class="text-[10px] text-slate-500 mb-4 line-clamp-2 relative z-10" dir="auto">"یادداشت: ${esc(sub.note)}"</p>` : ''}
      ${warn ? `<button type="button" onclick="markSubRenewed('${sub.id}')" ${sub.nextRenewal ? '' : 'disabled'} class="w-full py-3 mt-auto bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 relative z-10">${fa('arrows-rotate')} تمدید شد</button>`
        : `<button type="button" onclick="markSubRenewed('${sub.id}')" ${sub.nextRenewal ? '' : 'disabled'} title="ثبت تمدید زودتر از موعد" class="w-full py-3 mt-auto bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 relative z-10">${fa('check')} وضعیت مطلوب</button>`}
      ${warn ? fa('triangle-exclamation', 'absolute -bottom-4 -left-4 text-6xl text-rose-500/10 -rotate-12') : ''}
    </div>`;
}
function renderSubscriptionsDesktop(){
  const subs = state.subscriptions || [];
  const active = subs.filter(s => s.active), inactive = subs.filter(s => !s.active);
  const alerts = active.filter(s => ['due', 'overdue'].includes(subState(s)));
  const order = s => ({ overdue:0, due:1 }[subState(s)] ?? 2);
  const header = deskHeader({ icon:'credit-card', title:'اشتراک‌ها', sub:'پیگیری و مدیریت تمدید سرویس‌ها', profile:`${fd(subs.length)} سرویس ثبت‌شده`,
    right: `
      <div class="flex items-center gap-4 bg-slate-900/50 border border-slate-800 px-6 py-2 rounded-2xl">
        <div class="text-center"><p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">فعال</p><p class="text-sm font-black text-white">${fd(active.length)} مورد</p></div>
        <div class="w-px h-6 bg-slate-800"></div>
        <div class="text-center"><p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">تمدید نزدیک</p><p class="text-sm font-black text-rose-500">${fd(alerts.length)} مورد</p></div>
      </div>` });
  const body = `
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-4 h-full">
          <button type="button" onclick="openSubscriptionEditor(null)" class="w-full h-full min-h-[300px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400 transition-all group">
            <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/10">${fa('plus', 'text-xl')}</div>
            <span class="text-xs font-black uppercase tracking-widest">ثبت اشتراک جدید</span>
          </button>
        </div>
        ${[...active].sort((a, b) => order(a) - order(b)).map(subCardDesk).join('')}
        ${inactive.map(subCardDesk).join('')}
      </div>
    </div>`;
  return deskMain({ header, body, fab: deskFab('openSubscriptionEditor(null)', 'indigo', 'اشتراک تازه') });
}
function renderSubscriptionsMobile(){
  const subs = state.subscriptions || [];
  const alerts = subs.filter(s => s.active && ['due', 'overdue'].includes(subState(s)));
  const order = s => !s.active ? 3 : ({ overdue:0, due:1 }[subState(s)] ?? 2);
  const card = sub => {
    const st = subState(sub), warn = st === 'due' || st === 'overdue';
    if(!sub.active) return `
      <div class="sub-card bg-slate-900 border border-slate-800 rounded-3xl p-5 opacity-60">
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-center gap-3"><div class="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white border border-slate-800">${subIcon(sub, 'text-2xl text-indigo-400')}</div><div><h3 class="text-sm font-black text-white mb-1" dir="auto">${esc(sub.name)}</h3><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-2 py-0.5 rounded border border-slate-700">غیرفعال</span></div></div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="toggleSubActive('${sub.id}')" class="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black border border-slate-700">فعال‌سازی مجدد</button>
          <button type="button" onclick="deleteSubscription('${sub.id}')" aria-label="حذف" class="w-12 h-12 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl border border-slate-700">${fa('trash-can', 'text-xs')}</button>
        </div>
      </div>`;
    return `
      <div class="sub-card bg-slate-900 border ${warn ? 'border-rose-500/30' : 'border-slate-800'} rounded-3xl p-5">
        <div class="flex items-start justify-between mb-6 gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white border border-slate-800 shrink-0">${subIcon(sub, `text-2xl ${/spotify/i.test(sub.name) ? 'text-[#1DB954]' : warn ? 'text-rose-400' : 'text-indigo-400'}`)}</div>
            <div class="min-w-0"><h3 class="text-sm font-black text-white mb-1" dir="auto">${esc(sub.name)}</h3>
              ${warn ? `<span class="text-[9px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10">${st === 'overdue' ? 'منقضی شده' : 'نزدیک تمدید'}</span>` : `<span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">فعال</span>`}</div>
          </div>
          <div class="text-left shrink-0"><p class="text-xs ${warn ? 'text-rose-400' : 'text-indigo-400'}">${subDueLabel(sub).text}</p><p class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">${subCycle(sub.cycle).label}</p></div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50"><p class="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">تجدید بعدی</p><p class="text-[10px] font-black text-white uppercase">${sub.nextRenewal ? jDate(sub.nextRenewal) : '—'}</p></div>
          <div class="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50"><p class="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">مهلت یادآوری</p><p class="text-[10px] font-black text-amber-500 uppercase tracking-widest">${fd(sub.notifyDaysBefore || 0)} روز قبل</p></div>
        </div>
        ${sub.note ? `<p class="text-[10px] text-slate-500 mb-4" dir="auto">${esc(sub.note)}</p>` : ''}
        <div class="flex items-center gap-2">
          <button type="button" onclick="markSubRenewed('${sub.id}')" ${sub.nextRenewal ? '' : 'disabled'} class="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-900/20 disabled:opacity-40">ثبت تمدید</button>
          <button type="button" onclick="toggleSubActive('${sub.id}')" aria-label="غیرفعال کردن" class="w-12 h-12 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl border border-slate-700">${fa('pause', 'text-xs')}</button>
          <button type="button" onclick="openSubscriptionEditor('${sub.id}')" aria-label="ویرایش" class="w-12 h-12 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl border border-slate-700 transition-colors hover:text-white">${fa('pen', 'text-xs')}</button>
          <button type="button" onclick="deleteSubscription('${sub.id}')" aria-label="حذف" class="w-12 h-12 flex items-center justify-center bg-slate-800 text-slate-400 rounded-xl border border-slate-700 transition-colors hover:text-rose-500">${fa('trash-can', 'text-xs')}</button>
        </div>
      </div>`;
  };
  return `
    ${mobHeader(mobTitle('اشتراک‌ها'), mobIconBtn('plus', 'openSubscriptionEditor(null)', 'اشتراک تازه', 'primary'))}
    ${alerts.length ? `
      <div class="p-4">
        <div class="bg-amber-600/10 border border-amber-500/20 rounded-3xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-amber-900/20">${fa('bell', 'text-lg')}</div>
          <div><h3 class="text-xs font-black text-white mb-1">تمدید نزدیک است</h3><p class="text-[10px] text-slate-400 leading-relaxed">${fd(alerts.length)} اشتراک نزدیک تمدید یا گذشته‌ست: ${alerts.map(s => esc(s.name)).join('، ')}</p></div>
        </div>
      </div>` : '<div class="h-4"></div>'}
    <main class="safe-area-bottom px-4">
      ${renderStatusBars()}
      <div class="space-y-4">${subs.length ? [...subs].sort((a, b) => order(a) - order(b)).map(card).join('') : emptyNote('اشتراکی ثبت نشده', 'credit-card')}</div>
    </main>`;
}
function renderSubscriptionEditorModal(){
  const ed = state.subscriptionEditor;
  return renderEditorFrame({ title: ed.subId ? 'ویرایش اشتراک' : 'اشتراک تازه', onClose:'closeSubscriptionEditor()', onSave:'confirmSubscriptionEditor()',
    onDelete: ed.subId ? `const id=state.subscriptionEditor.subId; closeSubscriptionEditor(); deleteSubscription(id)` : '',
    body:`
      ${field('نام اشتراک', `<input type="text" dir="auto" value="${ea(ed.name)}" oninput="subEditorSet('name',this.value)" class="${titleInputCls()}">`)}
      ${field('دوره', chipBox(SUB_CYCLES.map(c => choiceChip(c.label, ed.cycle === c.id, `subEditorSet('cycle','${c.id}')`)).join('')))}
      <div class="grid grid-cols-2 gap-6">
        ${field('تاریخ تمدید بعدی', `<input type="date" value="${ed.nextRenewal || ''}" onchange="subEditorSet('nextRenewal',this.value); render()" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs font-bold text-slate-300 focus:outline-none focus:border-indigo-500/50">${ed.nextRenewal ? `<p class="text-[10px] text-indigo-400 font-bold px-1">${jDate(ed.nextRenewal, true)}</p>` : ''}`)}
        ${field('چند روز قبل هشدار بده', `<input type="text" inputmode="numeric" value="${fd(ed.notifyDaysBefore)}" oninput="normalizeNumericInput(this)" onchange="subEditorSet('notifyDaysBefore', Math.min(30, parseInt(toEnDigits(this.value),10) || 0))" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:outline-none focus:border-indigo-500/50">`)}
      </div>
      ${field('یادداشت', `<input type="text" dir="auto" value="${ea(ed.note || '')}" oninput="subEditorSet('note',this.value)" class="${inputCls}">`)}`,
  });
}

/* ================= ایده‌ها ================= */
function ideaFilterState(){
  const used = new Set(state.ideas.flatMap(i => i.tagIds));
  const tags = state.tags.filter(t => used.has(t.id));
  const ids = state.ideasFilterTagIds.filter(id => used.has(id));
  return { tags, ids, shown: ids.length ? state.ideas.filter(i => i.tagIds.some(id => ids.includes(id))) : state.ideas };
}
const ideaDate = i => i.createdAt ? jDate(dateKey(new Date(i.createdAt)), true) : '';
function ideaCardDesk(i){
  return `
    <div class="col-span-4 idea-card bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group flex flex-col h-fit">
      <div class="flex items-center justify-between mb-4">
        <span class="text-[10px] text-slate-500 font-medium">${ideaDate(i)}</span>
        <div class="idea-actions opacity-0 transition-opacity flex items-center gap-2">
          ${i.body ? `<button type="button" onclick="copyIdea('${i.id}', this)" class="p-2 text-slate-500 hover:text-white transition-colors" title="کپی متن" aria-label="کپی متن">${fa('copy', 'text-[10px]')}</button>` : ''}
          <button type="button" onclick="openIdeaEditor('${i.id}')" class="p-2 text-slate-500 hover:text-white transition-colors" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="deleteIdea('${i.id}')" class="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="حذف" aria-label="حذف">${fa('trash', 'text-[10px]')}</button>
        </div>
      </div>
      ${(i.images || []).length ? `<div class="grid grid-cols-2 gap-2 mb-4 overflow-hidden rounded-xl">${i.images.map(im => `<button type="button" onclick="downloadIdeaImage('${i.id}','${im.id}')" title="دانلود عکس" class="block"><img class="w-full h-24 object-cover" src="${im.dataUrl}" alt=""></button>`).join('')}</div>` : ''}
      ${i.body ? `<p class="text-sm text-slate-200 leading-relaxed font-bold mb-6 whitespace-pre-line" dir="auto">${esc(i.body)}</p>` : ''}
      <div class="mt-auto pt-6 border-t border-slate-800/50 flex items-center justify-between">
        <div class="flex gap-2 flex-wrap">${i.tagIds.map(id => { const t = tagById(id); return t ? `<span class="px-2 py-0.5 rounded-lg text-[9px] font-bold border" style="${tagTint(t.color)}">${esc(t.name)}</span>` : ''; }).join('')}</div>
        ${(i.images || []).length ? `<button type="button" onclick="${i.images.map(im => `downloadIdeaImage('${i.id}','${im.id}')`).join(';')}" title="دانلود عکس‌ها" aria-label="دانلود عکس‌ها" class="text-slate-500 hover:text-indigo-400 transition-colors">${fa('download', 'text-[10px]')}</button>` : ''}
      </div>
    </div>`;
}
function newIdeaComposer(mob){
  const selected = state.newIdeaTagIds || [];
  const imgs = state.newIdeaImages || [];
  const thumbs = imgs.map(im => `
    <div class="relative group">
      <img class="w-20 h-20 rounded-xl object-cover border border-slate-800" src="${im.dataUrl}" alt="">
      <button type="button" onclick="removeNewIdeaImage('${im.id}')" aria-label="حذف عکس" class="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] ${mob ? '' : 'opacity-0 group-hover:opacity-100 reveal'} transition-opacity">${fa('xmark')}</button>
    </div>`).join('');
  const tagChips = state.tags.map(t => `<button type="button" onclick="toggleNewIdeaTag('${t.id}')" class="${selected.includes(t.id) ? '' : 'bg-slate-900 text-slate-500 border-slate-800'} px-3 py-1 rounded-full text-[10px] font-bold border" style="${selected.includes(t.id) ? tagTint(t.color) : ''}">${esc(t.name)}</button>`).join('');
  if(mob) return `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 focus-within:border-indigo-500/50 transition-all">
      <textarea id="new-idea-body" data-preserve oninput="state.newIdeaBody=this.value" placeholder="ایده جدیدی دارید؟ اینجا بنویسید..." class="w-full bg-transparent border-none text-[11px] text-slate-200 focus:outline-none placeholder:text-slate-600 resize-none min-h-[60px]">${esc(state.newIdeaBody || '')}</textarea>
      ${imgs.length ? `<div class="flex flex-wrap gap-2 my-3">${thumbs}</div>` : ''}
      ${state.ideaTagsOpen ? `<div class="flex flex-wrap gap-2 my-3">${tagChips}</div>` : ''}
      <div class="flex items-center justify-between mt-3">
        <div class="flex items-center gap-3 text-slate-500">
          <label class="hover:text-white transition-colors cursor-pointer" aria-label="افزودن عکس">${fa('image', 'text-xs')}<input type="file" accept="image/*" multiple onchange="handleNewIdeaImages(this)" hidden></label>
          <button type="button" onclick="state.ideaTagsOpen=!state.ideaTagsOpen; state.newIdeaBody=document.getElementById('new-idea-body').value; render()" aria-label="تگ‌ها" class="${selected.length ? 'text-indigo-400' : ''} hover:text-white transition-colors">${fa('tag', 'text-xs')}</button>
        </div>
        <button type="button" onclick="addIdea()" class="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-[9px] font-black">ذخیره ایده</button>
      </div>
    </div>`;
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 mb-10">
      <textarea id="new-idea-body" data-preserve oninput="state.newIdeaBody=this.value" rows="2" placeholder="چه ایده‌ای در ذهن داری؟" class="w-full bg-transparent border-none text-lg font-bold text-white placeholder:text-slate-700 focus:outline-none mb-4 resize-none no-scrollbar">${esc(state.newIdeaBody || '')}</textarea>
      <div class="flex flex-wrap gap-2 mb-6" id="attachment-preview">
        ${thumbs}
        <label class="w-20 h-20 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:border-indigo-500/50 hover:text-indigo-400 transition-all cursor-pointer">
          ${fa('plus', 'text-xs mb-1')}<span class="text-[8px] font-black uppercase">تصویر</span>
          <input type="file" accept="image/*" multiple onchange="handleNewIdeaImages(this)" hidden>
        </label>
      </div>
      <div class="flex items-center justify-between border-t border-slate-800/50 pt-6">
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-2 text-slate-500 text-[11px] font-bold">${fa('tags', 'text-[10px]')} افزودن تگ</span>
          <div class="flex gap-2 flex-wrap">${tagChips || '<span class="text-[10px] text-slate-600">تگی نداری</span>'}</div>
        </div>
        <button type="button" onclick="addIdea()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-[11px] font-black transition-all">ثبت ایده</button>
      </div>
    </div>`;
}
function renderIdeasDesktop(){
  const { tags, ids, shown } = ideaFilterState();
  const header = deskHeader({ icon:'lightbulb', title:'بانک ایده‌ها', sub:'فضایی برای ثبت و مدیریت جرقه‌های ذهنی', profile:`${fd(state.ideas.length)} ایده ثبت شده`,
    right: tags.length ? `
      <div class="flex items-center gap-2">
        <div class="flex gap-2" aria-label="فیلتر تگ ایده‌ها">
          <button type="button" onclick="clearIdeasFilter()" class="px-3 py-2 rounded-xl ${ids.length ? 'bg-slate-900 text-slate-300' : 'bg-indigo-600 text-white'} text-xs">همه</button>
          ${tags.map(t => `<button type="button" onclick="toggleIdeasFilterTag('${t.id}')" class="px-3 py-2 rounded-xl ${ids.includes(t.id) ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'} text-xs">${esc(t.name)}</button>`).join('')}
        </div>
      </div>` : '' });
  const body = `
    <div class="max-w-6xl mx-auto">
      ${newIdeaComposer(false)}
      ${!state.ideas.length ? emptyNote('هنوز ایده‌ای ثبت نکردی', 'lightbulb') : !shown.length ? emptyNote('ایده‌ای با این تگ‌ها نیست') : `<div class="grid grid-cols-12 gap-6">${shown.map(ideaCardDesk).join('')}</div>`}
    </div>`;
  return deskMain({ header, body, fab: deskFab("focusEl('new-idea-body')", 'indigo', 'ایده تازه') });
}
function renderIdeasMobile(){
  const { tags, ids, shown } = ideaFilterState();
  const card = i => {
    const img = (i.images || [])[0];
    const chips = i.tagIds.map(id => { const t = tagById(id); return t ? `<span class="text-[8px] font-black px-2 py-0.5 rounded border uppercase" style="${tagTint(t.color)}">${esc(t.name)}</span>` : ''; }).join('');
    const foot = `
      <div class="flex items-center justify-between pt-2 border-t border-slate-800/50">
        <span class="text-[8px] font-bold text-slate-600 uppercase">${ideaDate(i)}</span>
        <div class="flex items-center gap-3 text-slate-600">
          ${i.body ? `<button type="button" onclick="copyIdea('${i.id}', this)" aria-label="کپی" class="hover:text-indigo-400 transition-colors">${fa('copy', 'text-[10px]')}</button>` : ''}
          ${img ? `<button type="button" onclick="${i.images.map(im => `downloadIdeaImage('${i.id}','${im.id}')`).join(';')}" aria-label="دانلود عکس" class="hover:text-indigo-400 transition-colors">${fa('download', 'text-[10px]')}</button>` : ''}
          <button type="button" onclick="openIdeaEditor('${i.id}')" aria-label="ویرایش">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="deleteIdea('${i.id}')" aria-label="حذف">${fa('trash', 'text-[10px]')}</button>
        </div>
      </div>`;
    return img ? `
      <div class="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div class="h-40 overflow-hidden relative">
          <img class="w-full h-full object-cover" src="${img.dataUrl}" alt="">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
          ${i.images.length > 1 ? `<span class="absolute top-3 left-3 px-2 h-8 bg-slate-950/50 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-[10px] font-black">+${fd(i.images.length - 1)}</span>` : ''}
        </div>
        <div class="p-4 space-y-4">
          ${i.body ? `<p class="text-[11px] text-slate-300 leading-relaxed whitespace-pre-line" dir="auto">${esc(i.body)}</p>` : ''}
          ${chips ? `<div class="flex flex-wrap gap-2">${chips}</div>` : ''}
          ${foot}
        </div>
      </div>` : `
      <div class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-4">
        <p class="text-[11px] text-slate-200 leading-relaxed font-bold whitespace-pre-line" dir="auto">${esc(i.body)}</p>
        ${chips ? `<div class="flex flex-wrap gap-2">${chips}</div>` : ''}
        ${foot}
      </div>`;
  };
  return `
    ${mobHeader(mobTitle('ایده‌ها', `<span class="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">${fd(state.ideas.length)} مورد</span>`), `<div class="flex items-center gap-2">${tags.length ? mobIconBtn('filter', 'state.ideaFilterOpen=!state.ideaFilterOpen; render()', 'فیلتر') : ''}${mobIconBtn('plus', "focusEl('new-idea-body')", 'ایده تازه', 'primary')}</div>`)}
    <main class="safe-area-bottom p-4">
      ${renderStatusBars()}
      ${state.ideaFilterOpen && tags.length ? `<div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-4">
        <button type="button" onclick="clearIdeasFilter()" class="${ids.length ? 'bg-slate-900 border-slate-800 text-slate-500 font-bold' : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-black'} border px-4 py-1.5 rounded-full text-[10px] shrink-0">همه</button>
        ${tags.map(t => `<button type="button" onclick="toggleIdeasFilterTag('${t.id}')" class="${ids.includes(t.id) ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-black' : 'bg-slate-900 border-slate-800 text-slate-500 font-bold'} border px-4 py-1.5 rounded-full text-[10px] shrink-0">${esc(t.name)}</button>`).join('')}
      </div>` : ''}
      ${newIdeaComposer(true)}
      <div class="space-y-4">${!state.ideas.length ? emptyNote('هنوز ایده‌ای ثبت نکردی', 'lightbulb') : !shown.length ? emptyNote('ایده‌ای با این تگ‌ها نیست') : shown.map(card).join('')}</div>
    </main>`;
}
function renderIdeaEditorModal(){
  const ed = state.ideaEditor;
  return renderEditorFrame({ title:'ویرایش ایده', onClose:'closeIdeaEditor()', onSave:'confirmIdeaEditor()', onDelete:`const id=state.ideaEditor.ideaId; closeIdeaEditor(); deleteIdea(id)`,
    body:`
      ${field('متن ایده', `<textarea id="idea-editor-body" data-preserve dir="auto" oninput="state.ideaEditor.body=this.value" placeholder="متن ایده…" class="${textareaCls()} min-h-[160px]">${esc(ed.body)}</textarea>`)}
      ${field('تصویرها', `<div class="flex flex-wrap gap-2">${ed.images.map(im => `
          <div class="relative"><img class="w-20 h-20 rounded-xl object-cover border border-slate-800" src="${im.dataUrl}" alt=""><button type="button" onclick="ideaEditorRemoveImage('${im.id}')" aria-label="حذف عکس" class="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]">${fa('xmark')}</button></div>`).join('')}
        <label class="w-20 h-20 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:border-indigo-500/50 hover:text-indigo-400 transition-all cursor-pointer">${fa('plus', 'text-xs mb-1')}<span class="text-[8px] font-black uppercase">تصویر</span><input type="file" accept="image/*" multiple onchange="ideaEditorAddImages(this)" hidden></label></div>`)}
      ${field('تگ‌ها', chipBox(state.tags.map(t => `<button type="button" onclick="ideaEditorToggleTag('${t.id}')" class="px-2 py-1 rounded-lg text-[10px] font-bold border ${ed.tagIds.includes(t.id) ? '' : 'bg-slate-800 border-slate-700 opacity-60'}" style="${ed.tagIds.includes(t.id) ? tagTint(t.color, '33', '1a') : `color:${ea(t.color)}`}">${esc(t.name)}</button>`).join('') || '<span class="text-[10px] text-slate-600">تگی نداری</span>'))}`,
  });
}

/* ================= پرامپت‌ها ================= */
function promptCatTint(cat){
  const tones = ['text-indigo-400 bg-indigo-500/10 border-indigo-500/10', 'text-amber-400 bg-amber-500/10 border-amber-500/10', 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10', 'text-rose-400 bg-rose-500/10 border-rose-500/10'];
  const cats = promptCategories();
  return tones[Math.max(0, cats.indexOf(cat)) % tones.length];
}
const promptWhen = p => p.createdAt ? jDate(dateKey(new Date(p.createdAt)), true) : '';
function promptCardDesk(p){
  const open = state.promptOpen && state.promptOpen[p.id];
  return `
    <div class="col-span-4 prompt-card bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-indigo-500/30 transition-all group flex flex-col h-full relative overflow-hidden">
      <div class="flex items-center justify-between mb-4 relative z-10">
        <div class="flex items-center gap-2">
          ${p.category ? `<span class="text-[10px] font-black ${promptCatTint(p.category)} px-2 py-0.5 rounded-lg border" dir="auto">${esc(p.category)}</span>` : ''}
          <button type="button" onclick="togglePromptFavorite('${p.id}')" aria-label="${p.favorite ? 'حذف از علاقه‌مندی‌ها' : 'علاقه‌مندی'}" class="${p.favorite ? 'text-rose-500' : 'text-slate-700 hover:text-rose-400'}">${fa('heart', 'text-[10px]')}</button>
        </div>
        <div class="prompt-actions opacity-0 transition-opacity flex items-center gap-1">
          <button type="button" onclick="copyPrompt('${p.id}', this)" class="p-2 text-slate-500 hover:text-white transition-colors" title="کپی" aria-label="کپی">${fa('copy', 'text-[10px]')}</button>
          <button type="button" onclick="openPromptEditor('${p.id}')" class="p-2 text-slate-500 hover:text-white transition-colors" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="deletePrompt('${p.id}')" class="p-2 text-slate-500 hover:text-rose-500 transition-colors" title="حذف" aria-label="حذف">${fa('trash', 'text-[10px]')}</button>
        </div>
      </div>
      <h3 class="text-sm font-black text-white mb-2 relative z-10" dir="auto">${esc(p.title || p.body.split('\n')[0].slice(0, 80))}</h3>
      <p class="text-[11px] text-slate-400 leading-relaxed mb-6 ${open ? 'whitespace-pre-line' : 'line-clamp-4'} relative z-10" dir="auto">"${esc(p.body)}"</p>
      ${open && p.note ? `<p class="text-[10px] text-slate-500 mb-6 relative z-10" dir="auto">${fa('note-sticky', 'ml-1')}${esc(p.note)}</p>` : ''}
      <div class="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between relative z-10">
        <span class="text-[9px] text-slate-600 font-bold uppercase">ثبت: ${promptWhen(p)}</span>
        <button type="button" onclick="togglePromptOpen('${p.id}')" class="text-[10px] font-black text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1">${open ? 'بستن' : 'مشاهده کامل'} ${fa(open ? 'chevron-up' : 'arrow-left', 'text-[8px]')}</button>
      </div>
      ${fa(/data|analy/i.test(p.category) ? 'chart-pie' : /انگلیسی|english|نگارش/i.test(p.category + p.title) ? 'spell-check' : 'code', 'absolute -bottom-4 -left-4 text-6xl text-white/5 -rotate-12')}
    </div>`;
}
function togglePromptOpen(id){ state.promptOpen = state.promptOpen || {}; state.promptOpen[id] = !state.promptOpen[id]; render(); }
function renderPromptList(){
  if(!(state.prompts || []).length) return isDesk() ? '' : emptyNote('هنوز پرامپتی ذخیره نکردی', 'terminal');
  const list = filteredPrompts();
  if(!list.length) return isDesk() ? `<div class="col-span-8 flex items-center">${emptyNote('پرامپتی با این جست‌وجو پیدا نشد')}</div>` : emptyNote('پرامپتی با این جست‌وجو پیدا نشد');
  return list.map(isDesk() ? promptCardDesk : promptCardMob).join('');
}
function renderPromptsDesktop(){
  const all = state.prompts || [];
  const cats = promptCategories();
  if(!['all', 'fav'].includes(state.promptFilter) && !cats.includes(state.promptFilter)) state.promptFilter = 'all';
  const chip = (v, label, extra = '') => `<button type="button" data-v="${ea(v)}" onclick="setPromptFilter(this.dataset.v)" class="px-4 py-1.5 ${state.promptFilter === v ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300'} rounded-xl text-[10px] font-black ${extra}">${label}</button>`;
  const header = deskHeader({ icon:'terminal', title:'کتابخانه پرامپت‌ها', sub:'مدیریت و نگهداری دستورات هوش مصنوعی', profile:`${fd(all.length)} پرامپت فعال`,
    right: `
      <div class="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800">
        ${chip('all', 'همه')}${cats.map(c => chip(c, esc(c))).join('')}
        <button type="button" data-v="fav" onclick="setPromptFilter(this.dataset.v)" class="px-4 py-1.5 ${state.promptFilter === 'fav' ? 'bg-rose-500/10 text-rose-500' : 'text-rose-500/50 hover:text-rose-500'} rounded-xl text-[10px] font-black flex items-center gap-1">${fa('heart', 'text-[8px]')} مورد علاقه</button>
      </div>
      <div class="relative">
        ${fa('magnifying-glass', 'absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs')}
        <input type="text" placeholder="جستجو در پرامپت‌ها..." value="${ea(state.promptSearch)}" oninput="setPromptSearch(this.value)" class="bg-slate-900 border border-slate-800 rounded-xl py-2 pr-9 pl-4 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/50 w-48 placeholder:text-slate-600">
      </div>` });
  const body = `
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-12 gap-6" id="prompt-list-wrap">
        <div class="col-span-4 h-full">
          <button type="button" onclick="openPromptEditor(null)" class="w-full h-full min-h-[200px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-600 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400 transition-all group">
            <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-indigo-500/10">${fa('plus', 'text-xl')}</div>
            <span class="text-xs font-black uppercase tracking-widest">پرامپت جدید</span>
          </button>
        </div>
        <div class="contents" id="prompt-list">${renderPromptList()}</div>
      </div>
    </div>`;
  return deskMain({ header, body, fab: deskFab('openPromptEditor(null)', 'indigo', 'پرامپت جدید') });
}
function promptCardMob(p){
  const open = state.promptOpen && state.promptOpen[p.id];
  return `
    <div class="prompt-card bg-slate-900 border border-slate-800 rounded-2xl p-5 transition-all">
      <div class="flex items-start justify-between mb-4 gap-3">
        <div class="space-y-1 min-w-0">
          <div class="flex items-center gap-2"><h3 class="text-xs font-black text-white" dir="auto">${esc(p.title || p.body.split('\n')[0].slice(0, 60))}</h3><button type="button" onclick="togglePromptFavorite('${p.id}')" aria-label="علاقه‌مندی" class="${p.favorite ? 'text-amber-500' : 'text-slate-700'}">${fa('star', 'text-[10px]')}</button></div>
          ${p.category ? `<p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 inline-block px-1.5 py-0.5 rounded" dir="auto">${esc(p.category)}</p>` : ''}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="openPromptEditor('${p.id}')" aria-label="ویرایش" class="text-slate-600 hover:text-white transition-colors p-1">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="copyPrompt('${p.id}', this)" aria-label="کپی" class="text-slate-600 hover:text-white transition-colors p-1">${fa('copy', 'text-[10px]')}</button>
          <button type="button" onclick="deletePrompt('${p.id}')" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-colors p-1">${fa('trash-can', 'text-[10px]')}</button>
        </div>
      </div>
      <div class="bg-slate-950/50 border border-slate-800/50 rounded-xl p-4 mb-4">
        <p class="text-[10px] text-slate-400 leading-relaxed ${open ? 'whitespace-pre-line' : 'line-clamp-3'}" dir="auto">"${esc(p.body)}"</p>
        ${open && p.note ? `<p class="text-[10px] text-slate-500 mt-3" dir="auto">${esc(p.note)}</p>` : ''}
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[8px] font-bold text-slate-600 uppercase tracking-widest">ثبت: ${promptWhen(p)}</span>
        <button type="button" onclick="togglePromptOpen('${p.id}')" class="text-[9px] font-black text-indigo-400">${open ? 'بستن' : 'مشاهده کامل'} ${fa(open ? 'chevron-up' : 'chevron-left', 'text-[8px] mr-1')}</button>
      </div>
    </div>`;
}
function renderPromptsMobile(){
  const cats = promptCategories();
  if(!['all', 'fav'].includes(state.promptFilter) && !cats.includes(state.promptFilter)) state.promptFilter = 'all';
  const chip = (v, label) => `<button type="button" data-v="${ea(v)}" onclick="setPromptFilter(this.dataset.v)" class="${state.promptFilter === v ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 font-black' : 'bg-slate-900 border-slate-800 text-slate-500 font-bold'} border px-4 py-1.5 rounded-full text-[10px] shrink-0">${label}</button>`;
  return `
    ${mobHeader(mobTitle('پرامپت‌ها'), mobIconBtn('plus', 'openPromptEditor(null)', 'پرامپت جدید', 'primary'))}
    <div class="p-4 space-y-4">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all">
        ${fa('magnifying-glass', 'text-slate-600 text-xs px-3')}
        <input type="text" placeholder="جستجو در پرامپت‌ها..." value="${ea(state.promptSearch)}" oninput="setPromptSearch(this.value)" class="flex-1 bg-transparent border-none text-[11px] text-slate-200 focus:outline-none placeholder:text-slate-600 h-9">
      </div>
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        ${chip('all', 'همه')}${(state.prompts || []).some(p => p.favorite) ? chip('fav', `${fa('star', 'text-[8px] ml-1')}علاقه‌مندی‌ها`) : ''}${cats.map(c => chip(c, esc(c))).join('')}
      </div>
    </div>
    <main class="safe-area-bottom px-4">
      ${renderStatusBars()}
      <div class="space-y-4" id="prompt-list">${renderPromptList()}</div>
    </main>`;
}
function renderPromptEditorModal(){
  const ed = state.promptEditor;
  const cats = promptCategories();
  return renderEditorFrame({ title: ed.promptId ? 'ویرایش پرامپت' : 'پرامپت جدید', onClose:'closePromptEditor()', onSave:'confirmPromptEditor()',
    onDelete: ed.promptId ? `const id=state.promptEditor.promptId; closePromptEditor(); deletePrompt(id)` : '',
    body:`
      ${field('عنوان (اختیاری)', `<input type="text" dir="auto" value="${ea(ed.title)}" oninput="promptEditorSet('title',this.value)" class="${titleInputCls()}">`)}
      ${field('متن پرامپت', `<textarea dir="auto" placeholder="پرامپت رو اینجا بچسبون…" oninput="promptEditorSet('body',this.value)" class="${textareaCls()} min-h-[200px]">${esc(ed.body)}</textarea>`)}
      ${field('دسته‌بندی', (cats.length ? chipBox(cats.map(c => choiceChip(esc(c), ed.category === c, 'pickPromptCategory(this.dataset.v)', `data-v="${ea(c)}"`)).join('')) : '') + `<input type="text" dir="auto" placeholder="${cats.length ? 'یا یه دستهٔ جدید بنویس' : 'مثلاً کدنویسی، نوشتن، تصویر'}" value="${ea(ed.category)}" oninput="promptEditorSet('category',this.value)" class="${inputCls}">`)}
      ${field('یادداشت', `<input type="text" dir="auto" placeholder="کجا به کار میاد، از کجا پیداش کردی…" value="${ea(ed.note)}" oninput="promptEditorSet('note',this.value)" class="${inputCls}">`)}`,
  });
}

/* ================= تونستم ================= */
function winsData(){
  const all = state.wins || [];
  const nowJ = window.jalaali.toJalaali(new Date());
  const thisMonth = all.filter(w => { if(!w.happenedOn) return false; const j = window.jalaali.toJalaali(new Date(w.happenedOn + 'T00:00:00')); return j.jy === nowJ.jy && j.jm === nowJ.jm; }).length;
  const used = new Set(all.flatMap(w => w.tagIds));
  const tags = state.tags.filter(t => used.has(t.id));
  const ids = state.winsFilterTagIds.filter(id => used.has(id));
  return { all, thisMonth, tags, ids, shown: ids.length ? all.filter(w => w.tagIds.some(id => ids.includes(id))) : all };
}
function winsFilterChips(tags, ids){
  if(!state.winFilterOpen || !tags.length) return '';
  return `<div class="flex items-center gap-2 flex-wrap mb-6">${choiceChip('همه', !ids.length, 'clearWinsFilter()')}${tags.map(t => choiceChip(esc(t.name), ids.includes(t.id), `toggleWinsFilterTag('${t.id}')`)).join('')}</div>`;
}
function renderWinsDesktop(){
  const { all, thisMonth, tags, ids, shown } = winsData();
  const header = deskHeader({ icon:'trophy', iconBox:'bg-amber-500/10 text-amber-500 shadow-lg shadow-amber-900/10', title:'تونستم! (Wins)', sub:'جشن گرفتن دستاوردهای کوچک و بزرگ', profile:`${fd(all.length)} بار تونستی`,
    right: `
      <div class="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-2xl">
        <div class="flex flex-col items-end"><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">کل دستاوردها</span><span class="text-sm font-black text-amber-500">${fd(all.length)} مورد</span></div>
        <div class="w-px h-6 bg-slate-800"></div>
        <div class="flex flex-col items-end"><span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">این ماه</span><span class="text-sm font-black text-indigo-400">${fd(thisMonth)} مورد</span></div>
      </div>` });
  const card = (w, i) => {
    const tag = w.tagIds.map(tagById).find(Boolean);
    return `
      <div class="col-span-6 win-card bg-slate-900/40 border border-slate-800 rounded-3xl p-6 hover:border-amber-500/30 transition-all group relative overflow-hidden">
        <div class="flex items-start justify-between relative z-10">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-4 flex-wrap">
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${w.happenedOn ? jDate(w.happenedOn, true) : ''}</span>
              ${w.tagIds.map(tagById).filter(Boolean).map(t => `<span class="w-1 h-1 bg-slate-700 rounded-full"></span><span class="text-[10px] font-black px-2 py-0.5 rounded-lg border" style="${tagTint(t.color)}">${esc(t.name)}</span>`).join('')}
            </div>
            <h3 class="text-lg font-black text-white mb-2 leading-tight" dir="auto">${esc(w.title)}</h3>
            ${w.hardship ? `<p class="text-sm text-slate-400 mb-4 font-medium italic" dir="auto"><span class="text-amber-500/50 not-italic ml-1">با اینکه:</span> ${esc(w.hardship)}</p>` : ''}
            ${w.why ? `<div class="p-4 bg-slate-950/50 rounded-2xl border border-slate-800"><p class="text-[10px] text-slate-500 mb-1">چرا معنادار بود؟</p><p class="text-[11px] text-slate-300 leading-relaxed font-bold" dir="auto">${esc(w.why)}</p></div>` : ''}
          </div>
          <div class="win-actions opacity-0 transition-opacity flex flex-col gap-2 mr-3">
            <button type="button" onclick="openWinEditor('${w.id}')" aria-label="ویرایش" class="w-8 h-8 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all">${fa('pen', 'text-[10px]')}</button>
            <button type="button" onclick="deleteWin('${w.id}')" aria-label="حذف" class="w-8 h-8 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-500 transition-all">${fa('trash', 'text-[10px]')}</button>
          </div>
        </div>
        ${fa(i % 2 ? 'medal' : 'trophy', `absolute -bottom-6 -left-6 text-8xl ${i % 2 ? 'text-indigo-400/5' : 'text-amber-500/5'} -rotate-12 group-hover:scale-110 transition-transform`)}
      </div>`;
  };
  const body = `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-end mb-8 gap-4">
        <div class="flex items-center gap-2 shrink-0">
          ${all.length ? `<button type="button" onclick="openWinSos()" class="h-10 px-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-400 text-[11px] font-black hover:bg-amber-500/20 transition-all">${fa('wand-magic-sparkles', 'text-xs')} مغزم داره شکست‌هامو می‌شمره</button>` : ''}
          ${tags.length ? `<button type="button" onclick="state.winFilterOpen=!state.winFilterOpen; render()" aria-label="فیلتر حوزه" class="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center ${ids.length ? 'text-indigo-400' : 'text-slate-400'} hover:text-white transition-all">${fa('filter', 'text-xs')}</button>` : ''}
        </div>
      </div>
      ${winsFilterChips(tags, ids)}
      ${!all.length ? `<div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 text-sm text-slate-400 leading-loose"><b class="text-white">اینجا جای کارهاییه که تونستی.</b><br>هر چیزی حساب می‌شه، حتی اگه کوچیک به نظر بیاد. مثلاً: «با اینکه حوصله نداشتم، ۲۰ دقیقه پایتون خوندم» یا «با اینکه می‌ترسیدم، به اون مشتری پیام دادم». چیزهای قدیمی‌تر رو هم می‌تونی با تاریخ خودشون اضافه کنی.</div>`
        : !shown.length ? emptyNote('موردی با این حوزه‌ها نیست') : `<div class="grid grid-cols-12 gap-6">${shown.map(card).join('')}</div>`}
    </div>`;
  return deskMain({ header, body, fab: deskFab('openWinEditor(null)', 'amber', 'یه چیزی که تونستم') });
}
function renderWinsMobile(){
  const { all, thisMonth, tags, ids, shown } = winsData();
  const card = (w, i) => `
    <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
      <div class="flex justify-between items-start mb-4 relative z-10 gap-3">
        <div class="min-w-0"><h3 class="text-sm font-black text-white mb-1" dir="auto">${esc(w.title)}</h3><span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">${w.happenedOn ? jDate(w.happenedOn, true) : ''}</span></div>
        <div class="w-8 h-8 ${i % 2 ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'} rounded-lg flex items-center justify-center shrink-0">${fa(i % 2 ? 'fire' : 'trophy', 'text-xs')}</div>
      </div>
      ${w.hardship || w.why ? `<div class="space-y-3 relative z-10">
        ${w.hardship ? `<div class="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50"><p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">با وجودِ (Despite)</p><p class="text-[10px] text-slate-300" dir="auto">${esc(w.hardship)}</p></div>` : ''}
        ${w.why ? `<div class="bg-slate-950/50 p-3 rounded-xl border border-slate-800/50"><p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">چرا مهم بود؟ (Why it matters)</p><p class="text-[10px] text-slate-300" dir="auto">${esc(w.why)}</p></div>` : ''}
      </div>` : ''}
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-800/50 relative z-10">
        <div class="flex gap-1.5 flex-wrap">${w.tagIds.map(tagById).filter(Boolean).map(t => `<span class="px-2 py-0.5 bg-slate-800 rounded text-[8px] font-black uppercase" style="color:${ea(t.color)}">${esc(t.name)}</span>`).join('')}</div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="openWinEditor('${w.id}')" aria-label="ویرایش" class="text-slate-600 hover:text-white transition-colors">${fa('pen', 'text-[10px] p-1')}</button>
          <button type="button" onclick="deleteWin('${w.id}')" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-colors">${fa('trash-can', 'text-[10px] p-1')}</button>
        </div>
      </div>
      ${fa('award', 'absolute -bottom-4 -left-4 text-6xl text-white/5 -rotate-12')}
    </div>`;
  return `
    ${mobHeader(mobTitle('تونستم'), `<div class="flex items-center gap-2">${tags.length ? mobIconBtn('filter', 'state.winFilterOpen=!state.winFilterOpen; render()', 'فیلتر') : ''}${mobIconBtn('plus', 'openWinEditor(null)', 'یه چیزی که تونستم', 'primary')}</div>`)}
    <div class="p-4 grid grid-cols-2 gap-3">
      <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5 text-center"><p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">کل دستاوردها</p><span class="text-2xl font-black text-white">${fd(all.length)}</span></div>
      <div class="bg-emerald-600/10 border border-emerald-500/20 rounded-3xl p-5 text-center"><p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">این ماه</p><span class="text-2xl font-black text-white">${fd(thisMonth)}</span></div>
    </div>
    <div class="px-4 mb-6 space-y-3">
      ${all.length ? `<button type="button" onclick="openWinSos()" class="w-full py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] font-black text-amber-400">${fa('wand-magic-sparkles', 'ml-1')} مغزم داره شکست‌هامو می‌شمره</button>` : ''}
    </div>
    <main class="safe-area-bottom px-4">
      ${renderStatusBars()}
      ${winsFilterChips(tags, ids)}
      <div class="space-y-4">${!all.length ? `<div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 text-[11px] text-slate-400 leading-loose"><b class="text-white">اینجا جای کارهاییه که تونستی.</b><br>هر چیزی حساب می‌شه، حتی اگه کوچیک به نظر بیاد.</div>` : !shown.length ? emptyNote('موردی با این حوزه‌ها نیست') : shown.map(card).join('')}</div>
    </main>`;
}
function renderWinEditorModal(){
  const ed = state.winEditor;
  const today = dateKey(new Date()), yesterday = dateKey(new Date(Date.now() - 86400000));
  const other = ed.happenedOn !== today && ed.happenedOn !== yesterday;
  const quick = (on, label, onclick) => `<button type="button" onclick="${onclick}" class="flex-1 py-2.5 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500'} rounded-xl text-[10px] font-black">${label}</button>`;
  return renderEditorFrame({ title: ed.winId ? 'ویرایش' : 'یه چیزی که تونستم', onClose:'closeWinEditor()', onSave:'confirmWinEditor()', saveLabel:'ثبتش کن',
    onDelete: ed.winId ? `const id=state.winEditor.winId; closeWinEditor(); deleteWin(id)` : '',
    body:`
      ${field('چی رو تونستی؟', `<input type="text" dir="auto" value="${ea(ed.title)}" oninput="state.winEditor.title=this.value" class="${titleInputCls()}">`)}
      ${field('با اینکه…', `<textarea dir="auto" placeholder="خسته بودم، می‌ترسیدم، حوصله نداشتم…" oninput="state.winEditor.hardship=this.value" class="${textareaCls()}">${esc(ed.hardship)}</textarea>`)}
      ${field('چرا برام مهم بود / چه حسی داشتم', `<textarea dir="auto" placeholder="چیزی که بعداً خوندنش بهت یادآوری کنه" oninput="state.winEditor.why=this.value" class="${textareaCls()}">${esc(ed.why)}</textarea>`)}
      ${state.tags.length ? field('حوزه', chipBox(state.tags.map(t => `<button type="button" onclick="winEditorToggleTag('${t.id}')" class="px-2 py-1 rounded-lg text-[10px] font-bold border ${ed.tagIds.includes(t.id) ? '' : 'bg-slate-800 border-slate-700 opacity-60'}" style="${ed.tagIds.includes(t.id) ? tagTint(t.color, '33', '1a') : `color:${ea(t.color)}`}">${esc(t.name)}</button>`).join(''))) : ''}
      ${field('کِی؟', `<div class="flex gap-2">${quick(ed.happenedOn === today, 'امروز', 'winEditorQuickDate(0)')}${quick(ed.happenedOn === yesterday, 'دیروز', 'winEditorQuickDate(1)')}${quick(other, other ? fmtWinDate(ed.happenedOn) : 'یه روز دیگه', 'toggleWinCalendar()')}</div>
        ${ed.calendarOpen ? renderPickCalendar({ jy:ed.calJY, jm:ed.calJM, date:ed.happenedOn, prev:'winCalPrevMonth', next:'winCalNextMonth', pick:'winCalPick' }) : ''}`)}`,
  });
}
function renderWinSos(){
  const s = state.winSos;
  const order = s.order.filter(id => state.wins.some(w => w.id === id));
  const total = order.length;
  const frame = (inner, actions) => `
    <div class="modal-overlay fixed inset-0 z-[70] bg-[#020617]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 gap-6" role="dialog" aria-modal="true">
      ${inner}
      <div class="flex items-center gap-3 w-full max-w-md">${actions}</div>
    </div>`;
  if(s.index >= total) return frame(`
    <div class="w-full max-w-md bg-slate-900 border border-amber-500/20 rounded-3xl p-8 text-center relative overflow-hidden">
      <p class="text-3xl font-black text-white mb-3">${fd(total)} بار تونستی.</p>
      <p class="text-sm text-slate-400 font-bold">همه‌ش کار خودت بود. یه بار دیگه هم می‌تونی.</p>
      ${fa('trophy', 'absolute -bottom-6 -left-6 text-8xl text-amber-500/10 -rotate-12')}
    </div>`, dlgPrimary('بسه، بهترم', 'closeWinSos()') + dlgSecondary('از اول', 'openWinSos()'));
  const w = state.wins.find(x => x.id === order[s.index]);
  return frame(`
    <p class="text-xs font-bold text-amber-400 text-center leading-relaxed">مغزت داره شکست‌ها رو می‌شمره؟<br>پس اینا رو هم بشمر.</p>
    <div class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
      <h3 class="text-xl font-black text-white mb-4 leading-tight relative z-10" dir="auto">${esc(w.title)}</h3>
      ${w.hardship ? `<p class="text-sm text-slate-400 mb-4 font-medium italic relative z-10" dir="auto"><span class="text-amber-500/60 not-italic ml-1">با اینکه:</span> ${esc(w.hardship)}</p>` : ''}
      ${w.why ? `<div class="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 relative z-10"><p class="text-[11px] text-slate-300 leading-relaxed font-bold" dir="auto">${esc(w.why)}</p></div>` : ''}
      <p class="text-[10px] font-black text-slate-500 mt-4 relative z-10">${fmtWinDate(w.happenedOn)}</p>
      ${fa('trophy', 'absolute -bottom-6 -left-6 text-8xl text-amber-500/5 -rotate-12')}
    </div>
    <p class="text-[10px] font-black text-slate-600">${fd(s.index + 1)} از ${fd(total)}</p>`,
    dlgPrimary('یکی دیگه', 'nextWinSos()') + dlgSecondary('بسه، بهترم', 'closeWinSos()'));
}

/* ================= مادر ================= */
function motherCareCard(i, todays, mob){
  const isToday = todays && todays.id === i.id;
  const dont = i.kind === 'dont';
  if(mob) return `
    <div class="bg-slate-900 border ${isToday ? 'border-rose-500/30' : 'border-slate-800'} rounded-2xl p-4">
      <div class="flex items-start justify-between mb-3 gap-3">
        <div class="space-y-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            ${i.category ? `<span class="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase" dir="auto">${esc(i.category)}</span>` : ''}
            <span class="text-[8px] font-black ${dont ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-1.5 py-0.5 rounded uppercase">${dont ? 'نکن' : 'بکن'}</span>
            ${isToday ? `<span class="text-[8px] font-black text-white bg-rose-500 px-1.5 py-0.5 rounded uppercase">ملاحظهٔ امروز</span>` : ''}
          </div>
          <h4 class="text-sm font-bold text-slate-200 leading-relaxed" dir="auto">${esc(i.body)}</h4>
        </div>
        <div class="flex gap-2 shrink-0">
          <button type="button" onclick="openMotherEditor('${i.id}')" aria-label="ویرایش" class="text-slate-600 hover:text-white transition-colors">${fa('pen', 'text-[10px] p-1')}</button>
          <button type="button" onclick="deleteMotherItem('${i.id}')" aria-label="حذف" class="text-slate-600 hover:text-rose-500 transition-colors">${fa('trash-can', 'text-[10px] p-1')}</button>
        </div>
      </div>
    </div>`;
  return `
    <div class="care-item bg-slate-900/40 border ${isToday ? 'border-rose-500/30' : 'border-slate-800'} rounded-3xl p-6 hover:border-rose-500/30 transition-all group">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 ${dont ? 'bg-rose-500/10 text-rose-500' : 'bg-indigo-500/10 text-indigo-400'} rounded-xl flex items-center justify-center">${fa(dont ? 'ban' : 'hand-holding-heart', 'text-sm')}</div>
          <div><h4 class="text-sm font-bold text-slate-200">${dont ? 'نکن' : 'بکن'}</h4><p class="text-[10px] text-slate-500" dir="auto">دسته‌بندی: ${esc(i.category || 'بدون دسته')}</p></div>
        </div>
        <div class="care-actions opacity-0 transition-opacity flex items-center gap-2">
          <button type="button" onclick="openMotherEditor('${i.id}')" aria-label="ویرایش" class="p-2 text-slate-500 hover:text-white transition-colors">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="deleteMotherItem('${i.id}')" aria-label="حذف" class="p-2 text-slate-500 hover:text-rose-500 transition-colors">${fa('trash', 'text-[10px]')}</button>
        </div>
      </div>
      <p class="text-sm text-slate-400 leading-relaxed mb-6 font-medium" dir="auto">${esc(i.body)}</p>
      <div class="flex items-center justify-between pt-4 border-t border-slate-800/50">
        <div class="flex items-center gap-2">${isToday ? `<span class="text-[10px] font-black text-rose-400">${fa('heart', 'text-[9px] ml-1')}ملاحظهٔ امروز</span>` : `<span class="text-[10px] text-slate-600 italic">ملاحظهٔ شخصی</span>`}</div>
        <button type="button" onclick="openMotherEditor('${i.id}')" class="text-[10px] font-black text-indigo-400 hover:text-indigo-300">ویرایش جزئیات</button>
      </div>
    </div>`;
}
const motherEmpty = () => `
  <div class="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-[11px] text-slate-400 leading-loose">
    <b class="text-white">هنوز ملاحظه‌ای ننوشتی.</b><br>می‌تونی از موارد عمومی ام‌اس شروع کنی و بعد به حال مادرت نزدیکشون کنی.
    <button type="button" onclick="addDefaultMotherItems()" class="block mt-4 text-[10px] font-black text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/10">اضافه کردن موارد عمومی ام‌اس</button>
  </div>`;
function motherWhyEditor(){
  return `
    <div class="space-y-3">
      <textarea dir="auto" oninput="state.motherWhyDraft=this.value" class="${textareaCls()}">${esc(state.motherWhyDraft)}</textarea>
      <div class="flex gap-2">${dlgPrimary('ذخیره', 'saveMotherWhy()')}${dlgSecondary('انصراف', 'state.motherWhyDraft=null; render()')}</div>
    </div>`;
}
function renderMotherDesktop(){
  const s = motherSettings();
  const items = state.motherItems || [];
  const todays = motherItemForDay(new Date());
  const why = s.why || DEFAULT_MOTHER_WHY;
  const header = deskHeader({ icon:'heart', iconBox:'bg-rose-500/10 text-rose-500', title:'رسیدگی به امور مادر', sub:'مدیریت مراقبت‌ها و یادآوری‌های روزانه', profile:`${fd(items.length)} ملاحظه`,
    right: `
      <button type="button" onclick="state.motherWhyDraft=motherSettings().why || DEFAULT_MOTHER_WHY; render()" title="${ea(why)}" class="hidden md:flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-2xl group cursor-pointer max-w-md">
        <p class="text-xs text-slate-400 italic truncate" dir="auto">"${esc(why)}"</p>
        ${fa('pen', 'text-[10px] text-slate-600 group-hover:text-rose-400 transition-colors shrink-0')}
      </button>` });
  const body = `
    <div class="max-w-6xl mx-auto grid grid-cols-12 gap-8">
      <div class="col-span-8 space-y-8">
        ${state.motherWhyDraft !== null ? `<div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">${cardTitle('چرا یادم باشه', 'heart', 'text-rose-500')}${motherWhyEditor()}</div>` : ''}
        <div>
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-sm font-black text-white uppercase tracking-widest">لیست ملاحظات مراقبتی</h3>
            <button type="button" onclick="openMotherEditor(null)" class="flex items-center gap-2 text-[10px] font-black text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl hover:bg-rose-500/20 transition-all border border-rose-500/10">${fa('plus')} افزودن مورد جدید</button>
          </div>
          <div class="space-y-4">${items.length ? [...items].sort((a, b) => (todays && b.id === todays.id) - (todays && a.id === todays.id)).map(i => motherCareCard(i, todays, false)).join('') : motherEmpty()}</div>
        </div>
      </div>
      <div class="col-span-4 space-y-8">
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          ${cardTitle('تنظیمات کلی یادآوری', 'bell', 'text-rose-500')}
          <div class="space-y-6">
            <div class="space-y-3">
              <div class="flex items-center justify-between px-1"><p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">روزهای فعال یادآوری</p><span class="text-[10px] font-black text-rose-400">${s.remindDays.length ? `هفته‌ای ${fd(s.remindDays.length)} روز` : 'خاموش'}</span></div>
              <div class="flex gap-1 justify-between">${weekdayBtns(s.remindDays, d => `toggleMotherDay(${d})`, 'rose', 'w-8 h-8')}</div>
            </div>
            <div class="flex items-center justify-between border-t border-slate-800 pt-6">
              <div><p class="text-xs font-bold text-slate-300">اعلان صبحگاهی</p><p class="text-[10px] text-slate-600">ارسال اعلان در ساعت ۸:۰۰</p></div>
              ${switchBtn(s.push, `setMotherFlag('push', ${!s.push})`, 'اعلان صبحگاهی', 'rose')}
            </div>
            <div class="flex items-center justify-between border-t border-slate-800 pt-6">
              <div><p class="text-xs font-bold text-slate-300">نمایش در ویجت امروز</p><p class="text-[10px] text-slate-600">مشاهده در صفحه اصلی</p></div>
              ${switchBtn(s.showOnToday, `setMotherFlag('showOnToday', ${!s.showOnToday})`, 'نمایش در امروز', 'rose')}
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-indigo-500/10 to-rose-500/5 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
          ${fa('quote-right', 'absolute top-4 left-4 text-4xl text-white/5')}
          <h4 class="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">نکته روز</h4>
          <p class="text-sm text-slate-300 leading-relaxed font-medium italic" dir="auto">"${esc(todays ? todays.body : why)}"</p>
          ${todays ? '' : `<p class="text-[10px] text-slate-500 mt-3">امروز روز یادآوری نیست.</p>`}
        </div>
        <p class="text-[10px] text-slate-600 leading-relaxed px-2">این‌ها نکته‌های عمومی ام‌اس‌ان؛ هر چیزی که دکترِ مادرت گفته مهم‌تره.</p>
      </div>
    </div>`;
  return deskMain({ header, body, fab: deskFab('openMotherEditor(null)', 'rose', 'ملاحظه‌ی تازه') });
}
function renderMotherMobile(){
  const s = motherSettings();
  const items = state.motherItems || [];
  const todays = motherItemForDay(new Date());
  const why = s.why || DEFAULT_MOTHER_WHY;
  return `
    ${mobHeader(`<div class="flex items-center gap-3"><div class="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 border border-rose-500/20">${fa('heart', 'text-sm')}</div><h1 class="text-lg font-black text-white">مادر</h1></div>`,
      mobIconBtn('pen', 'state.motherWhyDraft=motherSettings().why || DEFAULT_MOTHER_WHY; render()', 'ویرایش «چرا یادم باشه»'))}
    <div class="p-4 space-y-4">
      <div class="bg-gradient-to-br from-rose-500/15 to-indigo-500/10 border border-rose-500/20 rounded-3xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('bell', 'text-rose-400')} تنظیمات یادآوری کلی</h3>
          <span class="text-[9px] font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/10">${s.remindDays.length ? 'فعال' : 'خاموش'}</span>
        </div>
        <div class="space-y-4">
          <div class="flex justify-between gap-1">${WEEKDAY_DISPLAY_ORDER.map(d => `<button type="button" onclick="toggleMotherDay(${d})" title="${WEEKDAYS_FA[d]}" aria-pressed="${s.remindDays.includes(d)}" class="w-9 h-9 rounded-lg ${s.remindDays.includes(d) ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-600'} text-[10px] font-black">${WEEKDAYS_FA[d][0]}</button>`).join('')}</div>
          <div class="grid grid-cols-2 gap-3">
            <button type="button" onclick="setMotherFlag('push', ${!s.push})" class="bg-slate-950/50 p-3 rounded-2xl border border-rose-500/5 text-right"><p class="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">اعلان صبحگاهی</p><p class="text-[10px] font-black ${s.push ? 'text-white' : 'text-slate-500'}">${s.push ? 'ساعت ۸ صبح' : 'خاموش'}</p></button>
            <button type="button" onclick="setMotherFlag('showOnToday', ${!s.showOnToday})" class="bg-slate-950/50 p-3 rounded-2xl border border-rose-500/5 text-right"><p class="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">نمایش در امروز</p><p class="text-[10px] font-black ${s.showOnToday ? 'text-emerald-400' : 'text-slate-500'}">${s.showOnToday ? 'فعال' : 'خاموش'}</p></button>
          </div>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <p class="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">چرا این کار را می‌کنم؟</p>
        ${state.motherWhyDraft !== null ? motherWhyEditor() : `<p class="text-[10px] text-slate-400 italic leading-relaxed" dir="auto">"${esc(why)}"</p>`}
      </div>
    </div>
    <main class="safe-area-bottom px-4">
      ${renderStatusBars()}
      <div class="flex items-center justify-between mb-4 px-1"><h3 class="text-xs font-black text-white uppercase tracking-widest">موارد رسیدگی و محبت</h3><button type="button" onclick="openMotherEditor(null)" class="text-[10px] font-black text-rose-400">+ افزودن مورد</button></div>
      <div class="space-y-4">${items.length ? [...items].sort((a, b) => (todays && b.id === todays.id) - (todays && a.id === todays.id)).map(i => motherCareCard(i, todays, true)).join('') : motherEmpty()}</div>
      <p class="text-[10px] text-slate-600 leading-relaxed px-1 mt-6">این‌ها نکته‌های عمومی ام‌اس‌ان؛ هر چیزی که دکترِ مادرت گفته مهم‌تره.</p>
    </main>`;
}
function renderMotherEditorModal(){
  const ed = state.motherEditor;
  const cats = [...new Set((state.motherItems || []).map(i => i.category).filter(Boolean))];
  return renderEditorFrame({ title: ed.itemId ? 'ویرایش ملاحظه' : 'ملاحظه‌ی تازه', onClose:'closeMotherEditor()', onSave:'confirmMotherEditor()',
    onDelete: ed.itemId ? `const id=state.motherEditor.itemId; closeMotherEditor(); deleteMotherItem(id)` : '',
    body:`
      ${field('چی کار کنم / نکنم؟', `<textarea dir="auto" placeholder="مثلاً: وقتی خسته‌ست، کارهای خونه رو خودم انجام بدم" oninput="state.motherEditor.body=this.value" class="${textareaCls()}">${esc(ed.body)}</textarea>`)}
      ${field('نوع', segmented([['do','بکن'], ['dont','نکن']], ed.kind, k => `state.motherEditor.kind='${k}'; render()`))}
      ${field('دسته', (cats.length ? chipBox(cats.map(c => choiceChip(esc(c), ed.category === c, 'pickMotherCategory(this.dataset.v)', `data-v="${ea(c)}"`)).join('')) : '') + `<input type="text" dir="auto" placeholder="یا یه دسته‌ی تازه بنویس" value="${cats.includes(ed.category) ? '' : ea(ed.category)}" oninput="state.motherEditor.category=this.value" class="${inputCls}">`)}`,
  });
}
