const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const root=require('node:path').resolve(__dirname,'..');
const writes=[];
const fields=new Map();
const app={innerHTML:'',querySelector:()=>null};
const classes={add(){},remove(){},toggle(){},contains(){return false;}};
const builder=table=>{
  const result={data:[],error:null};
  const q=new Proxy({}, {get(_,key){
    if(key==='then')return (resolve,reject)=>Promise.resolve(result).then(resolve,reject);
    return (...args)=>{if(['insert','update','delete','upsert'].includes(key))writes.push({table,method:key,args});if(key==='single'||key==='maybeSingle')result.data=null;return q;};
  }});return q;
};
const context={console,Date,Map,Set,URL,Intl,Promise,Math,JSON,Number,String,Object,Array,RegExp,Error,crypto:webcrypto,
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},requestAnimationFrame:()=>1,
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{origin:'http://localhost',href:'http://localhost/',reload(){}},
  navigator:{onLine:true},fetch:async()=>({ok:true,json:async()=>({})}),
  indexedDB:{open:()=>({})},confirm:()=>true,alert(){},
  document:{body:{classList:classes,dataset:{}},activeElement:null,hidden:false,addEventListener(){},querySelector:()=>null,
    createElement:()=>({textContent:'',get innerHTML(){return String(this.textContent).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}}),
    getElementById:id=>id==='app'?app:fields.get(id)||{value:'',focus(){},classList:classes,style:{},querySelectorAll:()=>[]}},
  addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}}),
  supabase:{createClient:()=>({from:builder,auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}})}})},
};
context.window=context;
vm.createContext(context);
const html=readFileSync(root+'/index.html','utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
vm.runInContext(scripts.find(s=>s[2].includes('(function(global)'))[2],context,{filename:'jalaali.js'});
vm.runInContext(readFileSync(root+'/task-reminders.js','utf8'),context,{filename:'task-reminders.js'});
vm.runInContext(scripts.find(s=>s[2].includes('const SUPABASE_URL'))[2],context,{filename:'app-inline.js'});
vm.runInContext(readFileSync(root+'/uxpilot.js','utf8'),context,{filename:'uxpilot.js'});
vm.runInContext(readFileSync(__dirname+'/uxpilot-fixture.js','utf8'),context);
const run=code=>vm.runInContext(code,context);
run('uxSeedDemo()');
for(const view of run('Object.keys(uxPages)')){
  run(`state.view=${JSON.stringify(view)};render()`);
  assert.ok(app.innerHTML.length>100,view+' rendered');
}
let today=run("state.view='today';uxToday()");
assert.match(today,/بررسی نهایی هزینه‌های تعمیرات/);
assert.doesNotMatch(today,/خرید لوازم تحریر/,'undated excluded from Today');
assert.doesNotMatch(today,/مطالعهٔ فصل بعدی کتاب/,'future excluded from Today');
assert.match(today,/ثبت هزینه‌های اشتراک ماهیانه/,'done today remains visible');
run("state.tasks.find(t=>t.id==='task-overdue').done=true;state.tasks.find(t=>t.id==='task-overdue').completedAt=new Date().toISOString()");
today=run('uxToday()');assert.match(today,/بررسی نهایی هزینه‌های تعمیرات/,'overdue finished today retained');
run('state.calendarPage.jy=1403;state.calendarPage.jm=2;state.calendarPage.selectedDayKey="2024-05-14"');
const calendar=run('uxCalendar()');
assert.equal((calendar.match(/onclick="calendarPageShowDay\('/g)||[]).length,31,'all days in Jalali month');
assert.match(calendar,/2024-05-14/);
fields.set('editor-title',{value:'آزمون ساخت تسک',focus(){}});
(async()=>{
  run("state.view='tasks';openTaskEditorNewForDate(dateKey(state.today));state.taskEditor.draft.reminderEnabled=true;state.taskEditor.draft.reminderDate=dateKey(new Date(Date.now()+86400000));state.taskEditor.draft.reminderTime='18:30'");
  await run('confirmTaskEditor()');
  const created=run("state.tasks.find(t=>t.title==='آزمون ساخت تسک')");
  assert.ok(created?.reminderAt,'task owns saved alarm');
  assert.ok(writes.some(w=>w.table==='tasks'&&w.method==='insert'&&w.args[0].reminder_at),'alarm written with task');
  run(`openTaskEditorEdit(${JSON.stringify(created.id)});state.taskEditor.draft.reminderEnabled=false`);
  fields.set('editor-title',{value:'آزمون ویرایش تسک',focus(){}});
  await run('confirmTaskEditor()');
  assert.equal(run(`state.tasks.find(t=>t.id===${JSON.stringify(created.id)}).reminderAt`),null,'disable alarm persists');
  assert.equal(run(`state.tasks.find(t=>t.id===${JSON.stringify(created.id)}).title`),'آزمون ویرایش تسک');
  const always=run("taskReminderRow({...newTaskReminderDraft(),reminderEnabled:true,reminderKind:'always',recurring:{enabled:false}})");
  assert.equal(always.reminder_at,null,'until done does not fabricate timed alarm');
  assert.equal(always.reminder_kind,'always');
  assert.equal(run('NAV_GROUPS.flatMap(g=>g.items).length'),14);
  assert.ok(!writes.some(w=>w.table==='reminders'),'no retired reminder writes');
  console.log('PASS: 14 views, Today eligibility, full Jalali month, task create/edit/alarm disable and until-done behavior.');
})().catch(e=>{console.error(e);process.exitCode=1;});
