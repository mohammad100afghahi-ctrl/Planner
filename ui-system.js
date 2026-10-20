/* ---------- مدار UI: تنظیمات، آرشیو، گزارش هوشمند ----------
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
          <div class="space-y-3">
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
          </div>
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
        <div class="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">${tabBtn('tasks', 'تسک‌های تکمیل شده')}${tabBtn('purchases', 'خریدهای انجام شده')}</div>
        ${sec === 'purchases' ? `<div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">${sortBtn('default', 'جدیدترین')}${sortBtn('cheapest', 'ارزان‌ترین')}${sortBtn('priciest', 'گران‌ترین')}</div>` : ''}
      </div>
      ${sec === 'tasks' ? archiveFilterPanel() : ''}
      <div class="space-y-4">
        ${sec === 'tasks'
          ? (tasks.length ? groupsHtml(byJalaliMonth(tasks, t => t.completedAt), archiveTaskItem) : emptyNote('چیزی توی آرشیو با این فیلترها پیدا نشد', 'box-archive'))
          : (bought.length ? (state.purchaseSort === 'default' ? groupsHtml(byJalaliMonth([...bought].sort((a, b) => (b.boughtAt || '').localeCompare(a.boughtAt || '')), p => p.boughtAt), boughtItemDesk) : bought.map(boughtItemDesk).join('')) : emptyNote('هنوز خریدی انجام نشده', 'bag-shopping'))}
      </div>
      <div class="p-6 bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl text-center">
        <p class="text-[10px] text-slate-600 font-bold leading-relaxed">${sec === 'tasks' ? `تسک‌های تکمیل‌شده‌ای که بیش از ${fd(ARCHIVE_THRESHOLD_DAYS)} روز از تکمیلشون گذشته، این‌جا نگه‌داری می‌شن تا لیست‌های فعلی خلوت بمونن. موارد آرشیو شده همچنان در گزارش‌های هوشمند تاثیرگذار هستند.` : 'خریدهایی که تیک خورده‌اند این‌جا می‌مانند؛ با «بازگشت» دوباره به لیست انتظار برمی‌گردند.'}</p>
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
        ${sec === 'tasks'
          ? (tasks.length ? tasks.map(t => item(esc(t.title), `تکمیل: ${t.completedAt ? jDate(dateKey(new Date(t.completedAt))) : '—'}`,
              t.tagIds.map(tagById).filter(Boolean).map(g => `<span class="text-[8px] font-black uppercase" style="color:${ea(g.color)}99">${esc(g.name)}</span>`).join(''),
              `<button type="button" onclick="toggleTaskDone('${t.id}', event)" title="بازیابی" aria-label="بازیابی" class="w-8 h-8 flex items-center justify-center text-indigo-400 bg-indigo-500/5 rounded-lg border border-indigo-500/10">${fa('rotate-left', 'text-[10px]')}</button>
               <button type="button" onclick="openTaskEditorEdit('${t.id}')" aria-label="ویرایش" class="w-8 h-8 flex items-center justify-center text-slate-600">${fa('pen', 'text-[10px]')}</button>`)).join('') : '')
          : bought.map(p => item(esc(p.title), `${p.boughtAt ? `خرید: ${jDate(dateKey(new Date(p.boughtAt)))}` : 'خریداری شده'}${p.price != null ? ` · ${fmtPrice(p.price)}` : ''}`, '',
              `<button type="button" onclick="togglePurchaseBought('${p.id}')" title="برگرداندن به لیست" aria-label="برگرداندن به لیست" class="w-8 h-8 flex items-center justify-center text-indigo-400 bg-indigo-500/5 rounded-lg border border-indigo-500/10">${fa('rotate-left', 'text-[10px]')}</button>
               <button type="button" onclick="deletePurchase('${p.id}')" aria-label="حذف" class="w-8 h-8 flex items-center justify-center text-slate-600">${fa('trash-can', 'text-[10px]')}</button>`)).join('')}
        ${(sec === 'tasks' ? tasks : bought).length < 3 ? `
          <div class="py-10 flex flex-col items-center justify-center opacity-10">
            ${fa('box-archive', 'text-6xl mb-4')}
            <p class="text-[10px] font-black uppercase tracking-widest italic text-center">تسک‌های تکمیل‌شده و خریدهای انجام‌شده</p>
          </div>` : ''}
      </div>
    </main>`;
}

/* ================= گزارش هوشمند ================= */
function selectedReport(){
  const list = state.aiReports;
  return list.find(r => r.id === state.aiReportSelectedId) || list[0] || null;
}
function reportPeriodLabel(r){ return `${formatDateShort(r.periodStart)} تا ${formatDateShort(r.periodEnd)}`; }
function selectReport(id){ state.aiReportSelectedId = id; state.aiReportPickerOpen = false; render(); }
function reportPicker(mob){
  if(!state.aiReportPickerOpen || !state.aiReports.length) return '';
  const sel = selectedReport();
  return `
    <div class="${mob ? 'mx-4 mt-4' : 'absolute top-full left-0 mt-2 w-72 z-30'} bg-slate-950 border border-slate-800 rounded-2xl p-2 shadow-2xl max-h-80 overflow-y-auto custom-scrollbar">
      ${state.aiReports.map((r, i) => `
        <button type="button" onclick="selectReport('${r.id}')" class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-right ${sel && sel.id === r.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900'}">
          <span class="text-[11px] font-bold">${i === 0 ? 'آخرین مرور · ' : ''}${reportPeriodLabel(r)}</span>
          ${state.aiReportFreshIds.includes(r.id) ? `<span class="text-[8px] font-black bg-indigo-600 text-white px-1.5 rounded">تازه</span>` : reviewPending(r).length ? `<span class="text-[8px] font-black text-amber-400">${fd(reviewPending(r).length)} منتظر</span>` : ''}
        </button>`).join('')}
    </div>`;
}
function changeText(c){
  const day = d => d ? formatDateShort(d) : 'بعداً';
  const out = [];
  if(c.before.date !== c.after.date) out.push(`از ${day(c.before.date)} به ${day(c.after.date)}`);
  if(c.before.priority !== c.after.priority) out.push(`اولویت ${PRIORITY_LABEL[c.before.priority] || '—'} ← ${PRIORITY_LABEL[c.after.priority] || '—'}`);
  if(c.before.duration_min !== c.after.duration_min) out.push(`${c.before.duration_min ? fd(c.before.duration_min) : '—'} ← ${fd(c.after.duration_min)} دقیقه`);
  return out.join('، ');
}
function reviewCounts(r){
  const ch = (r && r.replan && r.replan.changes) || [];
  const legacy = ch.length && ch.every(c => !c.status);
  return {
    pending: reviewPending(r).length,
    applied: ch.filter(c => ['accepted', 'edited', 'auto'].includes(changeStatus(c))).length,
    rejected: ch.filter(c => ['rejected', 'skipped', 'expired'].includes(changeStatus(c))).length, legacy,
  };
}
function proposalCard(r, c, mob){
  const task = state.tasks.find(t => t.id === c.task_id);
  const st = changeStatus(c);
  const isPending = st === 'pending' && task && !task.done;
  const todayStr = dateKey(state.today);
  const line = `انتقال تسک «${esc(c.title)}» ${changeText(c)}${c.why ? ` (${esc(c.why)})` : ''}.`;
  if(isPending) return mob ? `
    <div class="p-5 border-b border-slate-800/50 last:border-0">
      <div class="flex items-start justify-between mb-4 gap-3">
        <div class="space-y-1 min-w-0">
          <h4 class="text-xs font-bold text-slate-200" dir="auto">${esc(c.title)}</h4>
          <div class="flex items-center gap-2 flex-wrap">
            ${c.before.date !== c.after.date ? `<span class="text-[8px] font-bold text-slate-600 line-through">${c.before.date ? formatDateShort(c.before.date) : 'بعداً'}</span>${fa('arrow-left', 'text-[8px] text-indigo-500')}<span class="text-[8px] font-black text-indigo-400">${c.after.date ? formatDateShort(c.after.date) : 'بعداً'}</span>` : `<span class="text-[8px] font-black text-indigo-400">${changeText(c)}</span>`}
          </div>
          ${c.why ? `<p class="text-[9px] text-slate-500 leading-relaxed" dir="auto">${esc(c.why)}</p>` : ''}
        </div>
        <span class="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10 uppercase shrink-0">در انتظار</span>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick="decideChange('${r.id}','${c.task_id}','accept')" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-[9px] font-black shadow-lg shadow-indigo-900/20">تایید</button>
        <label class="flex-1 bg-slate-800 text-slate-400 py-2 rounded-lg text-[9px] font-black border border-slate-700 text-center relative overflow-hidden">تغییر تاریخ<input type="date" min="${todayStr}" onchange="decideChange('${r.id}','${c.task_id}','date', this.value)" class="absolute inset-0 opacity-0"></label>
        <button type="button" onclick="decideChange('${r.id}','${c.task_id}','reject')" class="px-3 bg-slate-800 text-rose-300 py-2 rounded-lg text-[9px] font-black border border-slate-700">رد کردن</button>
        <button type="button" onclick="deleteTask('${c.task_id}')" aria-label="حذف این کار" class="px-3 bg-slate-800 text-rose-500 py-2 rounded-lg text-[9px] font-black border border-slate-700">${fa('xmark')}</button>
      </div>
    </div>` : `
    <div class="proposal-card p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl relative">
      <div class="flex justify-between items-start mb-3">
        <span class="text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/10 uppercase">در انتظار تایید</span>
        ${r.applyAfter ? `<span class="text-[9px] text-slate-600">اعمال خودکار ${applyAfterLabel(r.applyAfter)}</span>` : ''}
      </div>
      <p class="text-[11px] text-slate-300 mb-4 leading-relaxed font-bold" dir="auto">${line}</p>
      <div class="proposal-actions flex items-center gap-2">
        <button type="button" onclick="decideChange('${r.id}','${c.task_id}','accept')" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-[9px] font-black transition-all">تایید</button>
        <label class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg text-[9px] font-black transition-all relative overflow-hidden cursor-pointer">تغییر تاریخ<input type="date" min="${todayStr}" onchange="decideChange('${r.id}','${c.task_id}','date', this.value)" class="absolute inset-0 opacity-0 cursor-pointer"></label>
        <button type="button" onclick="decideChange('${r.id}','${c.task_id}','reject')" class="text-slate-600 hover:text-rose-500 px-2 py-1.5 text-[9px] font-black">رد کردن</button>
        <button type="button" onclick="deleteTask('${c.task_id}')" title="حذف این کار" aria-label="حذف این کار" class="mr-auto text-slate-700 hover:text-rose-500 px-2 py-1.5 text-[9px]">${fa('trash')}</button>
      </div>
    </div>`;
  const applied = ['accepted', 'edited', 'auto'].includes(st);
  const note = st === 'pending' && !task ? 'این کار حذف شد' : st === 'pending' && task && task.done ? 'انجامش دادی' : REVIEW_STATUS_LABEL[st] || '';
  if(mob) return `
    <div class="p-5 border-b border-slate-800/50 last:border-0 opacity-60">
      <div class="flex items-start justify-between mb-2 gap-3">
        <div class="min-w-0"><h4 class="text-xs font-bold text-slate-400" dir="auto">${esc(c.title)}</h4><p class="text-[8px] text-slate-600">${changeText(c)}</p></div>
        <span class="text-[8px] font-black ${applied ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10' : 'text-slate-500 bg-slate-800 border-slate-700'} px-2 py-0.5 rounded border uppercase shrink-0">${note}</span>
      </div>
    </div>`;
  return applied ? `
    <div class="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl opacity-60">
      <div class="flex justify-between items-start mb-2"><span class="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10 uppercase">${st === 'auto' ? 'اعمال شده' : note}</span></div>
      <p class="text-[11px] text-slate-500 leading-relaxed" dir="auto">${line}</p>
    </div>` : `
    <div class="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl opacity-40">
      <div class="flex justify-between items-start mb-2"><span class="text-[9px] font-black text-slate-600 uppercase">${note || 'رد شده'}</span></div>
      <p class="text-[11px] text-slate-600 leading-relaxed italic" dir="auto">${line}</p>
    </div>`;
}
function reportFocusBlock(r, mob){
  const suggested = (r.focus && r.focus.suggested) || [];
  if(!suggested.length) return '';
  const chosen = r.focus.chosen || [];
  const tones = ['bg-indigo-500/10 text-indigo-400', 'bg-amber-500/10 text-amber-500', 'bg-rose-500/10 text-rose-500'];
  const arrow = ['group-hover:text-indigo-400', 'group-hover:text-amber-500', 'group-hover:text-rose-500'];
  const items = suggested.map((f, i) => ({ f, i, task: state.tasks.find(t => t.id === f.task_id) })).filter(x => x.task);
  return `
    <div>
      <h3 class="${mob ? 'text-[10px] text-slate-600 mb-1 px-1' : 'text-sm text-white mb-1'} font-black uppercase tracking-widest">${fd(REVIEW_MAX_FOCUS)} تسک تمرکزی پیشنهادی برای هفته بعد</h3>
      <p class="text-[10px] text-slate-500 mb-4 ${mob ? 'px-1' : ''}">تا ${fd(REVIEW_MAX_FOCUS)} تا انتخاب کن؛ تا مرور بعدی بالای صفحه‌ی امروز می‌مونن.</p>
      <div class="space-y-3">
        ${items.map(({ f, i, task }) => { const on = chosen.includes(f.task_id); return mob ? `
          <button type="button" onclick="toggleFocus('${r.id}','${f.task_id}')" role="checkbox" aria-checked="${on}" class="w-full bg-slate-900 border ${on ? 'border-indigo-500/40' : 'border-slate-800'} rounded-2xl p-4 flex items-center gap-4 text-right">
            <div class="w-10 h-10 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-indigo-400'} rounded-xl flex items-center justify-center border border-slate-800 shrink-0">${on ? fa('check', 'text-xs') : `<span class="text-xs font-black">${fd(i + 1)}</span>`}</div>
            <div class="min-w-0"><h4 class="text-xs font-bold ${task.done ? 'text-slate-500 line-through' : 'text-slate-200'}" dir="auto">${esc(task.title)}</h4>${f.why ? `<p class="text-[9px] text-slate-500" dir="auto">دلیل: ${esc(f.why)}</p>` : ''}</div>
          </button>` : `
          <button type="button" onclick="toggleFocus('${r.id}','${f.task_id}')" role="checkbox" aria-checked="${on}" class="w-full bg-slate-900/40 p-5 rounded-3xl border ${on ? 'border-indigo-500/40' : 'border-slate-800'} flex items-center justify-between group text-right">
            <div class="flex items-center gap-4 min-w-0">
              <div class="w-10 h-10 ${on ? 'bg-indigo-600 text-white' : tones[i % 3]} rounded-xl flex items-center justify-center font-black shrink-0">${on ? fa('check') : fd(i + 1)}</div>
              <div class="min-w-0"><h4 class="text-sm font-bold ${task.done ? 'text-slate-500 line-through' : 'text-slate-200'}" dir="auto">${esc(task.title)}</h4>${f.why ? `<p class="text-[10px] text-slate-600" dir="auto">${esc(f.why)}</p>` : ''}</div>
            </div>
            ${fa(on ? 'star' : 'arrow-left', `${on ? 'text-indigo-400' : 'text-slate-700'} ${arrow[i % 3]} transition-colors shrink-0`)}
          </button>`; }).join('')}
      </div>
    </div>`;
}
function reportErrorBox(){
  return state.aiReportError && state.aiReportError !== (aiHealthProblem() || {}).errorMessage
    ? `<div class="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3 text-[11px] font-bold text-rose-400" role="alert">${esc(state.aiReportError)}</div>` : '';
}
function renderAIReportsDesktop(){
  const r = selectedReport();
  const idx = r ? state.aiReports.indexOf(r) : -1;
  const header = deskHeader({ icon:'wand-magic-sparkles', iconBox:'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20', title:'گزارش هوشمند و تحلیل عملکرد', sub:'تحلیل هفتگی و پیشنهادات بازچینی برنامه',
    profile: r ? `تحلیل شماره ${fd(state.aiReports.length - idx)}` : 'هنوز گزارشی نیست',
    right: `
      <button type="button" onclick="generateAIReportNow()" ${state.aiReportGenerating ? 'disabled' : ''} class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-60">${fa('wand-magic-sparkles', 'text-[10px]')}${state.aiReportGenerating ? 'در حال تولید…' : 'تولید گزارش الان'}</button>
      ${r ? `<div class="relative">
        <button type="button" onclick="state.aiReportPickerOpen=!state.aiReportPickerOpen; render()" aria-expanded="${!!state.aiReportPickerOpen}" class="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
          <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">${idx === 0 ? 'هفته جاری' : reportPeriodLabel(r)}</span>${fa('chevron-down', 'text-[8px] text-slate-600')}
        </button>
        ${reportPicker(false)}
      </div>` : ''}` });
  if(!r) return deskMain({ header, body:`
    <div class="max-w-3xl mx-auto space-y-6">${renderAIHealthBanner({ dismissible:false })}${reportErrorBox()}
      <div class="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center">${fa('wand-magic-sparkles', 'text-5xl text-white/5 mb-4')}<p class="text-sm text-slate-400 leading-loose">هنوز گزارشی ساخته نشده. مرور هفتگی هر جمعه عصر خودکار ساخته می‌شه، یا همین الان با دکمه‌ی «تولید گزارش الان» بساز.</p></div>
    </div>` });
  const rp = r.replan;
  const changes = (rp && rp.changes) || [];
  const counts = reviewCounts(r);
  const pending = reviewPending(r);
  const canRevert = changes.length && !r.replanRevertedAt && changes.some(c => changeStatus(c) === 'auto');
  const body = `
    <div class="max-w-6xl mx-auto grid grid-cols-12 gap-8">
      <div class="col-span-7 space-y-8">
        ${renderAIHealthBanner({ dismissible:false })}${reportErrorBox()}
        <div class="bg-slate-950 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
          <div class="relative z-10">
            <h3 class="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">${fa('comment-dots', 'text-indigo-500')} روایت هوشمند هفته
              <span class="text-[10px] font-bold text-slate-500 normal-case tracking-normal mr-2">${reportPeriodLabel(r)}</span>
              ${state.aiReportFreshIds.includes(r.id) ? `<span class="text-[9px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded">تازه</span>` : ''}</h3>
            <p class="text-base text-slate-300 leading-loose text-justify font-medium whitespace-pre-line" dir="auto">${esc(r.text)}</p>
          </div>
          <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/5 blur-[80px] rounded-full"></div>
        </div>
        ${reportFocusBlock(r, false)}
      </div>
      <div class="col-span-5 space-y-8">
        ${changes.length ? `
          <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
            <h3 class="text-xs font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">${fa('shuffle', 'text-indigo-400')} بازچینی پیشنهادی برنامه</h3>
            <div class="space-y-4">${[...changes].sort((a, b) => (changeStatus(b) === 'pending') - (changeStatus(a) === 'pending')).map(c => proposalCard(r, c, false)).join('')}</div>
            ${pending.length > 1 ? `<button type="button" onclick="acceptAllChanges('${r.id}')" class="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black transition-all">تایید همه (${fd(pending.length)})</button>` : ''}
            <div class="mt-8 p-4 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
              <div class="flex items-center gap-3"><div class="w-2 h-2 bg-indigo-500 rounded-full ${pending.length ? 'animate-ping' : ''} shrink-0"></div><p class="text-[10px] text-slate-400 font-bold">${pending.length && r.applyAfter ? `اگه تا ${applyAfterLabel(r.applyAfter)} تصمیم نگیری، باقی‌مونده‌ها رو خودم اعمال می‌کنم.` : 'برنامه روزانه بر اساس الگوی جدید بازچینی شد.'}</p></div>
              ${rp.reason ? `<p class="text-[10px] text-slate-500 leading-relaxed pr-5" dir="auto">${esc(rp.reason)}</p>` : ''}
              ${rp.capacity_min ? `<p class="text-[10px] text-slate-500 pr-5">ظرفیت روزانه‌ای که در نظر گرفتم: ${formatDuration(rp.capacity_min)}</p>` : ''}
              ${canRevert ? `<button type="button" onclick="revertReplan('${r.id}')" class="text-[9px] font-black text-slate-500 hover:text-indigo-400 flex items-center gap-1 pr-5">${fa('rotate-left')} برگردون همه‌ی تغییرات خودکار</button>` : r.replanRevertedAt ? `<p class="text-[10px] text-emerald-400 pr-5">برنامه‌ی قبلی برگردونده شد.</p>` : ''}
            </div>
          </div>
          <div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">
            <h4 class="text-xs font-black text-white uppercase tracking-widest mb-4">خلاصه پیشنهادات</h4>
            <div class="space-y-4">
              <div class="flex justify-between items-center text-[10px]"><span class="text-slate-500">پیشنهادات در انتظار:</span><span class="text-indigo-400 font-black">${fd(counts.pending)} مورد</span></div>
              <div class="flex justify-between items-center text-[10px]"><span class="text-slate-500">اعمال شده:</span><span class="text-emerald-400 font-black">${fd(counts.applied)} مورد</span></div>
              <div class="flex justify-between items-center text-[10px]"><span class="text-slate-500">رد شده یا دست‌نخورده:</span><span class="text-slate-600 font-black">${fd(counts.rejected)} مورد</span></div>
            </div>
          </div>` : `<div class="bg-slate-950 border border-slate-800 rounded-3xl p-6">${emptyNote('این مرور پیشنهاد بازچینی نداشت.', 'shuffle')}</div>`}
      </div>
    </div>`;
  return deskMain({ header, body });
}
function renderAIReportsMobile(){
  const r = selectedReport();
  const header = mobHeader(`<div class="flex items-center gap-3"><div class="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white">${fa('wand-magic-sparkles', 'text-sm')}</div><h1 class="text-lg font-black text-white">گزارش هوشمند</h1></div>`,
    state.aiReports.length ? mobIconBtn('clock-rotate-left', 'state.aiReportPickerOpen=!state.aiReportPickerOpen; render()', 'گزارش‌های قبلی') : '');
  const generate = `<button type="button" onclick="generateAIReportNow()" ${state.aiReportGenerating ? 'disabled' : ''} class="w-full py-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black text-indigo-400 disabled:opacity-60">${fa('wand-magic-sparkles', 'ml-1')}${state.aiReportGenerating ? 'در حال تولید…' : 'تولید گزارش الان'}</button>`;
  if(!r) return `${header}<main class="safe-area-bottom p-4"><div class="space-y-6">${renderStatusBars()}${renderAIHealthBanner({ dismissible:false })}${reportErrorBox()}<div class="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 text-[11px] text-slate-300 leading-relaxed">هنوز گزارشی ساخته نشده. مرور هفتگی هر جمعه عصر خودکار ساخته می‌شه.</div>${generate}</div></main>`;
  const inPeriod = d => d && d >= r.periodStart && d <= r.periodEnd;
  const doneN = state.tasks.filter(t => t.done && t.completedAt && inPeriod(dateKey(new Date(t.completedAt)))).length;
  const leftN = state.tasks.filter(t => !t.done && inPeriod(t.date)).length;
  const changes = (r.replan && r.replan.changes) || [];
  const canRevert = changes.length && !r.replanRevertedAt && changes.some(c => changeStatus(c) === 'auto');
  return `
    ${header}
    ${reportPicker(true)}
    <main class="safe-area-bottom p-4">
      <div class="space-y-6">
        ${renderStatusBars()}${renderAIHealthBanner({ dismissible:false })}${reportErrorBox()}
        <div class="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden">
          <h3 class="text-xs font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">${fa('comment-dots', 'text-indigo-400')} تحلیل عملکرد هفته ${state.aiReportFreshIds.includes(r.id) ? `<span class="text-[8px] font-black bg-indigo-600 text-white px-1.5 rounded normal-case">تازه</span>` : ''}</h3>
          <p class="text-[9px] text-slate-500 mb-4">${reportPeriodLabel(r)}</p>
          <p class="text-[11px] text-slate-300 leading-relaxed mb-6 whitespace-pre-line" dir="auto">"${esc(r.text)}"</p>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-slate-950/50 p-3 rounded-2xl border border-indigo-500/10"><p class="text-[9px] font-black text-slate-500 uppercase mb-1">تسک‌های انجام شده</p><span class="text-lg font-black text-white">${fd(doneN)} مورد</span></div>
            <div class="bg-slate-950/50 p-3 rounded-2xl border border-indigo-500/10"><p class="text-[9px] font-black text-slate-500 uppercase mb-1">تسک‌های باقیمانده</p><span class="text-lg font-black text-white">${fd(leftN)} مورد</span></div>
          </div>
          ${fa('quote-left', 'absolute top-4 left-4 text-4xl text-white/5')}
        </div>
        ${reportFocusBlock(r, true)}
        ${changes.length ? `
          <section id="replan-proposals">
            <div class="flex items-center justify-between mb-4 px-1">
              <h3 class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">پیشنهاد بازچینی (بازچینی برنامه)</h3>
              ${r.applyAfter && reviewPending(r).length ? `<span class="text-[9px] font-bold text-slate-500 italic">اعمال خودکار ${applyAfterLabel(r.applyAfter)}</span>` : ''}
            </div>
            <div class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">${[...changes].sort((a, b) => (changeStatus(b) === 'pending') - (changeStatus(a) === 'pending')).map(c => proposalCard(r, c, true)).join('')}</div>
            ${reviewPending(r).length > 1 ? `<button type="button" onclick="acceptAllChanges('${r.id}')" class="w-full mt-3 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-indigo-900/20">تایید همه (${fd(reviewPending(r).length)})</button>` : ''}
            ${canRevert ? `<button type="button" onclick="revertReplan('${r.id}')" class="mt-3 text-[9px] font-black text-slate-500 hover:text-indigo-400 transition-colors px-1">واگرد تغییرات خودکار ${fa('rotate-left', 'text-[8px] mr-1')}</button>` : ''}
          </section>` : ''}
        ${generate}
      </div>
    </main>`;
}
