/* Local-only stand-in for supabase-js. Reads come from window.FIXTURE, writes are
   recorded in window.__writes and never leave the page. */
(function(){
  const opts = window.__MOCK_OPTS || {};
  const writes = window.__writes = [];
  const session = { access_token:'mock-token', user:{ id:'mock-user', email:'user@example.com' } };
  const signedIn = opts.login !== '1';
  function table(name){ return (window.FIXTURE.tables[name] || []); }
  function chain(name){
    let op = 'select', payload = null, single = null; const filters = [];
    const q = {
      select(){ return q; }, order(){ return q; }, limit(){ return q; },
      eq(k, v){ filters.push([k, v]); return q; }, in(k, v){ filters.push([k, v]); return q; },
      insert(p){ op = 'insert'; payload = p; return q; },
      update(p){ op = 'update'; payload = p; return q; },
      upsert(p){ op = 'upsert'; payload = p; return q; },
      delete(){ op = 'delete'; return q; },
      maybeSingle(){ single = 'maybe'; return q; }, single(){ single = 'one'; return q; },
      then(ok, fail){
        let res;
        if(op === 'select'){
          let rows = table(name);
          filters.forEach(([k, v]) => { rows = rows.filter(r => Array.isArray(v) ? v.includes(r[k]) : r[k] === v); });
          res = { data: single ? (rows[0] || null) : rows, error: null };
        } else {
          writes.push({ table:name, op, payload, filters });
          console.log('[mock write]', name, op, JSON.stringify(payload || filters).slice(0, 300));
          res = { data: null, error: null };
        }
        return Promise.resolve(res).then(ok, fail);
      },
    };
    return q;
  }
  window.supabase = { createClient(){
    return {
      from: chain,
      rpc: async (fn, args) => { writes.push({ rpc:fn, args }); return fn === 'backup_now' ? { data:{ app:'madar', created_at:new Date().toISOString(), tables:{} }, error:null } : { data:'pre-id', error:null }; },
      auth: {
        storageKey: 'sb-mock-auth',
        onAuthStateChange(cb){ setTimeout(() => cb(signedIn ? 'SIGNED_IN' : 'INITIAL_SESSION', signedIn ? session : null), 0); return { data:{ subscription:{ unsubscribe(){} } } }; },
        getSession: async () => ({ data:{ session: signedIn ? session : null } }),
        getUser: async () => ({ data:{ user: signedIn ? session.user : null } }),
        refreshSession: async () => ({ data:{ session } }),
        signOut: async () => ({ error:null }),
        signInWithPassword: async () => ({ error:{ message:'invalid login (mock)' } }),
      },
      channel(){ const c = { state:'joined', on(){ return c; }, subscribe(){ return c; } }; return c; },
      removeChannel(){},
      functions: { invoke: async () => ({ data:{ text: window.FIXTURE.encouragement }, error:null }) },
    };
  }};
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if(/\/functions\/v1\//.test(url)){
      writes.push({ fn:url.split('/functions/v1/')[1], body: init && init.body });
      let body = { ok:true };
      if(url.includes('english-plan')) body = { chunks:[{ day:new Date().toISOString().slice(0,10), minutes:15, title:'بخش اول تکلیف' }] };
      if(url.includes('send-push')) body = { publicKey:'BPxxxx', sent:1 };
      if(url.includes('generate-ai-report')) body = { skipped:true };
      return Promise.resolve(new Response(JSON.stringify(body), { status:200, headers:{ 'Content-Type':'application/json' } }));
    }
    if(/supabase\.co/.test(url)) return Promise.resolve(new Response('{}', { status:503 }));
    return realFetch(input, init);
  };
  // ?view=…&edit=taskId&js=… open a given screen once the app has booted
  window.addEventListener('load', () => setTimeout(() => {
    if(!signedIn) return;
    if(opts.view){ state.view = opts.view; if(opts.view === 'ai-reports') markAIReportsSeen(); }
    if(opts.edit) openTaskEditorEdit(opts.edit);
    if(opts.js) (0, eval)(opts.js);
    render();
  }, 400));
  try{ localStorage.clear(); }catch(_e){}
})();
