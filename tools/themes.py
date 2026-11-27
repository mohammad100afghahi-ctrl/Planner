"""مدار's colour palette, in hex. Run  python3 tools/themes.py  from the repo root
after changing a colour: it rewrites the variable block at the top of themes.css
(everything before the «پوسته‌ها» marker) and leaves the rest alone.

One palette (black & crimson). The skins (کلاسیک، شیشه‌ای، برجسته) change shapes,
depth and surfaces in skins.css, never these colours."""
from pathlib import Path

S = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
def rgb(h):
    h = h.lstrip('#'); return f"{int(h[0:2],16)} {int(h[2:4],16)} {int(h[4:6],16)}"
def ramp(prefix, vals):
    return [f"  --{prefix}-{s}: {rgb(v)};" for s, v in zip(S, vals)]
def with_(base, **kw):
    v = list(base)
    for k, x in kw.items(): v[S.index(int(k[1:]))] = x
    return v

TW = {
 'rose':    ['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337','#4c0519'],
 'amber':   ['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f','#451a03'],
 'emerald': ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b','#022c22'],
 'sky':     ['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e','#082f49'],
}
# surfaces: 950 is the page (it was pure black until 2026-11-27 — too harsh to read on),
# 900 cards, 800 raised/hover, 700 tracks
neutral = ['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#36363c','#26262b','#1b1b1f','#131316']
crimson = ['#fff1f1','#ffe6e6','#fbc9c8','#f69694','#f06868','#bc1c28','#8e101c','#760d18','#5c0b14','#460a10','#28060a']
P = dict(
  page=neutral[-1], white='#ffffff', black='#000000', twhite='#ffffff',
  c_slate=neutral,
  b_slate=with_(neutral, s700='#46464d', s800='#2e2e34', s900='#232328', s950='#1b1b1f'),
  # text-slate-800 draws empty progress-ring tracks; 900/950 are dark text on amber/emerald fills
  t_slate=['#fafafa','#f4f4f5','#f0f0f3','#e4e4e8','#d4d4d8','#c4c4ca','#b0b0b6','#96969c','#26262b','#0e0e10','#000000'],
  c_indigo=crimson, t_indigo=with_(crimson, s500='#e24e50'),
  c_rose=TW['rose'], t_rose=with_(TW['rose'], s500='#fb7185'),
  c_amber=TW['amber'], t_amber=TW['amber'],
  c_emerald=TW['emerald'], t_emerald=TW['emerald'],
  c_sky=TW['sky'], t_sky=TW['sky'],
)

out = [':root {', '  --tag-text-filter: brightness(1.25) saturate(1.15);',
       f"  --page: {rgb(P['page'])};", f"  --c-white: {rgb(P['white'])};",
       f"  --c-black: {rgb(P['black'])};", f"  --t-white: {rgb(P['twhite'])};"]
for fam in ['slate', 'indigo', 'rose', 'amber', 'emerald', 'sky']:
    out += ramp(f'c-{fam}', P[f'c_{fam}'])
    out += ramp(f't-{fam}', P[f't_{fam}'])
out += ramp('b-slate', P['b_slate'])
out.append('}')

MARK = '/* ---------- پوسته‌ها ---------- */'
css_path = Path(__file__).resolve().parents[1] / 'themes.css'
css = css_path.read_text()
start = css.index(':root')
end = css.index(MARK)
css_path.write_text(css[:start] + '\n'.join(out) + '\n\n' + css[end:])
print('themes.css updated')
