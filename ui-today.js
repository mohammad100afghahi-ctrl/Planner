/* ---------- مدار UI: امروز ----------
   Desktop: reference Q7pbgNwfW4q7j5PTzn9i. Phone: reference s02MoXt3u4YjAnSUS5zz. */
/* filters and sort live in one panel, so they get one button; it lights up
   with the count of active choices (filterActiveCount includes a non-default sort) */
function todayFilterButton(d, iconSize){
  const on = d.filterCount || state.filterPanelOpen.todayFilters;
  return `<button type="button" onclick="toggleFilterPanel('todayFilters')" title="فیلتر و ترتیب" aria-label="فیلتر و ترتیب" class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black transition-colors ${on ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}">${fa('sliders', iconSize)}<span>فیلتر و ترتیب</span>${d.filterCount ? `<span>${fd(d.filterCount)}</span>` : ''}</button>`;
}
function todayData(){
  const todayStr = dateKey(state.today);
  /* Today's own tasks, plus any overdue task from a past day — an overdue task
     stays until it's finished, and a task finished today stays for the rest of
     the day (so the tick can be undone) instead of vanishing on tap. */
  const raw = state.tasks.filter(t => {
    if(t.date === todayStr) return true;
    if(!t.date || t.date >= todayStr) return false;
    if(!t.done) return true;
    return t.completedAt && dateKey(new Date(t.completedAt)) === todayStr;
  });
  const scheduled = applyFiltersAndSort(raw, 'todayFilters', { dateFilter:false });
  return {
    todayStr, raw, scheduled,
    overdue: scheduled.filter(t => !t.done && t.date < todayStr),
    open: scheduled.filter(t => !t.done && t.date >= todayStr),
    done: scheduled.filter(t => t.done),
    planned: raw.reduce((s, t) => s + (t.durationMin || 0), 0),
    filterCount: filterActiveCount(state.todayFilters, false),
  };
}
const hhmm = d => fd(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
function reminderShort(t){
  if(t.done) return '';
  if(t.reminderKind === 'always') return 'یادآوری تا انجام';
  if(!t.reminderAt) return '';
  const d = new Date(t.reminderAt);
  return dateKey(d) === dateKey(new Date()) ? `یادآوری ${hhmm(d)}` : `یادآوری ${jDate(dateKey(d))}، ${hhmm(d)}`;
}
const PRIORITY_TODAY_LABEL = { high:'مهم', medium:'متوسط', low:'پایین' };
/* the line of small facts under a task title (reference: tag · flag · bell · hourglass) */
function taskMetaSpans(t, { mob, priorityLabels = PRIORITY_TODAY_LABEL, showDate } = {}){
  const sp = mob ? 'text-[9px] font-black' : 'text-[10px] font-bold';
  const ic = mob ? 'text-[8px]' : 'text-[9px]';
  const out = [];
  t.tagIds.forEach(id => { const tag = tagById(id); if(tag) out.push(`<span class="${sp} flex items-center gap-1" style="color:${ea(tag.color)}">${fa('tag', ic)} ${esc(tag.name)}</span>`); });
  if(t.priority) out.push(`<span class="${sp} ${PRIORITY_TEXT[t.priority]} flex items-center gap-1">${fa('flag', ic)} ${priorityLabels[t.priority]}</span>`);
  if(showDate && t.date) out.push(`<span class="${sp} text-slate-500 flex items-center gap-1">${fa('calendar', ic)} ${jDate(t.date)}</span>`);
  const rem = reminderShort(t);
  if(rem) out.push(`<span class="${sp} text-slate-500 flex items-center gap-1">${fa('bell', ic)} ${rem}</span>`);
  if(t.durationMin) out.push(`<span class="${sp} text-slate-500 flex items-center gap-1">${fa('hourglass-half', ic)} ${fmtMin(t.durationMin)}</span>`);
  if(t.subtasks.length) out.push(`<span class="${sp} text-slate-500 flex items-center gap-1">${fa('list-check', ic)} ${fd(t.subtasks.filter(s => s.done).length)}/${fd(t.subtasks.length)}</span>`);
  if(t.recurringTemplateId) out.push(`<span class="${sp} text-slate-500 flex items-center gap-1" title="تکرارشونده">${fa('rotate', ic)}</span>`);
  return out.join('');
}
const overdueHeading = list => list.every(t => daysUntil(t.date) === -1) ? 'عقب‌افتاده از دیروز' : 'عقب‌افتاده از روزهای قبل';
function overdueLabel(t){
  const n = -daysUntil(t.date);
  return n === 1 ? 'دیروز (انجام نشده)' : `${fd(n)} روز پیش (انجام نشده)`;
}
/* an open task's ریز کارها, ticked right on its card (امروز and تسک‌ها) — no editor needed */
function subtaskChecklist(t){
  if(t.done || !t.subtasks.length) return '';
  return `
    <div class="space-y-1.5 mt-2" onclick="event.stopPropagation()">
      ${t.subtasks.map(s => `
        <button type="button" onclick="toggleSubtask('${t.id}','${s.id}', event)" aria-label="${s.done ? 'برگرداندن' : 'انجام شد'}" class="w-full flex items-center gap-2 text-right">
          ${s.done ? fa('circle-check', 'text-emerald-500 text-[10px]') : '<div class="w-2.5 h-2.5 border border-slate-700 rounded-sm shrink-0"></div>'}
          <span class="text-[11px] ${s.done ? 'text-slate-500 line-through' : 'text-slate-300'}" dir="auto">${esc(s.title)}</span>
        </button>`).join('')}
    </div>`;
}
const checkAlign = t => subtaskChecklist(t) ? 'items-start' : 'items-center';
/* notes open under the task when its title is tapped */
function todayTaskExpansion(t, mob){
  if(!state.todayExpanded[t.id] || !t.notes) return '';
  return `
    <div class="${mob ? 'px-4 pb-4' : 'px-4 pb-4 pr-14'} space-y-2">
      <p class="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line" dir="auto">${esc(t.notes)}</p>
    </div>`;
}
function todayTaskActions(t){
  return `
    <div class="task-actions opacity-0 transition-opacity flex items-center gap-2">
      <button type="button" onclick="openTaskEditorEdit('${t.id}')" title="ویرایش" aria-label="ویرایش" class="p-2 text-slate-500 hover:text-white transition-colors">${fa('pen', 'text-xs')}</button>
      <button type="button" onclick="copyTaskToEditor('${t.id}')" title="کپی" aria-label="کپی" class="p-2 text-slate-500 hover:text-white transition-colors">${fa('copy', 'text-xs')}</button>
      <button type="button" onclick="deleteTask('${t.id}', event)" title="حذف" aria-label="حذف" class="p-2 text-slate-500 hover:text-rose-500 transition-colors">${fa('trash', 'text-xs')}</button>
    </div>`;
}
const canExpand = t => !!t.notes;
function todayTaskDesk(t){
  const overdue = !t.done && t.date < dateKey(state.today);
  const expandAttr = canExpand(t) ? `onclick="toggleTodayExpand('${t.id}')" class="cursor-pointer"` : '';
  if(overdue) return `
    <div class="task-item bg-rose-500/5 rounded-2xl border border-rose-500/10 hover:border-rose-500/30 transition-all group">
      <div class="p-4 flex items-center justify-between">
        <div class="flex ${checkAlign(t)} gap-4">
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="انجام شد" class="w-6 h-6 border-2 border-rose-500/30 rounded-lg bg-slate-900 flex items-center justify-center transition-colors">${fa('check', 'text-xs text-rose-500 opacity-0 group-hover:opacity-30')}</button>
          <div ${expandAttr}>
            <h4 class="text-sm font-bold text-slate-200" dir="auto">${esc(t.title)}</h4>
            <div class="flex items-center gap-3 mt-1.5 flex-wrap">
              <span class="text-[10px] font-bold text-rose-400 flex items-center gap-1">${fa('clock', 'text-[9px]')} ${overdueLabel(t)}</span>
              ${taskMetaSpans(t)}
            </div>
            ${subtaskChecklist(t)}
          </div>
        </div>
        ${todayTaskActions(t)}
      </div>
      ${todayTaskExpansion(t)}
    </div>`;
  return `
    <div class="task-item bg-slate-800/40 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all group">
      <div class="p-4 flex items-center justify-between">
        <div class="flex ${checkAlign(t)} gap-4">
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="انجام شد" class="w-6 h-6 border-2 border-slate-700 rounded-lg bg-slate-900 hover:border-indigo-500 flex items-center justify-center transition-colors group">${fa('check', 'text-xs text-indigo-500 opacity-0 group-hover:opacity-30')}</button>
          <div ${expandAttr}>
            <h4 class="text-sm font-bold text-slate-200" dir="auto">${esc(t.title)}</h4>
            ${taskMetaSpans(t) ? `<div class="flex items-center gap-3 mt-1.5 flex-wrap">${taskMetaSpans(t)}</div>` : ''}
            ${subtaskChecklist(t)}
          </div>
        </div>
        ${todayTaskActions(t)}
      </div>
      ${todayTaskExpansion(t)}
    </div>`;
}
function todayDoneDesk(t){
  return `
    <div class="opacity-40 bg-slate-900/30 p-4 rounded-2xl border border-transparent flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="برگرداندن" class="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center">${fa('check', 'text-xs')}</button>
        <h4 class="text-sm font-bold text-slate-500 line-through" dir="auto">${esc(t.title)}</h4>
      </div>
    </div>`;
}
function todayFilterPanel(){
  if(!state.filterPanelOpen.todayFilters) return '';
  const f = state.todayFilters;
  const row = (label, chips) => `<div class="flex items-center gap-2 flex-wrap"><span class="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">${label}</span>${chips}</div>`;
  return `
    <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 mb-4 space-y-3">
      ${state.tags.length ? row('تگ', state.tags.map(t => choiceChip(esc(t.name), f.tagIds.includes(t.id), `toggleFilterTag('todayFilters','${t.id}')`)).join('')) : ''}
      ${row('اولویت', ['high','medium','low'].map(p => choiceChip(PRIORITY_LABEL[p], f.priorities.includes(p), `toggleFilterPriority('todayFilters','${p}')`)).join(''))}
      ${row('مرتب‌سازی', [['today-first','امروز اول'], ['duration-asc','کوتاه‌ترین اول'], ['duration-desc','بلندترین اول']].map(([v, l]) => choiceChip(l, f.sortBy === v, `setFilterSort('todayFilters','${v}')`)).join(''))}
      ${filtersActive(f, false) ? `<button type="button" onclick="resetFilters('todayFilters')" class="text-[10px] font-black text-rose-400">پاک‌کردن فیلترها</button>` : ''}
    </div>`;
}

/* ---------- top-of-page notices ---------- */
function todayCallout(mob){
  const health = renderAIHealthBanner();
  const r = currentRitual();
  let box = '';
  // مرور هفته is ready and not done yet: one card that opens it
  if(r){
    const started = r.ritual.step > 0;
    const text = started ? `از قدم ${fd(r.ritual.step + 1)} ادامه بده؛ چند دقیقه بیشتر نمونده.` : '۵ دقیقه: یه نگاه به هفته‌ی قبل، تکلیف کارهای گیرکرده، چیدن هفته و یه تعهد.';
    const label = started ? 'ادامه‌ی مرور' : 'شروع مرور';
    box = `
      <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl ${mob ? 'p-5' : 'p-6'} flex items-center gap-4">
        <div class="${mob ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'} bg-indigo-600 flex items-center justify-center text-white shrink-0">${fa('clipboard-check', mob ? 'text-lg' : 'text-xl')}</div>
        <div class="flex-1 min-w-0">
          <h3 class="${mob ? 'text-xs' : 'text-sm'} font-black text-white mb-1">مرور هفته آماده‌ست</h3>
          <p class="${mob ? 'text-[10px]' : 'text-xs'} text-slate-400 leading-relaxed">${text}</p>
        </div>
        <button type="button" onclick="navigateTo('ai-reports')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all shrink-0">${label}</button>
      </div>`;
  }
  return health + box;
}

/* ---------- right-hand cards ---------- */
function weeklyFocusData(){
  const goals = state.tagGoals.filter(g => g.weeklyMinutes > 0).map(g => {
    const tag = tagById(g.tagId);
    if(!tag) return null;
    const actual = computeTagWeeklyMinutes(g.tagId);
    return { tag, actual, target:g.weeklyMinutes, pct:Math.min(100, Math.round(actual / g.weeklyMinutes * 100)), reason:g.reason || '' };
  }).filter(Boolean);
  const c = weeklyCommitment();
  const focus = c ? [c.task] : [];
  return { goals, focus };
}
function focusCard(mob){
  const { goals, focus } = weeklyFocusData();
  if(!goals.length && !focus.length) return '';
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'}">
      <h4 class="${mob ? 'text-[10px]' : 'text-xs'} font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">${fa('bullseye', 'text-indigo-500')} تمرکز هفته</h4>
      <div class="space-y-4">
        ${goals.map(g => `
          <div class="p-3 bg-indigo-500/5 ${mob ? 'rounded-xl' : 'rounded-2xl'} border border-indigo-500/10" title="${ea(g.reason)}">
            <p class="${mob ? 'text-[10px]' : 'text-xs'} font-bold text-slate-300 mb-2 leading-relaxed">${esc(g.tag.name)}: ${formatDuration(g.actual)} از ${formatDuration(g.target)}${g.pct >= 100 ? ' ✓' : ''}</p>
            <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden"><div class="${g.pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'} h-full rounded-full ${mob ? '' : 'shadow-[0_0_8px_rgba(79,70,229,0.4)]'}" style="width:${Math.max(3, g.pct)}%"></div></div>
            ${g.reason && !mob ? `<p class="text-[10px] text-slate-500 mt-2">${esc(g.reason)}</p>` : ''}
          </div>`).join('')}
        ${focus.length ? `<div class="space-y-2"><p class="text-[9px] font-black text-indigo-400 px-1">تعهد این هفته</p>${focus.map(t => `
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" class="w-full flex items-center gap-2 px-1 text-right">
            ${t.done ? fa('circle-check', 'text-emerald-500 text-[10px]') : '<div class="w-2.5 h-2.5 border border-slate-700 rounded-sm shrink-0"></div>'}
            <span class="text-[11px] ${t.done ? 'text-slate-500 line-through' : 'text-slate-400'}" dir="auto">${esc(t.title)}</span>
            <span class="mr-auto text-[9px] text-slate-600">${t.date ? jDate(t.date) : 'بعداً'}</span>
          </button>`).join('')}</div>` : ''}
      </div>
    </div>`;
}
function englishTodayCard(mob){
  const card = mob ? 'bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden group' : 'bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group';
  const head = (right) => `
    <div class="flex items-center justify-between mb-4 relative z-10">
      <h4 class="${mob ? 'text-[10px]' : 'text-xs'} font-black text-white flex items-center gap-2 uppercase tracking-widest">${fa('language', 'text-amber-500')} تمرین انگلیسی</h4>
      ${right}
    </div>`;
  const watermark = mob ? '' : fa('graduation-cap', 'absolute -bottom-4 -left-4 text-7xl text-white/5 -rotate-12 transition-transform group-hover:scale-110');
  if(!state.englishSettings && !(state.englishHomework || []).length) return `
    <div class="${card}">
      ${head('')}
      <p class="text-[11px] text-slate-400 leading-relaxed mb-4 relative z-10">روزهای کلاست رو بگو تا مهلت هر تکلیف خودکار جلسه‌ی بعد بشه و بعد از کلاس یادت بندازم تکلیف رو بنویسی.</p>
      <button type="button" onclick="state.englishTab='settings'; navigateTo('english')" class="w-full py-3 bg-amber-500/10 text-amber-400 rounded-xl text-[10px] font-black hover:bg-amber-500/20 transition-all border border-amber-500/10 tracking-widest uppercase relative z-10">تنظیم روزهای کلاس</button>
      ${watermark}
    </div>`;
  const today = dateKey(new Date());
  const doneToday = enPracticedDays().has(today);
  const chunks = enTodayChunks();
  const askFor = enNeedsHomeworkPrompt();
  const minTicked = (state.englishPractice || []).some(p => p.day === today);
  const classLater = enIsClassDay(today) && !enClassEndedToday();
  const row = c => `
      <div>
        <button type="button" onclick="toggleEnglishChunk('${c.id}')" class="w-full flex items-center gap-2 text-right">
          ${c.done ? fa('circle-check', 'text-emerald-500 text-[10px]') : '<div class="w-2.5 h-2.5 border border-slate-700 rounded-sm shrink-0"></div>'}
          <span class="text-[11px] ${c.done ? 'text-slate-400' : 'text-slate-300'}" dir="auto">${esc(c.title)} (${c.done ? 'تکمیل شده' : fmtMin(c.minutes)})</span>
        </button>
      </div>`;
  return `
    <div class="${card}">
      ${head(`<button type="button" onclick="navigateTo('english')" class="${mob ? 'text-[9px]' : 'text-[10px]'} font-black text-amber-500">تکالیف فعال</button>`)}
      <div class="space-y-3 relative z-10">
        ${classLater ? `<p class="text-[10px] font-bold text-amber-400/80 flex items-center gap-1.5">${fa('clock', 'text-[9px]')} امروز ساعت ${fd(enClassTime(enWeekday(today)))} کلاس داری</p>` : ''}
        ${askFor ? `
          <div class="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-2">
            <p class="text-[11px] font-bold text-slate-300">کلاسِ ${enDayLabel(askFor)} تموم شد — تکلیف چی بود؟</p>
            <input type="text" id="en-quick-title" data-preserve placeholder="مثلاً: Workbook صفحه‌ی ۲۱ تا ۲۳" value="${ea(state.newHomework.title)}"
              oninput="state.newHomework.title=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); addEnglishHomework();}"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/50 placeholder:text-slate-600" />
            <div class="flex gap-2">
              <button type="button" onclick="addEnglishHomework()" class="flex-1 py-2 bg-amber-500 text-slate-950 rounded-lg text-[10px] font-black">ثبت تکلیف</button>
              <button type="button" onclick="enNoHomework()" class="px-3 py-2 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black">تکلیف نداشتیم</button>
            </div>
          </div>` : ''}
        <div class="${mob ? 'p-3 bg-slate-950 rounded-xl' : 'p-4 bg-slate-900/80 rounded-2xl'} border border-slate-800">
          <p class="text-[10px] text-slate-500 mb-2">ریز کارهای تکلیف:</p>
          <div class="space-y-2">
            ${chunks.length ? chunks.map(row).join('') : `<p class="text-[11px] text-slate-400 leading-relaxed">ریز کار بازی نداری. حداقلِ امروز: ${EN_MIN_IDEAS[new Date().getDay()]}</p>`}
          </div>
        </div>
        ${doneToday && !minTicked
          ? `<div class="w-full py-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black border border-emerald-500/10 tracking-widest uppercase text-center">${fa('check', 'ml-1')} امروز انجام شد</div>`
          : mob
            ? `<button type="button" onclick="toggleEnglishMin()" class="w-full py-3 ${minTicked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-900/10'} rounded-xl text-[10px] font-black">${minTicked ? `${fa('check', 'ml-1')} تمرین امروز ثبت شد` : 'ثبت تمرین امروز'}</button>`
            : `<button type="button" onclick="toggleEnglishMin()" class="w-full py-3 ${minTicked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/10'} rounded-xl text-[10px] font-black transition-all border tracking-widest uppercase">${minTicked ? `${fa('check', 'ml-1')} ۵ دقیقه‌ی امروز ثبت شد` : 'ثبت تمرین انجام شده'}</button>`}
      </div>
      ${watermark}
    </div>`;
}
function motherTodayCard(mob){
  if(!motherSettings().showOnToday || motherReadToday()) return '';
  const item = motherItemForDay(new Date());
  if(!item) return '';
  const kind = `<span class="${mob ? 'text-[9px]' : 'text-[10px]'} font-black not-italic ${item.kind === 'dont' ? 'text-rose-400' : 'text-emerald-400'} ml-1">${item.kind === 'dont' ? 'نکن:' : 'بکن:'}</span>`;
  return mob ? `
    <div class="bg-gradient-to-br from-rose-500/15 to-indigo-500/10 border border-rose-500/20 rounded-3xl p-5">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <span class="text-[8px] font-black uppercase tracking-widest bg-rose-500 text-white px-2 py-0.5 rounded-full mb-3 inline-block">مادر</span>
          <h3 class="text-sm font-black text-white mb-1">رسیدگی به امور مادر</h3>
          <p class="text-[10px] text-slate-400 mb-4 italic leading-relaxed" dir="auto">${kind}"${esc(item.body)}"</p>
          <div class="flex items-center gap-2">
            <button type="button" onclick="navigateTo('mother')" class="text-[9px] font-black text-rose-300 bg-rose-500/10 px-4 py-2 rounded-lg border border-rose-500/10">لیست مراقبت</button>
            <button type="button" onclick="markMotherRead()" title="خوندم" aria-label="خوندم" class="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-950/20">${fa('check', 'text-xs')}</button>
          </div>
        </div>
        <div class="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/10 shrink-0">${fa('heart', 'text-xl')}</div>
      </div>
    </div>` : `
    <div class="bg-gradient-to-br from-rose-500/10 to-indigo-500/5 border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden group">
      <div class="flex items-start justify-between relative z-10">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-3"><span class="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-full border border-rose-500/10">مادر</span></div>
          <h3 class="text-lg font-bold text-white mb-2">رسیدگی به امور مادر</h3>
          <p class="text-slate-400 text-[11px] mb-4 leading-relaxed italic" dir="auto">${kind}"${esc(item.body)}"</p>
          <div class="flex items-center gap-2">
            <button type="button" onclick="navigateTo('mother')" class="text-[10px] font-black text-rose-300 bg-rose-500/10 px-4 py-2 rounded-xl hover:bg-rose-500/20 transition-colors border border-rose-500/10">لیست مراقبت</button>
            <button type="button" onclick="markMotherRead()" title="خوندم" aria-label="خوندم" class="w-9 h-9 flex items-center justify-center bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/20">${fa('check')}</button>
          </div>
        </div>
        <div class="w-12 h-12 bg-slate-900/50 rounded-2xl flex items-center justify-center text-rose-400 border border-rose-500/10">${fa('heart', 'text-2xl')}</div>
      </div>
    </div>`;
}
/* task alarms that have gone off (and "until done" reminders) — the old «یادآوری‌ها» fold */
function dueReminderTasks(){
  return state.tasks.filter(t => !t.done && (t.reminderKind === 'always' || (t.reminderAt && Date.parse(t.reminderAt) <= Date.now())))
    .sort((a, b) => (Date.parse(a.reminderAt) || 0) - (Date.parse(b.reminderAt) || 0));
}
function remindersCard(mob){
  const list = dueReminderTasks();
  if(!list.length) return '';
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-3xl ${mob ? 'p-5' : 'p-6'}">
      <div class="flex items-center justify-between mb-4">
        <h4 class="${mob ? 'text-[10px]' : 'text-xs'} font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('bell', 'text-indigo-500')} کارهای یادآوری‌شده</h4>
        <span class="text-[10px] font-black text-indigo-400">${fd(list.length)} کار</span>
      </div>
      <div class="space-y-2">
        ${list.map(t => `
          <div class="flex items-center gap-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="انجام کار" class="w-5 h-5 border-2 border-slate-700 rounded bg-slate-950 flex items-center justify-center hover:border-indigo-500 shrink-0">${fa('check', 'text-[8px] text-indigo-500 opacity-0')}</button>
            <button type="button" onclick="openTaskEditorEdit('${t.id}')" class="flex-1 min-w-0 text-right">
              <span class="block text-[11px] text-slate-300 font-medium truncate" dir="auto">${esc(t.title)}</span>
              <span class="block text-[9px] text-slate-500">${esc(taskReminderLabel(t))}</span>
            </button>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ---------- desktop ---------- */
function renderTodayDesktop(){
  const d = todayData();
  const { wd, jalali } = fmtHeaderDate(state.today);
  const sk = computeStreak();
  const header = deskHeader({
    title:`امروز، ${wd}`, sub:jalali, profile:`${fd(d.open.length + d.overdue.length)} کار باز امروز`,
    right: `
      <button type="button" onclick="openStreakPanel()" class="hidden md:flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-2xl" aria-label="جزئیات زنجیره">
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">زنجیره</span>
          <span class="text-sm font-black text-amber-500 leading-none">${fd(sk.streak)} روز</span>
        </div>
        ${fa('fire', sk.atRisk && sk.streak ? 'text-amber-500 animate-pulse' : 'text-amber-500')}
      </button>
      <div class="hidden md:flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-2xl">
        <div class="flex flex-col items-end">
          <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">زمان برنامه‌ریزی شده</span>
          <span class="text-sm font-black text-indigo-400 leading-none">${fmtMin(d.planned)}</span>
        </div>
        ${fa('clock', 'text-indigo-400')}
      </div>`,
  });
  const callout = todayCallout(false);
  const body = `
    <div class="max-w-5xl mx-auto grid grid-cols-12 gap-8">
      <div class="col-span-8 space-y-8">
        ${callout}
        <div class="space-y-6">
          <section id="today-tasks">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-black text-white uppercase tracking-widest">برنامه امروز</h3>
              <div class="flex items-center gap-2">
                ${todayFilterButton(d, 'text-xs')}
                <button type="button" onclick="window.print()" title="چاپ کارهای امروز" aria-label="چاپ" class="p-2 text-slate-600 hover:text-white transition-colors">${fa('print', 'text-xs')}</button>
              </div>
            </div>
            ${todayFilterPanel()}
            <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-2 mb-4 flex items-center gap-2">
              <input type="text" id="today-quick-add" data-preserve placeholder="افزودن تسک سریع برای امروز..." value="${ea(state.quickAddTitle || '')}"
                oninput="state.quickAddTitle=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); quickAddTodayTask();}"
                class="flex-1 bg-transparent border-none text-sm text-slate-200 px-3 focus:outline-none placeholder:text-slate-600">
              <button type="button" onclick="quickAddTodayTask()" aria-label="افزودن" class="bg-indigo-600 hover:bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-all">${fa('plus', 'text-xs')}</button>
            </div>
            <div class="space-y-3">
              ${d.open.map(todayTaskDesk).join('')}
              ${!d.open.length ? `<div class="py-8 flex flex-col items-center justify-center text-slate-600">${fa(d.scheduled.length ? 'circle-check' : 'mug-hot', 'text-4xl mb-3 opacity-40')}<p class="text-xs font-bold">${d.scheduled.length ? 'همه‌ی کارهای امروز انجام شد' : d.filterCount ? 'کاری با این فیلترها برای امروز نیست' : 'برای امروز کاری ثبت نشده'}</p></div>` : ''}
            </div>
          </section>
          ${d.overdue.length ? `
            <section id="overdue-tasks">
              <button type="button" onclick="state.todayOverdueOpen = !state.todayOverdueOpen; render()" aria-expanded="${!!state.todayOverdueOpen}" class="w-full flex items-center gap-3 group ${state.todayOverdueOpen ? 'mb-4' : ''}">
                <span class="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                <h3 class="text-sm font-black text-rose-500 uppercase tracking-widest">${overdueHeading(d.overdue)}</h3>
                <span class="text-[10px] font-bold text-slate-600 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">${fd(d.overdue.length)} مورد</span>
                ${fa(state.todayOverdueOpen ? 'chevron-down' : 'chevron-left', 'text-[10px] text-rose-400 mr-auto transition-transform group-hover:translate-y-0.5')}
              </button>
              ${state.todayOverdueOpen ? `<div class="space-y-3">${d.overdue.map(todayTaskDesk).join('')}</div>` : ''}
            </section>` : ''}
          ${d.done.length ? `
            <section id="done-tasks" class="border-t border-slate-800/50 pt-6">
              <button type="button" onclick="state.todayDoneOpen = !state.todayDoneOpen; render()" aria-expanded="${!!state.todayDoneOpen}" class="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors group mb-4">
                ${fa(state.todayDoneOpen ? 'chevron-down' : 'chevron-left', 'text-[10px] transition-transform group-hover:translate-y-0.5')}
                <span class="text-[10px] font-black uppercase tracking-widest">تکمیل شده امروز (${fd(d.done.length)})</span>
              </button>
              ${state.todayDoneOpen ? `<div class="space-y-2">${d.done.map(todayDoneDesk).join('')}</div>` : ''}
            </section>` : ''}
        </div>
      </div>
      <div class="col-span-4 space-y-8">
        ${focusCard(false)}
        ${englishTodayCard(false)}
        ${motherTodayCard(false)}
        ${remindersCard(false)}
      </div>
    </div>`;
  return deskMain({ header, body, fab: deskFab('openTaskEditorNew()', 'indigo', 'تسک جدید') });
}

/* ---------- phone ---------- */
function todayTaskMob(t){
  const overdue = !t.done && t.date < dateKey(state.today);
  if(overdue) return `
    <div class="bg-rose-500/5 rounded-2xl border border-rose-500/10">
      <div class="p-4 flex items-center justify-between gap-3">
        <div class="flex ${checkAlign(t)} gap-3 min-w-0">
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="انجام شد" class="w-5 h-5 border-2 border-rose-500/30 rounded-md bg-slate-950 shrink-0"></button>
          <div class="min-w-0" ${canExpand(t) ? `onclick="toggleTodayExpand('${t.id}')"` : `onclick="openTaskEditorEdit('${t.id}')"`}>
            <h4 class="text-xs font-bold text-slate-200 line-clamp-1 mb-1" dir="auto">${esc(t.title)}</h4>
            <span class="text-[9px] font-black text-rose-400 flex items-center gap-1">${fa('clock', 'text-[8px]')} ${overdueLabel(t)}</span>
            ${subtaskChecklist(t)}
          </div>
        </div>
        <button type="button" onclick="openTaskEditorEdit('${t.id}')" aria-label="ویرایش" class="text-slate-600 p-1 shrink-0">${fa('chevron-left', 'text-[10px]')}</button>
      </div>
      ${todayTaskExpansion(t, true)}
    </div>`;
  const meta = taskMetaSpans(t, { mob:true });
  return `
    <div class="bg-slate-900/50 rounded-2xl border border-slate-800">
      <div class="p-4 flex items-center justify-between gap-4">
        <div class="flex ${checkAlign(t)} gap-3 min-w-0">
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="انجام شد" class="w-6 h-6 border-2 border-slate-700 rounded-lg bg-slate-950 shrink-0"></button>
          <div class="min-w-0" ${canExpand(t) ? `onclick="toggleTodayExpand('${t.id}')"` : `onclick="openTaskEditorEdit('${t.id}')"`}>
            <h4 class="text-xs font-bold text-slate-200 ${meta ? 'mb-1' : ''}" dir="auto">${esc(t.title)}</h4>
            ${meta ? `<div class="flex flex-wrap gap-2">${meta}</div>` : ''}
            ${subtaskChecklist(t)}
          </div>
        </div>
        <button type="button" onclick="openTaskEditorEdit('${t.id}')" aria-label="ویرایش" class="text-slate-600 p-1 shrink-0">${fa('chevron-left', 'text-[10px]')}</button>
      </div>
      ${todayTaskExpansion(t, true)}
    </div>`;
}
function renderTodayMobile(){
  const d = todayData();
  const { wd, jalali } = fmtHeaderDate(state.today);
  const sk = computeStreak();
  const header = mobHeader(`
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl ring-2 ring-slate-800 bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-sm font-black" aria-hidden="true">${initialOf(state.userEmail)}</div>
      <div>
        <h1 class="text-sm font-black text-white leading-none mb-1">امروز، ${wd}</h1>
        <p class="text-[10px] text-slate-500 font-medium">${jalali}</p>
      </div>
    </div>`, `
    <div class="flex items-center gap-2">
      <button type="button" onclick="openStreakPanel()" aria-label="زنجیره ${fd(sk.streak)} روز" class="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800">
        <span class="text-[10px] font-black text-amber-500">${fd(sk.streak)}</span>${fa('fire', 'text-amber-500 text-[10px]')}
      </button>
      ${mobIconBtn('print', 'window.print()', 'چاپ کارهای امروز')}
    </div>`, 'px-4 py-3 flex items-center justify-between');
  const total = d.raw.length, doneN = d.raw.filter(t => t.done).length;
  return `
    ${header}
    <main class="safe-area-bottom">
      <div class="p-4 space-y-6">
        ${renderStatusBars()}
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-2xl">
            <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">زمان برنامه‌ریزی</p>
            <div class="flex items-center justify-between"><span class="text-sm font-black text-white">${fmtMin(d.planned)}</span>${fa('clock', 'text-indigo-400 text-xs')}</div>
          </div>
          <div class="bg-emerald-600/10 border border-emerald-500/20 p-3 rounded-2xl">
            <p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">تکمیل شده</p>
            <div class="flex items-center justify-between"><span class="text-sm font-black text-white">${fd(doneN)}/${fd(total)} مورد</span>${fa('circle-check', 'text-emerald-400 text-xs')}</div>
          </div>
        </div>
        ${todayCallout(true)}
        <section id="today-tasks">
          <div class="flex items-center justify-between mb-3 px-1">
            <h3 class="text-xs font-black text-white uppercase tracking-widest">برنامه امروز</h3>
            <div class="flex items-center gap-1">
              ${todayFilterButton(d, 'text-[10px]')}
            </div>
          </div>
          ${todayFilterPanel()}
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-1.5 mb-4 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all">
            <input type="text" id="today-quick-add" data-preserve placeholder="افزودن تسک سریع..." value="${ea(state.quickAddTitle || '')}"
              oninput="state.quickAddTitle=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault(); quickAddTodayTask();}"
              class="flex-1 bg-transparent border-none text-xs text-slate-200 px-2 focus:outline-none placeholder:text-slate-600 h-9">
            <button type="button" onclick="quickAddTodayTask()" aria-label="افزودن" class="bg-indigo-600 text-white w-9 h-9 rounded-lg flex items-center justify-center transition-all shrink-0 shadow-lg shadow-indigo-900/20">${fa('plus', 'text-xs')}</button>
          </div>
          <div class="space-y-3">
            ${d.open.map(todayTaskMob).join('')}
            ${!d.open.length ? `<div class="py-6 flex flex-col items-center justify-center text-slate-600">${fa(d.scheduled.length ? 'circle-check' : 'mug-hot', 'text-4xl mb-3 opacity-40')}<p class="text-[11px] font-bold">${d.scheduled.length ? 'همه‌ی کارهای امروز انجام شد' : d.filterCount ? 'کاری با این فیلترها برای امروز نیست' : 'برای امروز کاری ثبت نشده'}</p></div>` : ''}
          </div>
        </section>
        ${d.overdue.length ? `
          <section id="overdue-tasks">
            <button type="button" onclick="state.todayOverdueOpen = !state.todayOverdueOpen; render()" aria-expanded="${!!state.todayOverdueOpen}" class="w-full flex items-center justify-between px-1 ${state.todayOverdueOpen ? 'mb-3' : ''}">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span><h3 class="text-xs font-black text-rose-500 uppercase tracking-widest">${overdueHeading(d.overdue)}</h3></div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">${fd(d.overdue.length)} مورد</span>
                ${fa(state.todayOverdueOpen ? 'chevron-down' : 'chevron-left', 'text-[10px] text-rose-400')}
              </div>
            </button>
            ${state.todayOverdueOpen ? `<div class="space-y-2">${d.overdue.map(todayTaskMob).join('')}</div>` : ''}
          </section>` : ''}
        <div class="space-y-4">
          ${englishTodayCard(true)}
          ${motherTodayCard(true)}
          ${focusCard(true)}
          ${remindersCard(true)}
        </div>
        ${d.done.length ? `
          <section id="done-tasks" class="pt-2">
            <button type="button" onclick="state.todayDoneOpen = !state.todayDoneOpen; render()" aria-expanded="${!!state.todayDoneOpen}" class="flex items-center gap-2 text-slate-600 mb-4">
              ${fa(state.todayDoneOpen ? 'chevron-down' : 'chevron-left', 'text-[10px]')}
              <span class="text-[10px] font-black uppercase tracking-widest">تکمیل شده امروز (${fd(d.done.length)})</span>
            </button>
            ${state.todayDoneOpen ? `<div class="space-y-2 opacity-50">${d.done.map(t => `
              <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
                <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="برگرداندن" class="w-5 h-5 bg-emerald-500 text-white rounded-md flex items-center justify-center shrink-0">${fa('check', 'text-[10px]')}</button>
                <h4 class="text-xs font-bold text-slate-500 line-through" dir="auto">${esc(t.title)}</h4>
              </div>`).join('')}</div>` : ''}
          </section>` : ''}
      </div>
    </main>
    ${mobFab('openTaskEditorNew()', 'تسک جدید')}`;
}

/* ---------- print (unchanged sheet, black on white) ---------- */
function renderTodayPrintSheet(){
  const { raw } = todayData();
  const { wd, jalali } = fmtHeaderDate(state.today);
  return `
    <div class="print-sheet">
      <h1>کارهای امروز</h1>
      <div class="print-date">${wd} — ${jalali}</div>
      ${raw.length === 0 ? `<p>کاری برای امروز ثبت نشده.</p>` : sortForPrint(raw).map(t => `
        <div class="print-task">
          <span class="print-checkbox ${t.done ? 'checked' : ''}"></span>
          <div>
            <div class="print-task-title ${t.done ? 'done' : ''}">${esc(t.title)}</div>
            <div class="print-task-meta">
              ${t.priority ? `اولویت: ${PRIORITY_LABEL[t.priority]}` : ''}
              ${t.durationMin ? ` · مدت: ${fd(t.durationMin)} دقیقه` : ''}
              ${t.tagIds.length ? ` · تگ: ${t.tagIds.map(id => (tagById(id) || {}).name).filter(Boolean).map(esc).join('، ')}` : ''}
            </div>
            ${t.subtasks.length ? `<div class="print-subtasks">${t.subtasks.map(s => `<div class="print-subtask"><span class="print-checkbox small ${s.done ? 'checked' : ''}"></span> ${esc(s.title)}</div>`).join('')}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`;
}

/* ---------- زنجیره (streak) details ---------- */
function renderStreakPanel(){
  const sk = computeStreak();
  const { streak, freezes, best, bestEnd, since, towardFreeze, doneCounts } = sk;
  const next = STREAK_MILESTONES.find(m => m > streak);
  const prev = [...STREAK_MILESTONES].reverse().find(m => m <= streak) || 0;
  const cursor = new Date();
  let last30 = 0;
  for(let i = 0; i < 30; i++, cursor.setDate(cursor.getDate() - 1)) if(doneCounts.has(dateKey(cursor))) last30++;
  const freezeFull = freezes >= STREAK_FREEZE_MAX;
  const doneToday = doneCounts.get(dateKey(new Date())) || 0;
  let status;
  if(doneToday) status = `<p class="text-[11px] font-bold text-emerald-400">امروز ثبت شد — ${fd(doneToday)} کار انجام دادی.</p>`;
  else if(!streak) status = `<p class="text-[11px] font-bold text-slate-400">الان زنجیره‌ای نداری. امروز یه کار رو تموم کن تا از همین امروز شروع بشه.</p>`;
  else {
    const now = new Date();
    const left = 24 * 60 - (now.getHours() * 60 + now.getMinutes());
    status = `<p class="text-[11px] font-bold text-amber-400 leading-relaxed">${sk.frozeYesterday ? 'دیروز جا افتاد و یه فریز خرج شد. ' : ''}امروز هنوز کاری تموم نکردی — ${formatDuration(left)} تا نیمه‌شب مونده. ${freezes ? `اگه امروز هم جا بمونه یکی از ${fd(freezes)} فریزت خرج می‌شه.` : 'فریز نداری؛ اگه امروز جا بمونه زنجیره صفر می‌شه.'}</p>`;
  }
  const tile = (n, label) => `<div class="p-3 bg-slate-900/50 rounded-2xl border border-slate-800"><p class="text-lg font-black text-white">${n}</p><p class="text-[9px] text-slate-500 font-bold leading-relaxed">${label}</p></div>`;
  const bar = (title, right, pct, tone) => `
    <div>
      <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-2"><span>${title}</span><span>${right}</span></div>
      <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden"><div class="${tone} h-full rounded-full" style="width:${Math.max(2, pct)}%"></div></div>
    </div>`;
  // the last weeks as a calendar (شنبه..جمعه across, newest week at the bottom);
  // the arrows page back STREAK_MAP_WEEKS at a time, no further than the first completion
  const todayKey = dateKey(new Date());
  const page = state.streakPage || 0;
  const c = new Date(); c.setHours(12, 0, 0, 0);
  c.setDate(c.getDate() - (c.getDay() + 1) % 7 - ((page + 1) * STREAK_MAP_WEEKS - 1) * 7);
  const canPrev = !!sk.first && dateKey(c) > sk.first;
  const canNext = page > 0;
  const CELL = {
    done:'bg-amber-500 text-slate-950 font-black',
    frozen:'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-bold',
    miss:'bg-rose-500/10 text-rose-400/80 border border-rose-500/30 font-bold',
    open:'bg-slate-800/50 border border-slate-700 text-slate-200 font-bold',
    out:'text-slate-700 font-bold',
  };
  const tally = { done:0, frozen:0, miss:0 };
  const rangeFrom = dateKey(c);
  const cells = [];
  for(let i = 0; i < STREAK_MAP_WEEKS * 7; i++, c.setDate(c.getDate() + 1)){
    const key = dateKey(c);
    if(key > todayKey){ cells.push('<span class="aspect-square"></span>'); continue; }
    const [, jm, jd] = gregorianToJalali(c.getFullYear(), c.getMonth() + 1, c.getDate());
    const n = doneCounts.get(key) || 0;
    const kind = n ? 'done' : key === todayKey ? 'open' : sk.log.get(key) || 'out';
    if(tally[kind] !== undefined) tally[kind]++;
    const label = n ? `${fd(n)} کار تموم شد` : kind === 'frozen' ? 'فریز خرج شد' : kind === 'miss' ? 'جا افتاد' : kind === 'open' ? 'امروز — هنوز کاری تموم نشده' : '';
    const day = kind === 'frozen' ? fa('snowflake', 'text-[10px]') : kind === 'miss' ? `<span class="line-through">${fd(jd)}</span>` : fd(jd);
    // the first of a month carries the month's name, so the rows read like dates
    const body = jd === 1 || i === 0 ? `<span class="flex flex-col items-center leading-none gap-0.5">${day}<span class="text-[7px] font-black opacity-80">${MONTHS_JALALI[jm - 1]}</span></span>` : day;
    cells.push(`<span title="${formatDateShort(key)}${label ? ' — ' + label : ''}" class="aspect-square flex items-center justify-center rounded-xl text-xs relative ${CELL[kind]} ${key === todayKey ? 'ring-2 ring-white/70' : ''}">${body}${n > 1 ? `<span class="absolute -top-1 -left-1 min-w-4 h-4 px-1 rounded-full bg-slate-950 border border-amber-500/50 text-amber-400 text-[8px] font-black flex items-center justify-center">${fd(n)}</span>` : ''}</span>`);
  }
  const rangeTo = dateKey(new Date(Math.min(c.getTime() - 864e5, Date.now())));
  const arrow = (on, fn, icon, label) => `<button type="button" ${on ? `onclick="${fn}()"` : 'disabled'} aria-label="${label}" class="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 ${on ? 'text-slate-400' : 'text-slate-700 opacity-40'}">${fa(icon, 'text-xs')}</button>`;
  const legend = [['done', 'کار تموم شد', ''], ['frozen', 'فریز خرج شد', fa('snowflake', 'text-[7px]')], ['miss', 'جا افتاد', '']]
    .map(([k, l, ic]) => `<span class="flex items-center gap-1.5"><i class="w-3.5 h-3.5 rounded-md flex items-center justify-center not-italic ${CELL[k]}">${ic}</i>${l}</span>`).join('');
  const summary = [tally.done && `${fd(tally.done)} روز فعال`, tally.frozen && `${fd(tally.frozen)} فریز`, tally.miss && `${fd(tally.miss)} روز جا افتاده`].filter(Boolean).join('، ') || 'توی این روزها هنوز چیزی ثبت نشده';
  return renderDialog({ title:'زنجیره', onClose:'closeStreakPanel()', wide:true, body:`
    <div class="flex items-center gap-4">
      <div class="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-500/10">${fa('fire', 'text-2xl')}</div>
      <div><p class="text-3xl font-black text-white leading-none">${fd(streak)} <span class="text-sm text-slate-400">روز پیاپی</span></p>${since ? `<p class="text-[10px] text-slate-500 mt-1">از ${formatDateShort(since)}</p>` : ''}</div>
    </div>
    ${status}
    <div class="grid grid-cols-3 gap-3">
      ${tile(fd(best), `رکورد${best && best === streak ? ' (همین الان)' : bestEnd ? ` — تا ${formatDateShort(bestEnd)}` : ''}`)}
      ${tile(`${fd(last30)}<span class="text-[10px] text-slate-500"> از ۳۰</span>`, 'روز فعال در ماه اخیر')}
      ${tile(fd(doneCounts.size), 'کل روزهای فعال')}
    </div>
    ${next ? bar(`${fa('trophy', 'text-amber-500 ml-1')} نشان بعدی: ${fd(next)} روز`, `${fd(next - streak)} روز مونده`, Math.round((streak - prev) / (next - prev) * 100), 'bg-amber-500') : ''}
    ${bar(`${fa('snowflake', 'text-sky-400 ml-1')} فریز: ${fd(freezes)} از ${fd(STREAK_FREEZE_MAX)}`, freezeFull ? 'پُره' : `${fd(STREAK_FREEZE_EVERY - towardFreeze)} روز تا فریز بعدی`, freezeFull ? 100 : Math.round(towardFreeze / STREAK_FREEZE_EVERY * 100), 'bg-sky-400')}
    <div class="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 w-full max-w-sm mx-auto">
      <div class="flex items-center justify-between mb-1">
        ${arrow(canPrev, 'streakPagePrev', 'chevron-right', 'هفته‌های قبل')}
        <span class="text-sm font-black text-white">${formatDateShort(rangeFrom)} تا ${formatDateShort(rangeTo)}</span>
        ${arrow(canNext, 'streakPageNext', 'chevron-left', 'هفته‌های بعد')}
      </div>
      <p class="text-center text-[10px] font-bold text-slate-500 mb-4">${summary}</p>
      <div class="grid grid-cols-7 gap-1 mb-2 text-center">
        ${['ش','ی','د','س','چ','پ','ج'].map((w, i) => `<span class="text-[9px] font-black ${i === 6 ? 'text-rose-900' : 'text-slate-600'}">${w}</span>`).join('')}
      </div>
      <div class="grid grid-cols-7 gap-1 text-center">${cells.join('')}</div>
      <div class="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-[10px] font-bold text-slate-400">${legend}</div>
    </div>
    <p class="text-[10px] text-slate-500 leading-relaxed">هر روزی که دست‌کم یه کار رو تموم کنی (یا یه ریز کار انگلیسی، یا ۵ دقیقه تمرینش) یه روز به زنجیره اضافه می‌شه (روزِ تموم‌شدن حسابه، نه روزی که برنامه‌ش بود). هر ${fd(STREAK_FREEZE_EVERY)} روز فعال یه فریز جایزه می‌گیری، حداکثر ${fd(STREAK_FREEZE_MAX)} تا؛ روزی که جا بندازی خودش خرج می‌شه و زنجیره می‌مونه، ولی اون روز شمرده نمی‌شه.</p>`,
    footer: dlgSecondary('بستن', 'closeStreakPanel()'),
  });
}

function streakPagePrev(){ state.streakPage = (state.streakPage || 0) + 1; render(); }
function streakPageNext(){ state.streakPage = Math.max(0, (state.streakPage || 0) - 1); render(); }

/* ---------- after ticking a task (or an English chunk) done ---------- */
function renderTaskCompletionModal(){
  const m = state.taskCompletionModal;
  const t = m.chunkId ? (state.englishChunks || []).find(c => c.id === m.chunkId) : state.tasks.find(x => x.id === m.taskId);
  if(!t){ state.taskCompletionModal = null; return ''; }
  const quickVals = m.chunkId ? [5, 10, 15, 20, 30] : [15, 30, 45, 60];
  const customVal = (m.minutes && !quickVals.includes(m.minutes)) ? m.minutes : '';
  const quick = (on, label, onclick) => `<button type="button" onclick="${onclick}" class="flex-1 py-2 rounded-lg text-[10px] font-black ${on ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}">${label}</button>`;
  return renderDialog({ title:`${fa('circle-check', 'text-emerald-500 ml-1')} ${esc(t.title)}`, onClose:'skipTaskCompletion()', body:`
    ${field(`چقدر واقعاً طول کشید؟ ${m.chunkId ? '(دقیقه — می‌ره توی هدف هفتگیِ تب انگلیسی)' : '(اختیاری)'}`, `
      <div class="flex gap-1">${quickVals.map(v => quick(m.minutes === v, fd(v), `completionSetMinutes(${v})`)).join('')}</div>
      <div class="relative">
        <input type="text" inputmode="numeric" placeholder="سفارشی" value="${customVal}" oninput="normalizeNumericInput(this); completionSetCustomMinutes(this.value)"
          class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all pl-12">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500">MIN</span>
      </div>`)}`,
    footer: dlgPrimary('ثبت', 'confirmTaskCompletion()') + dlgSecondary('رد کردن', 'skipTaskCompletion()'),
  });
}
