"""Palettes of مدار's themes, in hex. Run  python3 tools/themes.py  from the repo
root after changing a colour: it rewrites the variable blocks at the top of
themes.css (everything before the «نیمه‌شب» section) and leaves the rest alone.
The 'madar' values are exactly the colours tailwind.css used to bake in."""
from pathlib import Path
S = [50,100,200,300,400,500,600,700,800,900,950]
def rgb(h):
    h = h.lstrip('#'); return f"{int(h[0:2],16)} {int(h[2:4],16)} {int(h[4:6],16)}"
def ramp(prefix, vals):
    return [f"  --{prefix}-{s}: {rgb(v)};" for s, v in zip(S, vals) if v]

TW = {
 'rose':    ['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519'],
 'amber':   ['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f','#451a03'],
 'emerald': ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22'],
 'sky':     ['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e','#082f49'],
}
def with_(base, **kw):
    v = list(base)
    for k, x in kw.items(): v[S.index(int(k[1:]))] = x
    return v

themes = {}
# ---- مدار: black & crimson (exactly the values tailwind.css had baked in) ----
neutral = ['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#303034','#1c1c1f','#0e0e10','#000000']
crimson = ['#fff1f1','#ffe6e6','#fbc9c8','#f69694','#f06868','#bc1c28','#8e101c','#760d18','#5c0b14','#460a10','#28060a']
themes['madar'] = dict(
  page='#000000', white='#ffffff', black='#000000', twhite='#ffffff',
  c_slate=neutral,
  b_slate=with_(neutral, s700='#404046', s800='#26262a', s900='#1c1c1f', s950='#0e0e10'),
  t_slate=['#fafafa','#f4f4f5','#f0f0f3','#e4e4e8','#d4d4d8','#c4c4ca','#b0b0b6','#96969c','#1c1c1f','#0e0e10','#000000'],
  c_indigo=crimson, t_indigo=with_(crimson, s500='#e24e50'),
  c_rose=TW['rose'], t_rose=with_(TW['rose'], s500='#fb7185'),
  c_amber=TW['amber'], t_amber=TW['amber'],
  c_emerald=TW['emerald'], t_emerald=TW['emerald'],
  c_sky=TW['sky'], t_sky=TW['sky'],
)
# ---- نیمه‌شب: deep navy & violet ----
navy = ['#f4f6fb','#e6eaf3','#cdd4e4','#a9b3cb','#7a86a3','#56627f','#3b4763','#2a3553','#1d2640','#151c30','#0e1424']
violet = ['#f3f1ff','#e9e5ff','#d4cdff','#b5a8fe','#9a89fb','#7c6cf0','#6455e0','#5143c4','#41369c','#342d7a','#1f1a4a']
themes['midnight'] = dict(
  page='#0b1020', white='#ffffff', black='#03050c', twhite='#ffffff',
  c_slate=navy,
  b_slate=with_(navy, s600='#4d5a7a', s700='#374463', s800='#253049', s900='#1c253c', s950='#161e33'),
  t_slate=['#f7f9fd','#eef1f8','#e4e8f2','#d0d6e6','#b8c0d6','#a3acc6','#97a1bd','#8792b1','#1d2640','#151c30','#0e1424'],
  c_indigo=violet, t_indigo=with_(violet, s300='#c4b9ff', s400='#a898ff', s500='#9787fb'),
  c_rose=TW['rose'], t_rose=with_(TW['rose'], s500='#fb7185'),
  c_amber=TW['amber'], t_amber=TW['amber'],
  c_emerald=TW['emerald'], t_emerald=TW['emerald'],
  c_sky=TW['sky'], t_sky=TW['sky'],
)
# ---- کاغذی: warm paper & ink blue (light) ----
# surfaces run the other way: 950 (the darkest in the dark themes) is the brightest here
paper = ['#1c1b19','#2f2d2a','#4f4c47','#6f6b64','#8f8a81','#a8a39a','#c9c5bc','#e3e0d9','#efece6','#fbfaf8','#ffffff']
ink = ['#eef1ff','#e0e6ff','#c7d0fe','#a3b0fb','#7a88f2','#4558d6','#3346c0','#2a3a9e','#24317f','#c9d1fb','#dde3fd']  # 900/950 only feed soft coloured shadows
themes['paper'] = dict(
  page='#efede8', white='#ffffff', black='#3c342a', twhite='#1b1a18',
  c_slate=paper,
  b_slate=with_(paper, s600='#bdb8ae', s700='#d6d2c9', s800='#e6e3dc', s900='#eeebe5', s950='#f3f1ec'),
  # text-slate-800 draws the empty track of progress rings, text-slate-950 dark text on amber/emerald
  t_slate=['#121211','#1b1a18','#24231f','#2f2d29','#3c3a35','#4b4843','#5a5750','#6e6a62','#e6e3dc','#121211','#121211'],
  c_indigo=ink,
  t_indigo=['#eef1ff','#e0e6ff','#c7d0fe','#3346c0','#3346c0','#3f51cc','#2a3a9e','#24317f','#1f2a66','#1f2a66','#141a40'],
  c_rose=with_(TW['rose'], s900='#fbc4ce', s950='#fde7eb'),
  t_rose=with_(TW['rose'], s200='#9f1239', s300='#9f1239', s400='#ad1239', s500='#b3123b', s900='#881337'),
  c_amber=with_(TW['amber'], s900='#f5d9a8', s950='#f3cf8f'),
  t_amber=with_(TW['amber'], s300='#8a3c09', s400='#8f3f0a', s500='#873b09'),
  c_emerald=with_(TW['emerald'], s900='#bfe8d6', s950='#d3f0e3'),
  t_emerald=with_(TW['emerald'], s300='#046a4d', s400='#046a4d', s500='#047052'),
  c_sky=TW['sky'], t_sky=with_(TW['sky'], s300='#035e90', s400='#03679c'),
)

def block(sel, t, extra):
    out = [f"{sel} {{"]
    out += extra
    out += [f"  --page: {rgb(t['page'])};", f"  --c-white: {rgb(t['white'])};", f"  --c-black: {rgb(t['black'])};", f"  --t-white: {rgb(t['twhite'])};"]
    for fam in ['slate','indigo','rose','amber','emerald','sky']:
        out += ramp(f'c-{fam}', t[f'c_{fam}'])
        out += ramp(f't-{fam}', t[f't_{fam}'])
    out += ramp('b-slate', t['b_slate'])
    out.append('}')
    return '\n'.join(out)

out = '\n'.join([
  block(':root, [data-theme="madar"]', themes['madar'], ['  --tag-text-filter: brightness(1.25) saturate(1.15);']),
  block('[data-theme="midnight"]', themes['midnight'], ['  color-scheme: dark;', '  --tag-text-filter: brightness(1.25) saturate(1.1);']),
  block('[data-theme="paper"]', themes['paper'], ['  color-scheme: light;', '  --tag-text-filter: brightness(.6) saturate(1.35);']),
]) + '\n'
css_path = Path(__file__).resolve().parents[1] / 'themes.css'
css = css_path.read_text()
start = css.index(':root, [data-theme="madar"]')
end = css.index('/* ---------- نیمه‌شب ---------- */')
css_path.write_text(css[:start] + out + '\n' + css[end:])
print('themes.css updated')
