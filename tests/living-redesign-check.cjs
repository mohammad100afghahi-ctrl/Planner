const {chromium}=require('playwright');
const fs=require('fs');
const assert=require('node:assert/strict');
(async()=>{
 const root=process.env.MEDAR_TEST_URL||'http://127.0.0.1:8881/artifacts/living-redesign/';
 const origin=new URL(root).origin+'/';
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu']});
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const page=await ctx.newPage(),errors=[],network=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/*',r=>{const u=r.request().url();if(!u.startsWith(origin)&&!u.startsWith('https://fonts.googleapis.com/')&&!u.startsWith('https://fonts.gstatic.com/')){network.push(u);return r.abort();}return r.continue();});
 await page.goto(root,{waitUntil:'networkidle'});
 console.log('Loaded',await page.title(),errors);
 await page.getByRole('heading',{name:'اطلاعات',exact:true}).waitFor();
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{window.reviewSetScreen=function(screen){state.taskEditor=null;state.taskCompletionModal=null;state.recurringEditor=null;state.moveTaskPicker=null;state.streakPanel=false;if(screen==='editor'){navigateTo('today');openTaskEditorEdit('t1');}else if(screen==='day'){state.calendarPage.panel='day';state.calendarPage.selectedDayKey=sampleDay;navigateTo('calendar');}else{if(screen==='calendar')state.calendarPage.panel='grid';navigateTo(screen);}};});
 const seed=await page.evaluate(()=>JSON.stringify({tasks:state.tasks,goals:state.tagGoals,english:state.englishChunks}));
 const fullSeed=await page.evaluate(()=>JSON.stringify(state));
 const overflows=[];
 for(const look of ['living']){
  for(const [device,width,height] of [['phone',390,844],['laptop',1280,900]]){
   await page.setViewportSize({width,height});
   for(const screen of ['info','today','calendar','day','editor','more']){
    await page.evaluate(screen=>reviewSetScreen(screen),screen);
    await page.screenshot({path:`artifacts/living-redesign/${look}-${screen}-${device}.png`,fullPage:screen!=='editor'});
   }
  }
  for(const width of [320,360,390,700,768,994,1280,1440]){
   await page.setViewportSize({width,height:900});
   for(const screen of ['info','today','tasks','calendar','day','editor','english','more','settings','ideas','prompts','purchases','subscriptions','repairs','mother','wins','archive','ai-reports']){
    await page.evaluate(screen=>reviewSetScreen(screen),screen);
    const o=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,modal:[...document.querySelectorAll('.modal-box')].some(e=>e.scrollWidth>e.clientWidth+1)}));
    if(o.scroll>width+1||o.modal)overflows.push({look,width,screen,...o});
   }
  }
 }
 console.log('Overflow',JSON.stringify(overflows));
 assert.deepEqual(overflows,[]);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{reviewSetScreen('today')});
 // Complete, undo by reopening, and preserve time/difficulty completion controls.
 await page.locator('.design-task-sheet .today-item').filter({hasText:'مطالعهٔ فصل جدید کتاب'}).locator('.task-check').click();
 await page.locator('.modal-overlay').waitFor();
 assert.equal(await page.evaluate(()=>state.tasks.find(t=>t.id==='t2').done),true);
 await page.evaluate(()=>{skipTaskCompletion();toggleTaskDone('t2');});
 assert.equal(await page.evaluate(()=>state.tasks.find(t=>t.id==='t2').done),false);
 // Quick title uses the native save handler; full metadata stays in the native editor.
 await page.getByRole('textbox',{name:'عنوان کار جدید',exact:true}).fill('کار برای بررسی طرح');
 await page.getByRole('button',{name:'ثبت کار',exact:true}).click();
 assert.ok(await page.evaluate(()=>state.tasks.some(t=>t.title==='کار برای بررسی طرح'&&t.date===sampleDay)));
 await page.getByRole('button',{name:'ویرایش تکمیل طرح اولیهٔ پروژه',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'task-editor-heading');
 assert.equal(await page.locator('main').evaluate(el=>el.inert),true);
 assert.equal(await page.locator('.full-task-editor .pick-chip.on').getAttribute('aria-pressed'),'true');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'editor-title');
 await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),'تایید');
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'editor-title');
 assert.equal(await page.locator('.full-task-editor .priority-chip').count(),3);
 await page.locator('#editor-title').fill('طرح کامل با امکانات قبلی');
 await page.locator('.full-task-editor').getByText('پایین',{exact:true}).click();
 await page.evaluate(()=>editorMoveSubtask(1,-1));
 await page.getByRole('button',{name:'تایید',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.tasks.find(t=>t.id==='t1').priority),'low');
 assert.equal(await page.evaluate(()=>state.tasks.find(t=>t.id==='t1').subtasks[0].id),'s2');
 assert.equal(await page.locator('main').evaluate(el=>el.inert),false);
 await page.evaluate(()=>copyTaskToEditor('t1'));
 assert.equal(await page.evaluate(()=>state.taskEditor.mode),'create');
 await page.evaluate(()=>editorToggleRecurring());
 assert.equal(await page.locator('.full-task-editor .recurring-toggle input').first().isChecked(),true);
 await page.evaluate(()=>{closeTaskEditor();reviewSetScreen('calendar');});
 // Full monthly Jalali calendar, day navigation and existing-task picker.
 assert.ok((await page.locator('main .cal-cell:not(.empty)').count())>=29);
 await page.getByRole('button',{name:'ماه بعد',exact:true}).click();
 await page.getByRole('button',{name:'ماه قبل',exact:true}).click();
 await page.locator('main .cal-cell.today').click();
 await page.getByRole('button',{name:'انتخاب از تسک‌های موجود',exact:false}).click();
 assert.ok(await page.evaluate(()=>!!state.moveTaskPicker));
 await page.evaluate(()=>cancelMoveTaskPicker());
 await page.getByRole('button',{name:'روز بعد',exact:true}).click();
 await page.getByRole('button',{name:'روز قبل',exact:true}).click();
 // English retains all four actual subpages.
 await page.evaluate(()=>reviewSetScreen('english'));
 for(const tab of ['hw','done','stats','settings']){
  await page.evaluate(tab=>{state.englishTab=tab;render();},tab);
  assert.equal(await page.locator('main .repair-tabs button').count(),4);
 }
 await page.evaluate(()=>reviewSetScreen('more'));
 const routes=await page.locator('.design-directory button').evaluateAll(els=>els.map(e=>e.getAttribute('onclick')));
 assert.ok(routes.some(r=>r.includes('repairs'))&&routes.some(r=>r.includes('ideas'))&&routes.some(r=>r.includes('ai-reports')));
 // Verify actual full modules, not navigation stubs.
 await page.getByRole('button',{name:'خانه',exact:true}).click();assert.equal(await page.locator('main .repair-tabs button').count(),4);
 await page.evaluate(()=>navigateTo('ideas'));await page.locator('main #new-idea-body').count();
 await page.getByRole('button',{name:'ویرایش',exact:false}).first().count();
 await page.evaluate(()=>navigateTo('settings'));assert.ok(await page.locator('.tag-goals-section').count());
 await page.evaluate(()=>{reviewSetScreen('today');state.tasks[0].title='بررسی جزئیات طراحی صفحهٔ امروز Website redesign — متن طولانی برای آزمایش نمایش کامل و عدم برخورد با دکمه‌های ویرایش و گزینه‌ها';state.todayExpanded[state.tasks[0].id]=true;render();});
 const collision=await page.locator('.design-task-sheet .today-item-row').first().evaluate(el=>{const a=el.querySelector('.ti-main').getBoundingClientRect(),b=el.querySelector('.design-row-edit').getBoundingClientRect();return a.left<b.right-1;});
 assert.equal(collision,false);
 const unclipped=await page.locator('.design-task-sheet .ti-title').first().evaluate(el=>({clamp:getComputedStyle(el).webkitLineClamp,overflow:getComputedStyle(el).overflow}));
 assert.deepEqual(unclipped,{clamp:'none',overflow:'visible'});
 // The actual daily modules move together, including their controls.
 await page.evaluate(()=>reviewSetScreen('info'));
 assert.equal(await page.locator('.info-daily .today-fold').count(),2);
 await page.locator('.info-daily .today-fold').filter({hasText:'مادر'}).locator('.today-fold-head').click();
 await page.getByRole('button',{name:'خوندم',exact:true}).click();
 assert.equal(await page.locator('.info-daily .today-fold').count(),1);
 await page.evaluate(()=>reviewSetScreen('today'));
 assert.equal(await page.locator('.info-daily').count(),0);
 assert.equal(await page.locator('.design-daily-links').getByText('مادر',{exact:true}).count(),0);
 assert.equal(await page.locator('.design-daily-links').getByText('انگلیسی',{exact:true}).count(),0);
 await page.locator('.design-fold summary').first().click();
 await page.waitForFunction(()=>state.todayOverdueOpen===true);
 await page.evaluate(()=>render());
 assert.equal(await page.locator('.design-fold').first().getAttribute('open'),'');
 // A future task with a due alarm still has a working reminder today.
 await page.evaluate(()=>{state.tasks.push({...state.tasks[0],id:'future-alarm',title:'یادآوری کار آینده',date:shiftSample(3),done:false,reminderAt:new Date(Date.now()-60000).toISOString()});render();});
 await page.locator('.design-daily-links .today-fold-head').click();
 assert.equal(await page.getByRole('button',{name:'یادآوری کار آینده',exact:true}).count(),1);
 await page.evaluate(()=>{state.tagGoals.push({tagId:'removed',weeklyMinutes:30},{tagId:'work',weeklyMinutes:0});reviewSetScreen('info');});
 assert.equal(await page.locator('.overview-goal progress[max="0"]').count(),0);
 // Quick-capture drafts survive deferred background renders.
 await page.evaluate(()=>reviewSetScreen('today'));
 await page.getByRole('textbox',{name:'عنوان کار جدید',exact:true}).fill('پیش‌نویس ثبت سریع');
 assert.equal(await page.evaluate(()=>state.quickTaskTitle),'پیش‌نویس ثبت سریع');
 await page.evaluate(()=>render());
 assert.equal(await page.getByRole('textbox',{name:'عنوان کار جدید',exact:true}).inputValue(),'پیش‌نویس ثبت سریع');
 await page.getByRole('textbox',{name:'عنوان کار جدید',exact:true}).blur();
 await page.getByRole('button',{name:'تقویم',exact:true}).click();
 await page.goBack();
 assert.equal(await page.evaluate(()=>state.view),'today');
 // Full existing account menus are reachable through settings.
 await page.evaluate(()=>reviewSetScreen('settings'));
 await page.getByRole('button',{name:'اعلان‌ها',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.pushMenuOpen),true);
 await page.evaluate(()=>{state.pushMenuOpen=false;render();});
 await page.getByRole('button',{name:'پشتیبان',exact:true}).click();
 assert.equal(await page.evaluate(()=>state.backupMenuOpen),true);
 const writes=await page.evaluate(()=>window.previewWrites);
 assert.ok(writes.some(w=>w.table==='tasks'&&w.trace.some(s=>s.method==='insert')));
 assert.ok(writes.some(w=>w.table==='tasks'&&w.trace.some(s=>s.method==='update')));
 // Fresh sample state for review pictures, after deferred blur renders settle.
 await page.goto(root,{waitUntil:'networkidle'});
 await page.evaluate(()=>{localStorage.removeItem(MOTHER_READ_KEY);render();});
 await page.waitForTimeout(400);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/living-redesign/final-info-phone.png',fullPage:true});
 await page.evaluate(()=>navigateTo('today'));await page.screenshot({path:'artifacts/living-redesign/final-today-phone.png',fullPage:true});
 await page.setViewportSize({width:1280,height:900});await page.goto(root,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'artifacts/living-redesign/final-info-laptop.png',fullPage:true});
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(247, 243, 233)');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 await page.evaluate(()=>renderLogin());
 await page.locator('#loginEmail').fill('review@example.invalid');await page.locator('#loginPassword').fill('sample-only');
 await page.getByRole('button',{name:'ورود',exact:true}).click();
 await page.locator('.login-error').filter({hasText:'ایمیل یا رمز عبور درست نیست.'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>previewSignIn),{email:'review@example.invalid'});
 const report={passed:true,widths:[320,360,390,700,768,994,1280,1440],overflows,errors,unexpectedNetworkRequests:network,scope:'Current production UI; mock database writes. Live auth, server, AI and device push not exercised.'};
 fs.writeFileSync('artifacts/living-redesign/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
