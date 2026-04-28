"""
Make brand-logo-site.png use a real alpha channel (no solid black plate).

1) Edge flood through near-pure black from the image border.
2) Bleed transparency through dark pixels (blocked by white / bright green).
3) Punch enclosed dark holes (letter counters, gaps) using distance to OP lime and
   to PROJECT greens (SciPy Euclidean distance transform).
4) Feather dark fringes on the exterior.

Requires: pip install scipy numpy pillow
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
    from scipy.ndimage import distance_transform_edt
except ImportError as e:
    raise SystemExit(
        "knockout-brand-logo-bg.py requires pillow, numpy, and scipy "
        "(e.g. pip install pillow numpy scipy)."
    ) from e

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "brand-logo-site.png"

EDGE_BG_MAX = 28
BLEED_MAX = 40
FEATHER_CAP = 115

OP_LIME_Y_MAX = 275
PROJECT_START_Y = 365
PROJECT_GREEN_Y0 = 400
HOLE_MIN_DIST_FROM_OP_LIME = 24.0
HOLE_MIN_DIST_FROM_PROJECT_GREEN = 17.0
HOLE_RGB_MAX = 50


def main() -> None:
    if not SRC.is_file():
        raise SystemExit(f"Missing {SRC}")

    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    rgba = np.asarray(im, dtype=np.uint8)

    def idx(x: int, y: int) -> int:
        return y * w + x

    def is_lime_op(r: int, g: int, b: int, a: int) -> bool:
        return a > 200 and g > 100 and g > r + 15 and g > b + 5

    def is_project_green(r: int, g: int, b: int, a: int) -> bool:
        return a > 200 and g >= 45 and g >= r - 25 and g >= b - 25 and max(r, g, b) < 250

    op_barrier = np.ones((h, w), dtype=np.uint8)
    y_lim = min(OP_LIME_Y_MAX, h)
    for y in range(y_lim):
        row = rgba[y]
        for x in range(w):
            r, g, b, a = int(row[x, 0]), int(row[x, 1]), int(row[x, 2]), int(row[x, 3])
            if is_lime_op(r, g, b, a):
                op_barrier[y, x] = 0

    if not np.any(op_barrier == 0):
        raise SystemExit("No OP lime pixels found — check brand-logo-site.png and OP_LIME_Y_MAX.")

    op_dist = distance_transform_edt(op_barrier)

    proj_barrier = np.ones((h, w), dtype=np.uint8)
    y0 = min(PROJECT_GREEN_Y0, h)
    for y in range(y0, h):
        row = rgba[y]
        for x in range(w):
            r, g, b, a = int(row[x, 0]), int(row[x, 1]), int(row[x, 2]), int(row[x, 3])
            if is_project_green(r, g, b, a):
                proj_barrier[y, x] = 0

    proj_dist = distance_transform_edt(proj_barrier)

    transparent = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def is_edge_bg(r: int, g: int, b: int, a: int) -> bool:
        if a < 12:
            return True
        return max(r, g, b) <= EDGE_BG_MAX

    def seed_edge(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h:
            return
        i = idx(x, y)
        if transparent[i]:
            return
        r, g, b, a = px[x, y]
        if not is_edge_bg(r, g, b, a):
            return
        transparent[i] = 1
        q.append((x, y))

    for x in range(w):
        seed_edge(x, 0)
        seed_edge(x, h - 1)
    for y in range(h):
        seed_edge(0, y)
        seed_edge(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or nx >= w or ny < 0 or ny >= h:
                continue
            i = idx(nx, ny)
            if transparent[i]:
                continue
            r, g, b, a = px[nx, ny]
            if not is_edge_bg(r, g, b, a):
                continue
            transparent[i] = 1
            q.append((nx, ny))

    bleed_q: deque[tuple[int, int]] = deque()
    for y in range(h):
        for x in range(w):
            if transparent[idx(x, y)]:
                bleed_q.append((x, y))
    while bleed_q:
        x, y = bleed_q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or nx >= w or ny < 0 or ny >= h:
                continue
            ni = idx(nx, ny)
            if transparent[ni]:
                continue
            r, g, b, a = px[nx, ny]
            if a < 12:
                transparent[ni] = 1
                bleed_q.append((nx, ny))
                continue
            if max(r, g, b) > BLEED_MAX:
                continue
            transparent[ni] = 1
            bleed_q.append((nx, ny))

    neighbors4 = ((0, 1), (0, -1), (1, 0), (-1, 0))

    for y in range(h):
        for x in range(w):
            if transparent[idx(x, y)]:
                continue
            r, g, b, a = px[x, y]
            if a < 13 or max(r, g, b) > HOLE_RGB_MAX:
                continue
            punch = False
            if y < PROJECT_START_Y:
                punch = float(op_dist[y, x]) > HOLE_MIN_DIST_FROM_OP_LIME
            elif y >= PROJECT_GREEN_Y0:
                punch = float(proj_dist[y, x]) > HOLE_MIN_DIST_FROM_PROJECT_GREEN
            if not punch:
                continue
            transparent[idx(x, y)] = 1
            px[x, y] = (r, g, b, 0)

    for y in range(h):
        for x in range(w):
            if transparent[idx(x, y)]:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)
                continue
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = (r + g + b) / 3
            if lum > FEATHER_CAP:
                continue
            touches_void = False
            for dx, dy in neighbors4:
                nx, ny = x + dx, y + dy
                if nx < 0 or nx >= w or ny < 0 or ny >= h:
                    touches_void = True
                    break
                if transparent[idx(nx, ny)] or px[nx, ny][3] == 0:
                    touches_void = True
                    break
            if not touches_void:
                continue
            t = min(1.0, lum / FEATHER_CAP)
            new_a = int(round(a * (t * t)))
            if new_a < 8:
                new_a = 0
            px[x, y] = (r, g, b, new_a)

    im.save(SRC, "PNG", optimize=True)
    print(f"Wrote transparent background: {SRC}")


if __name__ == "__main__":
    main()
