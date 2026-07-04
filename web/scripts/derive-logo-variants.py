"""
Derive / refresh logo assets under web/public/.

- Dark: `brand-logo-site-dark-import.png` when present — transparent exports are trimmed
  and upscaled only; opaque black-plate exports use graphics-only knockout (silver wordmark).
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
MARK_IMPORT = ROOT / "public" / "brand-logo-mark-import.png"
LIGHT_IMPORT = ROOT / "public" / "brand-logo-site-light-import.png"
DARK_IMPORT = ROOT / "public" / "brand-logo-site-dark-import.png"
DARK_WORDMARK_TARGET_W = 1536

BG_THRESH = 24
WHITE_PLATE_MIN = 248  # edge-flood only near-pure white (keeps icon inner strokes)
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


def remove_outer_black(img: Image.Image, *, thresh: int = BG_THRESH) -> Image.Image:
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
        mx = max(r, g, b)
        lum, sat = _lum_sat(r, g, b)
        return mx <= thresh or (lum <= 0.17 and sat <= 0.22)

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

    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 8:
                seed(x, y)
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
                px[x, y] = (0, 0, 0, 0)

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


def remove_outer_white(img: Image.Image) -> Image.Image:
    """Edge-flood light plate pixels (white + off-white fringe connected to borders)."""
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
        mn = min(r, g, b)
        lum, sat = _lum_sat(r, g, b)
        return mn >= WHITE_PLATE_MIN - 16 or (lum >= 0.9 and sat <= 0.14)

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
                px[x, y] = (0, 0, 0, 0)

    return im


def _is_ink_pixel(r: int, g: int, b: int, a: int) -> bool:
    """Black/dark strokes and forest-green wordmark fills."""
    if a < 16:
        return False
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx <= 78:
        # Opaque plate black reads as dark ink — exclude flat near-pure black matte.
        if mx <= 10 and (mx - mn) <= 8:
            return False
        return True
    _, sat = _lum_sat(r, g, b)
    if g >= r and g >= b and g >= 55 and sat >= 0.12:
        return True
    return False


def _is_silver_wordmark(r: int, g: int, b: int, a: int) -> bool:
    """Metallic THE OUTREACH line on the dark wordmark export."""
    if a < 16:
        return False
    mn = min(r, g, b)
    if mn < 105 or mn >= 238:
        return False
    lum, sat = _lum_sat(r, g, b)
    return 0.42 <= lum <= 0.86 and sat <= 0.38


def _opaque_near_white_ratio(im: Image.Image) -> float:
    px = im.convert("RGBA").load()
    w, h = im.size
    opaque = 0
    light = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 200:
                continue
            opaque += 1
            if min(r, g, b) >= 220:
                light += 1
    if opaque == 0:
        return 0.0
    return light / opaque


def _opaque_near_black_ratio(im: Image.Image) -> float:
    px = im.convert("RGBA").load()
    w, h = im.size
    opaque = 0
    dark = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 200:
                continue
            opaque += 1
            if max(r, g, b) <= 36:
                dark += 1
    if opaque == 0:
        return 0.0
    return dark / opaque


def _is_black_plate(im: Image.Image) -> bool:
    px = im.convert("RGBA").load()
    w, h = im.size
    corners = (px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1])
    if all(a < 16 for _, _, _, a in corners):
        return True
    if _opaque_near_black_ratio(im) > 0.08:
        return True
    opaque_corners = [c for c in corners if c[3] > 200]
    return bool(opaque_corners) and all(max(r, g, b) <= 48 for r, g, b, _ in opaque_corners)


def _is_white_plate(im: Image.Image) -> bool:
    px = im.convert("RGBA").load()
    w, h = im.size
    corners = (px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1])
    opaque_corners = [c for c in corners if c[3] > 200]
    return bool(opaque_corners) and all(min(r, g, b) >= WHITE_PLATE_MIN - 8 for r, g, b, _ in opaque_corners)


def _wordmark_band_bounds(im: Image.Image) -> tuple[int, int, int, int, int, int] | None:
    """Return icon_y1, outreach_y0, outreach_y1, project_y0 for content bbox fractions."""
    bbox = im.getbbox()
    if not bbox:
        return None
    x0, y0, x1, y1 = bbox
    bh = max(1, y1 - y0)
    icon_y1 = y0 + int(bh * 0.58)
    outreach_y0 = y0 + int(bh * 0.58)
    outreach_y1 = y0 + int(bh * 0.78)
    project_y0 = y0 + int(bh * 0.78)
    return x0, icon_y1, outreach_y0, outreach_y1, project_y0, y1


def _extract_black_plate_graphics(img: Image.Image, *, allow_silver: bool = False) -> Image.Image:
    """
    Black export plate: do not flood-remove black (it deletes black-on-black THE OUTREACH).
    Keep graphics by band — icon greens/outlines, outreach line, PROJECT greens.
    """
    im = img.convert("RGBA")
    px = im.load()
    w, h = im.size
    bands = _wordmark_band_bounds(im)
    if not bands:
        return im
    _, icon_y1, outreach_y0, outreach_y1, project_y0, _y1 = bands

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                px[x, y] = (0, 0, 0, 0)
                continue

            keep = False
            if _is_green_pixel(r, g, b, a):
                keep = True
            elif _is_ink_pixel(r, g, b, a):
                keep = True
            elif allow_silver and outreach_y0 <= y < outreach_y1 and _is_silver_wordmark(r, g, b, a):
                keep = True
            elif not allow_silver and outreach_y0 <= y < outreach_y1 and max(r, g, b) <= 100:
                # Light wordmark: THE OUTREACH is black ink on the same plate color.
                keep = True
            elif y >= project_y0 and _is_ink_pixel(r, g, b, a):
                keep = True
            elif y < icon_y1 and (_is_green_pixel(r, g, b, a) or _is_ink_pixel(r, g, b, a)):
                keep = True

            if keep:
                if not (allow_silver and _is_silver_wordmark(r, g, b, a)):
                    mn = min(r, g, b)
                    lum, sat = _lum_sat(r, g, b)
                    if mn >= 200 and sat <= 0.22 and not _is_green_pixel(r, g, b, a):
                        px[x, y] = (0, 0, 0, 0)
                continue

            mn = min(r, g, b)
            lum, sat = _lum_sat(r, g, b)
            if mn >= 200 and sat <= 0.22:
                px[x, y] = (0, 0, 0, 0)
            elif lum >= 0.78 and sat <= 0.18:
                px[x, y] = (0, 0, 0, 0)
            elif max(r, g, b) <= 42 and lum <= 0.17 and sat <= 0.22:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (0, 0, 0, 0)

    return im


def extract_wordmark_graphics(img: Image.Image, *, allow_silver: bool = False) -> Image.Image:
    """Keep OP greens, ink, and optional silver wordmark — drop plate + matte fringe."""
    if _is_black_plate(img):
        return _extract_black_plate_graphics(img, allow_silver=allow_silver)
    im = remove_outer_white(img)
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                continue
            if _is_green_pixel(r, g, b, a):
                continue
            if _is_ink_pixel(r, g, b, a):
                continue
            if allow_silver and _is_silver_wordmark(r, g, b, a):
                continue
            mn = min(r, g, b)
            lum, sat = _lum_sat(r, g, b)
            if mn >= 200 and sat <= 0.22:
                px[x, y] = (0, 0, 0, 0)
            elif lum >= 0.78 and sat <= 0.18:
                px[x, y] = (0, 0, 0, 0)
    return im


def prepare_wordmark_rgba(img: Image.Image, *, allow_silver: bool = False) -> Image.Image:
    """Design export plate → transparent RGBA wordmark (graphics only)."""
    im = img.convert("RGBA")
    needs_knockout = (
        _is_black_plate(im)
        or _is_white_plate(im)
        or _opaque_near_white_ratio(im) > 0.05
        or _opaque_near_black_ratio(im) > 0.08
    )
    if needs_knockout:
        edge_radius = 0.25 if allow_silver else 0.45
        return smooth_alpha_edges(extract_wordmark_graphics(im, allow_silver=allow_silver), edge_radius)
    if _has_meaningful_alpha(im):
        return im
    return smooth_alpha_edges(remove_outer_black(img), 0.35)


def _upscale_wordmark_clean(im: Image.Image, target_w: int = DARK_WORDMARK_TARGET_W) -> Image.Image:
    """Upscale for header density without amplifying premultiplied AA fringe."""
    w, h = im.size
    if w >= target_w:
        return im
    nw = target_w
    nh = max(1, int(round(h * (target_w / w))))
    r, g, b, a = im.split()
    apx = a.load()
    aw, ah = a.size
    for y in range(ah):
        for x in range(aw):
            apx[x, y] = 255 if apx[x, y] >= 128 else 0
    rgb = Image.merge("RGB", (r, g, b)).resize((nw, nh), Image.Resampling.LANCZOS)
    alpha = a.resize((nw, nh), Image.Resampling.NEAREST)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def prepare_dark_wordmark_from_import(img: Image.Image) -> Image.Image:
    """
    Dark header wordmark from design import.

    Transparent RGBA exports (TopLogo-1): trim + crisp upscale only — do not re-run
    band extraction or edge flood (that strips silver text and beige icon outlines).
    Opaque black-plate fallbacks: graphics-only knockout + soft alpha.
    """
    im = img.convert("RGBA")
    if _has_meaningful_alpha(im):
        out = _trim_mark_margins(im, threshold=0.03)
        out = snap_light_alpha(out)
        return _upscale_wordmark_clean(out)
    out = prepare_wordmark_rgba(im, allow_silver=True)
    out = _trim_mark_margins(out, threshold=0.03)
    out = snap_light_alpha(out)
    return _upscale_wordmark_clean(out)


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
    """OP monogram only — crop above the THE OUTREACH wordmark band."""
    im = full_img.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    px = im.load()
    rows: list[int] = []
    for y in range(y0, y1):
        rows.append(sum(1 for x in range(x0, x1) if px[x, y][3] > 16))
    maxc = max(rows) if rows else 1
    cut_y = y1
    for i in range(len(rows) - 2):
        if rows[i] > maxc * 0.12 and rows[i + 1] < maxc * 0.06 and rows[i + 2] < maxc * 0.06:
            cut_y = y0 + i + 1
            break
    else:
        cut_y = y0 + int(h * 0.66)
    cropped = im.crop((x0, y0, x1, cut_y))
    return _trim_mark_margins(cropped)


def _trim_mark_margins(im: Image.Image, threshold: float = 0.05) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    cols = [sum(1 for y in range(h) if px[x, y][3] > 16) for x in range(w)]
    rows = [sum(1 for x in range(w) if px[x, y][3] > 16) for y in range(h)]
    max_col = max(cols) if cols else 1
    max_row = max(rows) if rows else 1
    col_cut = max(1, int(max_col * threshold))
    row_cut = max(1, int(max_row * threshold))
    left = next((i for i, c in enumerate(cols) if c > col_cut), 0)
    right = w - next((i for i, c in enumerate(reversed(cols)) if c > col_cut), 0)
    top = next((i for i, r in enumerate(rows) if r > row_cut), 0)
    bottom = h - next((i for i, r in enumerate(reversed(rows)) if r > row_cut), 0)
    if left >= right or top >= bottom:
        tight = im.getbbox()
        return im.crop(tight) if tight else im
    return im.crop((left, top, right, bottom))


def _maybe_upscale_wordmark(im: Image.Image, target_w: int = DARK_WORDMARK_TARGET_W) -> Image.Image:
    """Upscale design imports to the master wordmark width for crisp header rendering."""
    w, h = im.size
    if w >= target_w:
        return im
    scale = target_w / w
    return im.resize((target_w, max(1, int(round(h * scale)))), Image.Resampling.LANCZOS)


def main() -> None:
    mark_from_import = False
    if MARK_IMPORT.exists():
        mark = _trim_mark_margins(Image.open(MARK_IMPORT).convert("RGBA"))
        mark.save(OUT_MARK_DARK, "PNG", optimize=True)
        mark.save(OUT_MARK_LIGHT, "PNG", optimize=True)
        mark_from_import = True
        print("Mark logos: trimmed RGBA from brand-logo-mark-import.png")

    if DARK_IMPORT.exists():
        dark = prepare_dark_wordmark_from_import(Image.open(DARK_IMPORT))
        dark.save(OUT_DARK, "PNG", optimize=True)
        if not mark_from_import:
            crop_mark(dark).save(OUT_MARK_DARK, "PNG", optimize=True)
        print("Dark logo: trimmed transparent import + crisp upscale")
    elif SRC.exists():
        base = Image.open(SRC)

        if _has_meaningful_alpha(base):
            if SRC.resolve() != OUT_DARK.resolve():
                shutil.copyfile(SRC, OUT_DARK)
            if not mark_from_import:
                crop_mark(Image.open(SRC)).save(OUT_MARK_DARK, "PNG", optimize=True)
            print("Dark logo: transparent master - copied to site-dark" + ("" if mark_from_import else " + mark (no knockout/blur)"))
        else:
            raw = remove_outer_black(base)
            dark = smooth_alpha_edges(raw, 0.35)
            dark.save(OUT_DARK, "PNG", optimize=True)
            if not mark_from_import:
                crop_mark(dark).save(OUT_MARK_DARK, "PNG", optimize=True)
            dark.save(ROOT / "public" / "brand-logo-site.png", "PNG", optimize=True)
    else:
        raise SystemExit(f"Missing dark logo import ({DARK_IMPORT}) or source ({SRC})")

    if LIGHT_IMPORT.exists():
        light = prepare_wordmark_rgba(Image.open(LIGHT_IMPORT), allow_silver=False)
        light.save(OUT_LIGHT, "PNG", optimize=True)
        if not mark_from_import:
            crop_mark(light).save(OUT_MARK_LIGHT, "PNG", optimize=True)
        print("Light logo: graphics-only RGBA from light import" + ("" if mark_from_import else " + mark crop"))
    else:
        print("Light logo: skipped (add brand-logo-site-light-import.png or run install-light-logo.py)")

    print("Generated:")
    for p in (OUT_DARK, OUT_MARK_DARK, OUT_MARK_LIGHT):
        print(p)
    if LIGHT_IMPORT.exists():
        print(OUT_LIGHT)


if __name__ == "__main__":
    main()
