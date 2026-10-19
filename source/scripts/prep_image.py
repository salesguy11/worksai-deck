#!/usr/bin/env python3
"""이미지 변환: 리사이즈 + 마스킹 + WebP 저장.
사용: prep_image.py IN OUT [--max-width 1600] [--quality 80]
        [--mask x,y,w,h]...  (원본 좌표, 주변 배경색으로 칠함)
        [--hstack IN2]       (두 이미지를 좌우로 이어붙임)
"""
import argparse, sys
from PIL import Image, ImageDraw

def sample_bg(im, x, y, w, h):
    # 마스크 영역 바로 위쪽 띠에서 가장 흔한 색을 배경색으로 사용
    from collections import Counter
    c = Counter()
    y0 = max(0, y - 8)
    for yy in range(y0, y):
        for xx in range(x, min(im.width, x + w)):
            c[im.getpixel((xx, yy))] += 1
    return c.most_common(1)[0][0] if c else (255, 255, 255)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--max-width', type=int, default=1600)
    ap.add_argument('--quality', type=int, default=80)
    ap.add_argument('--mask', action='append', default=[])
    ap.add_argument('--hstack')
    a = ap.parse_args()
    im = Image.open(a.src).convert('RGB')
    if a.hstack:
        b = Image.open(a.hstack).convert('RGB')
        h = min(im.height, b.height)
        im = im.resize((int(im.width * h / im.height), h)); b = b.resize((int(b.width * h / b.height), h))
        s = Image.new('RGB', (im.width + b.width, h), 'white'); s.paste(im, (0, 0)); s.paste(b, (im.width, 0)); im = s
    d = ImageDraw.Draw(im)
    for m in a.mask:
        x, y, w, h = [int(v) for v in m.split(',')]
        d.rectangle([x, y, x + w, y + h], fill=sample_bg(im, x, y, w, h))
    if im.width > a.max_width:
        im = im.resize((a.max_width, round(im.height * a.max_width / im.width)), Image.LANCZOS)
    im.save(a.dst, 'WEBP', quality=a.quality, method=6)
    print(a.dst, im.size)

if __name__ == '__main__':
    main()
