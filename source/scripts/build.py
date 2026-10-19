#!/usr/bin/env python3
"""deck.json -> 단일 HTML. 사용: build.py DECK.json OUT.html [--audience internal|customer]
deck.json: {"meta":{...},"assets":{"key":"img/file.webp"},"pages":[...]}
- 이미지는 base64 로 내장, 외부 리소스 없음.
- audience=customer 이고 ev:"u"(근거 미확인) 항목이 있으면 빌드 실패.
"""
import argparse, base64, json, mimetypes, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSET = os.path.join(HERE, '..', 'assets')

def rd(name):
    with open(os.path.join(ASSET, name), encoding='utf-8') as f:
        return f.read()

def find_unverified(o, path='deck', out=None):
    out = [] if out is None else out
    if isinstance(o, list):
        for i, x in enumerate(o): find_unverified(x, f'{path}[{i}]', out)
    elif isinstance(o, dict):
        if o.get('ev') == 'u' or o.get('badgeEv') == 'u': out.append(path)
        for k, v in o.items(): find_unverified(v, f'{path}.{k}', out)
    return out

def jdump(o):
    return json.dumps(o, ensure_ascii=False, indent=2).replace('<', '\\u003c')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('deck'); ap.add_argument('out')
    ap.add_argument('--audience', choices=['internal', 'customer'])
    ap.add_argument('--allow-unverified', action='store_true', help='사용자가 근거 미확인 항목 사용을 명시 승인한 경우에만 사용')
    a = ap.parse_args()
    base = os.path.dirname(os.path.abspath(a.deck))
    deck = json.load(open(a.deck, encoding='utf-8'))
    if a.audience: deck.setdefault('meta', {})['audience'] = a.audience
    aud = deck.get('meta', {}).get('audience', 'internal')
    bad = find_unverified(deck.get('pages', []))
    if a.allow_unverified: deck['meta']['approvedUnverified'] = len(bad)
    if aud == 'customer' and bad and not a.allow_unverified:
        sys.exit('빌드 중단: 고객용인데 근거 미확인(ev:u) 항목 %d건\n  ' % len(bad) + '\n  '.join(bad[:20]))
    assets = {}
    for k, rel in (deck.pop('assets', {}) or {}).items():
        p = os.path.join(base, rel)
        mt = mimetypes.guess_type(p)[0] or 'image/webp'
        if p.endswith('.webp'): mt = 'image/webp'
        assets[k] = 'data:%s;base64,%s' % (mt, base64.b64encode(open(p, 'rb').read()).decode())
    html = rd('shell.html')
    for ph, val in [('__TITLE__', deck['meta']['title'].replace('<', '')), ('/*FONTS*/', rd('fonts.css')), ('/*STYLE*/', rd('style.css')),
                    ('/*DATA*/', jdump(deck)), ('/*ASSETS*/', json.dumps(assets)), ('/*ENGINE*/', rd('engine.js'))]:
        html = html.replace(ph, val, 1)
    with open(a.out, 'w', encoding='utf-8') as f: f.write(html)
    print('OK %s  %.2f MB  pages=%d  audience=%s  unverified=%d' % (a.out, len(html.encode()) / 1e6, len(deck['pages']), aud, len(bad)))

if __name__ == '__main__':
    main()
