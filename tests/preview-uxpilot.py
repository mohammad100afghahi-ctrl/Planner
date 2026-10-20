"""Local-only visual review with synthetic records and blocked backend access.

Run: python3 tests/preview-uxpilot.py
Open: http://127.0.0.1:8766/__review/index.html
Production index.html never references this harness or the fixture.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, unquote
import json
import re
import os

ROOT = Path(__file__).resolve().parents[1]
REFERENCES = Path(os.environ.get('MADAR_DESIGN_REFS', str(ROOT/'design-reference'))).resolve()
VIEWS = {'today','tasks','calendar','english','ideas','prompts','purchases','subscriptions','wins','mother','repairs','settings','archive','ai-reports'}
MOCK = r"""
const reviewNativeFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{
 const url=typeof input==='string'?input:input.url;
 if(String(url).includes('.supabase.co'))return Promise.resolve(new Response(JSON.stringify({error:'Local review has no backend access'}),{status:503,headers:{'Content-Type':'application/json'}}));
 return reviewNativeFetch(input,options);
};
window.supabase={createClient(){
 const chain=()=>{const result={data:[],error:null};let p; p=new Proxy({}, {get(_,key){if(key==='then')return (ok,fail)=>Promise.resolve(result).then(ok,fail);return ()=>p;}});return p;};
 return {from:chain,rpc:async()=>({data:null,error:{message:'Unavailable in local review'}}),auth:{onAuthStateChange(){},getSession:async()=>({data:{session:null}}),signOut:async()=>({error:null}),signInWithPassword:async()=>({error:{message:'Local review only'}})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}};
}};
"""

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def send_text(self,text,kind='text/html; charset=utf-8'):
        b=text.encode();self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
    def do_GET(self):
        parsed=urlsplit(self.path);path=unquote(parsed.path)
        if path.startswith('/__reference/'):
            p=(REFERENCES/path.removeprefix('/__reference/')).resolve()
            if not p.is_relative_to(REFERENCES) or not p.is_file():return self.send_error(404)
            return self.send_text(p.read_text())
        if path=='/__review/mock.js':return self.send_text(MOCK,'application/javascript')
        if path=='/__review/fixture.js':return self.send_text((ROOT/'tests/uxpilot-fixture.js').read_text(),'application/javascript')
        if path in ('/__review/','/__review/index.html'):
            html=(ROOT/'index.html').read_text()
            html=re.sub(r'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>','<script src="./mock.js"></script>',html)
            html=html.replace("if('serviceWorker' in navigator){","if(false){")
            q=parse_qs(parsed.query);view=q.get('view',['today'])[0]
            if view not in VIEWS:view='today'
            setup=f'uxSeedDemo();state.view={json.dumps(view)};'
            if q.get('mode')==['edit']:setup+="openTaskEditorEdit('task-design');"
            if view=='settings':setup+='state.tagManagerOpen=true;'
            setup+='render();'
            setup+="""const reportLayout=()=>parent.postMessage({kind:'madar-review-layout',width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,view:document.body.dataset.view},location.origin);addEventListener('resize',reportLayout);setTimeout(reportLayout,600);addEventListener('error',e=>parent.postMessage({kind:'madar-review-error',message:e.message},location.origin));"""
            html=html.replace('</body>',f'<script src="./fixture.js"></script><script>{setup}</script></body>')
            return self.send_text(html)
        if path.startswith('/__review/'):
            self.path=path.removeprefix('/__review')
        return super().do_GET()

if __name__=='__main__':
    print('Synthetic review: http://127.0.0.1:8766/__review/index.html',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8766),Handler).serve_forever()
