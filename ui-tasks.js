/* ---------- مدار UI: تسک‌ها، ویرایش تسک، تقویم ----------
   Tasks: desktop 2fiGBYM7crNc6yL52J96 (list + editor side by side), phone uJFnbriN8GQ6XbS4fuXT.
   Editor: desktop panel from the same desktop screen, phone QNkUVZaCdsbMaVQvoqSF.
   Calendar: desktop hsUthMdVU2qVDNq3Azob, phone hpZbdqYk7VAEHGta9zgy. */
const TASK_TABS_DESK = [['all','همه'], ['normal','عادی'], ['important','مهم'], ['recurring','تکرار شونده'], ['archive','آرشیو']];
const TASK_TABS_MOB = [['all','همه'], ['normal','عادی'], ['important','مهم'], ['recurring','تکرار شونده'], ['undated','بدون تاریخ']];
function setTasksTab(tab){
  if(tab === 'archive'){ state.archiveSection = 'tasks'; navigateTo('archive'); return; }
  state.tasksTab = tab;
  resetScrollOnRender = true;
  render();
}
function tasksListData(){
  let list = applyFiltersAndSort(state.tasks.filter(t => !isArchived(t)), 'tasksFilters', { dateFilter:true });
  const tab = state.tasksTab;
  if(tab === 'normal') list = list.filter(t => t.priority !== 'high');
  else if(tab === 'important') list = list.filter(t => t.priority === 'high');
  else if(tab === 'recurring') list = list.filter(t => t.recurringTemplateId);
  else if(tab === 'undated') list = list.filter(t => !t.date);
  const q = (state.tasksSearch || '').trim();
  if(q) list = list.filter(t => t.title.includes(q) || (t.notes || '').includes(q));
  return list;
}
function tasksFilterPanel(){
  if(!state.filterPanelOpen.tasksFilters) return '';
  const f = state.tasksFilters;
  const todayK = dateKey(new Date()), tomK = dateKey(tomorrowDate());
  const row = (label, chips) => `<div class="flex items-center gap-2 flex-wrap"><span class="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">${label}</span>${chips}</div>`;
  return `
    <div class="${isDesk() ? 'mx-4 mt-4' : 'mb-4'} bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
      ${state.tags.length ? row('تگ', state.tags.map(t => choiceChip(esc(t.name), f.tagIds.includes(t.id), `toggleFilterTag('tasksFilters','${t.id}')`)).join('')) : ''}
      ${row('اولویت', ['high','medium','low'].map(p => choiceChip(PRIORITY_LABEL[p], f.priorities.includes(p), `toggleFilterPriority('tasksFilters','${p}')`)).join(''))}
      ${row('تاریخ', [
        choiceChip('امروز', f.date === todayK, `setFilterDateQuick('today')`),
        choiceChip('فردا', f.date === tomK, `setFilterDateQuick('tomorrow')`),
        choiceChip('بدون تاریخ', f.date === 'none', `setFilterDateQuick('none')`),
        `<input type="date" value="${f.date && f.date !== 'none' ? f.date : ''}" onchange="setFilterDateCustom(this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300">`,
      ].join(''))}
      ${row('مرتب‌سازی', [['today-first','امروز اول'], ['duration-asc','کوتاه‌ترین اول'], ['duration-desc','بلندترین اول']].map(([v, l]) => choiceChip(l, f.sortBy === v, `setFilterSort('tasksFilters','${v}')`)).join(''))}
      ${filtersActive(f, true) ? `<button type="button" onclick="resetFilters('tasksFilters')" class="text-[10px] font-black text-rose-400">پاک‌کردن فیلترها</button>` : ''}
    </div>`;
}
function taskListItemDesk(t){
  const active = state.taskEditor && state.taskEditor.taskId === t.id;
  const meta = taskMetaSpans(t, { priorityLabels:PRIORITY_LABEL, showDate:true });
  return `
    <div onclick="openTaskEditorEdit('${t.id}')" class="task-list-item ${active ? 'active' : ''} p-4 rounded-2xl bg-slate-800/40 border-slate-800 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-800/60 group">
      <div class="flex items-center gap-4 min-w-0">
        <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="${t.done ? 'برگرداندن' : 'انجام شد'}" class="w-6 h-6 ${t.done ? 'bg-emerald-500 text-white' : `border-2 ${active ? 'border-indigo-500/50' : 'border-slate-700'} bg-slate-900 text-indigo-400`} rounded-lg flex items-center justify-center shrink-0">${fa('check', `text-xs ${t.done ? '' : 'opacity-0'}`)}</button>
        <div class="min-w-0">
          <h4 class="text-sm font-bold ${t.done ? 'text-slate-500 line-through' : active ? 'text-white' : 'text-slate-200'} leading-tight" dir="auto">${esc(t.title)}</h4>
          ${meta ? `<div class="flex items-center gap-3 mt-1.5 flex-wrap">${meta}</div>` : ''}
        </div>
      </div>
      ${fa('chevron-left', `${active ? 'text-indigo-500/50' : 'text-slate-700'} text-xs shrink-0`)}
    </div>`;
}
function recurringTemplatesBlock(mob){
  const tpls = state.recurringTemplates;
  if(!tpls.length) return `<p class="text-[11px] text-slate-500 px-2 py-3">هنوز کار تکرارشونده‌ای نساختی — توی فرم «تسک جدید» تیک «تکرار هفتگی» رو بزن.</p>`;
  return tpls.map(tpl => `
    <div class="p-4 rounded-2xl ${mob ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-800/40'} flex items-center justify-between gap-3 ${tpl.active ? '' : 'opacity-50'}">
      <div class="flex items-center gap-4 min-w-0">
        <div class="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">${fa('rotate', 'text-[10px]')}</div>
        <div class="min-w-0">
          <h4 class="text-sm font-bold text-slate-200 leading-tight" dir="auto">${esc(tpl.title)}</h4>
          <p class="text-[10px] font-bold text-slate-500 mt-1.5">${tpl.active ? '' : 'متوقف · '}${WEEKDAY_DISPLAY_ORDER.filter(d => tpl.weekdays.includes(d)).map(d => WEEKDAYS_FA[d]).join('، ')}</p>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button type="button" onclick="openRecurringEditor('${tpl.id}')" title="ویرایش" aria-label="ویرایش" class="p-2 text-slate-500 hover:text-white transition-colors">${fa('pen', 'text-xs')}</button>
        <button type="button" onclick="toggleRecurringActive('${tpl.id}')" title="${tpl.active ? 'توقف' : 'ادامه'}" aria-label="${tpl.active ? 'توقف' : 'ادامه'}" class="p-2 text-slate-500 hover:text-white transition-colors">${fa(tpl.active ? 'pause' : 'play', 'text-xs')}</button>
        <button type="button" onclick="deleteRecurringTemplate('${tpl.id}')" title="حذف تکرار" aria-label="حذف تکرار" class="p-2 text-slate-500 hover:text-rose-500 transition-colors">${fa('trash', 'text-xs')}</button>
      </div>
    </div>`).join('');
}
const tasksEmpty = () => `
  <div class="pt-8 flex flex-col items-center justify-center opacity-20">
    ${fa('list-check', 'text-6xl mb-4')}
    <p class="text-xs font-bold italic text-center">تسکی با فیلتر فعلی پیدا نشد.</p>
  </div>`;
function renderTasksDesktop(){
  const list = tasksListData();
  const undated = state.tasks.filter(t => !t.done && !t.date).length;
  const fc = filterActiveCount(state.tasksFilters, true);
  const tab = state.tasksTab === 'undated' ? 'all' : state.tasksTab;
  return `
    <main class="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/50 border-l border-slate-800">
      <header class="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 bg-slate-950/50">
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-black text-white">تسک‌ها</h1>
          <span class="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">${fd(undated)} تسک بی‌تاریخ</span>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" onclick="toggleFilterPanel('tasksFilters')" aria-label="فیلتر و مرتب‌سازی" class="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center ${fc || state.filterPanelOpen.tasksFilters ? 'text-indigo-400' : 'text-slate-400'} hover:text-white transition-all relative">${fa('filter', 'text-xs')}${fc ? `<span class="absolute -top-1 -left-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-black flex items-center justify-center">${fd(fc)}</span>` : ''}</button>
          <button type="button" onclick="openTaskEditorNew()" aria-label="تسک جدید" class="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-indigo-950/40">${fa('plus')}</button>
        </div>
      </header>
      <div class="px-8 py-3 border-b border-slate-800 flex items-center gap-6 shrink-0 overflow-x-auto no-scrollbar">
        ${TASK_TABS_DESK.map(([id, label]) => `<button type="button" onclick="setTasksTab('${id}')" class="${tab === id ? 'text-xs font-black text-indigo-400 border-b-2 border-indigo-500 pb-1.5 shrink-0' : 'text-xs font-bold text-slate-500 hover:text-slate-300 pb-1.5 shrink-0 transition-colors'}">${label}</button>`).join('')}
      </div>
      ${tasksFilterPanel()}
      <div class="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar" data-scroll="tasks">
        ${renderStatusBars()}
        ${tab === 'recurring' ? `<h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 pt-2">الگوهای تکرار</h3>${recurringTemplatesBlock(false)}<h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 pt-6">نوبت‌های ساخته‌شده</h3>` : ''}
        ${list.length ? list.map(taskListItemDesk).join('') : tasksEmpty()}
      </div>
    </main>
    ${state.taskEditor ? renderTaskEditor({ inline:true }) : `
      <aside class="w-[520px] bg-slate-950 border-r border-slate-800 flex flex-col h-full overflow-hidden shadow-2xl relative z-30">
        <header class="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 bg-slate-950"><h2 class="text-base font-black text-white">ویرایش تسک</h2></header>
        <div class="flex-1 flex flex-col items-center justify-center p-8 text-center">
          ${fa('pen-to-square', 'text-6xl text-white/5 mb-6')}
          <p class="text-xs font-bold text-slate-500 leading-relaxed mb-6">یک تسک را از فهرست انتخاب کن تا جزئیاتش اینجا باز شود.</p>
          <button type="button" onclick="openTaskEditorNew()" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-900/40 transition-all">+ تسک جدید</button>
        </div>
      </aside>`}`;
}
function taskListItemMob(t){
  const pills = [];
  if(t.priority === 'high') pills.push(`<span class="text-[9px] font-black text-rose-500 flex items-center gap-1 bg-rose-500/5 px-2 py-0.5 rounded-md border border-rose-500/10">${fa('flag', 'text-[8px]')} بالا</span>`);
  else if(t.priority) pills.push(`<span class="text-[9px] font-black text-slate-500 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">${fa('flag', 'text-[8px]')} ${PRIORITY_LABEL[t.priority]}</span>`);
  if(t.durationMin) pills.push(`<span class="text-[9px] font-black text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">${fa('clock', 'text-[8px]')} ${fmtMin(t.durationMin)}</span>`);
  if(t.date) pills.push(`<span class="text-[9px] font-black text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">${fa('calendar', 'text-[8px]')} ${jDate(t.date)}</span>`);
  t.tagIds.forEach(id => { const tag = tagById(id); if(tag) pills.push(`<span class="text-[9px] font-black flex items-center gap-1 px-2 py-0.5 rounded-md border" style="${tagTint(tag.color, '0d', '0d')}">${fa('tag', 'text-[8px]')} ${esc(tag.name)}</span>`); });
  const rem = reminderShort(t);
  if(rem) pills.push(`<span class="text-[9px] font-black text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">${fa('bell', 'text-[8px]')} ${rem}</span>`);
  if(t.recurringTemplateId) pills.push(`<span class="text-[9px] font-black text-slate-400 flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">${fa('rotate', 'text-[8px]')}</span>`);
  return `
    <div onclick="openTaskEditorEdit('${t.id}')" class="block bg-slate-900/50 p-4 rounded-2xl border border-slate-800 active:bg-slate-800/80 transition-all group cursor-pointer">
      <div class="flex items-start justify-between gap-4">
        <div class="flex items-start gap-3 min-w-0">
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="${t.done ? 'برگرداندن' : 'انجام شد'}" class="w-6 h-6 ${t.done ? 'bg-emerald-500 text-white' : `border-2 ${t.priority === 'high' ? 'border-indigo-500/50' : 'border-slate-700'} bg-slate-950`} rounded-lg flex items-center justify-center shrink-0 mt-0.5">${t.done ? fa('check', 'text-[10px]') : ''}</button>
          <div class="min-w-0">
            <h4 class="text-sm font-bold ${t.done ? 'text-slate-500 line-through' : t.priority === 'high' ? 'text-white' : 'text-slate-200'} leading-tight ${pills.length ? 'mb-1.5' : ''}" dir="auto">${esc(t.title)}</h4>
            ${pills.length ? `<div class="flex flex-wrap gap-2">${pills.join('')}</div>` : ''}
          </div>
        </div>
        ${fa('chevron-left', 'text-slate-700 text-[10px] mt-1 shrink-0')}
      </div>
    </div>`;
}
function renderTasksMobile(){
  const list = tasksListData();
  const tab = state.tasksTab === 'archive' ? 'all' : state.tasksTab;
  return `
    ${mobHeader(mobTitle('تسک‌ها', `<span class="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10">${fd(list.length)} مورد</span>`), `
      <div class="flex items-center gap-2">
        ${mobIconBtn('magnifying-glass', 'state.tasksSearchOpen=!state.tasksSearchOpen; if(!state.tasksSearchOpen) state.tasksSearch=\'\'; render()', 'جست‌وجو')}
        ${mobIconBtn('plus', 'openTaskEditorNew()', 'تسک جدید', 'primary')}
      </div>`)}
    <div class="sticky top-[69px] z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
      ${TASK_TABS_MOB.map(([id, label]) => `<button type="button" onclick="setTasksTab('${id}')" class="${tab === id ? 'pill-active px-4 py-1.5 rounded-full border border-transparent text-[10px] font-black shrink-0' : 'bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 text-slate-500 text-[10px] font-bold shrink-0'}">${label}</button>`).join('')}
      <button type="button" onclick="toggleFilterPanel('tasksFilters')" aria-label="فیلتر" class="bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 ${filterActiveCount(state.tasksFilters, true) ? 'text-indigo-400' : 'text-slate-500'} text-[10px] font-bold shrink-0">${fa('sliders')}</button>
    </div>
    <main class="safe-area-bottom">
      <div class="p-4 space-y-3">
        ${renderStatusBars()}
        ${state.tasksSearchOpen ? `
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all">
            ${fa('magnifying-glass', 'text-slate-600 text-xs px-3')}
            <input type="text" id="tasks-search" placeholder="جست‌وجو در تسک‌ها..." value="${ea(state.tasksSearch)}" oninput="state.tasksSearch=this.value; refreshTasksMobileList()"
              class="flex-1 bg-transparent border-none text-[11px] text-slate-200 focus:outline-none placeholder:text-slate-600 h-9">
          </div>` : ''}
        ${tasksFilterPanel()}
        ${tab === 'recurring' ? `<h3 class="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">الگوهای تکرار</h3>${recurringTemplatesBlock(true)}<h3 class="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1 pt-4">نوبت‌های ساخته‌شده</h3>` : ''}
        <div id="tasks-mobile-list" class="space-y-3">${list.length ? list.map(taskListItemMob).join('') : tasksEmpty()}</div>
      </div>
    </main>
    ${mobFab('openTaskEditorNew()', 'تسک جدید')}`;
}
// typing in the search box only redraws the list, so the keyboard stays up
function refreshTasksMobileList(){
  const el = document.getElementById('tasks-mobile-list');
  if(!el) return;
  const list = tasksListData();
  el.innerHTML = list.length ? list.map(taskListItemMob).join('') : tasksEmpty();
}

/* ---------- task editor ---------- */
function renderDurationSuggestionChip(){
  const sug = computeDurationSuggestion();
  if(!sug) return '';
  const labels = {
    exact:`پیشنهادی (دقیق، بر اساس ${fd(sug.count)} کار هم‌نام)`,
    keyword:`پیشنهادی (مشابه، بر اساس ${fd(sug.count)} کار مرتبط)`,
    tag:`تخمین کلی برچسب (بر اساس ${fd(sug.count)} کار، شاید دقیق نباشه)`,
  };
  return `<button type="button" onclick="editorQuickDuration(${sug.minutes})" title="${labels[sug.tier]}" class="w-full text-right text-[9px] font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/10 px-2 py-1.5 rounded-lg leading-relaxed">${fa('bullseye', 'ml-1')}${labels[sug.tier]}: ${formatDuration(sug.minutes)}</button>`;
}
function editorToggleTagPicker(){ state.taskEditor.tagPickerOpen = !state.taskEditor.tagPickerOpen; render(); }
function renderTaskCalendarPicker(){
  const ed = state.taskEditor;
  if(ed.calendarPanel === 'day'){
    const key = ed.calendarSelectedDayKey;
    const dayTasks = state.tasks.filter(t => t.date === key);
    return `
      <div class="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <button type="button" onclick="calendarBackToGrid()" class="text-[10px] font-black text-indigo-400">${fa('arrow-right', 'ml-1')} بازگشت به تقویم</button>
          <span class="text-xs font-black text-white">${jDate(key, true)}</span>
        </div>
        ${dayTasks.length ? dayTasks.map(t => `
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <p class="text-xs font-bold ${t.done ? 'text-slate-500 line-through' : 'text-slate-200'}" dir="auto">${esc(t.title)}</p>
            ${taskMetaSpans(t) ? `<div class="flex items-center gap-3 mt-1.5 flex-wrap">${taskMetaSpans(t)}</div>` : ''}
          </div>`).join('') : `<p class="text-[11px] text-slate-500 text-center py-3">کاری برای این روز ثبت نشده</p>`}
      </div>`;
  }
  const busy = new Set(state.tasks.filter(t => t.date).map(t => t.date));
  return renderPickCalendar({ jy:ed.calendarViewJY, jm:ed.calendarViewJM, date:ed.draft.date, prev:'calendarPrevMonth', next:'calendarNextMonth', pick:'calendarPickDay', dots:k => busy.has(k) })
    + `<p class="text-[10px] text-slate-600 px-1">روزهای نقطه‌دار کار دارن — <button type="button" class="text-indigo-400 font-black" onclick="calendarShowDayDetail('${ed.draft.date || dateKey(new Date())}', event)">کارهای روز انتخاب‌شده</button></p>`;
}
function taskEditorBody(){
  const ed = state.taskEditor, d = ed.draft, desk = isDesk();
  const todayStr = dateKey(new Date()), tomorrowStr = dateKey(tomorrowDate());
  const recurringCreate = ed.mode === 'create' && d.recurring.enabled;
  const title = field('عنوان تسک', `<input type="text" id="editor-title" value="${ea(d.title)}" placeholder="چیزی بنویسید..." oninput="state.taskEditor.draft.title=this.value; updateDurationSuggestionLive();" class="${titleInputCls()}">`, desk ? 'space-y-1' : 'space-y-1.5');
  const notes = field('یادداشت‌ها', `<textarea id="editor-notes" placeholder="جزئیات بیشتر..." oninput="state.taskEditor.draft.notes=this.value" class="${textareaCls()}">${esc(d.notes || '')}</textarea>`, desk ? 'space-y-1' : 'space-y-1.5');
  const chosen = d.tagIds.map(tagById).filter(Boolean);
  const others = state.tags.filter(t => !d.tagIds.includes(t.id));
  const tags = field(desk ? 'تگ‌ها (چندگانه)' : 'تگ‌ها', chipBox(`
    ${chosen.map(t => `<span class="px-2 py-1 rounded-lg ${desk ? 'text-[10px]' : 'text-[9px]'} font-bold border flex items-center gap-1.5" style="${tagTint(t.color, '33', '1a')}">${esc(t.name)} <button type="button" onclick="editorToggleTag('${t.id}')" aria-label="برداشتن ${ea(t.name)}">${fa('xmark', desk ? '' : 'text-[8px] opacity-50')}</button></span>`).join('')}
    ${others.length ? `<button type="button" onclick="editorToggleTagPicker()" aria-label="افزودن تگ" class="px-${desk ? '2' : '3'} py-1 bg-slate-800 text-slate-500 rounded-lg ${desk ? 'text-[10px]' : 'text-[9px]'} font-black border border-slate-700 hover:text-white transition-colors">+</button>` : ''}
    ${ed.tagPickerOpen && others.length ? `<div class="w-full flex flex-wrap gap-1.5 pt-2 mt-1 border-t border-slate-800">${others.map(t => `<button type="button" onclick="editorToggleTag('${t.id}')" class="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 bg-slate-800 hover:text-white transition-colors" style="color:${ea(t.color)}">${esc(t.name)}</button>`).join('')}</div>` : ''}
    ${!state.tags.length ? `<span class="text-[10px] text-slate-600">هنوز تگی نساختی — از تنظیمات بساز.</span>` : ''}`), desk ? 'space-y-2' : 'space-y-1.5');
  const priority = field('اولویت', prioritySeg(d.priority, 'editorSetPriority'), desk ? 'space-y-2' : 'space-y-1.5');
  const quick = (on, label, onclick) => desk
    ? `<button type="button" onclick="${onclick}" class="flex-1 py-1.5 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'} rounded-lg text-[9px] font-black">${label}</button>`
    : `<button type="button" onclick="${onclick}" class="py-2.5 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500'} rounded-xl text-[9px] font-black">${label}</button>`;
  const dateBtn = `<button type="button" onclick="toggleTaskCalendar()" class="${desk ? 'flex-1 bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs font-bold text-slate-300 flex items-center justify-between hover:border-indigo-500/50 transition-colors' : 'w-full bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs font-bold text-white flex items-center justify-between'}"><span>${d.date ? jDate(d.date, true) : 'بدون تاریخ — انتخاب از تقویم'}</span>${fa('calendar-day', 'text-indigo-500')}</button>`;
  const quickDates = [quick(d.date === todayStr, 'امروز', "editorQuickDate('today')"), quick(d.date === tomorrowStr, 'فردا', "editorQuickDate('tomorrow')"), quick(!d.date, 'بدون تاریخ', 'editorClearDate()')].join('');
  const date = recurringCreate ? '' : field('تاریخ (جلالی)', desk
    ? `<div class="flex items-center gap-2">${dateBtn}</div><div class="flex gap-1">${quickDates}</div>`
    : `<div class="space-y-2">${dateBtn}<div class="grid grid-cols-3 gap-2">${quickDates}</div></div>`, desk ? 'space-y-2' : 'space-y-1.5');
  const duration = field('مدت زمان (دقیقه)', `
    <div class="relative">
      <input type="text" inputmode="numeric" value="${d.durationMin || ''}" oninput="normalizeNumericInput(this)" onchange="editorSetDurationCustom(this.value)" aria-label="مدت به دقیقه"
        class="${desk ? 'w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 focus:outline-none transition-all pl-12' : 'w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs font-black text-white focus:outline-none focus:border-indigo-500/50 transition-all text-center'}">
      <span class="absolute ${desk ? 'left-4 text-[10px]' : 'left-3 text-[8px]'} top-1/2 -translate-y-1/2 font-bold text-slate-500 pointer-events-none">MIN</span>
    </div>
    <div id="duration-suggestion-slot" class="empty:hidden">${renderDurationSuggestionChip()}</div>
    ${ed.mode === 'edit' && ed.actualMinReadonly ? `<p class="text-[10px] font-bold text-slate-500">${fa('clock', 'ml-1')}زمان واقعی ثبت‌شده: ${formatDuration(ed.actualMinReadonly)}</p>` : ''}`, desk ? 'space-y-2' : 'space-y-1.5');
  const subtasks = `
    <div class="space-y-3">
      <div class="flex items-center justify-between px-1">
        <label class="text-[10px] font-black text-slate-600 uppercase tracking-widest">${desk ? 'زیرمجموعه (Subtasks)' : 'زیرمجموعه'}</label>
        <button type="button" onclick="(document.getElementById('editor-subtask-input')||{}).focus&&document.getElementById('editor-subtask-input').focus()" class="text-[10px] font-black text-indigo-400">${desk ? '+ افزودن' : '+ افزودن مورد'}</button>
      </div>
      <div class="space-y-2">
        ${d.subtasks.map((s, idx) => `
          <div class="flex items-center gap-3 ${desk ? 'bg-slate-900/50 border border-slate-800' : 'bg-slate-900/40 border border-slate-800/50'} p-3 rounded-xl group" draggable="${desk}"
            ondragstart="editorSubtaskDragStart(event, ${idx})" ondragover="editorSubtaskDragOver(event)" ondrop="editorSubtaskDrop(event, ${idx})" ondragend="editorSubtaskDragEnd(event)">
            ${desk ? fa('grip-vertical', 'text-slate-700 cursor-move') : `<span class="flex flex-col -my-1">
              <button type="button" onclick="editorMoveSubtask(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} aria-label="بالا" class="text-slate-600 disabled:opacity-20 leading-none">${fa('chevron-up', 'text-[9px]')}</button>
              <button type="button" onclick="editorMoveSubtask(${idx}, 1)" ${idx === d.subtasks.length - 1 ? 'disabled' : ''} aria-label="پایین" class="text-slate-600 disabled:opacity-20 leading-none">${fa('chevron-down', 'text-[9px]')}</button></span>`}
            <div class="w-4 h-4 ${s.done ? 'bg-emerald-500 text-white' : 'border border-slate-700 bg-slate-950'} rounded flex items-center justify-center shrink-0">${s.done ? fa('check', 'text-[8px]') : ''}</div>
            <span class="${desk ? 'text-xs' : 'text-[11px]'} ${s.done ? 'text-slate-500 line-through' : 'text-slate-300'} flex-1" dir="auto">${esc(s.title)}</span>
            <button type="button" onclick="editorDeleteSubtask('${s.id}')" aria-label="حذف" class="${desk ? 'opacity-0 group-hover:opacity-100 reveal' : ''} text-slate-600 hover:text-rose-500 transition-all">${fa('xmark', 'text-xs')}</button>
          </div>`).join('')}
        <div class="flex items-center gap-3 bg-slate-900/30 border border-dashed border-slate-800 p-3 rounded-xl">
          ${fa('plus', 'text-slate-700 text-xs')}
          <input type="text" id="editor-subtask-input" placeholder="ریز کار جدید…" onkeydown="if(event.key==='Enter'){event.preventDefault(); editorAddSubtask();}"
            class="flex-1 bg-transparent text-xs text-slate-300 focus:outline-none placeholder:text-slate-600">
          <button type="button" onclick="editorAddSubtask()" class="text-[10px] font-black text-indigo-400">افزودن</button>
        </div>
      </div>
    </div>`;
  const repeat = ed.mode === 'create' ? `
    ${toggleRow(`${fa('rotate', 'text-indigo-400 ml-1')} تکرار هفتگی`, 'این کار تکرار هفتگی داشته باشد', d.recurring.enabled, 'editorToggleRecurring()')}
    ${d.recurring.enabled ? `<div class="space-y-2">${fieldLabel('روزهای تکرار')}<div class="flex gap-1 justify-between">${weekdayBtns(d.recurring.weekdays, x => `editorToggleRecurringWeekday(${x})`, 'indigo', 'w-9 h-9')}</div>${!d.recurring.weekdays.length ? `<p class="text-[10px] text-amber-400/80 px-1">دست‌کم یک روز را انتخاب کن.</p>` : ''}</div>` : ''}`
    : ed.isRecurringInstance ? `
    ${toggleRow(`${fa('rotate', 'text-indigo-400 ml-1')} بخشی از یک سری تکرارشونده`, 'این تغییرات برای تکرارهای بعدی هم اعمال شود', ed.applyToFutureRecurring, 'editorToggleApplyToFuture()')}` : '';
  const desktopBody = `
    <div class="space-y-4">${title}${notes}</div>
    <div class="grid grid-cols-2 gap-6">${tags}${priority}</div>
    <div class="grid grid-cols-2 gap-6">${date || '<div></div>'}${duration}</div>
    ${ed.calendarOpen && !recurringCreate ? renderTaskCalendarPicker() : ''}
    ${subtasks}
    <section class="space-y-6 pt-8 border-t border-slate-800">${repeat}${renderTaskReminderFields(ed)}</section>`;
  const mobileBody = `
    ${title}${notes}
    <div class="grid grid-cols-2 gap-4">${priority}${duration}</div>
    ${tags}${date}
    ${ed.calendarOpen && !recurringCreate ? renderTaskCalendarPicker() : ''}
    ${subtasks}
    <section class="space-y-6 pt-8 border-t border-slate-800">${repeat}${renderTaskReminderFields(ed)}</section>`;
  return desk ? desktopBody : mobileBody;
}
function renderTaskEditor({ inline } = {}){
  const ed = state.taskEditor;
  if(!ed) return '';
  const editing = ed.mode === 'edit';
  return renderEditorFrame({
    title: editing ? 'ویرایش تسک' : 'تسک جدید', inline,
    body: taskEditorBody(), onClose:'closeTaskEditor()', onSave:'confirmTaskEditor()',
    saveLabel: editing ? (isDesk() ? 'ذخیره تسک' : 'ذخیره تغییرات') : 'افزودن تسک',
    onDelete: editing ? `deleteEditingTask()` : '',
    extraHead: editing ? (isDesk()
      ? `<button type="button" onclick="copyTaskToEditor('${ed.taskId}')" aria-label="کپی" title="کپی" class="w-9 h-9 rounded-xl border border-slate-800 text-slate-500 hover:text-white transition-all flex items-center justify-center">${fa('copy', 'text-sm')}</button>`
      : mobIconBtn('copy', `copyTaskToEditor('${ed.taskId}')`, 'کپی')) : '',
  });
}
function deleteEditingTask(){
  const id = state.taskEditor && state.taskEditor.taskId;
  state.taskEditor = null;
  if(id) deleteTask(id); else render();
}

/* ---------- recurring template editor ---------- */
function renderRecurringEditorModal(){
  const ed = state.recurringEditor;
  const quickVals = [15, 30, 45, 60];
  const customVal = (ed.durationMin && !quickVals.includes(ed.durationMin)) ? ed.durationMin : '';
  return renderEditorFrame({
    title:'ویرایش کار تکرارشونده', onClose:'closeRecurringEditor()', onSave:'confirmRecurringEditor()',
    body:`
      <p class="text-[11px] text-slate-400 leading-relaxed bg-indigo-600/5 border border-indigo-500/20 p-4 rounded-2xl">تغییرات روی همه‌ی تکرارهای آینده اعمال می‌شه؛ کارهای گذشته و امروز دست‌نخورده می‌مونن.</p>
      ${field('عنوان', `<input type="text" id="recurring-editor-title" value="${ea(ed.title)}" placeholder="اسم کار…" class="${titleInputCls()}">`)}
      ${field('تگ‌ها', chipBox(state.tags.map(t => `<button type="button" onclick="recurringEditorToggleTag('${t.id}')" class="px-2 py-1 rounded-lg text-[10px] font-bold border ${ed.tagIds.includes(t.id) ? '' : 'bg-slate-800 border-slate-700 opacity-60'}" style="${ed.tagIds.includes(t.id) ? tagTint(t.color, '33', '1a') : `color:${ea(t.color)}`}">${esc(t.name)}</button>`).join('') || '<span class="text-[10px] text-slate-600">تگی نداری</span>'))}
      ${field('اولویت', prioritySeg(ed.priority, 'recurringEditorSetPriority'))}
      ${field('روزهای تکرار', `<div class="flex gap-1 justify-between">${weekdayBtns(ed.weekdays, x => `recurringEditorToggleWeekday(${x})`, 'indigo', 'w-9 h-9')}</div>`)}
      ${field('مدت زمان (دقیقه)', `
        <div class="flex gap-1">${quickVals.map(v => `<button type="button" onclick="recurringEditorSetDuration(${v})" class="flex-1 py-1.5 ${ed.durationMin === v ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'} rounded-lg text-[9px] font-black">${fd(v)}</button>`).join('')}</div>
        <input type="text" id="recurring-editor-duration" inputmode="numeric" placeholder="سفارشی" value="${customVal}" oninput="normalizeNumericInput(this)" class="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm font-black text-white focus:outline-none focus:border-indigo-500/50">`)}
      <section class="space-y-6 pt-8 border-t border-slate-800">${renderRecurringReminderFields(ed)}</section>`,
  });
}

/* ---------- pick an existing task for a calendar day ---------- */
function renderMoveTaskPickerList(){
  const { dateStr, tagIds } = state.moveTaskPicker;
  const search = state.moveTaskPicker.search.trim().toLowerCase();
  let list = state.tasks.filter(t => !t.done && t.date !== dateStr);
  if(search) list = list.filter(t => t.title.toLowerCase().includes(search));
  if(tagIds.length) list = list.filter(t => t.tagIds.some(id => tagIds.includes(id)));
  return list.length === 0
    ? `<p class="text-[11px] text-slate-500 text-center py-4">تسک انجام‌نشده‌ای با این جست‌وجو پیدا نشد</p>`
    : list.map(t => `
      <button type="button" onclick="moveTaskToDate('${t.id}')" class="w-full flex items-center justify-between gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all text-right">
        <span class="text-xs font-bold text-slate-200" dir="auto">${esc(t.title)}${t.date ? ` <span class="text-[10px] text-slate-500">(${jDate(t.date)})</span>` : ''}</span>
        ${t.durationMin ? `<span class="text-[10px] font-bold text-slate-500 shrink-0">${fmtMin(t.durationMin)}</span>` : ''}
      </button>`).join('');
}
function renderMoveTaskPicker(){
  const tagIds = state.moveTaskPicker.tagIds;
  return renderDialog({ title:`کدوم کار بیاد توی ${jDate(state.moveTaskPicker.dateStr)}؟`, onClose:'cancelMoveTaskPicker()', body:`
    <input type="text" placeholder="جست‌وجو در تسک‌های انجام‌نشده…" value="${ea(state.moveTaskPicker.search)}" oninput="moveTaskPickerSetSearch(this.value)"
      onkeydown="if(event.key==='Enter'){ event.preventDefault(); this.blur(); }" class="${inputCls}">
    ${state.tags.length ? `<div class="flex flex-wrap gap-1.5">${state.tags.map(t => `<button type="button" class="pick-chip ${tagIds.includes(t.id) ? 'on' : ''} px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-700 bg-slate-800 text-slate-500" onclick="moveTaskPickerToggleTag('${t.id}', this)">${esc(t.name)}</button>`).join('')}</div>` : ''}
    <div class="space-y-2" id="move-task-pick-list">${renderMoveTaskPickerList()}</div>`,
    footer: dlgSecondary('انصراف', 'cancelMoveTaskPicker()'),
  });
}

/* ---------- calendar ---------- */
function calendarSelectedKey(){
  if(!state.calendarPage.selectedDayKey) state.calendarPage.selectedDayKey = dateKey(new Date());
  return state.calendarPage.selectedDayKey;
}
function calendarPageToday(){
  const j = window.jalaali.toJalaali(new Date());
  Object.assign(state.calendarPage, { jy:j.jy, jm:j.jm, selectedDayKey:dateKey(new Date()) });
  render();
}
function calendarDayItems(key){
  return {
    tasks: state.calendarShowDated ? state.tasks.filter(t => t.date === key) : [],
    previews: state.calendarShowPreviews ? getRecurringPreviewsForDate(key) : [],
  };
}
// the month's weeks, Saturday first, padded with the neighbouring months' days
function calendarMonthCells(jy, jm){
  const monthLen = window.jalaali.jalaaliMonthLength(jy, jm);
  const g1 = window.jalaali.toGregorian(jy, jm, 1);
  const first = new Date(g1.gy, g1.gm - 1, g1.gd);
  const lead = (first.getDay() + 1) % 7;
  const cells = [];
  const total = Math.ceil((lead + monthLen) / 7) * 7;
  for(let i = 0; i < total; i++){
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() - lead + i);
    const j = window.jalaali.toJalaali(d);
    cells.push({ key:dateKey(d), jd:j.jd, inMonth: j.jm === jm && j.jy === jy, friday: i % 7 === 6 });
  }
  return cells;
}
function calendarTaskDot(t, glow){
  const tag = t.tagIds.map(tagById).find(Boolean);
  const color = t.priority === 'high' ? '#f43f5e' : tag ? tag.color : '#6366f1';
  return `<div class="task-dot ${glow ? 'shadow-[0_0_8px_rgba(79,70,229,0.5)]' : ''}" style="background-color:${ea(color)}" title="${ea(t.title)}"></div>`;
}
function calendarDayCard(t){
  const pill = t.priority === 'high'
    ? `<span class="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10">مهم</span>`
    : t.priority === 'medium' ? `<span class="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/10">متوسط</span>`
    : `<span class="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-1.5 py-0.5 rounded">عادی</span>`;
  const rem = reminderShort(t);
  return `
    <div onclick="openTaskEditorEdit('${t.id}')" class="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-all group cursor-pointer ${t.done ? 'opacity-60' : ''}">
      <div class="flex items-start justify-between mb-2">
        <h4 class="text-xs font-bold ${t.done ? 'text-slate-500 line-through' : 'text-slate-200'} leading-tight" dir="auto">${esc(t.title)}</h4>
        <div class="reveal flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onclick="event.stopPropagation(); openTaskEditorEdit('${t.id}')" aria-label="ویرایش" class="p-1 text-slate-500 hover:text-white">${fa('pen', 'text-[10px]')}</button>
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="${t.done ? 'برگرداندن' : 'انجام شد'}" class="p-1 text-slate-500 hover:text-emerald-500">${fa(t.done ? 'rotate-left' : 'check', 'text-[10px]')}</button>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 flex-wrap">${pill}${rem ? `<span class="text-[9px] font-bold text-slate-500">${rem}</span>` : ''}${t.durationMin ? `<span class="text-[9px] font-bold text-slate-500">${fmtMin(t.durationMin)}</span>` : ''}</div>
        ${rem ? fa('bell', 'text-[10px] text-indigo-500') : t.done ? fa('circle-check', 'text-[10px] text-emerald-500') : ''}
      </div>
    </div>`;
}
function calendarPreviewCard(tpl){
  return `
    <div class="bg-slate-950/40 p-4 rounded-2xl border border-dashed border-slate-800 opacity-60 hover:opacity-100 transition-opacity group">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-xs font-bold text-slate-500" dir="auto">${esc(tpl.title)}</h4>
        ${fa('rotate', 'text-[10px] text-slate-600')}
      </div>
      <div class="flex items-center justify-between">
        <span class="text-[9px] font-black text-indigo-900 uppercase tracking-widest bg-indigo-500/5 px-1.5 py-0.5 rounded">تکرار هفتگی</span>
        <div class="flex items-center gap-2">
          <button type="button" onclick="openRecurringEditor('${tpl.id}')" class="text-[9px] font-black text-slate-500 hover:text-white">ویرایش</button>
          <button type="button" onclick="deleteRecurringFuture('${tpl.id}')" class="text-[9px] font-black text-slate-500 hover:text-rose-500">توقف تکرار</button>
        </div>
      </div>
    </div>`;
}
function calendarDaySummary(key){
  const { tasks, previews } = calendarDayItems(key);
  const total = tasks.reduce((s, t) => s + (t.durationMin || 0), 0) + previews.reduce((s, p) => s + (p.durationMin || 0), 0);
  return `${fd(tasks.length)} تسک ثبت شده${previews.length ? ` و ${fd(previews.length)} تکرار` : ''}، ${total ? formatDuration(total) : 'بدون'} زمان تخمینی`;
}
function renderCalendarSidebarFooter(){
  const box = (on, label, onclick) => `
    <button type="button" onclick="${onclick}" class="flex items-center gap-3 cursor-pointer w-full">
      <div class="w-4 h-4 rounded border border-slate-700 flex items-center justify-center ${on ? 'bg-indigo-600 text-white' : 'bg-slate-800'}">${on ? fa('check', 'text-[8px]') : ''}</div>
      <span class="text-[11px] font-bold ${on ? 'text-slate-300' : 'text-slate-500'}">${label}</span>
    </button>`;
  return `
    <div class="p-6 border-t border-slate-800 bg-slate-950">
      <div class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-4">
        <h5 class="text-[9px] font-black text-slate-500 mb-3 uppercase tracking-widest">فیلتر نمایش</h5>
        <div class="space-y-3">
          ${box(state.calendarShowDated, 'تسک‌های تاریخ‌دار', 'state.calendarShowDated=!state.calendarShowDated; render()')}
          ${box(state.calendarShowPreviews, 'پیش‌نمایش تکرار شونده', 'state.calendarShowPreviews=!state.calendarShowPreviews; render()')}
        </div>
      </div>
      <button type="button" onclick="openTaskEditorNewForDate('${calendarSelectedKey()}')" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-900/40">+ تسک جدید</button>
    </div>`;
}
function renderCalendarDesktop(){
  const c = state.calendarPage;
  const sel = calendarSelectedKey();
  const todayK = dateKey(new Date());
  const cells = calendarMonthCells(c.jy, c.jm);
  const grid = cells.map(cell => {
    const { tasks, previews } = calendarDayItems(cell.key);
    const isToday = cell.key === todayK, isSel = cell.key === sel;
    const num = `<span class="text-xs ${isToday ? 'font-black text-indigo-400' : cell.friday ? 'font-black text-rose-500' : cell.inMonth ? 'font-bold text-slate-300' : 'font-bold text-slate-600'}">${fd(cell.jd)}</span>`;
    const dots = tasks.slice(0, 7).map((t, i) => calendarTaskDot(t, isSel && i === 0)).join('') + previews.slice(0, 3).map(() => `<div class="task-dot bg-slate-600"></div>`).join('');
    const more = tasks.length > 7 ? `<span class="text-[8px] font-black text-slate-500">+${fd(tasks.length - 7)}</span>` : '';
    return `
      <div onclick="calendarPageShowDay('${cell.key}')" class="calendar-day cursor-pointer ${cell.friday ? 'bg-rose-500/5' : ''} ${isSel ? 'active border-indigo-500/50' : ''} ${cell.inMonth ? '' : 'opacity-20'}">
        ${isToday ? `<div class="flex items-center justify-between">${num}<span class="text-[8px] font-black bg-indigo-600 text-white px-1 rounded uppercase">امروز</span></div>` : num}
        ${dots || more ? `<div class="mt-2 flex gap-1 flex-wrap items-center">${dots}${more}</div>` : ''}
      </div>`;
  }).join('');
  // list view: the month's days that have anything on them
  const listDays = cells.filter(x => x.inMonth).map(x => ({ ...x, ...calendarDayItems(x.key) })).filter(x => x.tasks.length || x.previews.length);
  const list = `
    <div class="p-8 space-y-8 max-w-3xl">
      ${listDays.length ? listDays.map(x => `
        <section>
          <button type="button" onclick="calendarPageShowDay('${x.key}')" class="flex items-center gap-3 mb-4">
            <h3 class="text-sm font-black ${x.key === sel ? 'text-indigo-400' : 'text-white'}">${WEEKDAYS_FA[new Date(x.key + 'T00:00:00').getDay()]}، ${jDate(x.key)}</h3>
            ${x.key === todayK ? `<span class="text-[8px] font-black bg-indigo-600 text-white px-1 rounded uppercase">امروز</span>` : ''}
            <span class="text-[10px] font-bold text-slate-600">${calendarDaySummary(x.key)}</span>
          </button>
          <div class="grid grid-cols-2 gap-3">${x.previews.map(calendarPreviewCard).join('')}${x.tasks.map(calendarDayCard).join('')}</div>
        </section>`).join('') : `<p class="text-xs font-bold text-slate-600 text-center py-16">برای این ماه کاری ثبت نشده</p>`}
    </div>`;
  const { tasks, previews } = calendarDayItems(sel);
  const segBtn = (on, label, v) => `<button type="button" onclick="state.calendarView='${v}'; render()" class="px-4 py-1.5 text-[10px] font-black ${on ? 'text-white bg-slate-800 rounded-lg shadow-sm' : 'text-slate-500 hover:text-slate-300'}">${label}</button>`;
  return `
    <main class="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden border-l border-slate-800">
      <header class="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 bg-slate-950/50">
        <div class="flex items-center gap-8">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-black text-white tracking-tight">${MONTHS_JALALI[c.jm - 1]} ${fd(c.jy)}</h1>
            <div class="flex items-center gap-1">
              <button type="button" onclick="calendarPagePrevMonth()" aria-label="ماه قبل" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-900 transition-colors text-slate-600 hover:text-white">${fa('chevron-right', 'text-xs')}</button>
              <button type="button" onclick="calendarPageNextMonth()" aria-label="ماه بعد" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-900 transition-colors text-slate-600 hover:text-white">${fa('chevron-left', 'text-xs')}</button>
            </div>
          </div>
          <button type="button" onclick="calendarPageToday()" class="px-4 py-1.5 border border-slate-800 rounded-lg text-[10px] font-black text-slate-400 hover:bg-slate-900 hover:text-white transition-all">امروز</button>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">${segBtn(state.calendarView !== 'list', 'ماه', 'month')}${segBtn(state.calendarView === 'list', 'لیست', 'list')}</div>
        </div>
      </header>
      ${state.calendarView === 'list' ? `<div class="flex-1 overflow-y-auto custom-scrollbar" data-scroll="calendar-list">${renderStatusBars()}${list}</div>` : `
        <div class="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm">
          ${WEEKDAY_DISPLAY_ORDER.map(d => `<div class="py-3 text-center text-[10px] font-black ${d === 5 ? 'text-rose-500' : 'text-slate-500'} uppercase tracking-widest">${WEEKDAYS_FA[d]}</div>`).join('')}
        </div>
        <div class="flex-1 overflow-y-auto custom-scrollbar" data-scroll="calendar">
          ${renderStatusBars()}
          <div class="calendar-grid border-r border-slate-800">${grid}</div>
        </div>`}
    </main>
    <aside id="day-details" class="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      <header class="h-20 border-b border-slate-800 px-8 flex items-center justify-between shrink-0">
        <h3 class="text-sm font-black text-white">${jDate(sel)}</h3>
        <div class="flex items-center gap-2">
          <button type="button" onclick="openMoveTaskPicker('${sel}')" title="انتخاب از تسک‌های موجود" aria-label="انتخاب از تسک‌های موجود" class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center hover:text-white transition-all">${fa('arrow-right-to-bracket', 'text-xs')}</button>
          <button type="button" onclick="openTaskEditorNewForDate('${sel}')" aria-label="تسک جدید برای این روز" class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all">${fa('plus', 'text-xs')}</button>
        </div>
      </header>
      <div class="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4" data-scroll="day">
        ${tasks.map(calendarDayCard).join('')}
        ${previews.map(calendarPreviewCard).join('')}
        ${!tasks.length && !previews.length ? `<div class="py-10 flex flex-col items-center text-slate-600">${fa('calendar-xmark', 'text-4xl mb-3 opacity-30')}<p class="text-[11px] font-bold">کاری برای این روز ثبت نشده</p></div>` : ''}
      </div>
      <div class="p-6 border-t border-slate-800">
        <div class="text-center p-4 rounded-2xl bg-indigo-600/5 border border-indigo-500/10">
          <p class="text-[10px] font-black text-indigo-400 mb-1">خلاصه روز</p>
          <p class="text-xs font-bold text-slate-300">${calendarDaySummary(sel)}</p>
        </div>
      </div>
    </aside>`;
}
function renderCalendarMobile(){
  const c = state.calendarPage;
  const sel = calendarSelectedKey();
  const todayK = dateKey(new Date());
  const monthLen = window.jalaali.jalaaliMonthLength(c.jy, c.jm);
  const g1 = window.jalaali.toGregorian(c.jy, c.jm, 1);
  const lead = (new Date(g1.gy, g1.gm - 1, g1.gd).getDay() + 1) % 7;
  const cells = [];
  for(let i = 0; i < lead; i++) cells.push('<span class="aspect-square"></span>');
  for(let d = 1; d <= monthLen; d++){
    const g = window.jalaali.toGregorian(c.jy, c.jm, d);
    const key = dateKey(new Date(g.gy, g.gm - 1, g.gd));
    const { tasks, previews } = calendarDayItems(key);
    const busy = tasks.length || previews.length;
    const friday = (lead + d - 1) % 7 === 6;
    const isSel = key === sel, isToday = key === todayK;
    cells.push(`<button type="button" onclick="calendarPageShowDay('${key}')" class="aspect-square flex items-center justify-center rounded-xl text-xs relative ${isSel ? 'font-black bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : `font-bold ${isToday ? 'bg-slate-800/50 border border-slate-700' : friday ? 'hover:bg-rose-500/10' : 'hover:bg-slate-800'} ${friday ? 'text-rose-500' : ''}`}">${fd(d)}${busy ? `<span class="absolute bottom-1.5 w-1 h-1 ${isSel ? 'bg-white' : 'bg-indigo-400'} rounded-full"></span>` : ''}</button>`);
  }
  while(cells.length % 7) cells.push('<span class="aspect-square"></span>');
  const { tasks, previews } = calendarDayItems(sel);
  const selDate = new Date(sel + 'T00:00:00');
  const item = t => {
    const rem = reminderShort(t);
    return `
      <div onclick="openTaskEditorEdit('${t.id}')" class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 cursor-pointer">
        <div class="flex items-center gap-3 min-w-0">
          <button type="button" onclick="toggleTaskDone('${t.id}', event)" aria-label="${t.done ? 'برگرداندن' : 'انجام شد'}" class="w-6 h-6 ${t.done ? 'bg-emerald-500 text-white' : `border-2 ${rem ? 'border-indigo-500' : 'border-slate-700'} bg-slate-950`} rounded-lg flex items-center justify-center shrink-0">${t.done ? fa('check', 'text-[10px]') : rem ? fa('check', 'text-[10px] text-indigo-500 opacity-30') : ''}</button>
          <div class="min-w-0">
            <h4 class="text-xs font-bold ${t.done ? 'text-slate-500 line-through' : 'text-slate-200'}" dir="auto">${esc(t.title)}</h4>
            <div class="flex items-center gap-2 mt-1"><span class="text-[9px] font-bold ${rem ? 'text-indigo-400' : 'text-slate-500'}">${rem || (t.durationMin ? fmtMin(t.durationMin) : 'برنامه‌ریزی شده')}</span></div>
          </div>
        </div>
        ${fa(rem ? 'bell' : 'chevron-left', `${rem ? 'text-indigo-500' : 'text-slate-600'} text-[10px] shrink-0`)}
      </div>`;
  };
  return `
    ${mobHeader(mobTitle('تقویم جلالی', `<span class="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/10">${fd(c.jy)}</span>`), `
      <div class="flex items-center gap-2">
        ${mobIconBtn('chevron-right', 'calendarPagePrevMonth()', 'ماه قبل')}
        <button type="button" onclick="calendarPageToday()" class="text-sm font-black px-2">${MONTHS_JALALI[c.jm - 1]}</button>
        ${mobIconBtn('chevron-left', 'calendarPageNextMonth()', 'ماه بعد')}
      </div>`)}
    <main class="safe-area-bottom">
      <div class="p-4">
        ${renderStatusBars()}
        <div class="bg-slate-900/50 border border-slate-800 rounded-3xl p-4">
          <div class="grid grid-cols-7 gap-1 mb-4 text-center">
            ${['ش','ی','د','س','چ','پ','ج'].map((w, i) => `<span class="text-[9px] font-black ${i === 6 ? 'text-rose-900' : 'text-slate-600'} uppercase tracking-widest">${w}</span>`).join('')}
          </div>
          <div class="grid grid-cols-7 gap-1 text-center">${cells.join('')}</div>
        </div>
        <div class="mt-8 space-y-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-sm font-black text-white">برنامه ${WEEKDAYS_FA[selDate.getDay()]}، ${jDate(sel)}</h3>
            <div class="flex items-center gap-3">
              <button type="button" onclick="openMoveTaskPicker('${sel}')" class="text-[10px] font-black text-slate-500">${fa('arrow-right-to-bracket', 'ml-1')}از تسک‌ها</button>
              <button type="button" onclick="openTaskEditorNewForDate('${sel}')" class="text-[10px] font-black text-indigo-400">+ افزودن تسک</button>
            </div>
          </div>
          <div class="space-y-3">
            ${tasks.map(item).join('')}
            ${previews.map(tpl => `
              <div class="bg-slate-900 border border-dashed border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4 opacity-70">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-6 h-6 border-2 border-slate-800 rounded-lg bg-slate-950 shrink-0"></div>
                  <div class="min-w-0">
                    <h4 class="text-xs font-bold text-slate-400" dir="auto">${esc(tpl.title)}</h4>
                    <div class="flex items-center gap-3 mt-1">
                      <span class="text-[9px] font-bold text-slate-500">تکرار هفتگی — خودش ساخته می‌شه</span>
                      <button type="button" onclick="openRecurringEditor('${tpl.id}')" class="text-[9px] font-black text-indigo-400">ویرایش</button>
                      <button type="button" onclick="deleteRecurringFuture('${tpl.id}')" class="text-[9px] font-black text-rose-400">توقف</button>
                    </div>
                  </div>
                </div>
                ${fa('rotate', 'text-slate-600 text-[10px] shrink-0')}
              </div>`).join('')}
            ${!tasks.length && !previews.length ? `<p class="text-[11px] font-bold text-slate-600 text-center py-6">کاری برای این روز ثبت نشده</p>` : ''}
          </div>
        </div>
      </div>
    </main>`;
}
