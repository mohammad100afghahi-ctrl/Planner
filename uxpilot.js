/* Approved UX Pilot presentation. Persistence, auth, reminders and domain actions
   remain in index.html/task-reminders.js. No demo data or backend is introduced. */
const uxBase = {
  render, renderNav, renderToday, renderTasksView, renderCalendarPage,
  renderTaskEditorModal, renderTodayItem, renderIdeasPage, renderPromptsPage,
};
const uxPages = {
  today: ['امروز', 'برنامهٔ امروز، با تمرکز روی کارهای مهم', 'sun'],
  tasks: ['تسک‌ها', 'همهٔ کارها، تاریخ‌ها و یادآوری‌ها در یک جا', 'check'],
  calendar: ['تقویم جلالی', 'نمای ماهانه و برنامهٔ هر روز', 'calendar'],
  english: ['یادگیری انگلیسی', 'تکلیف‌ها، تکه‌های تمرین و روند یادگیری', 'book'],
  ideas: ['افکار و ایده‌ها', 'فضایی برای ثبت جرقه‌های ذهنی', 'bulb'],
  prompts: ['کتابخانهٔ پرامپت‌ها', 'دستورهایی که می‌خواهی دوباره استفاده کنی', 'prompt'],
  purchases: ['لیست خریدها', 'خریدهای مورد نیاز و اولویت‌هایشان', 'cart'],
  subscriptions: ['اشتراک‌ها', 'پیگیری سرویس‌ها و زمان تمدید', 'card'],
  wins: ['تونستم', 'دستاوردهای کوچک و بزرگت را به یاد بیاور', 'trophy'],
  mother: ['مادر', 'ملاحظه‌های کوچک برای ارتباط و رسیدگی', 'heart'],
  repairs: ['تعمیرات خانه', 'کارهای فنی، قطعه‌ها و نگهداری دوره‌ای', 'wrench'],
  settings: ['تنظیمات', 'تگ‌ها، هدف‌ها، اعلان‌ها و پشتیبان‌گیری', 'settings'],
  archive: ['آرشیو', 'مرور کارهای تکمیل‌شده و خریدهای انجام‌شده', 'archive'],
  'ai-reports': ['گزارش هوشمند', 'مرور هفتگی و پیشنهادهای تغییر برنامه', 'sparkle'],
};
let uxSectionsOpen = false;
let uxLastRenderedEditor = null;

function uxViewLink(n, mobile = false){
  return `<button type="button" class="${mobile ? 'ux-mobile-link' : 'ux-nav-link'} ${state.view === n.id ? 'active' : ''}"
    onclick="uxNavigate('${n.id}')" ${state.view === n.id ? 'aria-current="page"' : ''}>
    ${icon(n.icon, mobile ? 21 : 18)}<span>${n.label}</span></button>`;
}
function uxNavigate(view){ uxSectionsOpen = false; navigateTo(view); }
function uxToggleSections(){ uxSectionsOpen = !uxSectionsOpen; render(); }
function uxRenderNav(){
  const direct = [
    {id:'today', label:'امروز', icon:'sun'}, {id:'tasks', label:'تسک‌ها', icon:'check'},
    {id:'calendar', label:'تقویم', icon:'calendar'}, {id:'ai-reports', label:'گزارش', icon:'sparkle'},
  ];
  const isMore = !direct.some(n => n.id === state.view);
  return `<aside class="ux-sidebar" aria-label="منوی اصلی">
    <button type="button" class="ux-brand" onclick="uxNavigate('today')"><span class="ux-brand-mark" aria-hidden="true">${icon('repeat',22)}</span><span>مَدار</span></button>
    <nav class="ux-sidebar-sections" aria-label="بخش‌های مدار">
      ${NAV_GROUPS.map(g => `<div class="ux-nav-group"><h2>${g.label}</h2>${g.items.map(n => uxViewLink(n)).join('')}</div>`).join('')}
    </nav>
    <button type="button" class="ux-primary ux-sidebar-add" onclick="openTaskEditorNew()">${icon('plus',18)} افزودن تسک</button>
  </aside>
  <nav class="ux-mobile-nav" aria-label="پیمایش اصلی">${direct.map(n => uxViewLink(n,true)).join('')}
    <button type="button" class="ux-mobile-link ${isMore || uxSectionsOpen ? 'active' : ''}" onclick="uxToggleSections()" aria-expanded="${uxSectionsOpen}" aria-controls="ux-sections">${icon('dots',21)}<span>بیشتر</span></button>
  </nav>
  ${uxSectionsOpen ? `<div class="ux-sections-backdrop" onclick="if(event.target===this)uxToggleSections()"><section id="ux-sections" class="ux-sections" role="dialog" aria-modal="true" aria-label="بخش‌های مدار" tabindex="-1">
    <div class="ux-section-top"><h2>بخش‌های مدار</h2><button type="button" class="ux-icon-button" onclick="uxToggleSections()" aria-label="بستن بخش‌ها">${icon('close',20)}</button></div>
    ${NAV_GROUPS.map(g => `<div class="ux-menu-group"><h3>${g.label}</h3><div>${g.items.map(n => uxViewLink(n)).join('')}</div></div>`).join('')}
  </section></div>` : ''}`;
}
function uxHeader(){
  const {jalali,wd} = fmtHeaderDate(state.today);
  const page = uxPages[state.view] || uxPages.today;
  return `<header class="ux-header"><div class="ux-header-heading"><span class="ux-header-icon">${icon(page[2],22)}</span><div><h1>${page[0]}${state.view === 'today' ? `، ${wd}` : ''}</h1><p>${state.view === 'today' ? jalali : page[1]}</p></div></div>
    <div class="ux-header-actions">
      ${state.view==='today'?`<div class="ux-header-summary"><button type="button" onclick="openStreakPanel()">${icon('flame',16)} ${toFaDigits(computeStreak().streak)} روز</button><span>${icon('clock',16)} ${toFaDigits(uxTodayTasks().reduce((n,t)=>n+(t.durationMin||0),0))} دقیقه</span></div>`:''}
      ${state.pushStatus === 'unsupported' ? '' : `<button type="button" class="ux-icon-button ${state.pushStatus === 'on' ? 'is-on' : ''}" onclick="togglePushMenu()" aria-label="اعلان‌های گوشی" title="اعلان‌های گوشی">${icon('bell',19)}</button>`}
      <button type="button" class="ux-icon-button ${backupOverdue() ? 'is-warning' : ''}" onclick="toggleBackupMenu()" aria-label="پشتیبان‌گیری و بازیابی" title="پشتیبان‌گیری و بازیابی">${icon('download',19)}</button>
      <div class="ux-account"><span class="ux-account-mark">${icon('sun',20)}</span><div><span>فضای شخصی</span><button type="button" onclick="signOut()">خروج از حساب</button></div></div>
    </div></header>`;
}
function uxQuickTask(event){
  event.preventDefault();
  const title = document.getElementById('ux-quick-task').value.trim();
  openTaskEditorNewForDate(dateKey(state.today));
  state.taskEditor.draft.title = title;
  render();
  document.getElementById('editor-title')?.focus();
}
function uxCalendarDay(key){
  const j = window.jalaali.toJalaali(new Date(key+'T12:00:00'));
  Object.assign(state.calendarPage,{jy:j.jy,jm:j.jm,selectedDayKey:key,panel:'day'});
  uxNavigate('calendar');
}
function uxMiniCalendar(){
  const d = new Date(state.today), j = window.jalaali.toJalaali(d), today = dateKey(d);
  d.setDate(d.getDate()-((d.getDay()+1)%7));
  const days = Array.from({length:7},(_,i) => {
    const day = new Date(d); day.setDate(day.getDate()+i);
    const key = dateKey(day), n = window.jalaali.toJalaali(day).jd;
    return `<button type="button" class="${key===today?'active':''}" onclick="uxCalendarDay('${key}')" aria-label="${formatDateShort(key)}"><span>${['ش','ی','د','س','چ','پ','ج'][i]}</span><b>${toFaDigits(n)}</b>${state.tasks.some(t=>t.date===key&&!t.done)?'<i></i>':''}</button>`;
  });
  return `<section class="ux-card ux-mini-calendar"><div class="ux-card-title"><h3>${MONTHS_JALALI[j.jm-1]} ${toFaDigits(j.jy)}</h3><button type="button" class="ux-text-button" onclick="uxNavigate('calendar')">تقویم ${icon('calendar',14)}</button></div><div class="ux-week">${days.join('')}</div></section>`;
}
function uxTodayTasks(){
  const today=dateKey(state.today);
  return state.tasks.filter(t=>t.date===today||(t.date&&t.date<today&&(!t.done||(t.completedAt&&dateKey(new Date(t.completedAt))===today))));
}
function uxToday(){
  const today = dateKey(state.today), wd = fmtHeaderDate(state.today).wd;
  // Same eligibility as the existing Today view, including overdue done today.
  const raw = uxTodayTasks();
  const list = applyFiltersAndSort(raw,'todayFilters',{dateFilter:false});
  const overdue = list.filter(t=>!t.done&&t.date<today), open=list.filter(t=>!t.done&&t.date===today), done=list.filter(t=>t.done);
  const total=raw.reduce((n,t)=>n+(t.durationMin||0),0), streak=computeStreak();
  const folds=[renderTaskReminderAlert(),renderWeeklyFocus(),renderEnglishTodayCard(),renderMotherTodayCard(),renderWeeklyGoals()].filter(Boolean);
  const urgent=folds.filter(f=>f.urgent&&f.html.includes("'reminders'"));
  const rail=folds.filter(f=>!urgent.includes(f));
  const proposal=state.aiReports.find(r=>reviewPending(r).length);
  const count=filterActiveCount(state.todayFilters,false);
  return `<section class="ux-today">
    <div class="ux-today-stats"><button type="button" class="ux-stat ux-stat-streak" onclick="openStreakPanel()"><span>${icon('flame',18)} زنجیره</span><strong>${toFaDigits(streak.streak)} <small>روز</small></strong></button>
      <div class="ux-stat"><span>${icon('clock',18)} زمان برنامه‌ریزی</span><strong>${toFaDigits(total)} <small>دقیقه</small></strong></div>
      <div class="ux-stat ux-stat-done"><span>${icon('check',18)} تکمیل‌شده</span><strong>${toFaDigits(raw.filter(t=>t.done).length)} <small>از ${toFaDigits(raw.length)} کار</small></strong></div></div>
    ${renderAIHealthBanner()}${proposal?'':renderUnseenReportNotice()}
    <div class="ux-today-columns"><div class="ux-today-main">
      ${proposal?`<section class="ux-replan-card"><span class="ux-replan-symbol">${icon('sparkle',22)}</span><div><h2>پیشنهاد هوشمند بازچینی برنامه‌ها</h2><p>${toFaDigits(reviewPending(proposal).length)} تغییر در برنامه منتظر بررسی توست.</p><button type="button" class="ux-primary" onclick="uxNavigate('ai-reports')">بررسی پیشنهادها</button>${proposal.applyAfter?`<small>زمان اعمال خودکار: ${escapeHtml(new Date(proposal.applyAfter).toLocaleString('fa-IR',{dateStyle:'short',timeStyle:'short'}))}</small>`:''}</div></section>`:''}
      ${urgent.map(f=>f.html).join('')}
      ${overdue.length?`<section class="ux-overdue"><div class="ux-list-heading"><h2>عقب‌افتاده</h2><span>${toFaDigits(overdue.length)} مورد</span></div>${overdue.map(t=>renderTodayItem(t,today)).join('')}</section>`:''}
      <div class="ux-list-heading"><h2>برنامهٔ امروز</h2><div><button type="button" class="ux-icon-button ${count?'active':''}" onclick="toggleFilterPanel('todayFilters')" aria-label="فیلتر و مرتب‌سازی">${icon('filter',17)}${count?`<b>${toFaDigits(count)}</b>`:''}</button><button type="button" class="ux-icon-button" onclick="window.print()" aria-label="چاپ برنامهٔ امروز">${icon('printer',17)}</button></div></div>
      ${renderFilterPanel('todayFilters',{dateFilter:false,ownToggle:true})}
      <form class="ux-quick-add" onsubmit="uxQuickTask(event)"><input id="ux-quick-task" data-preserve placeholder="افزودن تسک سریع…" aria-label="عنوان تسک جدید"><button type="submit" aria-label="ادامهٔ افزودن تسک">${icon('plus',20)}</button></form>
      ${open.length?open.map(t=>renderTodayItem(t,today)).join(''):`<div class="empty-state ux-empty">${count?'کاری با این فیلترها برای امروز نیست':raw.length&&raw.every(t=>t.done)?'همهٔ کارهای امروز انجام شد.':'برای امروز کاری ثبت نشده است.'}</div>`}
      ${done.length?`<button type="button" class="today-done-toggle" onclick="state.todayDoneOpen=!state.todayDoneOpen;render()" aria-expanded="${!!state.todayDoneOpen}">${icon('chevronDown',15)} تکمیل‌شدهٔ امروز (${toFaDigits(done.length)})</button>${state.todayDoneOpen?done.map(t=>renderTodayItem(t,today)).join(''):''}`:''}
    </div><aside class="ux-today-rail">${rail.map(f=>f.html).join('')}
      ${state.encouragement?.text?`<blockquote class="ux-encouragement">${escapeHtml(state.encouragement.text)}</blockquote>`:''}
    </aside></div>${renderPrintSheet(raw,wd)}</section>`;
}
function uxTaskRow(t){
  return `<article class="ux-task-row ${t.done?'done':''} ${state.taskEditor?.taskId===t.id?'selected':''}">
    <button type="button" class="task-check ${t.done?'checked':''}" onclick="toggleTaskDone('${t.id}',event)" aria-label="${t.done?'لغو تکمیل':'انجام'} ${escapeHtml(t.title)}">${t.done?icon('check',14):''}</button>
    <div class="ux-task-row-main"><button type="button" class="ux-task-title ${t.done?'done-text':''}" onclick="openTaskEditorEdit('${t.id}')">${escapeHtml(t.title)}</button>
      <div class="ux-task-meta">${t.priority?`<span class="ux-priority ${t.priority}">${PRIORITY_LABEL[t.priority]}</span>`:''}${t.date?`<span>${formatDateShort(t.date)}</span>`:'<span>بدون تاریخ</span>'}${t.durationMin?`<span>${icon('clock',12)} ${toFaDigits(t.durationMin)} دقیقه</span>`:''}${t.subtasks.length?`<span>${toFaDigits(t.subtasks.filter(s=>s.done).length)} از ${toFaDigits(t.subtasks.length)} ریزکار</span>`:''}${t.actualMin?`<span>زمان واقعی ${formatDuration(t.actualMin)}</span>`:''}</div>
      ${t.tagIds.length?`<div class="ux-task-tags">${t.tagIds.map(id=>{const tag=state.tags.find(x=>x.id===id);return tag?`<span class="mini-tag" style="--chip-color:${tag.color}">${escapeHtml(tag.name)}</span>`:'';}).join('')}</div>`:''}
      ${renderTaskReminderBadge(t)}
    </div><div class="ux-row-actions"><button type="button" class="ux-icon-button" onclick="openTaskEditorEdit('${t.id}')" aria-label="ویرایش تسک">${icon('pencil',16)}</button><button type="button" class="ux-icon-button" onclick="copyTaskToEditor('${t.id}')" aria-label="کپی تسک">${icon('copy',16)}</button><button type="button" class="ux-icon-button ux-danger" onclick="deleteTask('${t.id}',event)" aria-label="حذف تسک">${icon('close',16)}</button></div></article>`;
}
function uxTasks(){
  const list=applyFiltersAndSort(state.tasks.filter(t=>!isArchived(t)),'tasksFilters',{dateFilter:true});
  return `<section class="ux-task-page"><div class="ux-page-toolbar"><div><span class="ux-count">${toFaDigits(list.length)} تسک</span><span class="summary-text">${toFaDigits(state.tasks.filter(t=>!t.done&&!t.date).length)} کار بدون تاریخ</span></div><button type="button" class="ux-primary" onclick="openTaskEditorNew()">${icon('plus',18)} تسک جدید</button></div>
    ${renderRecurringManager()}${renderFilterPanel('tasksFilters',{dateFilter:true})}<div class="ux-task-list">${list.length?list.map(uxTaskRow).join(''):'<div class="empty-state ux-empty">کاری با این فیلترها پیدا نشد.</div>'}</div></section>`;
}
function uxCalendar(){
  const c=state.calendarPage, first=window.jalaali.toGregorian(c.jy,c.jm,1), firstDate=new Date(first.gy,first.gm-1,first.gd), length=window.jalaali.jalaaliMonthLength(c.jy,c.jm);
  const today=dateKey(state.today), todayJ=window.jalaali.toJalaali(state.today);
  let selected=c.selectedDayKey;
  const sj=selected?window.jalaali.toJalaali(new Date(selected+'T12:00:00')):null;
  if(!sj||sj.jy!==c.jy||sj.jm!==c.jm)selected=todayJ.jy===c.jy&&todayJ.jm===c.jm?today:dateKey(firstDate);
  const offset=(firstDate.getDay()+1)%7, cells=Array(offset).fill('<div class="ux-calendar-cell empty" aria-hidden="true"></div>');
  for(let n=1;n<=length;n++){
    const g=window.jalaali.toGregorian(c.jy,c.jm,n), key=dateKey(new Date(g.gy,g.gm-1,g.gd));
    const tasks=state.tasks.filter(t=>t.date===key), previews=getRecurringPreviewsForDate(key), entries=[...tasks,...previews.map(t=>({...t,preview:true}))];
    cells.push(`<button type="button" class="ux-calendar-cell ${key===today?'today':''} ${key===selected?'selected':''} ${(offset+n-1)%7===6?'friday':''}" onclick="calendarPageShowDay('${key}')" aria-label="${toFaDigits(n)} ${MONTHS_JALALI[c.jm-1]}، ${toFaDigits(entries.length)} کار" ${key===selected?'aria-pressed="true"':''}>
      <span class="ux-day-number">${toFaDigits(n)}${key===today?'<small>امروز</small>':''}</span><span class="ux-calendar-entries">${entries.slice(0,2).map(t=>`<span class="ux-calendar-entry ${t.preview?'preview':''} ${t.done?'done-text':''}">${escapeHtml(t.title)}</span>`).join('')}${entries.length>2?`<span class="ux-calendar-more">${toFaDigits(entries.length-2)} مورد دیگر</span>`:''}</span>${entries.length?'<span class="ux-calendar-dot"></span>':''}</button>`);
  }
  while(cells.length%7)cells.push('<div class="ux-calendar-cell empty" aria-hidden="true"></div>');
  const dayTasks=state.tasks.filter(t=>t.date===selected), previews=getRecurringPreviewsForDate(selected);
  const total=[...dayTasks,...previews].reduce((s,t)=>s+(t.durationMin||0),0);
  return `<section class="ux-calendar"><div class="ux-calendar-main"><div class="ux-calendar-toolbar"><div><h2>${MONTHS_JALALI[c.jm-1]} ${toFaDigits(c.jy)}</h2><p>${MONTHS_GREG_FA[first.gm-1]} ${toFaDigits(first.gy)}</p></div><div class="ux-calendar-controls"><button type="button" class="ux-icon-button" onclick="calendarPagePrevMonth()" aria-label="ماه قبل">${icon('arrowIn',17)}</button><button type="button" class="ux-text-button" onclick="uxCalendarDay('${today}')">امروز</button><button type="button" class="ux-icon-button ux-next" onclick="calendarPageNextMonth()" aria-label="ماه بعد">${icon('arrowIn',17)}</button></div></div>
      <div class="ux-calendar-weekdays">${['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنج‌شنبه','جمعه'].map(d=>`<span>${d}</span>`).join('')}</div><div class="ux-calendar-grid">${cells.join('')}</div></div>
    <aside class="ux-day-panel"><div class="ux-card-title"><h2>${formatDateShort(selected)}</h2><button type="button" class="ux-primary ux-square" onclick="openTaskEditorNewForDate('${selected}')" aria-label="افزودن تسک به روز انتخاب‌شده">${icon('plus',18)}</button></div><p class="ux-day-label">${WEEKDAYS_FA[new Date(selected+'T12:00:00').getDay()]} · برنامهٔ روز</p>
      ${!dayTasks.length&&!previews.length?'<div class="empty-state">کاری برای این روز ثبت نشده است.</div>':''}
      ${dayTasks.map(t=>`<article class="ux-day-task ${t.done?'done':''}"><div><button type="button" class="ux-task-title ${t.done?'done-text':''}" onclick="openTaskEditorEdit('${t.id}')">${escapeHtml(t.title)}</button><button type="button" class="task-check ${t.done?'checked':''}" onclick="toggleTaskDone('${t.id}',event)" aria-label="${t.done?'لغو تکمیل':'تکمیل'} تسک">${t.done?icon('check',13):''}</button></div><p>${t.priority?`<span class="ux-priority ${t.priority}">${PRIORITY_LABEL[t.priority]}</span>`:''}${t.durationMin?` ${toFaDigits(t.durationMin)} دقیقه`:''}</p>${renderTaskReminderBadge(t)}<button type="button" class="ux-text-button" onclick="openTaskEditorEdit('${t.id}')">${icon('pencil',13)} ویرایش</button></article>`).join('')}
      ${previews.map(t=>`<article class="ux-day-task preview"><button type="button" class="ux-task-title" onclick="openRecurringEditor('${t.id}')">${escapeHtml(t.title)}</button><p>${icon('repeat',13)} پیش‌نمایش تکرار هفتگی</p><button type="button" class="ux-text-button" onclick="openRecurringEditor('${t.id}')">ویرایش تکرار</button></article>`).join('')}
      <button type="button" class="ux-secondary ux-move-task" onclick="openMoveTaskPicker('${selected}')">${icon('arrowIn',15)} انتخاب از تسک‌های موجود</button><div class="ux-day-summary">${toFaDigits(dayTasks.length)} تسک${previews.length?` و ${toFaDigits(previews.length)} تکرار`:''}<strong>${formatDuration(total)} زمان تخمینی</strong></div>
    </aside></section>${state.moveTaskPicker?renderMoveTaskPicker():''}`;
}
function uxTaskEditor(){
  const ed=state.taskEditor;
  if(!ed)return '';
  const d=ed.draft;
  return `<div class="modal-overlay ux-task-overlay" onclick="if(event.target===this)closeTaskEditor()"><section class="modal-box ux-task-editor" role="dialog" aria-modal="${!(state.view==='tasks'&&window.matchMedia('(min-width:1300px)').matches)}" aria-labelledby="ux-editor-heading">
    <div class="ux-editor-heading"><h2 id="ux-editor-heading">${ed.mode==='create'?'تسک جدید':'ویرایش تسک'}</h2><button type="button" class="ux-icon-button" onclick="closeTaskEditor()" aria-label="بستن ویرایش تسک">${icon('close',20)}</button></div>
    <div class="ux-editor-fields">
      <label class="ux-field"><span>عنوان تسک</span><input id="editor-title" data-preserve class="modal-title-input" value="${escapeAttr(d.title)}" placeholder="اسم کار…" oninput="state.taskEditor.draft.title=this.value;updateDurationSuggestionLive()"></label>
      <label class="ux-field"><span>یادداشت‌ها</span><textarea id="editor-notes" data-preserve class="task-notes-input" rows="3" placeholder="توضیحات (اختیاری)…" oninput="state.taskEditor.draft.notes=this.value;autoGrowTextarea(this)">${escapeHtml(d.notes||'')}</textarea></label>
      <div class="ux-editor-grid"><section class="ux-field ux-editor-tags-field"><span>تگ‌ها · چندگانه</span><div class="ux-editor-tags">${state.tags.map(t=>`<button type="button" class="pick-chip ${d.tagIds.includes(t.id)?'on':''}" style="--chip-color:${t.color}" onclick="editorToggleTag('${t.id}')" aria-pressed="${d.tagIds.includes(t.id)}">${escapeHtml(t.name)}</button>`).join('')}${state.tags.length?'':`<button type="button" class="ux-text-button" onclick="closeTaskEditor();uxNavigate('settings')">مدیریت تگ‌ها</button>`}</div></section>
      <section class="ux-field ux-editor-priority-field"><span>اولویت</span><div class="ux-priority-picker">${['high','medium','low'].map(p=>`<button type="button" class="priority-chip ${p} ${d.priority===p?'active':''}" onclick="editorSetPriority('${p}')" aria-pressed="${d.priority===p}">${PRIORITY_LABEL[p]}</button>`).join('')}</div></section></div>
      <div class="ux-editor-grid"><section class="ux-field ux-editor-date-field" ${ed.mode==='create'&&d.recurring.enabled?'hidden':''}><span>تاریخ انجام · شمسی</span><button type="button" class="date-picker-btn" onclick="toggleTaskCalendar()">${d.date?formatDateShort(d.date):'انتخاب تاریخ'} ${icon('calendar',15)}</button><div class="ux-quick-dates"><button type="button" class="${d.date===dateKey(new Date())?'active':''}" onclick="editorQuickDate('today')">امروز</button><button type="button" class="${d.date===dateKey(tomorrowDate())?'active':''}" onclick="editorQuickDate('tomorrow')">فردا</button><button type="button" class="${!d.date?'active':''}" onclick="editorClearDate()">بدون تاریخ</button></div></section>
      <label class="ux-field ux-editor-duration-field"><span>مدت زمان · دقیقه</span><input aria-label="مدت زمان به دقیقه" class="num-text ux-duration-input" type="text" inputmode="numeric" value="${d.durationMin||''}" placeholder="مثلاً ۳۰" oninput="normalizeNumericInput(this)" onchange="editorSetDurationCustom(this.value)"><span id="duration-suggestion-slot">${renderDurationSuggestionChip()}</span></label></div>
      ${ed.calendarOpen?renderTaskCalendar():''}
      ${ed.mode==='edit'&&ed.actualMinReadonly?`<p class="actual-time-row">${icon('clock',14)} زمان واقعی ثبت‌شده: ${formatDuration(ed.actualMinReadonly)}</p>`:''}
      <section class="ux-field"><span>ریزکارها</span><div class="ux-editor-subtasks">${d.subtasks.map((s,i)=>`<div class="modal-subtask-row" draggable="true" ondragstart="editorSubtaskDragStart(event,${i})" ondragover="editorSubtaskDragOver(event)" ondrop="editorSubtaskDrop(event,${i})" ondragend="editorSubtaskDragEnd(event)"><span class="drag-handle" aria-hidden="true">⋮⋮</span>${ed.mode==='edit'?`<input type="checkbox" aria-label="تکمیل ${escapeAttr(s.title)}" ${s.done?'checked':''} onchange="uxToggleDraftSubtask(${i})">`:''}<span class="ux-subtask-title ${s.done?'done-text':''}">${escapeHtml(s.title)}</span><span class="subtask-move-btns"><button type="button" class="subtask-move-btn" onclick="editorMoveSubtask(${i},-1)" ${i===0?'disabled':''} aria-label="انتقال ریزکار به بالا">▲</button><button type="button" class="subtask-move-btn" onclick="editorMoveSubtask(${i},1)" ${i===d.subtasks.length-1?'disabled':''} aria-label="انتقال ریزکار به پایین">▼</button></span><button type="button" class="subtask-del" onclick="editorDeleteSubtask('${s.id}')" aria-label="حذف ${escapeAttr(s.title)}">${icon('close',14)}</button></div>`).join('')}</div>
      <div class="modal-add-subtask"><input id="editor-subtask-input" placeholder="ریزکار جدید…" aria-label="عنوان ریزکار جدید" onkeydown="if(event.key==='Enter'){event.preventDefault();editorAddSubtask()}"><button type="button" onclick="editorAddSubtask()">${icon('plus',14)} افزودن</button></div></section>
      ${ed.mode==='create'?`<section class="ux-field ux-editor-divider"><label class="recurring-toggle"><input type="checkbox" ${d.recurring.enabled?'checked':''} onchange="editorToggleRecurring()">این کار تکرار هفتگی داشته باشد</label>${d.recurring.enabled?`<div class="ux-editor-weekdays">${WEEKDAY_DISPLAY_ORDER.map(n=>`<button type="button" class="quick-chip ${d.recurring.weekdays.includes(n)?'active':''}" onclick="editorToggleRecurringWeekday(${n})" aria-pressed="${d.recurring.weekdays.includes(n)}">${WEEKDAYS_FA[n]}</button>`).join('')}</div>`:''}</section>`:''}
      ${ed.isRecurringInstance?`<label class="apply-future-check ux-editor-divider"><input type="checkbox" ${ed.applyToFutureRecurring?'checked':''} onchange="editorToggleApplyToFuture()">این تغییرات برای تکرارهای بعدی هم اعمال شود</label>`:''}
      <section class="ux-editor-divider">${renderTaskReminderFields(ed)}</section>
    </div><div class="modal-actions"><button type="button" class="confirm" onclick="confirmTaskEditor()">${ed.mode==='create'?'افزودن تسک':'ذخیرهٔ تغییرات'}</button><button type="button" class="cancel" onclick="closeTaskEditor()">انصراف</button></div>
  </section></div>`;
}
function uxToggleDraftSubtask(i){
  const sub=state.taskEditor?.draft.subtasks[i];
  if(sub){sub.done=!sub.done;render();}
}
renderNav = uxRenderNav;
renderToday = uxToday;
renderTasksView = uxTasks;
renderCalendarPage = uxCalendar;
renderTaskEditorModal = uxTaskEditor;
renderTodayItem = function(task,today){
  let html=uxBase.renderTodayItem(task,today);
  const compact=renderTaskReminderBadge(task,true);
  if(compact)html=html.replace(compact,renderTaskReminderBadge(task,false));
  return html.replace(/(<button class="task-check[^\"]*" )/,`$1aria-label="${task.done?'لغو تکمیل':'انجام'} ${escapeAttr(task.title)}" `);
};
// The approved rail shows its useful contents initially. Existing saved fold
// choices still win, and toggling continues to use the original preference key.
todayFoldOpen = function(id,urgent){
  if(urgent)return !state.todayFoldShut[id];
  const prefs=todayFoldPrefs();
  return Object.hasOwn(prefs,id)?!!prefs[id]:true;
};
toggleTodayFold = function(id,urgent){
  if(urgent)state.todayFoldShut[id]=!state.todayFoldShut[id];
  else{const prefs=todayFoldPrefs();prefs[id]=!todayFoldOpen(id,false);try{localStorage.setItem(TODAY_FOLDS_KEY,JSON.stringify(prefs));}catch(_e){}}
  render();
};
renderIdeasPage = function(){
  const html=uxBase.renderIdeasPage(), pos=html.indexOf('<div class="idea-card">');
  if(pos<0)return html;
  const editor=state.ideaEditor?renderIdeaEditorModal():'';
  const content=editor?html.slice(0,html.lastIndexOf(editor)):html;
  return content.slice(0,pos)+`<div class="ux-card-grid ux-ideas-grid">`+content.slice(pos)+`</div>`+editor;
};
renderPromptsPage = function(){ return uxBase.renderPromptsPage().replace('id="prompt-list"','id="prompt-list" class="ux-card-grid"'); };

render = function(){
  const ev=window.event;
  if(preservedFieldFocused()&&!(ev&&USER_EVENT_TYPES.has(ev.type))){renderDeferred=true;return;}
  const previousMain=document.querySelector('#app > main');
  const mainScroll=previousMain?.scrollTop||0, previousView=previousMain?.dataset.view;
  const editorScroll=document.querySelector('.ux-editor-fields')?.scrollTop||0;
  const sameEditor=uxLastRenderedEditor===state.taskEditor;
  document.body.classList.add('ux-app');
  document.body.dataset.view=state.view;
  document.body.classList.toggle('ux-task-editing',!!state.taskEditor&&state.view==='tasks');
  uxBase.render();
  const app=document.getElementById('app');
  const header=app.querySelector(':scope > header');
  if(header)header.outerHTML=uxHeader();
  app.querySelector(':scope > .subnav')?.remove();
  const main=app.querySelector(':scope > main');
  if(main){main.classList.add('ux-content');main.dataset.view=state.view;if(previousView===state.view)main.scrollTop=mainScroll;}
  const editorFields=app.querySelector('.ux-editor-fields');
  if(editorFields&&sameEditor)editorFields.scrollTop=editorScroll;
  uxLastRenderedEditor=state.taskEditor;
  if(uxSectionsOpen){
    const dialog=document.getElementById('ux-sections');
    dialog?.focus({preventScroll:true});
    const focusable=dialog?.querySelectorAll('button');
    dialog?.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();uxToggleSections();return;}
      if(e.key!=='Tab'||!focusable?.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }
};
document.body.classList.add('ux-app');
if(appStarted)render();
