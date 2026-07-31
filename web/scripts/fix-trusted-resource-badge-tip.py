"""Restore charcoal fill in the Trusted Resource badge tip.

The tip below the TRUSTED RESOURCE banner was left hollow (transparent
interior between the green/silver V outlines). This restores opaque fill
matching the upper shield body without painting outside the shield.
"""
from pathlib import Path
import shutil

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
HOLLOW = ROOT / "web" / "public" / "assets" / "brand" / "trusted-resource-badge.png"
OUT_ASSETS = ROOT / "assets" / "brand" / "trusted-resource-badge.png"
OUT_PUBLIC = ROOT / "web" / "public" / "brand" / "trusted-resource-badge.png"
FILL = (34, 36, 35, 255)


def is_green(r, g, b, a):
    return a >= 40 and g >= 95 and (g - r) >= 20 and g > b - 10


def is_hollow(r, g, b, a):
    if a < 40:
        return True
    if r >= 170 and g >= 170 and b >= 160:
        return True
    return False


def is_gray_wash(r, g, b, a):
    if a < 40 or is_green(r, g, b, a):
        return False
    if min(r, g, b) >= 130 and max(r, g, b) - min(r, g, b) <= 25:
        return False
    lum = (r + g + b) / 3
    return 40 <= lum <= 160 and abs(r - g) <= 30 and abs(g - b) <= 30 and (g - r) < 25


def main():
    im = Image.open(HOLLOW).convert("RGBA")
    w, h = im.size
    px = im.load()

    # Pass 1: fill hollow between outermost opaque on tip rows
    for y in range(int(h * 0.78), h - 1):
        opaque = [x for x in range(w) if px[x, y][3] >= 40]
        if len(opaque) < 2:
            continue
        left, right = opaque[0], opaque[-1]
        if not (8 <= right - left <= int(w * 0.62)):
            continue
        for x in range(left + 1, right):
            if is_hollow(*px[x, y]):
                px[x, y] = FILL

    # Pass 2: gray wash leftovers near tip center
    for y in range(890, 930):
        opaque = [xi for xi in range(w) if px[xi, y][3] >= 40]
        if len(opaque) < 2:
            continue
        left, right = opaque[0], opaque[-1]
        for x in range(w // 2 - 80, w // 2 + 81):
            if left < x < right and (is_gray_wash(*px[x, y]) or is_hollow(*px[x, y])):
                px[x, y] = FILL

    # Pass 3: close vertical gaps (bridges isolated tip fragment)
    for x in range(w // 2 - 45, w // 2 + 46):
        ys = [y for y in range(880, 932) if px[x, y][3] >= 40]
        if len(ys) < 2:
            continue
        for y in range(ys[0], ys[-1] + 1):
            if px[x, y][3] < 40:
                px[x, y] = FILL

    # Pass 4: tiny tip spans + interpolated bounds for fully transparent rows
    for y in range(900, 930):
        opaque = [x for x in range(w) if px[x, y][3] >= 40]
        if len(opaque) < 2:
            bounds = None
            for dy in range(1, 8):
                for yy in (y - dy, y + dy):
                    if 0 <= yy < h:
                        op = [x for x in range(w) if px[x, yy][3] >= 40]
                        if len(op) >= 2 and op[0] < w // 2 < op[-1]:
                            bounds = (op[0], op[-1])
                            break
                if bounds:
                    break
            if not bounds:
                continue
            left, right = bounds
        else:
            left, right = opaque[0], opaque[-1]
            if right - left > 120 and y >= 900:
                # tip should be narrow; skip banner-wide spans
                if right - left > int(w * 0.25):
                    continue
        if not (left <= w // 2 <= right):
            continue
        for x in range(left, right + 1):
            if is_hollow(*px[x, y]) or is_gray_wash(*px[x, y]):
                px[x, y] = FILL

    OUT_ASSETS.parent.mkdir(parents=True, exist_ok=True)
    OUT_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    im.save(OUT_ASSETS)
    shutil.copyfile(OUT_ASSETS, OUT_PUBLIC)

    mid = px[w // 2, int(h * 0.86)]
    corner = px[2, 2]
    holes = 0
    for y in range(900, 930):
        opaque = [x for x in range(w) if px[x, y][3] >= 40]
        if len(opaque) < 2:
            continue
        for x in range(opaque[0], opaque[-1] + 1):
            if px[x, y][3] < 40:
                holes += 1

    print(
        f"size={w}x{h} mid={mid} corner={corner} tip_interior_holes={holes} "
        f"wrote={OUT_PUBLIC}"
    )


if __name__ == "__main__":
    main()
