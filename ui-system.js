/* ---------- مدار UI: تنظیمات، آرشیو، مرور هفته ----------
   Settings qQaJvC8qAHaJaUT1wDhi / tAb0AcSzpRoSgSmpXE2t · Archive 4oNCwQG3fB2JffmSVxKJ / LlieWErsa2N3Y2Paci3M
   Reports JpgtE3aP90xJm2VQf5sv / v5rdZPNIGB44EChbuFsS.
   The old header menus (اعلان‌ها، پشتیبان، خروج) live on the settings page, where the reference puts them. */

/* ================= تنظیمات ================= */
function toggleTagEdit(id){ state.tagEditOpen = state.tagEditOpen === id ? null : id; render(); }
function tagGoalLine(tag){
  const g = state.tagGoals.find(x => x.tagId === tag.id);
  if(!g) return 'بدون هدف هفتگی';
  return `هدف: ${fd(g.weeklyMinutes)} دقیقه${g.reason ? ` (${esc(g.reason)})` : ''}`;
}
function tagEditBox(tag){
  const g = state.tagGoals.find(x => x.tagId === tag.id);
  const hours = g ? Math.round(g.weeklyMinutes / 60) : '';
  return `
    <div class="mt-4 pt-4 border-t border-slate-800/50 grid grid-cols-12 gap-3 items-end">
      <div class="col-span-2 space-y-2">${fieldLabel('رنگ')}<input type="color" value="${ea(tag.color)}" onchange="updateTagColor('${tag.id}', this.value)" class="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl p-1 cursor-pointer"></div>
      <div class="col-span-3 space-y-2">${fieldLabel('هدف هفتگی (ساعت)')}<input type="text" inputmode="numeric" placeholder="بدون هدف" value="${hours}" oninput="normalizeNumericInput(this)" onchange="setTagGoal('${tag.id}', (parseInt(toEnDigits(this.value))||0)*60)" class="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm font-black text-white focus:outline-none focus:border-indigo-500/50"></div>
      <div class="col-span-5 space-y-2">${fieldLabel('چرا این هدف مهمه؟')}<input type="text" ${g ? '' : 'disabled'} placeholder="${g ? 'مثلاً: برای GED' : 'اول هدف رو بنویس'}" value="${ea(g ? g.reason : '')}" onchange="setTagGoalReason('${tag.id}', this.value)" class="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 disabled:opacity-40"></div>
      <div class="col-span-2"><button type="button" onclick="state.tagEditOpen=null; deleteTag('${tag.id}')" class="w-full h-11 rounded-xl border border-slate-800 text-[10px] font-black text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all">${fa('trash-can', 'ml-1')}حذف</button></div>
    </div>`;
}
function newTagRow(){
  return `
    <div class="mt-6 grid grid-cols-12 gap-3">
      <input type="text" id="new-tag-name" placeholder="نام تگ جدید…" onkeydown="if(event.key==='Enter'){event.preventDefault(); addTag();}" class="col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600">
      <input type="color" id="new-tag-color" value="#6366f1" aria-label="رنگ تگ" class="col-span-2 h-full min-h-[46px] bg-slate-900 border border-slate-800 rounded-2xl p-1 cursor-pointer">
      <button type="button" onclick="addTag()" class="col-span-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black transition-all">افزودن تگ</button>
    </div>`;
}
function pushInfo(){
  const s = state.pushStatus;
  if(s === 'ios-install') return { canToggle:false, text:'روی آیفون، اعلان فقط برای نسخهٔ نصب‌شده کار می‌کنه: توی Safari دکمهٔ اشتراک‌گذاری ← «Add to Home Screen» رو بزن، مدار رو از صفحهٔ اصلی باز کن و دوباره همین‌جا بیا.', status:'نیاز به نصب', tone:'text-amber-400' };
  if(s === 'unsupported') return { canToggle:false, text:'این مرورگر از اعلان پشتیبانی نمی‌کنه.', status:'پشتیبانی نمی‌شود', tone:'text-slate-500' };
  if(s === 'denied') return { canToggle:false, text:'اجازهٔ اعلان برای این سایت بسته شده. از تنظیمات مرورگر (یا تنظیمات گوشی ← مدار ← Notifications) اجازه بده و صفحه رو دوباره باز کن.', status:'مسدود', tone:'text-rose-400' };
  if(s === 'checking') return { canToggle:false, text:'در حال بررسی…', status:'در حال بررسی', tone:'text-slate-500' };
  const on = s === 'on' || (s === 'busy' && Notification.permission === 'granted');
  return { canToggle:s !== 'busy', on, status: on ? 'مجاز' : 'خاموش', tone: on ? 'text-emerald-400' : 'text-slate-500',
    text: on ? 'هر روز ساعت ۸ صبح یادآوری‌های سررسیده، تمدید اشتراک‌ها و تعداد کارهای امروز برات فرستاده می‌شه؛ هشدار تسک‌ها هم سر وقتشون.'
             : 'با روشن کردن اعلان، هر روز ساعت ۸ صبح بدون باز کردن اپ خبردار می‌شی: یادآوری‌هایی که وقتشون رسیده، اشتراک‌هایی که تمدید می‌شن و کارهای امروز.' };
}
function restorePanel(){
  const rp = state.restorePreview;
  if(!rp) return '';
  const cur = currentBackupCounts();
  const sum = o => Object.keys(BACKUP_TABLE_LABELS).reduce((n, t) => n + (o[t] || 0), 0);
  const busy = state.backupBusy ? 'disabled' : '';
  const rows = Object.keys(BACKUP_TABLE_LABELS).filter(t => (rp.counts[t] || 0) || (cur[t] || 0))
    .map(t => `<span class="text-slate-400">${BACKUP_TABLE_LABELS[t]}</span><span class="text-left text-slate-500">${fd(cur[t] || 0)}</span><span class="text-left text-indigo-400">${fd(rp.counts[t] || 0)}</span>`).join('');
  const mode = (m, title, sub, danger) => `<button type="button" onclick="setRestoreMode('${m}')" class="p-3 rounded-xl border flex flex-col items-center gap-1 ${rp.mode === m ? (danger ? 'bg-rose-600 border-rose-500' : 'bg-indigo-600 border-indigo-500') : 'bg-slate-900 border-slate-800 opacity-60'}"><span class="text-[10px] font-black ${rp.mode === m ? 'text-white' : danger ? 'text-rose-400' : 'text-slate-400'}">${title}</span><span class="text-[8px] ${rp.mode === m ? 'text-indigo-100' : 'text-slate-600'} leading-relaxed">${sub}</span></button>`;
  return `
    <div class="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative overflow-hidden">
      <div class="relative z-10">
        <h4 class="text-xs font-black text-indigo-400 mb-4 uppercase flex items-center gap-2">${fa('file-import')} بازگردانی نسخه پشتیبان</h4>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
          <div class="flex items-center justify-between mb-3"><span class="text-[10px] text-slate-500">${rp.backupId ? 'نسخهٔ انتخاب شده:' : 'فایل انتخاب شده:'}</span><span class="text-[10px] font-black text-white italic" dir="auto">${esc(rp.label)}${rp.createdAt ? ` — ${backupWhen(rp.createdAt)}` : ''}</span></div>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-2 bg-slate-950 rounded-lg"><p class="text-[8px] text-slate-600 uppercase">موجود</p><p class="text-xs font-black text-slate-400">${fd(sum(cur))} مورد</p></div>
            <div class="text-center p-2 bg-indigo-500/10 rounded-lg"><p class="text-[8px] text-indigo-500 uppercase">نسخه پشتیبان</p><p class="text-xs font-black text-indigo-400">${fd(sum(rp.counts))} مورد</p></div>
          </div>
          <details class="mt-3"><summary class="text-[10px] font-black text-slate-500 cursor-pointer">جزئیات هر بخش</summary><div class="grid grid-cols-3 gap-x-4 gap-y-1 mt-3 text-[10px]"><span></span><span class="text-left text-slate-600">الان</span><span class="text-left text-slate-600">پشتیبان</span>${rows}</div></details>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-6">
          ${mode('merge', 'ادغام (Merge)', 'موارد حذف‌شده برمی‌گردند و موارد تغییرکرده به نسخهٔ پشتیبان برمی‌گردند؛ موارد جدید حفظ می‌شوند.')}
          ${mode('replace', 'جایگزینی کامل', 'همهٔ اطلاعات فعلی پاک و دقیقاً مثل پشتیبان می‌شه؛ هر چیزی که بعدش اضافه کردی از بین می‌ره.', true)}
        </div>
        <p class="text-[9px] text-slate-500 leading-relaxed mb-6">قبل از بازگردانی، یک <b>نسخه پشتیبان خودکار</b> از وضعیت فعلی ساخته می‌شه و می‌تونی واگردش کنی.</p>
        <div class="flex items-center gap-3">
          <button type="button" ${busy} onclick="confirmRestore()" class="flex-1 ${rp.mode === 'replace' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white py-2.5 rounded-xl text-[10px] font-black transition-all disabled:opacity-50">${state.backupBusy ? 'در حال بازیابی…' : 'تایید و بازگردانی'}</button>
          <button type="button" ${busy} onclick="cancelRestore()" class="px-6 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black">انصراف</button>
        </div>
      </div>
    </div>`;
}
function renderRestoreModal(){
  return renderDialog({ title:'بازیابی پشتیبان', onClose: state.backupBusy ? '' : 'cancelRestore()', wide:true, body: restorePanel() });
}
function backupList(){
  const busy = state.backupBusy ? 'disabled' : '';
  if(!state.backups) return `<p class="text-[10px] text-slate-500">در حال بررسی نسخه‌های روی سرور…</p>`;
  if(!state.backups.length) return '';
  return `
    <div class="space-y-2">
      ${fieldLabel('نسخه‌های روی سرور (هر جمعه خودکار)')}
      ${state.backups.map(b => `
        <div class="flex items-center justify-between gap-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
          <div class="min-w-0"><p class="text-[11px] font-bold text-slate-300">${backupWhen(b.createdAt)}</p><p class="text-[9px] text-slate-500">${BACKUP_KIND_LABELS[b.kind] || esc(b.kind)} · ${fd(b.counts.tasks || 0)} کار</p></div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" ${busy} onclick="downloadStoredBackup('${b.id}')" class="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-[9px] font-black disabled:opacity-50">دانلود</button>
            <button type="button" ${busy} onclick="openStoredRestore('${b.id}')" class="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg text-[9px] font-black border border-indigo-500/10 disabled:opacity-50">برگرداندن</button>
          </div>
        </div>`).join('')}
    </div>`;
}
function backupStatusText(){
  const last = lastBackupDownload();
  return !state.backups ? 'در حال بررسی…' : last ? `آخرین دانلود: ${backupWhen(last.createdAt)}` : 'هنوز هیچ فایل پشتیبانی دانلود نکردی';
}
function renderSettingsDesktop(){
  const p = pushInfo();
  const busy = state.backupBusy ? 'disabled' : '';
  const header = deskHeader({ icon:'gear', iconBox:'bg-slate-900 text-slate-400', title:'تنظیمات سیستم', sub:'شخصی‌سازی، مدیریت تگ‌ها و پشتیبان‌گیری', profile:'حساب کاربری فعال' });
  const body = `
    <div class="max-w-4xl mx-auto space-y-10">
      <section id="tags-goals" class="space-y-6">
        <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('tags', 'text-indigo-500')} تگ‌ها و اهداف هفتگی</h3>
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
          <div class="space-y-4">
            ${state.tags.map(tag => `
              <div class="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 group">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-6 h-6 rounded-lg" style="background-color:${ea(tag.color)};box-shadow:0 0 10px ${ea(tag.color)}4d"></div>
                    <div><p class="text-sm font-bold text-slate-200">${esc(tag.name)}</p><p class="text-[10px] text-slate-600">${tagGoalLine(tag)}</p></div>
                  </div>
                  <button type="button" onclick="toggleTagEdit('${tag.id}')" class="text-[10px] font-black ${state.tagEditOpen === tag.id ? 'text-indigo-400' : 'text-slate-500'} hover:text-white transition-colors">${state.tagEditOpen === tag.id ? 'بستن' : 'ویرایش'}</button>
                </div>
                ${state.tagEditOpen === tag.id ? tagEditBox(tag) : ''}
              </div>`).join('') || `<p class="text-[11px] text-slate-500 text-center py-4">هنوز تگی نساختی</p>`}
          </div>
          ${state.newTagOpen ? newTagRow() : `<button type="button" onclick="state.newTagOpen=true; render(); focusEl('new-tag-name')" class="w-full mt-6 py-3 border-2 border-dashed border-slate-800 rounded-2xl text-[11px] font-black text-slate-600 hover:border-indigo-500/50 hover:text-indigo-400 transition-all">${fa('plus', 'mr-1')} افزودن تگ جدید</button>`}
        </div>
      </section>
      <section id="notifications" class="space-y-6">
        <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('bell', 'text-rose-500')} تنظیمات اعلان‌ها</h3>
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div class="flex items-center justify-between gap-6">
            <div><p class="text-sm font-black text-slate-200">اعلان‌های مرورگر</p><p class="text-[10px] text-slate-600 leading-relaxed">${p.text}</p></div>
            ${p.canToggle ? switchBtn(p.on, p.on ? 'disablePush()' : 'enablePush()', 'اعلان‌های مرورگر') : `<span class="w-10 h-5 switch-off rounded-full relative opacity-40 shrink-0"><span class="absolute right-1 top-1 w-3 h-3 bg-slate-400 rounded-full"></span></span>`}
          </div>
          <div class="flex items-center justify-between border-t border-slate-800/50 pt-6 gap-6">
            <div><p class="text-sm font-black text-slate-200">وضعیت اعلان‌های گوشی</p><p class="text-[10px] text-slate-600">برای دریافت هشدار تسک‌ها، دسترسی اعلان مرورگر لازم است. وضعیت روی این دستگاه: <b class="${p.tone}">${p.status}</b></p></div>
            ${p.on ? `<button type="button" ${state.pushStatus === 'busy' ? 'disabled' : ''} onclick="sendTestPush()" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black shrink-0 disabled:opacity-50">ارسال اعلان آزمایشی</button>` : ''}
          </div>
        </div>
      </section>
      <section id="backup" class="space-y-6">
        <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">${fa('shield-halved', 'text-emerald-500')} پشتیبان‌گیری و حساب کاربری</h3>
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-8">
          <div class="grid grid-cols-2 gap-4">
            <button type="button" ${busy} onclick="downloadBackup()" class="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500/50 transition-all flex flex-col items-center gap-2 group disabled:opacity-50">
              ${fa('download', 'text-indigo-400 text-lg group-hover:scale-110 transition-transform')}<span class="text-[11px] font-black text-white uppercase">${state.backupBusy ? 'صبر کن…' : 'خروجی کامل داده‌ها'}</span>
            </button>
            <button type="button" ${busy} onclick="pickRestoreFile()" class="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-emerald-500/50 transition-all flex flex-col items-center gap-2 group disabled:opacity-50">
              ${fa('upload', 'text-emerald-400 text-lg group-hover:scale-110 transition-transform')}<span class="text-[11px] font-black text-white uppercase">وارد کردن نسخه پشتیبان</span>
            </button>
          </div>
          <p class="text-[10px] text-slate-500 leading-relaxed">فایل پشتیبان همهٔ کارها، ایده‌ها (با عکس)، دستاوردها، پرامپت‌ها، اشتراک‌ها، خریدها و گزارش‌هاست. نسخهٔ دانلودشده رو جایی غیر از همین دستگاه نگه دار — اگه خود سرور از دست بره، فقط همین فایل می‌مونه.</p>
          ${restorePanel()}
          ${backupList()}
          <div class="pt-8 border-t border-slate-800/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 ${backupOverdue() ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full animate-pulse"></div>
              <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">وضعیت: ${backupStatusText()}${backupOverdue() ? ' — <span class="text-rose-400">وقتشه یه نسخهٔ تازه دانلود کنی</span>' : ''}</p>
            </div>
            <button type="button" onclick="signOut()" class="text-[10px] font-black text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-widest">خروج از حساب کاربری</button>
          </div>
        </div>
      </section>
    </div>`;
  return deskMain({ header, body });
}
/* phone: the tag list is long, so it folds into one card — the tags' colours,
   how many there are and how many carry a weekly goal — and opens on tap */
function tagManagerSummary(){
  const open = state.tagManagerOpen;
  const goals = state.tags.filter(t => state.tagGoals.some(g => g.tagId === t.id)).length;
  const dots = state.tags.slice(0, 6).map(t => `<span class="w-3 h-3 rounded-full ring-2 ring-slate-900 -ml-1" style="background-color:${ea(t.color)}"></span>`).join('');
  return `
    <button type="button" onclick="toggleTagManager()" aria-expanded="${open}" class="w-full bg-slate-900 border ${open ? 'border-indigo-500/20' : 'border-slate-800'} rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 shrink-0 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center justify-center">${fa('tags', 'text-sm')}</div>
        <div class="text-right min-w-0">
          <p class="text-xs font-black text-slate-200">${fd(state.tags.length)} تگ</p>
          <p class="text-[10px] text-slate-500 mt-0.5">${goals ? `${fd(goals)} تگ با هدف هفتگی` : 'هنوز هدف هفتگی نذاشتی'}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        ${open ? '' : `<div class="flex items-center pl-1" aria-hidden="true">${dots}</div>`}
        ${fa(open ? 'chevron-up' : 'chevron-down', 'text-[10px] text-slate-500')}
      </div>
    </button>`;
}
function renderSettingsMobile(){
  const p = pushInfo();
  const busy = state.backupBusy ? 'disabled' : '';
  return `
    ${mobHeader(mobTitle('تنظیمات'), `<div class="w-9 h-9 rounded-xl ring-2 ring-slate-800 bg-indigo-600/20 text-indigo-300 flex items-center justify-center text-sm font-black" aria-hidden="true">${initialOf(state.userEmail)}</div>`)}
    <main class="safe-area-bottom p-4">
      <div class="space-y-6">
        ${renderStatusBars()}
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
          <div class="min-w-0"><h3 class="text-sm font-black text-white mb-1 truncate" dir="ltr">${esc(state.userEmail || 'حساب شما')}</h3><p class="text-[10px] text-slate-500">حساب شخصی</p></div>
        </div>
        <section id="tags-settings">
          <h3 class="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-1">مدیریت تگ‌ها و اهداف</h3>
          ${tagManagerSummary()}
          ${state.tagManagerOpen ? `<div class="space-y-3 mt-3">
            ${state.tags.map(tag => { const g = state.tagGoals.find(x => x.tagId === tag.id); return `
              <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div class="flex items-center justify-between ${g || state.tagEditOpen === tag.id ? 'mb-4' : ''}">
                  <div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full" style="background-color:${ea(tag.color)}"></div><h4 class="text-xs font-bold text-slate-200">${esc(tag.name)}</h4></div>
                  <button type="button" onclick="toggleTagEdit('${tag.id}')" aria-label="ویرایش" class="${state.tagEditOpen === tag.id ? 'text-indigo-400' : 'text-slate-600'}">${fa(state.tagEditOpen === tag.id ? 'xmark' : 'pen', 'text-[10px]')}</button>
                </div>
                ${g && state.tagEditOpen !== tag.id ? `<div class="space-y-3"><div class="flex items-center justify-between"><span class="text-[10px] text-slate-500">هدف هفتگی:</span><span class="text-[10px] font-black text-indigo-400">${fd(g.weeklyMinutes)} دقیقه (${formatDuration(g.weeklyMinutes)})</span></div>${g.reason ? `<p class="text-[9px] text-slate-600 italic">"دلیل: ${esc(g.reason)}"</p>` : ''}</div>` : ''}
                ${state.tagEditOpen === tag.id ? `
                  <div class="space-y-3">
                    <div class="grid grid-cols-3 gap-3">
                      <div class="space-y-1.5">${fieldLabel('رنگ')}<input type="color" value="${ea(tag.color)}" onchange="updateTagColor('${tag.id}', this.value)" class="w-full h-11 bg-slate-950 border border-slate-800 rounded-xl p-1"></div>
                      <div class="col-span-2 space-y-1.5">${fieldLabel('هدف هفتگی (ساعت)')}<input type="text" inputmode="numeric" placeholder="بدون هدف" value="${g ? Math.round(g.weeklyMinutes / 60) : ''}" oninput="normalizeNumericInput(this)" onchange="setTagGoal('${tag.id}', (parseInt(toEnDigits(this.value))||0)*60)" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-black text-white focus:outline-none"></div>
                    </div>
                    ${g ? `<div class="space-y-1.5">${fieldLabel('چرا این هدف مهمه؟')}<input type="text" value="${ea(g.reason)}" onchange="setTagGoalReason('${tag.id}', this.value)" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none"></div>` : ''}
                    <button type="button" onclick="state.tagEditOpen=null; deleteTag('${tag.id}')" class="w-full py-2.5 rounded-xl border border-slate-800 text-[10px] font-black text-rose-400">${fa('trash-can', 'ml-1')}حذف تگ</button>
                  </div>` : ''}
              </div>`; }).join('')}
            ${state.newTagOpen ? `<div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">${newTagRow().replace('mt-6 ', '')}</div>` : `<button type="button" onclick="state.newTagOpen=true; render(); focusEl('new-tag-name')" class="w-full py-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-slate-500 border-dashed">+ افزودن تگ جدید</button>`}
          </div>` : ''}
        </section>
        <section id="notifications-settings">
          <h3 class="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-1">اطلاع‌رسانی</h3>
          <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div class="p-4 flex items-center justify-between gap-4 border-b border-slate-800/50">
              <div><p class="text-xs font-bold text-slate-200">اعلان‌های سیستم</p><p class="text-[9px] text-slate-500 leading-relaxed">${p.text}</p></div>
              ${p.canToggle ? switchBtn(p.on, p.on ? 'disablePush()' : 'enablePush()', 'اعلان‌های سیستم') : ''}
            </div>
            <div class="p-4 flex items-center justify-between">
              <p class="text-xs font-bold text-slate-200">وضعیت دسترسی</p>
              <div class="flex items-center gap-3">${p.on ? `<button type="button" onclick="sendTestPush()" class="text-[9px] font-black text-indigo-400">اعلان آزمایشی</button>` : ''}<span class="text-[9px] font-black ${p.tone}">${p.status}</span></div>
            </div>
          </div>
        </section>
        <section id="backup-settings">
          <h3 class="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-1">پشتیبان‌گیری و بازیابی</h3>
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
            <div class="flex items-center justify-between gap-3">
              <div><p class="text-xs font-bold text-slate-200">آخرین نسخه پشتیبان</p><p class="text-[9px] ${backupOverdue() ? 'text-rose-400' : 'text-slate-500'}">${backupStatusText()}</p></div>
              <button type="button" ${busy} onclick="downloadBackup()" class="bg-indigo-600/10 text-indigo-400 px-4 py-2 rounded-xl text-[9px] font-black border border-indigo-500/20 shrink-0 disabled:opacity-50">${state.backupBusy ? 'صبر کن…' : 'تهیهٔ پشتیبان'}</button>
            </div>
            <div class="pt-5 border-t border-slate-800/50 space-y-3">
              <p class="text-[10px] font-black text-slate-600 uppercase tracking-widest">بازیابی داده‌ها</p>
              ${state.restorePreview ? restorePanel() : `<button type="button" ${busy} onclick="pickRestoreFile()" class="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-center"><p class="text-[10px] font-black text-white mb-1">${fa('upload', 'ml-1 text-emerald-400')}انتخاب فایل پشتیبان</p><p class="text-[8px] text-slate-600 leading-tight">بعد از انتخاب، بین ادغام و جایگزینی کامل انتخاب می‌کنی</p></button>`}
              <p class="text-[8px] text-slate-500 italic px-1">نکته: قبل از بازیابی، یک نسخه پشتیبان خودکار برای بازگشت (واگرد) ایجاد می‌شود.</p>
              ${backupList()}
            </div>
          </div>
        </section>
        <div class="pt-4 pb-10 space-y-3">
          <button type="button" onclick="signOut()" class="w-full py-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-black text-slate-400">خروج از حساب کاربری</button>
        </div>
      </div>
    </main>`;
}

/* ================= آرشیو ================= */
function archiveTasksList(){
  const f = state.archiveFilters;
  const search = f.search.trim();
  let list = state.tasks.filter(isArchived);
  if(search) list = list.filter(t => t.title.includes(search));
  if(f.tagIds.length) list = list.filter(t => t.tagIds.some(id => f.tagIds.includes(id)));
  if(f.dateFrom) list = list.filter(t => t.completedAt && t.completedAt.slice(0, 10) >= f.dateFrom);
  if(f.dateTo) list = list.filter(t => t.completedAt && t.completedAt.slice(0, 10) <= f.dateTo);
  return [...list].sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
}
// one heading per Jalali month, newest first
function byJalaliMonth(list, dateOf){
  const groups = [];
  list.forEach(x => {
    const d = dateOf(x);
    const j = d ? window.jalaali.toJalaali(new Date(d)) : null;
    const label = j ? `${MONTHS_JALALI[j.jm - 1]} ${fd(j.jy)}` : 'بدون تاریخ';
    const g = groups[groups.length - 1];
    if(g && g.label === label) g.items.push(x); else groups.push({ label, items:[x] });
  });
  return groups;
}
function archiveFilterPanel(){
  if(!state.archiveFilterOpen) return '';
  const f = state.archiveFilters;
  const active = !!(f.tagIds.length || f.dateFrom || f.dateTo);
  return `
    <div class="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
      ${state.tags.length ? `<div class="flex items-center gap-2 flex-wrap"><span class="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">تگ</span>${state.tags.map(t => choiceChip(esc(t.name), f.tagIds.includes(t.id), `toggleArchiveTag('${t.id}')`)).join('')}</div>` : ''}
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">بازه‌ی تکمیل</span>
        <input type="date" value="${f.dateFrom || ''}" onchange="setArchiveDateFrom(this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300">
        <span class="text-[10px] text-slate-500">تا</span>
        <input type="date" value="${f.dateTo || ''}" onchange="setArchiveDateTo(this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300">
      </div>
      ${active ? `<button type="button" onclick="resetArchiveFilters()" class="text-[10px] font-black text-rose-400">پاک‌کردن فیلترها</button>` : ''}
    </div>`;
}
function archiveTaskItem(t){
  return `
    <div class="archive-item bg-slate-900/40 border border-slate-800 rounded-3xl p-5 hover:border-indigo-500/30 transition-all group flex items-center justify-between">
      <div class="flex items-center gap-4 min-w-0">
        <div class="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">${fa('check', 'text-xs')}</div>
        <div class="min-w-0">
          <h4 class="text-sm font-bold text-slate-400" dir="auto">${esc(t.title)}</h4>
          <div class="flex items-center gap-3 mt-1 flex-wrap">
            ${t.tagIds.map(tagById).filter(Boolean).map(g => `<span class="text-[10px] font-bold px-2 py-0.5 rounded-lg border" style="${tagTint(g.color, '0d', '1a')}">${esc(g.name)}</span>`).join('')}
            <span class="text-[10px] text-slate-600">تکمیل: ${t.completedAt ? jDate(dateKey(new Date(t.completedAt))) : '—'}</span>
            ${t.actualMin ? `<span class="text-[10px] text-slate-600">${formatDuration(t.actualMin)}${t.difficulty ? ` · ${DIFFICULTY_LABEL[t.difficulty]}` : ''}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="archive-actions opacity-0 transition-opacity flex items-center gap-2">
        <button type="button" onclick="toggleTaskDone('${t.id}', event)" class="p-2 text-slate-600 hover:text-indigo-400 transition-colors" title="بازگرداندن" aria-label="بازگرداندن">${fa('rotate-left', 'text-[11px]')}</button>
        <button type="button" onclick="openTaskEditorEdit('${t.id}')" class="p-2 text-slate-600 hover:text-white transition-colors" title="ویرایش" aria-label="ویرایش">${fa('pen', 'text-[11px]')}</button>
        <button type="button" onclick="deleteTask('${t.id}', event)" class="p-2 text-slate-600 hover:text-rose-500 transition-colors" title="حذف" aria-label="حذف">${fa('trash', 'text-[11px]')}</button>
      </div>
    </div>`;
}
/* «کنار گذاشته‌ها»: tasks shelved from مرور هفته, back to the lists with one tap */
function shelvedItem(t, mob){
  return `
    <div class="${mob ? 'bg-slate-900 rounded-2xl p-4' : 'bg-slate-950 rounded-2xl p-5'} border border-slate-800 flex items-center justify-between gap-4">
      <div class="min-w-0">
        <h4 class="text-xs font-bold text-slate-300 mb-1" dir="auto">${esc(t.title)}</h4>
        <span class="text-[9px] font-bold text-slate-600">کنار گذاشته: ${jDate(dateKey(new Date(t.shelvedAt)))}</span>
      </div>
      <button type="button" onclick="unshelveTask('${t.id}')" class="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black text-indigo-400 bg-indigo-500/5 rounded-lg border border-indigo-500/10 shrink-0">${fa('rotate-left', 'text-[10px]')}بازگشت</button>
    </div>`;
}
function renderArchiveDesktop(){
  const sec = state.archiveSection;
  const tasks = archiveTasksList();
  const bought = sortPurchases(state.purchases.filter(p => p.bought));
  const fc = state.archiveFilters.tagIds.length + (state.archiveFilters.dateFrom ? 1 : 0) + (state.archiveFilters.dateTo ? 1 : 0);
  const header = deskHeader({ icon:'box-archive', iconBox:'bg-slate-900 text-slate-400', title:'آرشیو موارد تکمیل شده', sub:'مرور و جستجو در تاریخچه فعالیت‌ها', profile:'تاریخچه کامل',
    right: `
      <div class="flex items-center gap-2">
        <div class="relative">
          ${fa('magnifying-glass', 'absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs')}
          <input type="text" id="archive-search" placeholder="جستجو در آرشیو..." value="${ea(state.archiveFilters.search)}" oninput="setArchiveSearch(this.value)" class="bg-slate-900 border border-slate-800 rounded-xl py-2 pr-9 pl-4 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500/50 w-48 placeholder:text-slate-600">
        </div>
        <button type="button" onclick="state.archiveFilterOpen=!state.archiveFilterOpen; render()" aria-label="فیلتر" class="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center ${fc || state.archiveFilterOpen ? 'text-indigo-400' : 'text-slate-400'} hover:text-white transition-all">${fa('filter', 'text-xs')}</button>
      </div>` });
  const tabBtn = (id, label) => `<button type="button" onclick="setArchiveSection('${id}')" class="px-6 py-2 ${sec === id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300'} rounded-xl text-[10px] font-black">${label}</button>`;
  const sortBtn = (mode, label) => `<button type="button" onclick="setPurchaseSort('${mode}')" class="px-3 py-1 text-[9px] font-black ${state.purchaseSort === mode ? 'bg-slate-800 text-white rounded-lg' : 'text-slate-500 hover:text-slate-300'}">${label}</button>`;
  const groupsHtml = (groups, item) => groups.map((g, i) => `
    <div class="flex items-center justify-between px-2 ${i ? 'pt-6' : ''}"><h3 class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${g.label}</h3></div>
    ${g.items.map(item).join('')}`).join('');
  const body = `
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="flex items-center justify-between gap-4">
        <div class="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">${tabBtn('tasks', 'تسک‌های تکمیل شده')}${tabBtn('purchases', 'خریدهای انجام شده')}${tabBtn('shelved', 'کنار گذاشته‌ها')}</div>
        ${sec === 'purchases' ? `<div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">${sortBtn('default', 'جدیدترین')}${sortBtn('cheapest', 'ارزان‌ترین')}${sortBtn('priciest', 'گران‌ترین')}</div>` : ''}
      </div>
      ${sec === 'tasks' ? archiveFilterPanel() : ''}
      <div class="space-y-4">
        ${sec === 'shelved' ? (state.shelvedTasks.length ? state.shelvedTasks.map(t => shelvedItem(t, false)).join('') : emptyNote('کاری کنار گذاشته نشده', 'box-archive'))
          : sec === 'tasks'
          ? (tasks.length ? groupsHtml(byJalaliMonth(tasks, t => t.completedAt), archiveTaskItem) : emptyNote('چیزی توی آرشیو با این فیلترها پیدا نشد', 'box-archive'))
          : (bought.length ? (state.purchaseSort === 'default' ? groupsHtml(byJalaliMonth([...bought].sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || '')), p => p.boughtAt), boughtItemDesk) : bought.map(boughtItemDesk).join('')) : emptyNote('هنوز خریدی انجام نشده', 'bag-shopping'))}
      </div>
      <div class="p-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-center">
        <p class="text-[10px] text-slate-600 font-bold leading-relaxed">${sec === 'shelved' ? 'کارهایی که توی مرور هفته کنار گذاشتی این‌جا می‌مونن؛ نه یادآور دارن نه توی لیست‌ها میان. با «بازگشت» سر جاشون برمی‌گردن.' : sec === 'tasks' ? `تسک‌های تکمیل‌شده‌ای که بیش از ${fd(ARCHIVE_THRESHOLD_DAYS)} روز از تکمیلشون گذشته، این‌جا نگه‌داری می‌شن تا لیست‌های فعلی خلوت بمونن. موارد آرشیو شده همچنان در گزارش‌های هوشمند تاثیرگذار هستند.` : 'خریدهایی که تیک خورده‌اند این‌جا می‌مانند؛ با «بازگشت» دوباره به لیست انتظار برمی‌گردند.'}</p>
      </div>
    </div>`;
  return deskMain({ header, body, fab: deskFab('openTaskEditorNew()', 'indigo', 'تسک جدید') });
}
function renderArchiveMobile(){
  const sec = state.archiveSection;
  const tasks = archiveTasksList();
  const bought = [...state.purchases.filter(p => p.bought)].sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || ''));
  const f = state.archiveFilters;
  const item = (title, sub, tagHtml, actions) => `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 opacity-70">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0">${fa('check', 'text-[10px]')}</div>
        <div class="min-w-0"><h4 class="text-xs font-bold text-slate-400 line-through mb-1" dir="auto">${title}</h4><div class="flex items-center gap-2 flex-wrap"><span class="text-[8px] font-bold text-slate-600">${sub}</span>${tagHtml}</div></div>
      </div>
      <div class="flex items-center gap-2 shrink-0">${actions}</div>
    </div>`;
  return `
    <header id="header" class="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-4 py-4">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-lg font-black text-white">آرشیو</h1>
        ${mobIconBtn('magnifying-glass', 'state.archiveSearchOpen=!state.archiveSearchOpen; render()', 'جست‌وجو')}
      </div>
      <div class="flex items-center gap-6">
        <button type="button" onclick="setArchiveSection('tasks')" class="${sec === 'tasks' ? 'tab-active pb-2 text-xs font-black' : 'text-slate-500 pb-2 text-xs font-bold'}">تسک‌ها</button>
        <button type="button" onclick="setArchiveSection('purchases')" class="${sec === 'purchases' ? 'tab-active pb-2 text-xs font-black' : 'text-slate-500 pb-2 text-xs font-bold'}">خریدها</button>
        <button type="button" onclick="setArchiveSection('shelved')" class="${sec === 'shelved' ? 'tab-active pb-2 text-xs font-black' : 'text-slate-500 pb-2 text-xs font-bold'}">کنار گذاشته‌ها</button>
      </div>
    </header>
    ${sec === 'tasks' ? `
      <div class="bg-slate-900/50 border-b border-slate-800/50 px-4 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar">
        <button type="button" onclick="state.archiveFilterOpen=!state.archiveFilterOpen; render()" class="bg-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-black ${f.tagIds.length ? 'text-indigo-400' : 'text-slate-400'} border border-slate-700 whitespace-nowrap">${f.tagIds.length ? `${fd(f.tagIds.length)} تگ` : 'همه تگ‌ها'} ${fa('chevron-down', 'ml-1')}</button>
        <button type="button" onclick="state.archiveFilterOpen=!state.archiveFilterOpen; render()" class="bg-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-black ${f.dateFrom || f.dateTo ? 'text-indigo-400' : 'text-slate-400'} border border-slate-700 whitespace-nowrap">تاریخ تکمیل ${fa('calendar', 'text-[8px] ml-1')}</button>
        <span class="bg-slate-800 px-3 py-1.5 rounded-lg text-[9px] font-black text-slate-400 border border-slate-700 whitespace-nowrap">جدیدترین ${fa('arrow-down-wide-short', 'ml-1')}</span>
      </div>` : ''}
    <main class="safe-area-bottom p-4">
      ${renderStatusBars()}
      ${state.archiveSearchOpen && sec === 'tasks' ? `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1.5 mb-4 flex items-center gap-2">
          ${fa('magnifying-glass', 'text-slate-600 text-xs px-3')}
          <input type="text" id="archive-search" placeholder="جست‌وجو در عنوان تسک‌ها…" value="${ea(f.search)}" oninput="setArchiveSearch(this.value)" class="flex-1 bg-transparent border-none text-[11px] text-slate-200 focus:outline-none placeholder:text-slate-600 h-9">
        </div>` : ''}
      ${sec === 'tasks' && state.archiveFilterOpen ? `<div class="mb-4">${archiveFilterPanel()}</div>` : ''}
      <div class="space-y-3">
        ${sec === 'shelved' ? (state.shelvedTasks.length ? state.shelvedTasks.map(t => shelvedItem(t, true)).join('') : emptyNote('کاری کنار گذاشته نشده', 'box-archive')) : sec === 'tasks'
          ? (tasks.length ? tasks.map(t => item(esc(t.title), `تکمیل: ${t.completedAt ? jDate(dateKey(new Date(t.completedAt))) : '—'}`,
              t.tagIds.map(tagById).filter(Boolean).map(g => `<span class="text-[8px] font-black uppercase" style="color:${ea(g.color)}99">${esc(g.name)}</span>`).join(''),
              `<button type="button" onclick="toggleTaskDone('${t.id}', event)" title="بازیابی" aria-label="بازیابی" class="w-8 h-8 flex items-center justify-center text-indigo-400 bg-indigo-500/5 rounded-lg border border-indigo-500/10">${fa('rotate-left', 'text-[10px]')}</button>
               <button type="button" onclick="openTaskEditorEdit('${t.id}')" aria-label="ویرایش" class="w-8 h-8 flex items-center justify-center text-slate-600">${fa('pen', 'text-[10px]')}</button>`)).join('') : '')
          : bought.map(p => item(esc(p.title), `${p.boughtAt ? `خرید: ${jDate(dateKey(new Date(p.boughtAt)))}` : 'خریداری شده'}${p.price != null ? ` · ${fmtPrice(p.price)}` : ''}`, '',
              `<button type="button" onclick="togglePurchaseBought('${p.id}')" title="برگرداندن به لیست" aria-label="برگرداندن به لیست" class="w-8 h-8 flex items-center justify-center text-indigo-400 bg-indigo-500/5 rounded-lg border border-indigo-500/10">${fa('rotate-left', 'text-[10px]')}</button>
               <button type="button" onclick="deletePurchase('${p.id}')" aria-label="حذف" class="w-8 h-8 flex items-center justify-center text-slate-600">${fa('trash-can', 'text-[10px]')}</button>`)).join('')}
        ${sec !== 'shelved' && (sec === 'tasks' ? tasks : bought).length < 3 ? `
          <div class="py-10 flex flex-col items-center justify-center opacity-10">
            ${fa('box-archive', 'text-6xl mb-4')}
            <p class="text-[10px] font-black uppercase tracking-widest italic text-center">تسک‌های تکمیل‌شده و خریدهای انجام‌شده</p>
          </div>` : ''}
      </div>
    </main>`;
}

/* ================= مرور هفته ================= */
const RITUAL_STEP_LABELS = ['هفته‌ی قبل', 'گیرکرده‌ها', 'چیدن هفته', 'تعهد'];
const RITUAL_DAY_LETTER = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش']; // by getDay(), for the narrow capacity bars
function reportErrorBox(){
  return state.aiReportError && state.aiReportError !== (aiHealthProblem() || {}).errorMessage
    ? `<div class="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-[11px] font-bold text-rose-400" role="alert">${esc(state.aiReportError)}</div>` : '';
}
const ritualCard = (inner, mob) => `<div class="${mob ? 'bg-slate-900 border border-slate-800 rounded-3xl p-5' : 'bg-slate-950 border border-slate-800 rounded-3xl p-8'} space-y-5">${inner}</div>`;
const ritualTitle = (text, sub, mob) => `<div><h3 class="${mob ? 'text-xs' : 'text-sm'} font-black text-white mb-1">${text}</h3>${sub ? `<p class="text-[10px] text-slate-500 leading-relaxed">${sub}</p>` : ''}</div>`;
function ritualStepper(step, mob){
  return `
    <div class="grid grid-cols-4 gap-2">
      ${RITUAL_STEP_LABELS.map((l, i) => `
        <button type="button" onclick="ritualGo(${i})" class="text-right space-y-2">
          <div class="h-1.5 rounded-full ${i < step ? 'bg-indigo-500' : i === step ? 'bg-indigo-400' : 'bg-slate-800'}"></div>
          <span class="${mob ? 'text-[9px]' : 'text-[10px]'} font-black ${i === step ? 'text-indigo-400' : 'text-slate-600'}">${fd(i + 1)}. ${l}</span>
        </button>`).join('')}
    </div>`;
}
function ritualNav(step, mob){
  const last = step === RITUAL_STEPS - 1;
  return `
    <div class="flex items-center gap-2">
      ${step > 0 ? `<button type="button" onclick="ritualGo(${step - 1})" class="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black border border-slate-700 transition-all">${fa('arrow-right', 'ml-1')}قبلی</button>` : ''}
      ${last
        ? `<button type="button" onclick="finishRitual()" ${state.ritualSaving ? 'disabled' : ''} class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-900/20 transition-all disabled:opacity-60">${fa('check', 'ml-1')}${state.ritualSaving ? 'در حال ثبت…' : 'ثبت هفته'}</button>`
        : `<button type="button" onclick="ritualGo(${step + 1})" class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-900/20 transition-all">بعدی${fa('arrow-left', 'mr-1')}</button>`}
    </div>`;
}

/* step 0: last week's commitment + what got in the way */
function ritualStepLastWeek(r, mob){
  const rt = r.ritual, pc = rt.prev_commitment;
  const pcTask = pc && (state.tasks.find(t => t.id === pc.task_id) || state.shelvedTasks.find(t => t.id === pc.task_id));
  const yesNo = (val, label) => `<button type="button" onclick="ritualPrevKept(${val})" class="flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all ${rt.prev_kept === val ? (val ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border-rose-500/20') : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}">${label}</button>`;
  return ritualCard(`
    ${pc ? `
      <div class="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
        <p class="text-[10px] font-black text-indigo-400">تعهد هفته‌ی قبل</p>
        <p class="${mob ? 'text-xs' : 'text-sm'} font-bold text-slate-200" dir="auto">${esc(pc.title)}</p>
        ${pcTask && pcTask.done ? `<p class="text-[10px] text-emerald-400 font-bold">${fa('circle-check', 'ml-1')}توی اپ تیکش زدی.</p>` : ''}
        <div class="flex gap-2">${yesNo(true, 'انجامش دادم')}${yesNo(false, 'نشد')}</div>
      </div>` : `<p class="text-[11px] text-slate-500 leading-relaxed">این اولین مروره؛ آخرش یه کار رو به‌عنوان تعهد هفته انتخاب می‌کنی و جمعه‌ی بعد همین‌جا ازش می‌پرسم.</p>`}
    ${ritualTitle('این هفته چی بیشتر از همه جلوت رو گرفت؟', 'یکی رو بزن؛ لازم نیست دقیق باشه.', mob)}
    <div class="flex flex-wrap gap-1.5">${RITUAL_BLOCKERS.map(([k, l]) => choiceChip(l, rt.blocker === k, `ritualBlocker('${k}')`)).join('')}</div>
    ${rt.blocker === 'other' ? `<textarea data-preserve placeholder="چی شد؟" onchange="ritualBlockerNote(this.value)" class="${textareaCls()}">${esc(rt.blocker_note || '')}</textarea>` : ''}`, mob);
}

/* step 1: stuck tasks */
function ritualStepStuck(r, mob){
  const items = (r.ritual.stuck || []).filter(s => s.decision === 'shelve' || state.tasks.some(t => t.id === s.task_id && !t.done));
  const why = s => [s.moved >= 3 ? `${fd(s.moved)} بار عقب افتاده` : '', s.idle_days >= 28 ? `${fd(s.idle_days)} روزه دست نخورده` : ''].filter(Boolean).join(' · ');
  const btn = (s, decision, label, icon) => {
    const on = s.decision === decision, busy = state.ritualBreaking === s.task_id && decision === 'break';
    return `<button type="button" onclick="stuckDecide('${s.task_id}','${decision}')" ${state.ritualBreaking ? 'disabled' : ''} class="flex-1 py-2 rounded-lg text-[9px] font-black border transition-all disabled:opacity-60 ${on ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}">${fa(busy ? 'spinner fa-spin' : icon, 'ml-1')}${busy ? 'در حال شکستن…' : label}</button>`;
  };
  const row = s => s.decision === 'shelve' ? `
    <div class="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl opacity-60 flex items-center justify-between gap-3">
      <span class="text-[11px] text-slate-500 line-through" dir="auto">${esc(s.title)}</span>
      <span class="text-[9px] font-black text-slate-500 shrink-0">کنار گذاشته شد</span>
    </div>` : `
    <div class="p-4 ${mob ? 'bg-slate-950' : 'bg-slate-900/50'} border border-slate-800 rounded-2xl space-y-3">
      <div>
        <h4 class="text-xs font-bold text-slate-200" dir="auto">${esc(s.title)}</h4>
        <p class="text-[9px] font-bold text-amber-500/80 mt-1">${why(s)}</p>
      </div>
      ${s.decision === 'break' && s.step_title ? `<p class="text-[10px] text-indigo-300 bg-indigo-500/5 border border-indigo-500/10 rounded-xl px-3 py-2 leading-relaxed" dir="auto">${fa('shoe-prints', 'ml-1')}قدم اول اضافه شد: ${esc(s.step_title)}</p>` : ''}
      <div class="flex gap-2">
        ${s.decision === 'break' ? '' : btn(s, 'break', 'بشکنش', 'scissors')}
        ${btn(s, 'shelve', 'کنار بذار', 'box-archive')}
        ${btn(s, 'keep', 'نگهش دار', 'thumbtack')}
      </div>
    </div>`;
  return ritualCard(`
    ${ritualTitle('کارهای گیرکرده', 'بارها عقب افتادن یا مدت‌هاست دست نخوردن. «بشکنش» یه قدم ده‌دقیقه‌ای ازش می‌سازه، «کنار بذار» از لیست‌ها برش می‌داره (از آرشیو برمی‌گرده).', mob)}
    ${items.length ? `<div class="space-y-3">${items.map(row).join('')}</div>` : emptyNote('کار گیرکرده‌ای نداری.', 'circle-check')}`, mob);
}

/* step 2: the week on days */
function ritualStepWeek(r, mob){
  const days = ritualDays(), cap = dailyCapacity();
  const dateOf = t => ritualPlanDate(r, t);
  const changes = (r.replan && r.replan.changes) || [];
  const dayName = k => WEEKDAYS_FA[new Date(k + 'T00:00:00').getDay()];
  const bars = days.map(k => {
    const load = dayLoad(k, { dateOf }), over = load > cap;
    return `
      <div class="text-center space-y-1.5">
        <p class="text-[9px] font-black ${over ? 'text-rose-400' : 'text-slate-500'}">${RITUAL_DAY_LETTER[new Date(k + 'T00:00:00').getDay()]}</p>
        <div class="h-16 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col justify-end"><div class="${over ? 'bg-rose-500' : 'bg-indigo-500'} w-full" style="height:${Math.min(100, Math.round(load / cap * 100))}%"></div></div>
        <p class="text-[8px] font-bold ${over ? 'text-rose-400' : 'text-slate-600'}">${fd(Math.round(load / 6) / 10)} س</p>
      </div>`;
  }).join('');
  const tasks = ritualPlanTasks(r);
  const chip = (t, k, label) => `<button type="button" onclick="ritualPlace('${t.id}','${k}')" class="px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${dateOf(t) === k ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/10' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'}">${label}</button>`;
  const row = t => {
    const k = dateOf(t), open = state.ritualOpenTask === t.id;
    const c = changes.find(c => c.task_id === t.id && changeStatus(c) === 'pending');
    const fromAI = c && (c.after.date || '') === k;
    return `
      <div class="${mob ? 'bg-slate-950' : 'bg-slate-900/50'} border ${open ? 'border-indigo-500/40' : 'border-slate-800'} rounded-2xl">
        <button type="button" onclick="ritualToggleTask('${t.id}')" class="w-full p-3 flex items-center gap-3 text-right">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-slate-200" dir="auto">${esc(t.title)}</p>
            <p class="text-[9px] text-slate-500 mt-0.5">${formatDuration(t.durationMin || DEFAULT_TASK_MIN)}${t.date && t.date < days[0] ? ` · <span class="text-rose-400">عقب‌افتاده از ${jDate(t.date)}</span>` : ''}${fromAI ? ` · <span class="text-indigo-400">${fa('wand-magic-sparkles', 'text-[8px]')} پیشنهاد هوشواره</span>` : ''}</p>
          </div>
          <span class="text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${!k ? 'bg-slate-800 text-slate-500' : k < days[0] ? 'bg-rose-500/10 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'}">${!k ? 'بعداً' : k < days[0] ? 'روز بده' : `${dayName(k)} ${jDate(k)}`}</span>
        </button>
        ${open ? `
          <div class="px-3 pb-3 space-y-2">
            ${fromAI && c.why ? `<p class="text-[10px] text-slate-500 leading-relaxed" dir="auto">${esc(c.why)}</p>` : ''}
            <div class="flex flex-wrap gap-1.5">${days.map(d => chip(t, d, `${dayName(d)} ${jDate(d)}`)).join('')}${chip(t, '', 'بعداً')}</div>
          </div>` : ''}
      </div>`;
  };
  const late = tasks.filter(t => dateOf(t) && dateOf(t) < days[0]).sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const onDays = tasks.filter(t => dateOf(t) >= days[0]).sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const later = tasks.filter(t => !dateOf(t)).sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3));
  return ritualCard(`
    ${ritualTitle('هفته رو بچین', `روی هر کار بزن و روزش رو انتخاب کن. ظرفیت معمولت حدود ${formatDuration(cap)} در روزه؛ ستون قرمز یعنی اون روز زیادی پره.`, mob)}
    <div class="grid grid-cols-7 gap-1.5">${bars}</div>
    ${late.length ? `<div class="space-y-2"><p class="text-[10px] font-black text-rose-400 px-1">عقب‌افتاده؛ یه روز تازه بهشون بده (${fd(late.length)})</p>${late.map(row).join('')}</div>` : ''}
    ${onDays.length ? `<div class="space-y-2"><p class="text-[10px] font-black text-slate-600 px-1">روی روزها (${fd(onDays.length)})</p>${onDays.map(row).join('')}</div>` : ''}
    ${later.length ? `<div class="space-y-2"><p class="text-[10px] font-black text-slate-600 px-1">بعداً (${fd(later.length)})</p>${later.map(row).join('')}</div>` : ''}
    ${!tasks.length ? emptyNote('کار بازی برای چیدن نیست.', 'calendar-check') : ''}`, mob);
}

/* step 3: one commitment */
function ritualStepCommit(r, mob){
  const days = ritualDays();
  const picks = ritualPlanTasks(r).filter(t => days.includes(ritualPlanDate(r, t)));
  const chosen = r.ritual.commitment && r.ritual.commitment.task_id;
  return ritualCard(`
    ${ritualTitle('یه تعهد برای این هفته', 'فقط یکی. کل هفته بالای «امروز» می‌مونه و جمعه‌ی بعد ازش می‌پرسم.', mob)}
    ${picks.length ? `<div class="space-y-2">${picks.map(t => { const on = chosen === t.id; return `
      <button type="button" onclick="ritualCommit('${t.id}')" role="radio" aria-checked="${on}" class="w-full ${mob ? 'bg-slate-950' : 'bg-slate-900/50'} border ${on ? 'border-indigo-500/40' : 'border-slate-800'} rounded-2xl p-3 flex items-center gap-3 text-right">
        <div class="w-8 h-8 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-600'} rounded-xl flex items-center justify-center border border-slate-800 shrink-0">${fa(on ? 'star' : 'bullseye', 'text-xs')}</div>
        <span class="flex-1 text-xs font-bold text-slate-200" dir="auto">${esc(t.title)}</span>
        <span class="text-[9px] text-slate-500 shrink-0">${jDate(ritualPlanDate(r, t))}</span>
      </button>`; }).join('')}</div>`
      : emptyNote('هنوز کاری روی روزهای این هفته نذاشتی؛ از قدم قبل یکی رو روی یه روز بذار.', 'bullseye')}`, mob);
}
const RITUAL_STEP_RENDER = [ritualStepLastWeek, ritualStepStuck, ritualStepWeek, ritualStepCommit];

/* nothing to do: the last finished ritual, and a way to start one now */
function ritualIdle(mob){
  const last = lastDoneRitual(), c = weeklyCommitment();
  const start = `<button type="button" onclick="startReviewNow()" ${state.aiReportGenerating ? 'disabled' : ''} class="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black text-indigo-400 disabled:opacity-60">${fa(state.aiReportGenerating ? 'spinner fa-spin' : 'clipboard-check', 'ml-1')}${state.aiReportGenerating ? 'در حال آماده کردن…' : 'شروع مرور الان'}</button>`;
  return `
    ${ritualCard(last ? `
      ${ritualTitle('مرور این هفته انجام شد', `${jDate(dateKey(new Date(last.completedAt)))}؛ مرور بعدی جمعه عصر آماده می‌شه.`, mob)}
      ${c ? `<div class="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-1"><p class="text-[10px] font-black text-indigo-400">تعهد این هفته</p><p class="text-xs font-bold ${c.task.done ? 'text-slate-500 line-through' : 'text-slate-200'}" dir="auto">${esc(c.task.title)}</p></div>` : ''}`
      : ritualTitle('مرور هفته', 'هر جمعه عصر یه مرور پنج‌دقیقه‌ای آماده می‌شه: تعهد هفته‌ی قبل، تکلیف کارهای گیرکرده، چیدن هفته‌ی بعد و یه تعهد تازه.', mob), mob)}
    ${start}`;
}
function ritualBody(mob){
  const r = currentRitual();
  const top = `${renderAIHealthBanner({ dismissible:false })}${reportErrorBox()}`;
  if(!r) return `${top}${ritualIdle(mob)}`;
  const step = Math.min(r.ritual.step || 0, RITUAL_STEPS - 1);
  return `${top}${ritualStepper(step, mob)}${RITUAL_STEP_RENDER[step](r, mob)}${ritualNav(step, mob)}`;
}
function renderAIReportsDesktop(){
  const header = deskHeader({ icon:'clipboard-check', iconBox:'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20', title:'مرور هفته', sub:'پنج دقیقه برای چیدن هفته‌ی بعد' });
  return deskMain({ header, body:`<div class="max-w-3xl mx-auto space-y-6">${ritualBody(false)}</div>` });
}
function renderAIReportsMobile(){
  const header = mobHeader(`<div class="flex items-center gap-3"><div class="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white">${fa('clipboard-check', 'text-sm')}</div><h1 class="text-lg font-black text-white">مرور هفته</h1></div>`);
  return `${header}<main class="safe-area-bottom p-4"><div class="space-y-6">${renderStatusBars()}${ritualBody(true)}</div></main>`;
}
