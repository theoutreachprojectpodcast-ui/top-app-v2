"""
Derive / refresh logo assets under web/public/.

- Dark master `brand-logo-site.png`: if it already has transparency (alpha < 255 somewhere),
  it is treated as a finished export — byte-copied to `brand-logo-site-dark.png` with no
  knockout or blur. Opaque black-plate masters still use edge flood + soft alpha.
- Light: byte-copied from `brand-logo-site-light-import.png` when present.

Run from repo: python web/scripts/derive-logo-variants.py

Design originals (sync): see web/scripts/sync-brand-logos-from-assets.ps1
"""
from __future__ import annotations

import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "brand-logo-site.png"
OUT_DARK = ROOT / "public" / "brand-logo-site-dark.png"
OUT_LIGHT = ROOT / "public" / "brand-logo-site-light.png"
OUT_MARK_DARK = ROOT / "public" / "brand-logo-mark-dark.png"
OUT_MARK_LIGHT = ROOT / "public" / "brand-logo-mark-light.png"
LIGHT_IMPORT = ROOT / "public" / "brand-logo-site-light-import.png"

BG_THRESH = 24
# Near-white / silver (wordmark on dark plate) → ink on light
LIGHT_INK = (17, 23, 20)  # aligns with --color-text-primary
# Icon (top): remap neutral highlights; threshold must catch gray AA on wordmark
# that sits visually under the mark but above ~1/3 of canvas height.
ICON_LUM_MIN = 0.58
ICON_SAT_MAX = 0.32
# Wordmark band: slightly more aggressive for silver / faint fills on dark plate.
TEXT_LUM_MIN = 0.5
TEXT_SAT_MAX = 0.42
# Start early — first line often begins well above mid-canvas depending on crop.
TEXT_BAND_Y = 0.18
# Green fill / gradient: do not recolor
GREEN_MIN_SAT = 0.1


def remove_outer_black(img: Image.Image) -> Image.Image:
    im = img.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)

    def idx(x: int, y: int) -> int:
        return y * w + x

    def floodable(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        if a < 8:
            return True
        return max(r, g, b) <= BG_THRESH

    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h:
            return
        i = idx(x, y)
        if seen[i]:
            return
        if not floodable(x, y):
            return
        seen[i] = 1
        q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or nx >= w or ny < 0 or ny >= h:
                continue
            i = idx(nx, ny)
            if seen[i]:
                continue
            if not floodable(nx, ny):
                continue
            seen[i] = 1
            q.append((nx, ny))

    for y in range(h):
        for x in range(w):
            if seen[idx(x, y)]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)

    return im


def _lum_sat(r: int, g: int, b: int) -> tuple[float, float]:
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == 0:
        return 0.0, 0.0
    sat = (mx - mn) / mx
    lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
    return lum, sat


def _is_green_pixel(r: int, g: int, b: int, a: int) -> bool:
    """True for brand green fills and PROJECT gradient (including darker forest tones)."""
    if a < 30:
        return False
    # Cream / tan ring: r≈g high, b lower but still "muddy"; not lime (min channel low).
    mn = min(r, g, b)
    if (
        mn > 95
        and abs(r - g) < 22
        and b == mn
        and (r + g + b) / 3 > 150
        and g < max(r, b) + 8
    ):
        return False
    _, sat = _lum_sat(r, g, b)
    # Bright mint / highlight: require a clear green lead (fringe grays are ~246,243,237).
    if g >= max(r, b) + 10 and g >= 165:
        return True
    if sat < GREEN_MIN_SAT:
        return False
    if g < 48:
        return False
    # Green leads, or near-neutral greenish (dark forest) where g still tops r,b
    if g >= r + 4 and g >= b + 4:
        return True
    if g >= r and g >= b and sat >= 0.14 and (r + b) < 2 * g:
        return True
    return False


def light_variant(im: Image.Image) -> Image.Image:
    """Map highlight neutrals to ink; leave greens and near-black strokes."""
    out = im.copy().convert("RGBA")
    px = out.load()
    w, h = out.size
    ir, ig, ib = LIGHT_INK
    y_text = int(h * TEXT_BAND_Y)

    for y in range(h):
        text_row = y >= y_text
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            lum, sat = _lum_sat(r, g, b)
            if _is_green_pixel(r, g, b, a):
                continue
            # Keep black/dark ink strokes (wordmark outlines on dark plate)
            if max(r, g, b) <= 52 and lum < 0.34:
                continue
            if text_row:
                if lum >= TEXT_LUM_MIN and sat <= TEXT_SAT_MAX:
                    px[x, y] = (ir, ig, ib, a)
            else:
                if lum >= ICON_LUM_MIN and sat <= ICON_SAT_MAX:
                    px[x, y] = (ir, ig, ib, a)

    return out


def solidify_unmatted_neutrals(im: Image.Image) -> Image.Image:
    """
    AA pixels are premultiplied on the dark plate; on white they read as speckles/halos.
    Un-premultiply and snap **bright** unmatted neutrals to solid ink (skip greens).

    Mid-gray + low alpha often sits *inside* letter counters — inking those causes
    dark blotches; skip when alpha is weak and local neighborhood is also weak.
    """
    out = im.copy().convert("RGBA")
    px = out.load()
    w, h = out.size
    ir, ig, ib = LIGHT_INK
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 40 or a >= 254:
                continue
            if a < 130:
                nmax = 0
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nmax = max(nmax, px[nx, ny][3])
                if nmax < 150:
                    continue
            f = 255.0 / a
            ru = min(255, int(r * f + 0.5))
            gu = min(255, int(g * f + 0.5))
            bu = min(255, int(b * f + 0.5))
            if _is_green_pixel(ru, gu, bu, 255):
                continue
            lum_u, sat_u = _lum_sat(ru, gu, bu)
            if lum_u >= 0.58 and sat_u <= 0.32:
                px[x, y] = (ir, ig, ib, 255)
    return out


def punch_wordmark_holes(im: Image.Image) -> Image.Image:
    """
    Remove enclosed black counter fills in the **PROJECT** line only.

    Using full-image Y fractions included the OP mark and "THE OUTREACH", which
    destroyed real letter strokes (punch kept only components touching green).
    """
    out = im.copy().convert("RGBA")
    px = out.load()
    w, h = out.size
    bbox = im.getbbox()
    if not bbox:
        return out
    bx0, by0, bx1, by1 = bbox
    bh, bw = by1 - by0, bx1 - bx0
    # Lower ~40% of content: second line + padding; skip icon + first wordmark line.
    y0, y1 = by0 + int(bh * 0.58), by1 - max(2, int(bh * 0.02))
    x0, x1 = bx0 + int(bw * 0.06), bx1 - int(bw * 0.06)
    y0, y1 = max(0, y0), min(h, y1)
    x0, x1 = max(0, x0), min(w, x1)
    if y0 >= y1 or x0 >= x1:
        return out

    neighbors4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
    neighbors8 = (
        (-1, -1),
        (0, -1),
        (1, -1),
        (-1, 0),
        (1, 0),
        (-1, 1),
        (0, 1),
        (1, 1),
    )

    def is_hole_seed(r: int, g: int, b: int, a: int) -> bool:
        return a > 180 and max(r, g, b) <= 36

    visited = bytearray(w * h)

    def idx(x: int, y: int) -> int:
        return y * w + x

    for sy in range(y0, y1):
        for sx in range(x0, x1):
            i = idx(sx, sy)
            if visited[i]:
                continue
            r, g, b, a = px[sx, sy]
            if not is_hole_seed(r, g, b, a):
                continue

            comp: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque()
            visited[i] = 1
            q.append((sx, sy))
            touches_green = False
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for dx, dy in neighbors8:
                    nx, ny = cx + dx, cy + dy
                    if nx < 0 or nx >= w or ny < 0 or ny >= h:
                        continue
                    rr, gg, bb, aa = px[nx, ny]
                    if _is_green_pixel(rr, gg, bb, aa):
                        touches_green = True
                for dx, dy in neighbors4:
                    nx, ny = cx + dx, cy + dy
                    if nx < x0 or nx >= x1 or ny < y0 or ny >= y1:
                        continue
                    ni = idx(nx, ny)
                    if visited[ni]:
                        continue
                    rr, gg, bb, aa = px[nx, ny]
                    if not is_hole_seed(rr, gg, bb, aa):
                        continue
                    visited[ni] = 1
                    q.append((nx, ny))

            if touches_green:
                continue
            if len(comp) > 8500:  # safety: don't wipe large regions
                continue
            xs = [p[0] for p in comp]
            bw = max(xs) - min(xs) + 1
            if bw > w * 0.55:
                continue
            for cx, cy in comp:
                px[cx, cy] = (0, 0, 0, 0)

    return out


def smooth_alpha_edges(im: Image.Image, radius: float = 0.6) -> Image.Image:
    r, g, b, a = im.split()
    a2 = a.filter(ImageFilter.GaussianBlur(radius))
    return Image.merge("RGBA", (r, g, b, a2))


def snap_light_alpha(im: Image.Image) -> Image.Image:
    """Clip only nearly-invisible / nearly-opaque alpha — preserves AA (no recoloring)."""
    out = im.copy().convert("RGBA")
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 14:
                px[x, y] = (0, 0, 0, 0)
            elif a >= 250:
                px[x, y] = (r, g, b, 255)
    return out


def _has_meaningful_alpha(im: Image.Image) -> bool:
    """True when the image is already a transparent PNG (not an opaque plate)."""
    mn, _ = im.convert("RGBA").split()[3].getextrema()
    return mn < 250


def crop_mark(full_img: Image.Image) -> Image.Image:
    im = full_img.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    cut_y = y0 + int((y1 - y0) * 0.64)
    return im.crop((x0, y0, x1, cut_y))


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source logo: {SRC}")

    base = Image.open(SRC)

    if _has_meaningful_alpha(base):
        # Master is already `brand-logo-site.png`; only refresh the dark alias + mark.
        if SRC.resolve() != OUT_DARK.resolve():
            shutil.copyfile(SRC, OUT_DARK)
        crop_mark(Image.open(SRC)).save(OUT_MARK_DARK, "PNG", optimize=True)
        print("Dark logo: transparent master - copied to site-dark + mark (no knockout/blur)")
    else:
        raw = remove_outer_black(base)
        dark = smooth_alpha_edges(raw, 0.35)
        dark.save(OUT_DARK, "PNG", optimize=True)
        crop_mark(dark).save(OUT_MARK_DARK, "PNG", optimize=True)
        dark.save(ROOT / "public" / "brand-logo-site.png", "PNG", optimize=True)

    if LIGHT_IMPORT.exists():
        shutil.copyfile(LIGHT_IMPORT, OUT_LIGHT)
        crop_mark(Image.open(OUT_LIGHT)).save(OUT_MARK_LIGHT, "PNG", optimize=True)
        print("Light logo: copied import + refreshed mark crop")
    else:
        print("Light logo: skipped (add brand-logo-site-light-import.png or run install-light-logo.py)")

    print("Generated:")
    for p in (OUT_DARK, OUT_MARK_DARK, OUT_MARK_LIGHT):
        print(p)
    if LIGHT_IMPORT.exists():
        print(OUT_LIGHT)


if __name__ == "__main__":
    main()
