"""Isolated sample-data preview of the CURRENT production files, not a separate UI."""
from pathlib import Path
import re, base64

root=Path(__file__).resolve().parents[1]
out=root/'artifacts/living-redesign'
html=(root/'index.html').read_text()
mock='''<script>
window.previewWrites=[];
function previewQuery(table,trace=[]){return new Proxy({}, {get:(_,key)=>key==='then'?((resolve,reject)=>{window.previewWrites.push({table,trace});return Promise.resolve({data:[],error:null}).then(resolve,reject);}):(...args)=>previewQuery(table,[...trace,{method:key,args}])});}
window.supabase={createClient:()=>({from:previewQuery,rpc:async()=>({data:null,error:null}),auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:{id:'preview'}}}),signInWithPassword:async(args)=>{window.previewSignIn={email:args.email};return {error:{message:'Invalid sample login'}};}},functions:{invoke:async()=>({data:null,error:new Error('سرویس آنلاین در پیش‌نمایش فعال نیست.')})}})};
window.fetch=async()=>{throw new Error('No live services in preview');};
</script>'''
html=html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',mock)
for name in ['task-reminders.js','ui-redesign.js']:
    html=html.replace(f'<script src="{name}"></script>','<script>'+(root/name).read_text()+'</script>')
html=html.replace('<link rel="stylesheet" href="ui-redesign.css">','<style>'+(root/'ui-redesign.css').read_text()+'</style>')
html=html.replace('src="icon-192.png"','src="data:image/png;base64,'+base64.b64encode((root/'icon-192.png').read_bytes()).decode()+'"')
html=re.sub(r'<link rel="(?:manifest|icon|apple-touch-icon)"[^>]*>','',html)
html=re.sub(r"const SUPABASE_URL = '[^']*';","const SUPABASE_URL = 'https://preview.invalid';",html)
html=re.sub(r"const SUPABASE_ANON_KEY = '[^']*';","const SUPABASE_ANON_KEY = 'sample-only';",html)
html=html.replace("localStorage.getItem(sb.auth.storageKey || 'sb-byqowlvyupcusjjyxwaf-auth-token')",'null')
html=html.replace("indexedDB.open('medar-offline', 1)","indexedDB.open('medar-living-review', 1)")
html=html.replace("'medar-","'living-review-medar-")
a=html.index('/* ---------- PWA: register the app-shell service worker ----------')
b=html.index('</script>',a)
html=html[:a]+'// No service worker in review.\n'+html[b:]
fixture=(root/'tests/fixtures/living-sample.js').read_text()
fixture=fixture.replace("state.pushStatus='off';", "state.pushStatus='off';")
html=html.replace('</body>','<script>'+fixture+"\nstate.view='info';render();</script></body>")
html=html.replace('</head>', '''<meta http-equiv="Content-Security-Policy" content="default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; worker-src 'none'; object-src 'none'"></head>''')
html=html.replace('<title>مدار</title>','<title>مدار · پیش‌نمایش زنده</title>')
assert 'eyJhbGci' not in html and 'serviceWorker.register(' not in html
assert 'byqowlvyupcusjjyxwaf' not in html
out.mkdir(parents=True,exist_ok=True)
(out/'index.html').write_text(html)
print(out/'index.html')
