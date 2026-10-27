#!/usr/bin/env python3
"""Sprawl regression sweep: runs index.html in headless Chromium (Python Playwright) and checks
classification, typing flows, drag gestures, snapping/combining, the image store and the intro.

    python3 -I tests/run.py            # from sprawl/
    python3 -I tests/run.py --keep     # keep screenshots in tests/out/

Needs: pip install playwright && playwright install chromium
"""
import base64, json, os, sys, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
URL = (HERE.parent / 'index.html').as_uri()
OUT = HERE / 'out'; OUT.mkdir(exist_ok=True)
EVAL = json.loads((HERE.parent / 'model' / 'eval.json').read_text())
TINY_PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVQIW2P8z8DwnwEIGGEMAD0GBAHl2kA3AAAAAElFTkSuQmCC')

results, errs = [], []
def step(name, fn):
    try: results.append(('ok', name, fn()))
    except Exception: results.append(('FAIL', name, traceback.format_exc().strip().splitlines()[-1][:300]))

# the 34 phrases every release must classify the same way (own examples + edge cases)
CLASSIFIER = [
    ("pack charger, passport and headphones", "todo"), ("# Q4 PLAN", "heading"), ("https://example.com/blog check later", "link"),
    ("why do customers churn?", "question"), ('"less, but better" — dieter rams', "quote"), ("coffee with maya thursday 10am", "event"),
    ("remind me to renew the passport tomorrow", "reminder"), ("20 min stretch", "timer"), ("run 3x a week", "habit"), ("read daily", "habit"),
    ("walk 500 miles this year, 120 done", "goal"), ("#3a7bd5", "color"), ("sky blue", "color"), ("15% of 240", "calc"), ("2+2*3", "calc"),
    ("sqrt(16)", "calc"), ("4 miles in km", "convert"), ("68f to c", "convert"), ("100 kg to lbs", "convert"), ("split 86 between 3", "split"),
    ("spent 14 on lunch", "expense"), ("days until new year", "countdown"), ("countdown to 12/1", "countdown"), ("9am est in london", "timezone"),
    ("time in sydney", "timezone"), ("roll 2d6", "random"), ("flip a coin", "random"), ("pick one: beach, hike or museum", "random"),
    ("tacos, ramen or pizza tonight?", "poll"), ("maya chen 555 201 8890 maya@example.com", "contact"), ("call the dentist @tomorrow", "todo"),
    ("flight to lisbon on 12/3 at 9am", "event"), ("just a thought about things", "note"), ("2026-11-05", "note"),
]

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1400, 'height': 1000}, accept_downloads=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: errs.append(f'CONSOLE {m.type} {m.text}') if m.type in ('error', 'warning') else None)
    S = pg.evaluate
    def boot():
        pg.goto(URL); pg.wait_for_function('window.__sprawl!==undefined'); pg.wait_for_timeout(150)
    def fresh_space():
        S("()=>{ const d=window.__sprawl.db; d.settings.introSeen=true; const s=d.spaces[d.current]; s.cards=[]; s.connections=[]; s.boxes=[]; s.strokes=[]; s.view={x:0,y:0,z:1}; localStorage.setItem('sprawl.v1',JSON.stringify(d)); }"); boot()
    cards = lambda: S('window.__sprawl.db.spaces[window.__sprawl.db.current].cards')
    def type_card(x, y, text):
        pg.mouse.click(x, y); pg.wait_for_timeout(80); pg.keyboard.type(text); pg.wait_for_timeout(100); pg.keyboard.press('Enter'); pg.wait_for_timeout(150)
    def rect(i):
        return S(f"(()=>{{const c=window.__sprawl.db.spaces[window.__sprawl.db.current].cards[{i}]; const r=document.querySelector(`[data-id='${{c.id}}']`).getBoundingClientRect(); return {{id:c.id,x:r.x,y:r.y,w:r.width,h:r.height,cx:c.x,cy:c.y,type:c.type}}}})()")
    def drag(fr, to, hold=None):
        pg.mouse.move(*fr); pg.mouse.down(); pg.mouse.move(fr[0] + 6, fr[1] + 6); pg.mouse.move(*to, steps=12); pg.wait_for_timeout(80)
        r = hold() if hold else None; pg.mouse.up(); pg.wait_for_timeout(150); return r

    # ---- intro on a first visit ----
    boot(); pg.wait_for_timeout(1200)
    def t_intro():
        assert S("!document.querySelector('#intro').hidden"), 'intro hidden'; return 'visible, demo running: ' + S("document.querySelector('.demo-chip').textContent")
    step('intro shows on first visit', t_intro)
    def t_tour():
        pg.click('[data-act="tour"]'); pg.wait_for_timeout(300); name = S('window.__sprawl.db.spaces[window.__sprawl.db.current].name')
        bad = S("""()=>{ const sp=window.__sprawl.db.spaces[window.__sprawl.db.current]; const out=[]; for(const c of sp.cards){ const el=document.querySelector(`[data-id='${c.id}']`); const h=el.offsetHeight,w=el.offsetWidth; if(!sp.boxes.some(b=>c.x>=b.x&&c.y>=b.y&&c.x+w<=b.x+b.w&&c.y+h<=b.y+b.h)) out.push(c.id); } return out; }""")
        assert name == 'Welcome' and not bad, (name, bad); return f'{len(cards())} cards, all inside their boxes'
    step('welcome tour layout', t_tour)

    # ---- classifier ----
    def t_cls():
        got = S('cs=>cs.map(([t,y])=>[t,y,window.__sprawl.rank(t)[0].type])', CLASSIFIER); bad = [g for g in got if g[1] != g[2]]
        assert not bad, bad; return f'{len(got)}/{len(got)}'
    step('classifier regression', t_cls)
    def t_eval():
        got = S('ev=>ev.map(([t,y])=>[t,y,window.__sprawl.ruleRank(t)[0].type,window.__sprawl.rank(t)[0].type])', EVAL)
        r = sum(1 for g in got if g[1] == g[2]); b = sum(1 for g in got if g[1] == g[3]); assert b >= 125, (r, b)
        return f'rules {r}/{len(got)}, blended {b}/{len(got)}'
    step('model eval set', t_eval)

    # ---- typing ----
    fresh_space()
    def t_list():
        type_card(300, 200, 'buy milk, eggs and bread'); c = cards()[-1]; assert c['type'] == 'todo' and c['text'].startswith('Buy:'), c; return c['text'].replace('\n', ' | ')
    step('comma list becomes checklist', t_list)
    def t_shift():
        pg.mouse.click(300, 420); pg.keyboard.type('[ ] first'); pg.keyboard.press('Shift+Enter'); pg.wait_for_timeout(50)
        v = S("document.querySelector('.card textarea').value"); assert v.endswith('\n[ ] '), v; pg.keyboard.type('second'); pg.keyboard.press('Enter'); pg.wait_for_timeout(150); return 'list continues'
    step('shift+enter continues lists', t_shift)
    def t_slash():
        pg.mouse.click(700, 200); pg.keyboard.type('/tim'); pg.wait_for_timeout(100); n = S("document.querySelectorAll('.slash .sl').length"); pg.keyboard.press('Enter'); pg.wait_for_timeout(80)
        pg.keyboard.type('10 min tea'); pg.wait_for_timeout(120); pg.keyboard.press('Enter'); pg.wait_for_timeout(150); c = cards()[-1]; assert c['type'] == 'timer' and c['manual'], c; return f'{n} matches, timer picked'
    step('slash menu', t_slash)
    def t_tab():
        pg.mouse.click(700, 450); pg.keyboard.type('zoom or in person?'); pg.wait_for_timeout(200); pg.keyboard.press('Tab'); pg.wait_for_timeout(80)
        on = S("document.querySelector('.editing .chipS.on').dataset.pick"); pg.keyboard.press('Enter'); pg.wait_for_timeout(150); c = cards()[-1]; assert c['type'] == on and c['manual'], (c['type'], on); return f'tab -> {on}'
    step('tab cycles and sticks', t_tab)
    def t_edit():
        a = rect(0); pg.mouse.click(a['x'] + a['w'] / 2, a['y'] + a['h'] / 2); pg.wait_for_timeout(120); assert S("document.querySelector('.card.editing')!==null")
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100); return 'click edits, esc commits'
    step('edit existing card', t_edit)

    # ---- gestures ----
    fresh_space(); type_card(300, 200, 'first item'); type_card(300, 600, 'second item'); type_card(900, 200, 'third item')
    def t_move():
        a = rect(0); drag((a['x'] + a['w'] / 2, a['y'] + a['h'] / 2), (a['x'] + 60 + a['w'] / 2, a['y'] + 120 + a['h'] / 2)); a2 = rect(0); assert abs(a2['x'] - a['x'] - 60) < 10, (a, a2); return 'moved'
    step('drag moves a card', t_move)
    def t_connect():
        a, b = rect(0), rect(2); pg.mouse.move(a['x'] + a['w'] / 2, a['y'] + a['h'] / 2); pg.wait_for_timeout(60)
        drag((a['x'] + a['w'] - 0.5, a['y'] + a['h'] / 2), (b['x'] + b['w'] / 2, b['y'] + b['h'] / 2)); n = S('window.__sprawl.db.spaces[window.__sprawl.db.current].connections.length'); assert n == 1; return 'connected'
    step('handle connects', t_connect)
    def t_snap():
        a, b = rect(0), rect(1); slot = drag((b['x'] + b['w'] / 2, b['y'] + b['h'] / 2), (a['x'] + b['w'] / 2, a['y'] + a['h'] + 40 + b['h'] / 2), lambda: S("getComputedStyle(document.querySelector('#snapSlot')).display"))
        a2, b2 = rect(0), rect(1); assert slot == 'block' and b2['cx'] == a2['cx'] and b2['cy'] == a2['cy'] + round(a['h']) + 12, (slot, a2, b2); return 'snapped under'
    step('snap into list', t_snap)
    def t_insert():
        a, b, c = rect(0), rect(1), rect(2); drag((c['x'] + c['w'] / 2, c['y'] + c['h'] / 2), (a['x'] + c['w'] / 2, a['y'] + a['h'] + 18 + c['h'] / 2))
        a2, b2, c2 = rect(0), rect(1), rect(2); assert c2['cy'] == a2['cy'] + round(a['h']) + 12 and b2['cy'] == c2['cy'] + round(c2['h']) + 12, (a2, b2, c2); return 'list made room'
    step('insert between list items', t_insert)
    def t_close():
        a, b, c = rect(0), rect(1), rect(2); drag((a['x'] + a['w'] / 2, a['y'] + a['h'] / 2), (a['x'] + 500, a['y'] + a['h'] / 2)); c2 = rect(2); assert c2['cy'] == a['cy'], (c2, a); return 'gap closed'
    step('drag out closes gap', t_close)
    def t_merge():
        a, c = rect(0), rect(2); n = len(cards()); label = drag((a['x'] + a['w'] / 2, a['y'] + a['h'] / 2), (c['x'] + a['w'] / 2, c['y'] + c['h'] - 4 + a['h'] / 2), lambda: S("document.querySelector('#mergeBar span').textContent"))
        assert len(cards()) == n - 1, (label, n); pg.keyboard.press('Meta+z'); pg.wait_for_timeout(120); assert len(cards()) == n; return label + ' (undone)'
    step('overlap combines, undo restores', t_merge)
    def t_resize():
        a = rect(0); pg.mouse.move(a['x'] + a['w'] / 2, a['y'] + a['h'] / 2); pg.wait_for_timeout(60); drag((a['x'] + a['w'] + 2, a['y'] + a['h'] + 2), (a['x'] + a['w'] + 82, a['y'] + a['h'] + 42))
        c = cards()[0]; assert c['w'] >= a['w'] + 60 and c.get('h'), (c['w'], c.get('h')); return f"w {round(a['w'])}->{c['w']} h {c['h']}"
    step('corner resize', t_resize)
    def t_move_space():
        cid = cards()[0]['id']; a = rect(0); pg.mouse.click(a['x'] + a['w'] / 2, a['y'] + a['h'] / 2, button='right'); pg.wait_for_timeout(150); pg.click('.pop [data-act="move"]'); pg.wait_for_timeout(150)
        pg.once('dialog', lambda d: d.accept('Other')); pg.click('.pop [data-act="new"]'); pg.wait_for_timeout(250); pg.keyboard.press('Meta+z'); pg.wait_for_timeout(150)
        where = S('cid=>Object.values(window.__sprawl.db.spaces).filter(s=>s.cards.some(c=>c.id===cid)).map(s=>s.name)', cid); assert where == ['Scratch'] or len(where) == 1, where; return f'after undo in {where}'
    step('move to space + undo', t_move_space)

    # ---- palette, today, templates, present ----
    def t_capture():
        pg.keyboard.press('Meta+k'); pg.wait_for_timeout(100); pg.keyboard.type('remind me to pay the plumber tomorrow'); pg.wait_for_timeout(150); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
        ib = [s for s in S('Object.values(window.__sprawl.db.spaces)') if s['kind'] == 'inbox']; assert ib and ib[0]['cards'][0]['type'] == 'reminder'; return 'inbox reminder'
    step('palette capture', t_capture)
    def t_today():
        pg.keyboard.press('t'); pg.wait_for_timeout(200); txt = S("document.querySelector('#today').innerText"); pg.keyboard.press('Escape'); assert 'plumber' in txt; return 'today lists it'
    step('today panel', t_today)
    def t_deck():
        pg.keyboard.press('Meta+k'); pg.wait_for_timeout(80); pg.keyboard.type('pitch deck'); pg.wait_for_timeout(150); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
        nb = S('window.__sprawl.db.spaces[window.__sprawl.db.current].boxes.length'); pg.keyboard.press('Escape'); pg.keyboard.press('p'); pg.wait_for_timeout(700)
        pres = S("document.body.classList.contains('presenting')"); pg.keyboard.press('Escape'); pg.wait_for_timeout(100); assert nb == 4 and pres; return '4 slides, presented'
    step('template + present', t_deck)

    # ---- images ----
    def t_img():
        (OUT / 'tiny.png').write_bytes(TINY_PNG); pg.click('#addBtn'); pg.wait_for_timeout(100)
        with pg.expect_file_chooser() as fc: pg.click('.pop [data-act="image"]')
        fc.value.set_files(str(OUT / 'tiny.png')); pg.wait_for_timeout(500); c = cards()[-1]; assert c['img'].startswith('idb:'), c['img']
        boot(); c2 = cards()[-1]; nat = S(f"document.querySelector(\"[data-id='{c2['id']}'] img\").naturalWidth"); assert nat == 2; return 'stored in IndexedDB, survives reload'
    step('image store', t_img)
    def t_export():
        pg.click('#setBtn'); pg.wait_for_timeout(100)
        with pg.expect_download() as dl: pg.click('#expJson')
        d = json.load(open(dl.value.path())); imgs = [c['img'] for s in d['spaces'].values() for c in s['cards'] if c.get('img')]
        assert d['settings']['gist']['token'] == '' and imgs and imgs[0].startswith('data:'); pg.keyboard.press('Escape'); return 'token stripped, images inlined'
    step('export backup', t_export)

    # ---- phone layout ----
    m = ctx.new_page(); m.set_viewport_size({'width': 390, 'height': 844}); m.goto(URL); m.wait_for_function('window.__sprawl!==undefined'); m.wait_for_timeout(300)
    def t_mobile():
        ov = m.evaluate('document.documentElement.scrollWidth>document.documentElement.clientWidth'); assert not ov; m.screenshot(path=str(OUT / 'mobile.png')); return 'no horizontal overflow'
    step('phone layout', t_mobile)
    pg.screenshot(path=str(OUT / 'desktop.png'))
    browser.close()

fails = [r for r in results if r[0] == 'FAIL']
for r in results: print(f'{r[0]:4} {r[1]:32} {r[2]}')
print('page errors:', *errs, sep='\n  ') if errs else print('page errors: none')
if '--keep' not in sys.argv:
    for f in OUT.iterdir(): f.unlink()
    OUT.rmdir()
sys.exit(1 if fails or errs else 0)
