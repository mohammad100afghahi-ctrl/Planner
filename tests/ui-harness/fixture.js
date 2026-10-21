/* Synthetic data for local visual checks. Content mirrors the UX Pilot sample
   screens (same kinds and amounts of items) so the comparison is like-for-like. */
(function(){
  const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const at = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m || 0, 0, 0); return d.toISOString(); };
  const T = { design:'tag-design', en:'tag-en', madar:'tag-madar', personal:'tag-personal', office:'tag-office' };
  const tags = [
    { id:T.design, name:'دیزاین', color:'#6366f1', created_at:at(-90, 9) },
    { id:T.en, name:'انگلیسی', color:'#f59e0b', created_at:at(-90, 9, 1) },
    { id:T.madar, name:'پروژه مدار', color:'#10b981', created_at:at(-90, 9, 2) },
    { id:T.personal, name:'شخصی', color:'#f43f5e', created_at:at(-90, 9, 3) },
    { id:T.office, name:'اداری', color:'#64748b', created_at:at(-90, 9, 4) },
  ];
  let n = 0;
  const task = (o) => Object.assign({
    id:'task-' + (++n), title:'', notes:null, done:false, completed_at:null, priority:null, date:null,
    duration_min:null, reminder_at:null, reminder_kind:'once', reminder_lead_days:0, actual_min:null,
    difficulty:null, recurring_template_id:null, created_at:at(-n, 8), subtasks:[], task_tags:[],
  }, o);
  const tt = (...ids) => ids.map(tag_id => ({ tag_id }));
  const tasks = [
    task({ id:'task-design', title:'طراحی رابط کاربری اپلیکیشن مدار', notes:'تکمیل تمامی صفحات اصلی و بررسی حالت‌های واکنش‌گرا.', priority:'high', date:day(0), duration_min:45,
      reminder_at:at(0, 18, 30), task_tags:tt(T.design, T.madar),
      subtasks:[{ id:'sub-1', title:'طراحی اولیه وایر فریم‌ها', done:false, position:0 }, { id:'sub-2', title:'انتخاب پالت رنگی', done:true, position:1 }] }),
    task({ title:'تمرین Chunks بخش مکالمه', date:day(0), duration_min:20, task_tags:tt(T.en) }),
    task({ title:'بررسی نهایی هزینه‌های تعمیرات', date:day(-1), priority:'medium' }),
    task({ title:'ثبت هزینه‌های اشتراک ماهیانه', date:day(0), done:true, completed_at:at(0, 9) }),
    task({ title:'جواب دادن به ایمیل‌های کاری', date:day(0), done:true, completed_at:at(0, 10), task_tags:tt(T.office) }),
    task({ title:'مرور کارت‌های واژه', date:day(0), done:true, completed_at:at(0, 11), task_tags:tt(T.en), duration_min:15 }),
    task({ id:'task-contracts', title:'مطالعه قراردادها', date:day(-2), priority:'medium', duration_min:30, task_tags:tt(T.office) }),
    task({ title:'خرید قطعات برای تعمیرات', date:day(1), duration_min:40 }),
    task({ id:'task-doc', title:'تکمیل داکیومنت دیزاین سیستم', date:day(2), priority:'high', duration_min:90, task_tags:tt(T.design) }),
    task({ title:'بررسی هزینه‌های جاری و فاکتورها', priority:'medium', duration_min:20 }),
    task({ id:'task-intro', title:'نوشتن متن معرفی پروژه', duration_min:30, task_tags:tt(T.madar) }),
    task({ id:'task-files', title:'مرتب کردن فایل‌های طراحی', priority:'low' }),
    task({ id:'task-insurance', title:'تمدید بیمه ماشین', priority:'high', reminder_kind:'always' }),
    task({ title:'تعویض لامپ راهرو', shelved_at:at(-3, 12) }),
    task({ title:'جلسه با تیم توسعه', date:day(4), duration_min:60, task_tags:tt(T.madar) }),
    task({ title:'آماده کردن ارائه', date:day(6), priority:'high', duration_min:120, task_tags:tt(T.design) }),
    task({ title:'طراحی اولیه آیکون‌های اپلیکیشن', done:true, date:day(-12), completed_at:at(-10, 15), task_tags:tt(T.design), actual_min:50 }),
    task({ title:'بررسی قراردادهای فریلنسری', done:true, date:day(-15), completed_at:at(-14, 12), task_tags:tt(T.office) }),
    task({ title:'خرید هدیه تولد مادر', done:true, date:day(-40), completed_at:at(-38, 18), task_tags:tt(T.personal) }),
  ];
  // a steady streak: one finished task on each of the last 11 days
  for(let i = 1; i <= 11; i++) tasks.push(task({ title:'کار روزانه ' + i, done:true, date:day(-i), completed_at:at(-i, 20), duration_min:20 }));
  const recurring_templates = [
    { id:'tpl-review', title:'جلسه هفتگی مرور اهداف', notes:null, priority:'medium', duration_min:45, weekdays:[(new Date().getDay() + 2) % 7], active:true, reminder_time:null, reminder_days_before:0, created_at:at(-30, 9), recurring_template_tags:tt(T.personal) },
  ];
  // an old narrative report (no ritual: hidden now) and this Friday's مرور هفته, halfway through
  const ai_reports = [{
    id:'rep-old', period_start:day(-14), period_end:day(-8), created_at:at(-8, 17), seen_at:at(-8, 18), completed_at:null,
    report_text:'هفته گذشته با تمرکز بالایی روی پروژه‌های دیزاین همراه بود.', replan:null, ritual:null,
  }, {
    id:'rep-prev', period_start:day(-14), period_end:day(-7), created_at:at(-7, 17), seen_at:at(-7, 18), completed_at:at(-7, 18),
    report_text:'', replan:null,
    ritual:{ step:4, prev_commitment:null, prev_kept:null, blocker:'time', blocker_note:'', stuck:[], commitment:{ task_id:'task-doc', title:'تکمیل داکیومنت دیزاین سیستم' } },
  }, {
    id:'rep-1', period_start:day(-6), period_end:day(0), created_at:at(0, 17), seen_at:null, completed_at:null,
    report_text:'',
    replan:{ capacity_min:180, changes:[
      { task_id:'task-contracts', title:'مطالعه قراردادها', status:'pending', why:'دو روزه عقب افتاده؛ فردا سبک‌تره.', before:{ date:day(-2), priority:'medium', duration_min:30 }, after:{ date:day(1), priority:'medium', duration_min:30 } },
      { task_id:'task-intro', title:'نوشتن متن معرفی پروژه', status:'pending', why:'مهمه و پنجشنبه جا داره.', before:{ date:null, priority:null, duration_min:30 }, after:{ date:day(3), priority:null, duration_min:45 } },
    ]},
    ritual:{ step:0, prev_commitment:{ task_id:'task-doc', title:'تکمیل داکیومنت دیزاین سیستم' }, prev_kept:null, blocker:null, blocker_note:'',
      stuck:[
        { task_id:'task-insurance', title:'تمدید بیمه ماشین', moved:4, idle_days:12, decision:null, step_task_id:null },
        { task_id:'task-files', title:'مرتب کردن فایل‌های طراحی', moved:0, idle_days:41, decision:null, step_task_id:null },
      ], commitment:null },
  }];
  const purchases = [
    { id:'p1', title:'مانیتور ۲۷ اینچ 4K', priority:'high', price:120000, bought:false, bought_at:null, created_at:at(-1, 10) },
    { id:'p2', title:'کتاب «Clean Code» نسخه فیزیکی', priority:'medium', price:25000, bought:false, bought_at:null, created_at:at(-5, 10) },
    { id:'p3', title:'کابل شارژ', priority:'low', price:8000, bought:false, bought_at:null, created_at:at(-6, 10) },
    { id:'p4', title:'هدفون Noise Cancelling', priority:'medium', price:95000, bought:true, bought_at:at(-3, 12), created_at:at(-20, 10) },
  ];
  const svg = (a, b) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="320" height="200" fill="url(#g)"/></svg>`);
  const ideas = [
    { id:'i1', body:'طراحی یک سیستم هوشمند برای مدیریت یادگیری زبان انگلیسی بر اساس متد Chunks و بازخورد روزانه.', created_at:at(0, 9), idea_tags:tt(T.design, T.en), idea_images:[] },
    { id:'i2', body:'تغییر دکوراسیون اتاق کار به سبک مینیمال تیره با نورپردازی متمرکز برای افزایش تمرکز.', created_at:at(-3, 9), idea_tags:tt(T.personal), idea_images:[{ id:'im1', data_url:svg('#1e293b', '#475569'), position:0 }, { id:'im2', data_url:svg('#312e81', '#0f172a'), position:1 }] },
    { id:'i3', body:'استفاده از هوش مصنوعی برای تولید خودکار گزارش‌های هفتگی از روند پیشرفت پروژه‌ها و تسک‌های انجام شده.', created_at:at(-7, 9), idea_tags:tt(T.madar), idea_images:[] },
  ];
  const subscriptions = [
    { id:'s1', name:'Spotify Premium', cycle:'monthly', next_renewal:day(-3), active:true, notify_days_before:2, note:null },
    { id:'s2', name:'Figma Professional', cycle:'yearly', next_renewal:day(21), active:true, notify_days_before:3, note:'برای پروژه‌های شخصی و فریلنسری' },
    { id:'s3', name:'Netflix Premium', cycle:'monthly', next_renewal:day(10), active:false, notify_days_before:3, note:null },
  ];
  const prompts = [
    { id:'pr1', title:'طراحی کامپوننت‌های تیره', body:'Create a set of high-fidelity dark mode UI components for a productivity app using Tailwind CSS colors. Focus on slate and indigo tones, with subtle borders and glassmorphism effects, and keep the spacing consistent across every component.', category:'UI Design', note:null, favorite:true, created_at:at(-2, 9) },
    { id:'pr2', title:'اصلاح نگارش انگلیسی', body:'Act as a professional editor. Review the following text for grammatical errors, formal tone, and clarity. Provide suggestions for better vocabulary choices consistent with C1 level.', category:'انگلیسی', note:null, favorite:false, created_at:at(-7, 9) },
    { id:'pr3', title:'تحلیل رفتار کاربر', body:'Analyze the provided JSON data of user interactions. Identify patterns in feature usage, peak activity times, and potential churn indicators. Summary should be in bullet points.', category:'Data Analysis', note:'برای گزارش ماهانه', favorite:false, created_at:at(-20, 9) },
  ];
  const wins = [
    { id:'w1', title:'بالاخره طراحی پروتوتایپ اپلیکیشن مدار رو تموم کردم', hardship:'خیلی خسته بودم و فک می‌کردم به ددلاین نمی‌رسم.', why:'باعث شد بفهمم تمرکز عمیق حتی در زمان محدود چقدر می‌تونه معجزه کنه.', tag_ids:[T.design], happened_on:day(-1), created_at:at(-1, 21) },
    { id:'w2', title:'۳۰ دقیقه زودتر از همیشه بیدار شدم و مدیتیشن کردم', hardship:'شب قبلش دیر خوابیده بودم و بدنم خیلی سنگین بود.', why:'شروع روز با آرامش تاثیر خیلی زیادی روی تمرکز بقیه ساعت‌های روزم داشت.', tag_ids:[T.personal], happened_on:day(-5), created_at:at(-5, 21) },
  ];
  const wd = new Date().getDay();
  const mother_care = { why:'ام‌اس بیماری نامرئیه. وقتی مدتی از آخرین حمله گذشته و حالش خوب به نظر میاد، هنوز مریضه.', remind_days:[wd, (wd + 2) % 7, (wd + 4) % 7], show_on_today:true, push:true };
  const mother_care_items = [
    { id:'m1', kind:'do', category:'استرس و حرف زدن', body:'بپرس «امروز چطوری؟» و واقعاً گوش بده.', created_at:at(-30, 9) },
    { id:'m2', kind:'do', category:'بدن و حرکت', body:'ممکنه تعادلش کم باشه؛ مسیرهای خونه رو خلوت نگه دار و تو پله‌ها کنارش باش.', created_at:at(-30, 9, 1) },
    { id:'m3', kind:'dont', category:'گرما', body:'تو گرمای وسط روز نبرش بیرون یا خرید.', created_at:at(-30, 9, 2) },
  ];
  const home_repairs = [
    { id:'r1', title:'تعمیر شیر آب آشپزخانه', room:'آشپزخونه', urgency:'urgent', who:'pro', trade:'لوله‌کش', status:'open', est_cost:120000, actual_cost:null, note:'نشت شدید آب', task_id:null, created_at:at(-4, 9), done_at:null },
    { id:'r2', title:'تعویض لامپ‌های راهرو', room:'راهرو', urgency:'soon', who:'self', trade:'', status:'waiting', est_cost:60000, actual_cost:null, note:'', task_id:null, created_at:at(-3, 9), done_at:null },
    { id:'r3', title:'تعمیر قفل در بالکن', room:'پذیرایی', urgency:'whenever', who:'pro', trade:'قفل‌ساز', status:'done', est_cost:40000, actual_cost:45000, note:'', task_id:null, created_at:at(-20, 9), done_at:at(-6, 12) },
  ];
  const home_repair_parts = [
    { id:'hp1', repair_id:'r1', name:'واشر سرامیکی', bought:false, created_at:at(-4, 9) },
    { id:'hp2', repair_id:'r1', name:'نوار تفلون', bought:true, created_at:at(-4, 9, 1) },
    { id:'hp3', repair_id:'r2', name:'فیوز مینیاتوری ۱۶ آمپر', bought:false, created_at:at(-3, 9) },
    { id:'hp4', repair_id:'r2', name:'لامپ هالوژن سقفی (۲ عدد)', bought:false, created_at:at(-3, 9, 1) },
  ];
  const home_maintenance = [
    { id:'hm1', title:'سرویس پکیج', room:'کل خونه', every_months:12, next_due:day(-5), last_done:day(-370), who:'pro', trade:'تأسیسات و پکیج', note:'', task_id:null, created_at:at(-400, 9) },
    { id:'hm2', title:'تعویض فیلتر تصفیه آب', room:'آشپزخونه', every_months:6, next_due:day(90), last_done:day(-90), who:'self', trade:'', note:'', task_id:null, created_at:at(-200, 9) },
  ];
  const english_settings = { class_days:[6, 2, 4], class_time:'18:00', class_times:{}, class_minutes:90, practice_time:'20:00', push:true };
  const english_homework = [
    { id:'hw1', title:'Writing Practice - Formal Letter', unit:'Unit 5', assigned_on:day(-2), due_on:day(3), created_at:at(-2, 20) },
    { id:'hw0', title:'Reading: Sustainable Energy', unit:'Unit 4', assigned_on:day(-9), due_on:day(-4), created_at:at(-9, 20) },
  ];
  const chunk = (o) => Object.assign({ done:false, done_at:null, actual_min:null, difficulty:null, skips:[], position:0 }, o);
  const english_chunks = [
    chunk({ id:'c1', homework_id:'hw1', title:'Vocabulary: Greeting & Closing', minutes:15, day:day(0), position:0, done:true, done_at:at(0, 8), created_at:at(-2, 20) }),
    chunk({ id:'c2', homework_id:'hw1', title:'Draft: Opening Paragraph', minutes:20, day:day(0), position:1, created_at:at(-2, 20, 1) }),
    chunk({ id:'c3', homework_id:'hw1', title:'Draft: Body Paragraphs', minutes:25, day:day(1), position:2, created_at:at(-2, 20, 2) }),
    chunk({ id:'c0', homework_id:'hw0', title:'Read the article', minutes:15, day:day(-6), position:0, done:true, done_at:at(-6, 19), created_at:at(-9, 20) }),
  ];
  const english_practice = [-1, -2, -3, -5, -6].map(i => ({ day:day(i), created_at:at(i, 21) }));
  const backups = [{ id:'b1', kind:'download', created_at:at(-12, 10), counts:{ tasks:38 } }, { id:'b2', kind:'auto', created_at:at(-4, 3), counts:{ tasks:40 } }];
  window.FIXTURE = {
    encouragement:'هر گام کوچک، بخشی از یک مسیر بزرگ است. تو از دیروزت بهتری.',
    tables:{ tags, tasks, recurring_templates, tag_goals:[{ tag_id:T.design, weekly_minutes:600, reason:'به دلیل ددلاین پروژه مدار' }, { tag_id:T.en, weekly_minutes:300, reason:'برای حفظ زنجیره یادگیری' }],
      ai_reports, purchases, ideas, subscriptions, reminders:[], prompts, wins, mother_care_items, mother_care:[mother_care],
      home_repairs, home_repair_parts, home_maintenance, ai_health:[], english_settings:[english_settings], english_homework, english_chunks, english_practice, backups },
  };
})();
