"""Local visual harness for the مدار interface — sample data, no backend.

  python3 tests/ui-harness/serve.py            (port 8770, or PORT=…)
  MADAR_DESIGN_REFS=/path/to/madar-design  also serves the UX Pilot exports under /refs/

  /app?view=tasks&edit=task-design   the app with mock.js in place of supabase-js
                                     (reads from fixture.js, every write is only
                                     recorded in window.__writes) and no service worker
  /compare.html?ref=/refs/desktop/<id>.html&app=/app%3Fview%3D…&s=0.5&x=640
                                     reference | app side by side, same region
  /tools/tailwind-build.html         rebuilds tailwind.css (POST /__save writes it)
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
import json, os, re

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
REFS = Path(os.environ['MADAR_DESIGN_REFS']).resolve() if os.environ.get('MADAR_DESIGN_REFS') else None

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_bytes(self, b, kind):
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        u = urlsplit(self.path)
        if u.path == '/app':
            html = (ROOT / 'index.html').read_text()
            opts = {k: v[0] for k, v in parse_qs(u.query).items()}
            html = html.replace('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
                                f'<script>window.__MOCK_OPTS={json.dumps(opts)};</script><script src="./fixture.js"></script><script src="./mock.js"></script>')
            html = html.replace("if('serviceWorker' in navigator){", "if(false){")
            return self.send_bytes(html.encode(), 'text/html; charset=utf-8')
        if u.path in ('/mock.js', '/fixture.js', '/compare.html'):
            kind = 'text/html; charset=utf-8' if u.path.endswith('.html') else 'application/javascript'
            return self.send_bytes((HERE / u.path[1:]).read_bytes(), kind)
        if u.path.startswith('/refs/') and REFS:
            p = (REFS / u.path[len('/refs/'):]).resolve()
            if p.is_file() and p.is_relative_to(REFS):
                return self.send_bytes(p.read_bytes(), 'text/html; charset=utf-8')
            return self.send_error(404)
        return super().do_GET()

    def do_POST(self):
        u = urlsplit(self.path)
        rel = parse_qs(u.query).get('path', [''])[0]
        if u.path != '/__save' or rel != 'tailwind.css':
            return self.send_error(400)
        n = int(self.headers.get('Content-Length', 0))
        (ROOT / rel).write_bytes(self.rfile.read(n))
        self.send_bytes(b'ok', 'text/plain')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8770'))
    print(f'harness on http://127.0.0.1:{port}/app', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
