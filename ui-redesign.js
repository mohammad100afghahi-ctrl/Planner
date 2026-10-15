/* Medar: selected Living direction. Existing persistence and full editors remain authoritative. */
function installMedarPresentation(){
let designTaskView='today';
const designGroups=[['info','اطلاعات','chart'],['work','کارها','check'],['calendar','تقویم','calendar'],['english','انگلیسی','book'],['more','بیشتر','grid']];
const designMore=[['مرور',[['ai-reports','گزارش هوشمند','sparkle'],['wins','تونستم','trophy'],['archive','آرشیو','archive']]],['یادداشت‌ها',[['ideas','ایده‌ها','bulb'],['prompts','پرامپت‌ها','prompt']]],['زندگی روزمره',[['purchases','خریدها','cart'],['subscriptions','اشتراک‌ها','card'],['repairs','خانه','wrench'],['mother','مادر','heart']]],['مدیریت',[['settings','تنظیمات','settings']]]];
const designRouteNames={info:'اطلاعات',today:'امروز',tasks:'همهٔ کارها',calendar:'تقویم',english:'انگلیسی',more:'بیشتر',settings:'تنظیمات','ai-reports':'گزارش هوشمند',archive:'آرشیو',ideas:'ایده‌ها',prompts:'پرامپت‌ها',purchases:'خریدها',subscriptions:'اشتراک‌ها',repairs:'خانه',mother:'مادر',wins:'تونستم'};
const designBrand=()=>`<img src="icon-192.png" alt="" width="32" height="32"><strong>مدار</strong>`;
function renderDesignHeader(){
 const d=fmtHeaderDate(state.today);
 return `<a class="skip-link" href="#main-content" onclick="focusMedarContent(event)">رفتن به محتوای صفحه</a><header class="design-header"><button class="design-brand" onclick="navigateTo('info')" aria-label="مدار، اطلاعات">${designBrand()}</button><div class="design-location">${designRouteNames[state.view]||''}</div><div class="design-header-tools"><span>${d.jalali}</span><button class="design-icon" onclick="navigateTo('settings')" aria-label="تنظیمات">${icon('settings',19)}</button></div></header>`;
}
renderNav=function(){
 const group=['today','tasks'].includes(state.view)?'work':designGroups.some(g=>g[0]===state.view)?state.view:state.view==='mother'?'info':'more';
 return `<nav class="main-nav design-nav" aria-label="بخش‌های اصلی"><button class="design-brand" onclick="navigateTo('info')" aria-label="مدار، اطلاعات">${designBrand()}</button><div class="design-nav-items">${designGroups.map(([id,label,ic])=>`<button class="design-nav-item ${group===id?'active':''}" onclick="navigateTo('${id==='work'?designTaskView:id}')" ${group===id?'aria-current="page"':''}>${icon(ic,21)}<span>${label}</span>${id==='info'&&state.aiReports.some(r=>!r.seenAt||reviewPending(r).length)?'<i class="design-dot"></i>':''}</button>`).join('')}</div><div class="design-nav-foot"><button onclick="navigateTo('settings')">${icon('settings',18)} تنظیمات</button></div></nav>`;
};
renderViewContext=function(){
 if(['today','tasks'].includes(state.view))return `<div class="design-task-tabs" role="group" aria-label="صفحه‌های کارها"><button class="${state.view==='today'?'active':''}" onclick="navigateTo('today')">امروز</button><button class="${state.view==='tasks'?'active':''}" onclick="navigateTo('tasks')">همهٔ کارها</button></div>`;
 if(state.view==='mother')return `<button class="design-back" onclick="navigateTo('info')">${icon('arrowIn',15)} اطلاعات</button>`;
 if(!['info','calendar','english','more'].includes(state.view))return `<button class="design-back" onclick="navigateTo('more')">${icon('arrowIn',15)} بیشتر</button>`;
 return '';
};
navigateTo=function(view){
 if(view==='progress')view='info';
 if(view==='reminders')view='tasks';
 if(!designRouteNames[view])view='info';
 if(['today','tasks'].includes(view))designTaskView=view;
 lastViewInGroup[groupOfView(view).id]=view;
 state.pushMenuOpen=false;state.backupMenuOpen=false;
 setView(view);window.scrollTo(0,0);
 document.querySelector('main')?.setAttribute('tabindex','-1');
 document.querySelector('main')?.focus({preventScroll:true});
 if(location.hash!=='#'+view)history.pushState(null,'','#'+view);
};
const designSection=(title,body,cls='')=>`<section class="overview-panel ${cls}"><div class="overview-panel-head"><h2>${title}</h2></div>${body}</section>`;
function renderDesignInfo(){
 const day=dateKey(state.today),open=state.tasks.filter(t=>t.date===day&&!t.done),done=state.tasks.filter(t=>t.date===day&&t.done),overdue=state.tasks.filter(t=>t.date&&t.date<day&&!t.done);
 const streak=computeStreak();const unread=state.aiReports.filter(r=>!r.seenAt).length;const waiting=state.aiReports.reduce((n,r)=>n+reviewPending(r).length,0);
 const goals=state.tagGoals.filter(g=>g.weeklyMinutes>0&&state.tags.some(t=>t.id===g.tagId)).map(g=>{const tag=state.tags.find(t=>t.id===g.tagId);const actual=computeTagWeeklyMinutes(g.tagId);return `<div class="overview-goal"><div><strong>${escapeHtml(tag.name)}</strong><span>${formatDuration(actual)} از ${formatDuration(g.weeklyMinutes)}</span></div><progress value="${actual}" max="${g.weeklyMinutes}" aria-label="هدف ${escapeHtml(tag.name)}"></progress>${g.reason?`<small>${escapeHtml(g.reason)}</small>`:''}</div>`;}).join('');
 const notice=(label,detail,ic,route)=>`<button class="overview-notice" onclick="navigateTo('${route}')"><span class="notice-symbol">${icon(ic,20)}</span><span><strong>${label}</strong><small>${detail}</small></span>${icon('arrowLeft',16)}</button>`;
 const dueSubs=state.subscriptions.filter(s=>s.active&&s.nextRenewal&&daysUntil(s.nextRenewal)<=s.notifyDaysBefore);
 const dueHome=state.homeMaint.filter(m=>m.nextDue&&daysUntil(m.nextDue)<=7);
 const notifications=[
  (unread||waiting)?notice('مرور هفتگی',`${toFaDigits(unread)} گزارش دیده‌نشده${waiting?'، '+toFaDigits(waiting)+' پیشنهاد در انتظار':''}`,'sparkle','ai-reports'):'',
  overdue.length?notice('کارهای عقب‌افتاده',`${toFaDigits(overdue.length)} کار`,'clock','today'):'',
  dueSubs.length?notice('تمدید اشتراک',dueSubs.map(s=>escapeHtml(s.name)).join('، '),'card','subscriptions'):'',
  dueHome.length?notice('نگهداری خانه',`${toFaDigits(dueHome.length)} موعد نزدیک`,'wrench','repairs'):'',
  backupOverdue()?notice('پشتیبان اطلاعات','زمان تهیهٔ نسخهٔ تازه است','archive','settings'):''
 ].filter(Boolean).join('')||'<span class="summary-text">موردی نیاز به توجه ندارد.</span>';
 const days=Array.from({length:7},(_,i)=>{const d=new Date(state.today);d.setDate(d.getDate()-6+i);const k=dateKey(d),n=state.tasks.filter(t=>t.done&&t.completedAt&&dateKey(new Date(t.completedAt))===k).length;return {k,n,label:WEEKDAYS_FA[d.getDay()].slice(0,1)};});
 const activity=`<div class="overview-activity">${days.map(d=>`<div class="activity-day ${d.k===day?'current':''}"><strong>${toFaDigits(d.n)}</strong><span class="activity-track"><i style="height:${Math.min(100,d.n*28)}%"></i></span><small>${d.label}</small></div>`).join('')}</div><button class="overview-streak" onclick="openStreakPanel()">${icon('flame',18)}<strong>${toFaDigits(streak.streak)} روز پیاپی${streak.atRisk?' · در خطر':''}</strong><span>جزئیات ${icon('arrowLeft',14)}</span></button>`;
 const focus=renderWeeklyFocus();
 const daily=[renderMotherTodayCard(),renderEnglishTodayCard()].filter(Boolean);
 return `<div class="design-page-head"><div><span class="design-date">${fmtHeaderDate(state.today).wd}، ${fmtHeaderDate(state.today).jalali}</span><h1>اطلاعات</h1></div><span class="design-page-index">${icon('chart',25)}</span></div><div class="overview-today"><div><strong>برنامهٔ امروز</strong><p>${toFaDigits(open.length)} کار باقی مانده <span>/ ${toFaDigits(done.length)} انجام‌شده</span></p></div><button onclick="navigateTo('today')">رفتن به امروز ${icon('arrowLeft',18)}</button></div><div class="overview-grid">${designSection('هدف‌های این هفته',`<a class="overview-adjust" href="#" onclick="event.preventDefault();navigateTo('settings')">تنظیم هدف‌ها</a>${goals||'<div class="overview-goal">هدفی ثبت نشده.</div>'}`,'goals-panel')}${designSection('نیاز به توجه',notifications,'notices-panel')}${designSection('فعالیت هفت روز اخیر',activity,'activity-panel')}${designSection('اولویت‌های هفته',focus?focus.html:'<span class="summary-text">اولویتی انتخاب نشده.</span>','focus-panel')}</div><section class="info-daily" aria-label="مادر و انگلیسی">${daily.map(d=>d.html).join('')}</section>${state.encouragement?.text?`<div class="info-encouragement">${escapeHtml(state.encouragement.text)}</div>`:''}${renderAIHealthBanner()}`;
}
function renderDesignMore(){return `<div class="design-page-head"><h1>بیشتر</h1></div>${designMore.map(([label,items])=>`<section class="design-directory-group"><h2>${label}</h2><div class="design-directory">${items.map(([id,title,ic])=>`<button onclick="navigateTo('${id}')">${icon(ic,24)}<strong>${title}</strong></button>`).join('')}</div></section>`).join('')}`;}
const nativeTodayItem=renderTodayItem;
renderTodayItem=function(t,day){
 let html=nativeTodayItem(t,day).replace(/<span class="priority-dot [^"]*" title="[^"]*"><\/span>/,'');
 html=html.replace('<div class="ti-meta-row">',`<div class="ti-meta-row">${t.priority?`<span class="design-priority ${t.priority}">${PRIORITY_LABEL[t.priority]}</span>`:''}`);
 html=html.replace(/<div class="ti-row-actions">([\s\S]*?)<\/div>/,'$1').replace('class="ti-edit"','class="design-row-edit"');
 return html;
};
function designQuickCapture(date){
 return `<form class="design-quick-add" onsubmit="event.preventDefault();designCapture(this)"><input name="title" aria-label="عنوان کار جدید" placeholder="یک کار جدید…" required maxlength="300" autocomplete="off" data-preserve value="${escapeAttr(state.quickTaskTitle||'')}" oninput="state.quickTaskTitle=this.value"><input type="hidden" name="date" value="${date}"><button type="submit" aria-label="ثبت کار">${icon('plus',20)}</button></form>`;
}
async function designCapture(form){
 const title=form.elements.title.value.trim(),date=form.elements.date.value;if(!title)return;
 state.taskEditor={mode:'create',taskId:null,draft:{title,notes:'',tagIds:[],priority:null,date,durationMin:null,subtasks:[],...newTaskReminderDraft(),recurring:{enabled:false,weekdays:[]}},calendarOpen:false,isRecurringInstance:false,applyToFutureRecurring:false};
 state.quickTaskTitle='';
 await confirmTaskEditor(title);
}
const nativeTasks=renderTasksView;
renderTasksView=function(){return `<div class="design-page-head"><h1>همهٔ کارها</h1><button class="design-text-action" onclick="openTaskEditorNew()">فرم کامل ${icon('pencil',16)}</button></div>${designQuickCapture('')}${nativeTasks()}`;};
renderToday=function(){
 const day=dateKey(state.today),all=state.tasks.filter(t=>t.date===day||t.date&&t.date<day&&(!t.done||t.completedAt&&dateKey(new Date(t.completedAt))===day));
 const list=applyFiltersAndSort(all,'todayFilters',{dateFilter:false}),open=list.filter(t=>!t.done&&t.date===day),old=list.filter(t=>!t.done&&t.date<day),done=list.filter(t=>t.done);
 const daily=[renderTaskReminderAlert()].filter(Boolean);
 const total=all.reduce((n,t)=>n+(t.durationMin||0),0);
 return `<div class="design-page-head"><div><span class="design-date">${fmtHeaderDate(state.today).wd}، ${fmtHeaderDate(state.today).jalali}</span><h1>امروز</h1></div><div class="today-heading-tools"><span class="today-count"><strong>${toFaDigits(open.length)}</strong> باقی · ${toFaDigits(done.length)} انجام‌شده</span>${total?`<span class="today-plan-duration">${formatDuration(total)} برنامه</span>`:''}<div><button class="design-icon" onclick="toggleFilterPanel('todayFilters')" aria-label="فیلتر و مرتب‌سازی">${icon('filter',18)}</button><button class="design-icon" onclick="window.print()" aria-label="چاپ برنامهٔ امروز">${icon('printer',18)}</button></div></div></div>${renderFilterPanel('todayFilters',{dateFilter:false,ownToggle:true})}<div class="design-task-sheet">${open.length?open.map(t=>renderTodayItem(t,day)).join(''):'<div class="empty-state">کاری برای امروز باقی نمانده.</div>'}</div>${designQuickCapture(day)}<details class="design-fold" ${state.todayOverdueOpen?'open':''} ontoggle="state.todayOverdueOpen=this.open"><summary>از روزهای قبل <span>${toFaDigits(old.length)}</span>${icon('chevronDown',16)}</summary><div class="design-task-sheet">${old.map(t=>renderTodayItem(t,day)).join('')||'<div class="empty-state">کار عقب‌افتاده‌ای نداری.</div>'}</div></details><details class="design-fold" ${state.todayDoneOpen?'open':''} ontoggle="state.todayDoneOpen=this.open"><summary>انجام‌شده‌ها <span>${toFaDigits(done.length)}</span>${icon('chevronDown',16)}</summary><div class="design-task-sheet">${done.map(t=>renderTodayItem(t,day)).join('')}</div></details><div class="design-daily-links">${daily.map(d=>d.html).join('')}</div>${renderPrintSheet(all,fmtHeaderDate(state.today).wd)}`;
};
const nativeEditor=renderTaskEditorModal;
renderTaskEditorModal=function(){return nativeEditor().replace('modal-box task-editor-box','modal-box task-editor-box full-task-editor');};
renderAccountSettings=function(){return `<section class="design-account"><h3>حساب و دستگاه</h3><button onclick="openAccountPanel('push')">${icon('bell',18)} اعلان‌ها</button><button onclick="openAccountPanel('backup')">${icon('archive',18)} پشتیبان</button><button onclick="signOut()">${icon('close',18)} خروج از حساب</button></section>`;};
openAccountPanel=function(panel){if(panel==='backup')toggleBackupMenu();else togglePushMenu();window.scrollTo({top:0,behavior:'instant'});};

window.renderDesignHeader=renderDesignHeader;
window.renderDesignInfo=renderDesignInfo;
window.renderDesignMore=renderDesignMore;
window.designCapture=designCapture;
window.focusMedarContent=function(event){event.preventDefault();document.getElementById('main-content')?.focus();};
let dialogWasOpen=false,dialogTrigger=null;
window.captureMedarFocus=function(){
 const el=document.activeElement;if(!el||el===document.body)return null;
 return {id:el.id,tag:el.tagName,action:el.getAttribute('onclick'),label:el.getAttribute('aria-label'),selection:typeof el.selectionStart==='number'?[el.selectionStart,el.selectionEnd]:null};
};
function restoreMedarFocus(saved,scope=document){
 if(!saved)return false;
 const el=saved.id?scope.querySelector('#'+CSS.escape(saved.id)):[...scope.querySelectorAll(saved.tag)].find(el=>saved.action?el.getAttribute('onclick')===saved.action:saved.label&&el.getAttribute('aria-label')===saved.label);
 if(!el)return false;el.focus({preventScroll:true});
 if(saved.selection&&el.setSelectionRange)el.setSelectionRange(...saved.selection);
 return document.activeElement===el;
}
window.syncMedarDialog=function(saved){
 const dialog=document.querySelector('.full-task-editor');
 for(const child of document.getElementById('app').children)child.inert=!!dialog&&!child.contains(dialog);
 if(dialog){
  // Preserve each existing action while giving its chip native keyboard behavior.
  for(const chip of dialog.querySelectorAll('span[onclick]')){
   const button=document.createElement('button');for(const attr of chip.attributes)button.setAttribute(attr.name,attr.value);
   button.type='button';button.innerHTML=chip.innerHTML;
   if(button.matches('.pick-chip,.priority-chip,.quick-chip:not(.suggestion-chip)'))button.setAttribute('aria-pressed',String(button.classList.contains('active')||button.classList.contains('on')));
   chip.replaceWith(button);
  }
  const labels={'editor-title':'عنوان کار','editor-notes':'توضیحات کار','editor-subtask-input':'عنوان ریزکار جدید'};
  for(const [id,label] of Object.entries(labels))dialog.querySelector('#'+id)?.setAttribute('aria-label',label);
  dialog.querySelector('.num-text')?.setAttribute('aria-label','مدت سفارشی به دقیقه');
  for(const row of dialog.querySelectorAll('.modal-subtask-row'))row.querySelector('.subtask-del')?.setAttribute('aria-label','حذف ریزکار '+(row.querySelector('span:not([class])')?.textContent.trim()||''));
  if(!dialogWasOpen){dialogTrigger=saved;const heading=dialog.querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});}
  else restoreMedarFocus(saved,dialog);
 }else if(dialogWasOpen){if(!restoreMedarFocus(dialogTrigger))document.getElementById('main-content')?.focus({preventScroll:true});dialogTrigger=null;}
 dialogWasOpen=!!dialog;
};
document.addEventListener('keydown',event=>{
 const dialog=document.querySelector('.full-task-editor');if(!dialog)return;
 if(event.key==='Escape'){event.preventDefault();closeTaskEditor();return;}
 if(event.key!=='Tab')return;
 const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el=>el.getClientRects().length);
 const first=controls[0],last=controls.at(-1),active=document.activeElement;
 if(!dialog.contains(active)||event.shiftKey&&(active===first||active===dialog.querySelector('h3'))){event.preventDefault();(event.shiftKey?last:first)?.focus();}
 else if(!event.shiftKey&&active===last){event.preventDefault();first?.focus();}
});
function hashRoute(){const route=location.hash.slice(1);return route==='reminders'?'tasks':designRouteNames[route]?route:'info';}
window.addEventListener('popstate',()=>{const route=hashRoute();if(['today','tasks'].includes(route))designTaskView=route;setView(route);});
state.view=hashRoute();if(['today','tasks'].includes(state.view))designTaskView=state.view;

}
