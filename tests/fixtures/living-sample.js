// Shared fixture for every direction. Contains no account data or service credentials.
const sampleDay=dateKey(new Date());
const shiftSample=n=>{const d=new Date(sampleDay+'T12:00:00');d.setDate(d.getDate()+n);return dateKey(d);};
const sampleTask=(id,title,tags,minutes,extra={})=>({id,title,tagIds:tags,durationMin:minutes,subtasks:[],priority:null,date:sampleDay,done:false,completedAt:null,createdAt:new Date().toISOString(),notes:'',actualMin:0,recurringTemplateId:null,reminderAt:null,reminderKind:'once',reminderLeadDays:0,...extra});
state.tags=[{id:'work',name:'پروژه',color:'#3F7154'},{id:'learn',name:'یادگیری',color:'#486E8C'},{id:'en',name:'انگلیسی',color:'#896B95'},{id:'personal',name:'شخصی',color:'#AC7C42'}];
state.tasks=[
 sampleTask('t1','تکمیل طرح اولیهٔ پروژه',['work'],60,{priority:'high',notes:'چیدمان صفحه‌ها و جزئیات تقویم را مرور کنم.',subtasks:[{id:'s1',title:'مرور صفحهٔ اطلاعات',done:true},{id:'s2',title:'بررسی تقویم ماهانه',done:false}]}),
 sampleTask('t2','مطالعهٔ فصل جدید کتاب',['learn'],30,{priority:'medium'}),
 sampleTask('t3','پیاده‌روی عصرگاهی',['personal'],30,{reminderAt:new Date(sampleDay+'T18:00:00').toISOString()}),
 sampleTask('t4','مرتب‌کردن یادداشت‌های پروژه',['work'],25,{done:true,actualMin:25,completedAt:sampleDay+'T08:30:00'}),
 sampleTask('old','پیگیری سفارش کتاب',['personal'],10,{date:shiftSample(-1),priority:'low'}),
 sampleTask('free','پیداکردن یک دورهٔ عکاسی',['learn'],null,{date:''}),
 sampleTask('future','مرور برنامهٔ هفتهٔ بعد',['work'],45,{date:shiftSample(2)}),
 ...[-1,-2,-3,-4,-5].map((n,i)=>sampleTask('past'+i,['مرور جزئیات پروژه','تمرین مکالمه','تکمیل یادداشت جلسه','مرور فصل قبل','بررسی برنامهٔ ماه'][i],['work','learn','work','learn','work'].slice(i,i+1),30,{date:shiftSample(n),done:true,actualMin:30,completedAt:shiftSample(n)+'T12:00:00'}))
];
state.tagGoals=[{tagId:'work',weeklyMinutes:300,reason:'پیش‌بردن پروژه با قدم‌های پیوسته'},{tagId:'learn',weeklyMinutes:180,reason:''},{tagId:'en',weeklyMinutes:120,reason:''}];
state.recurringTemplates=[{id:'repeat1',title:'مرور هفتگی برنامه',notes:'',priority:'medium',durationMin:30,active:true,weekdays:[5],tagIds:['work'],subtasks:[],reminderTime:'09:00',reminderDaysBefore:0}];
state.englishSettings={classDays:[6,1],classTime:'18:00',classTimes:{6:'18:00',1:'18:00'},classMinutes:90,practiceTime:'17:00',push:true};
state.englishHomework=[{id:'hw1',title:'Workbook درس چهارم و تمرین مکالمه',unit:'Unit 4',assignedOn:shiftSample(-2),dueOn:shiftSample(2),createdAt:shiftSample(-2)+'T19:30:00'}];
state.englishChunks=[{id:'en1',homeworkId:'hw1',title:'تمرین واژه‌های درس چهارم',minutes:15,day:sampleDay,position:0,done:false,doneAt:null,skips:[],createdAt:sampleDay+'T08:00:00'}, {id:'en2',homeworkId:'hw1',title:'مرور فایل شنیداری درس',minutes:15,day:shiftSample(-1),position:1,done:false,doneAt:null,skips:[],createdAt:shiftSample(-1)+'T08:00:00'}, {id:'en3',homeworkId:'hw1',title:'تمرین معرفی یک پروژه',minutes:20,actualMin:20,day:shiftSample(-2),position:2,done:true,doneAt:shiftSample(-2)+'T17:00:00',skips:[],createdAt:shiftSample(-2)+'T08:00:00'}];
state.englishPractice=[{day:shiftSample(-2),createdAt:shiftSample(-2)+'T17:00:00'}];
state.aiReports=[{id:'report1',periodStart:shiftSample(-7),periodEnd:shiftSample(-1),text:'این هفته کارهای پروژه پیوسته‌تر پیش رفتند. برای هفتهٔ بعد، زمان کوتاهی برای مرور تقویم و ادامهٔ تمرین انگلیسی کنار بگذار.',createdAt:shiftSample(-1)+'T18:00:00',seenAt:null,replan:null,focus:{suggested:[{task_id:'t1',why:'اولویت اصلی پروژه'},{task_id:'t2',why:'ادامهٔ یادگیری'}],chosen:['t1','t2']}}];
state.ideas=[{id:'idea1',body:'برای هر پروژه، یک مرور کوتاه در پایان هفته داشته باشم.',tagIds:['work'],images:[],createdAt:new Date().toISOString()}];
state.prompts=[{id:'prompt1',title:'مرور برنامهٔ هفته',body:'کارهای هفته را مرور کن و سه اولویت پیشنهادی برای هفتهٔ بعد بنویس.',category:'برنامه‌ریزی',note:'',favorite:true,createdAt:new Date().toISOString()}];
state.purchases=[{id:'buy1',title:'دفتر یادداشت',price:12000,priority:'medium',bought:false,boughtAt:null}];
state.subscriptions=[{id:'sub1',name:'فضای ابری',cycle:'monthly',nextRenewal:shiftSample(2),active:true,notifyDaysBefore:3,note:''}];
state.wins=[{id:'win1',title:'نسخهٔ اولیهٔ پروژه را تمام کردم',hardship:'چند روز کارم عقب افتاده بود',why:'بالاخره یک قدم مشخص جلو رفتم.',tagIds:['work'],happenedOn:shiftSample(-2),createdAt:new Date().toISOString()}];
state.motherSettings={why:'با توجه و حضور بیشتر',remindDays:[0,1,2,3,4,5,6],showOnToday:true,push:true};
state.motherItems=[{id:'mother1',kind:'do',category:'همراهی',body:'برای یک گفت‌وگوی کوتاه وقت بگذارم.',createdAt:new Date().toISOString()}];
state.homeRepairs=[{id:'repair1',title:'بررسی شیر آشپزخانه',room:'آشپزخونه',urgency:'soon',who:'pro',trade:'لوله‌کش',status:'open',estCost:25000,actualCost:null,note:'',taskId:null,createdAt:new Date().toISOString(),doneAt:null}];
state.homeParts=[{id:'part1',repairId:'repair1',name:'واشر شیر',bought:false,createdAt:new Date().toISOString()}];
state.homeMaint=[{id:'maint1',title:'سرویس کولر',room:'کل خونه',everyMonths:6,nextDue:shiftSample(4),lastDone:shiftSample(-170),who:'pro',trade:'کولرساز',note:'',taskId:null,createdAt:new Date().toISOString()}];
state.pushStatus='off';state.backups=[];state.encouragement=null;state.reminders=[];
applyEmptyDefaults();appStarted=true;appBooted=true;dataLoaded=true;loginShown=false;
scheduleSnapshot=()=>{};
loadAll=async()=>render();ensureRealtimeSync=()=>{};
signOut=()=>showInfoToast('این پیش‌نمایش حساب اصلی نیست.');
enablePush=disablePush=sendTestPush=()=>showInfoToast('اعلان دستگاه در پیش‌نمایش ارسال نمی‌شود.');
downloadBackup=downloadStoredBackup=pickRestoreFile=openStoredRestore=confirmRestore=()=>showInfoToast('پشتیبان حساب اصلی در این پیش‌نمایش در دسترس نیست.');
