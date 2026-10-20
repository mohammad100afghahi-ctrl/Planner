/* Synthetic review data only. Never loaded by the production application. */
function uxSeedDemo(){
  const today=dateKey(new Date()), day=n=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+n);return dateKey(d);};
  const task=(id,title,patch={})=>({id,title,notes:'',done:false,completedAt:null,tagIds:['design'],priority:'medium',subtasks:[],date:today,durationMin:30,actualMin:null,recurringTemplateId:null,reminderAt:null,reminderKind:'once',reminderLeadDays:0,...patch});
  state.tags=[{id:'design',name:'دیزاین',color:'#818cf8'},{id:'english',name:'انگلیسی',color:'#fbbf24'},{id:'life',name:'شخصی',color:'#34d399'}];
  state.tasks=[
    task('task-design','طراحی رابط کاربری اپلیکیشن مدار',{priority:'high',durationMin:45,notes:'بررسی صفحه‌های اصلی و حالت‌های واکنش‌گرا.',reminderAt:new Date(day(1)+'T18:30:00').toISOString(),subtasks:[{id:'sub-one',title:'طراحی اولیهٔ صفحه‌ها',done:false},{id:'sub-two',title:'انتخاب پالت رنگی',done:true}]}),
    task('task-english','تمرین انگلیسی و مرور تکلیف‌ها',{tagIds:['english'],durationMin:20}),
    task('task-overdue','بررسی نهایی هزینه‌های تعمیرات',{date:day(-1),priority:'high',tagIds:['life']}),
    task('task-done','ثبت هزینه‌های اشتراک ماهیانه',{done:true,completedAt:new Date(today+'T10:15:00').toISOString(),tagIds:['life']}),
    task('task-undated','خرید لوازم تحریر',{date:'',priority:'low',tagIds:['life']}),
    task('task-future','مطالعهٔ فصل بعدی کتاب',{date:day(3),tagIds:['english']}),
    task('task-archive','جمع‌بندی کارهای هفتهٔ قبل',{date:day(-12),done:true,completedAt:new Date(day(-11)+'T12:00:00').toISOString()}),
  ];
  state.recurringTemplates=[{id:'template-one',title:'مرور هدف‌های هفته',notes:'',priority:'medium',durationMin:30,weekdays:[new Date().getDay()],active:true,tagIds:['design'],reminderTime:'09:00',reminderDaysBefore:0}];
  state.tagGoals=[{tagId:'design',weeklyMinutes:480,reason:'پیشرفت در پروژهٔ شخصی'},{tagId:'english',weeklyMinutes:180,reason:'تمرین پیوسته'}];
  state.todayDoneOpen=true;state.backups=[];state.pushStatus='off';
  state.ideas=[{id:'idea-one',body:'ایدهٔ ساخت یک دفتر شخصی برای ثبت چیزهایی که یاد می‌گیرم.',tagIds:['life'],images:[],createdAt:new Date().toISOString()},{id:'idea-two',body:'مرور هفتگی طراحی‌ها و ثبت نکته‌های قابل بهبود.',tagIds:['design'],images:[],createdAt:new Date().toISOString()}];
  state.prompts=[{id:'prompt-one',title:'بازبینی متن انگلیسی',body:'Review the following text for clarity and grammar. Explain the changes briefly.',category:'انگلیسی',note:'',favorite:true,createdAt:new Date().toISOString()},{id:'prompt-two',title:'مرور طرح رابط کاربری',body:'طرح را از نظر سلسله‌مراتب، خوانایی و تراز عناصر بررسی کن.',category:'دیزاین',note:'',favorite:false,createdAt:new Date().toISOString()}];
  state.purchases=[{id:'purchase-one',title:'کتاب طراحی محصول',price:45000,priority:'high',bought:false},{id:'purchase-two',title:'دفتر یادداشت',price:12000,priority:'low',bought:false},{id:'purchase-three',title:'چراغ مطالعه',price:25000,priority:'medium',bought:true,boughtAt:new Date().toISOString()}];
  state.subscriptions=[{id:'subscription-one',name:'سرویس موسیقی',cycle:'monthly',nextRenewal:day(2),active:true,notifyDaysBefore:3,note:'اشتراک شخصی'},{id:'subscription-two',name:'ابزار طراحی',cycle:'yearly',nextRenewal:day(25),active:true,notifyDaysBefore:7,note:''}];
  state.wins=[{id:'win-one',title:'فاز اول پروژه را تمام کردم',hardship:'زمان محدود و کارهای زیاد',why:'یاد گرفتم کار بزرگ را به قدم‌های کوچک تقسیم کنم.',tagIds:['design'],happenedOn:day(-1),createdAt:new Date().toISOString()}];
  state.motherSettings={why:'برای حفظ ارتباط و کنار هم بودن.',remindDays:[new Date().getDay()],showOnToday:true,push:false};
  state.motherItems=[{id:'mother-one',kind:'do',category:'ارتباط',body:'زمانی برای گفتگو و شنیدن حرف‌ها کنار بگذار.',createdAt:new Date().toISOString()}];
  state.homeRepairs=[{id:'repair-one',title:'تعمیر شیر آب آشپزخانه',room:'آشپزخانه',urgency:'urgent',who:'self',trade:'plumbing',status:'open',estCost:120000,actualCost:null,note:'نیاز به بررسی واشر',taskId:null,createdAt:new Date().toISOString()}];
  state.homeParts=[{id:'part-one',repairId:'repair-one',name:'واشر شیر آب',bought:false,createdAt:new Date().toISOString()}];
  state.homeMaint=[{id:'maint-one',title:'تعویض فیلتر تصفیهٔ آب',room:'آشپزخانه',everyMonths:3,nextDue:day(5),lastDone:day(-85),who:'self',trade:'plumbing',note:'',taskId:null,createdAt:new Date().toISOString()}];
  state.englishSettings={classDays:[(new Date().getDay()+1)%7],classTime:'17:00',classTimes:{[(new Date().getDay()+1)%7]:'17:00'},classMinutes:90,practiceTime:'18:30',push:false};
  state.englishHomework=[{id:'homework-one',title:'Writing Practice — Formal Letter',unit:'درس ۴',assignedOn:day(-1),dueOn:day(2),createdAt:new Date().toISOString()}];
  state.englishChunks=[{id:'chunk-one',homeworkId:'homework-one',title:'Draft: Opening Paragraph',minutes:20,day:today,position:0,done:false,doneAt:null,skips:[],createdAt:new Date().toISOString()}];
  state.englishPractice=[];
  state.aiReports=[{id:'report-one',periodStart:day(-7),periodEnd:day(-1),text:'این هفته چند کار مهم را به پایان رساندی. برای هفتهٔ آینده، ادامهٔ تمرین انگلیسی و مرور کارهای عقب‌افتاده را در نظر بگیر.',createdAt:new Date().toISOString(),seenAt:new Date().toISOString(),applyAfter:new Date(Date.now()+3600000).toISOString(),replan:{reason:'مرور کارهای عقب‌افتاده',capacity_min:180,changes:[{task_id:'task-overdue',title:'بررسی نهایی هزینه‌های تعمیرات',status:'pending',before:{date:day(-1),priority:'high',duration_min:30},after:{date:day(1),priority:'high',duration_min:30},why:'برای روز بعد برنامه‌ریزی شود.'}]},focus:{chosen:['task-design','task-english'],suggested:[{task_id:'task-design',why:'تکمیل کار مهم پروژه'},{task_id:'task-english',why:'تمرین پیوسته'}]}}];
  state.encouragement={text:'هر قدم کوچک، بخشی از یک مسیر بزرگ است.'};
  appStarted=true;appBooted=true;dataLoaded=true;
  document.body.classList.remove('signed-out');
  render();
}
