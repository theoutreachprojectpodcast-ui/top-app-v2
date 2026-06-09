"""
Generate native app icons for iOS App Store and Android Play Store.

Uses the OP monogram only (no THE OUTREACH wordmark) from brand site logos,
on the dark-mode gradient used across the product.

Outputs:
  - iOS: AppIcon-512@2x.png (1024×1024, no alpha)
  - Android: mipmap launcher + adaptive foreground PNGs (all densities)
  - PWA / manifest: icon-1024, icon-512, icon-192, apple-touch-icon

Run from repo root:
  python3 web/scripts/generate-mobile-app-icons.py

Requires: pip install pillow
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
SOURCE = WEB / "public" / "brand-logo-site-dark.png"
FALLBACK_SOURCE = WEB / "public" / "brand-logo-site.png"

IOS_ICON = (
    WEB / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"
)
ANDROID_RES = WEB / "android" / "app" / "src" / "main" / "res"

OUT_ASSETS_1024 = ROOT / "assets" / "icon-1024.png"
OUT_PUBLIC_1024 = WEB / "public" / "icon-1024.png"
OUT_PUBLIC_512 = WEB / "public" / "icon-512.png"
OUT_PUBLIC_192 = WEB / "public" / "icon-192.png"
OUT_APPLE_TOUCH = WEB / "public" / "apple-touch-icon.png"

STORE_SIZE = 1024
# Max side of monogram bbox as a fraction of the square canvas (App Store / legacy launcher).
IOS_MARK_FILL = 0.85
# Android adaptive foreground safe zone: 66dp circle in 108dp canvas (~61%).
ANDROID_SAFE_FILL = 0.61

GRAD_TOP = (0x15, 0x20, 0x19)
GRAD_MID = (0x10, 0x18, 0x14)
GRAD_BOTTOM = (0x0C, 0x12, 0x10)

ANDROID_LAUNCHER = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

ANDROID_FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def _lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def _mix_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (_lerp(c1[0], c2[0], t), _lerp(c1[1], c2[1], t), _lerp(c1[2], c2[2], t))


def extract_monogram(source: Path) -> Image.Image:
    """Return tight OP monogram crop (excludes wordmark below the icon band)."""
    if not source.exists():
        raise SystemExit(f"Missing logo source: {source}")
    im = Image.open(source).convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        raise SystemExit(f"Logo has no visible pixels: {source}")
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
    return _trim_low_density_margins(cropped)


def _trim_low_density_margins(im: Image.Image, threshold: float = 0.05) -> Image.Image:
    """
    Remove wide empty margins the wordmark band can leave in alpha bbox.

    Full-width faint pixels would otherwise shrink the OP mark on square icons.
    """
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


def dark_mode_background(size: int) -> Image.Image:
    base = Image.new("RGB", (size, size))
    px = base.load()
    for y in range(size):
        for x in range(size):
            t = (x / (size - 1) + y / (size - 1)) / 2
            if t < 0.48:
                local = t / 0.48
                rgb = _mix_rgb(GRAD_TOP, GRAD_MID, local)
            else:
                local = (t - 0.48) / 0.52
                rgb = _mix_rgb(GRAD_MID, GRAD_BOTTOM, local)
            px[x, y] = rgb

    cx, cy = size * 0.14, size * 0.10
    radius = size * 0.52
    glow = (0x24, 0x3A, 0x2E)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy)
            if d >= radius:
                continue
            strength = (1 - d / radius) ** 1.6 * 0.38
            r, g, b = px[x, y]
            px[x, y] = (
                _lerp(r, glow[0], strength),
                _lerp(g, glow[1], strength),
                _lerp(b, glow[2], strength),
            )
    return base


def _scale_mark(mark: Image.Image, canvas: int, fill: float) -> Image.Image:
    mw, mh = mark.size
    max_dim = int(canvas * fill)
    scale = min(max_dim / mw, max_dim / mh)
    new_w = max(1, int(mw * scale))
    new_h = max(1, int(mh * scale))
    return mark.resize((new_w, new_h), Image.Resampling.LANCZOS)


def compose_store_icon(mark: Image.Image, size: int, fill: float = IOS_MARK_FILL) -> Image.Image:
    bg = dark_mode_background(size)
    scaled = _scale_mark(mark, size, fill)
    sw, sh = scaled.size
    x = (size - sw) // 2
    y = (size - sh) // 2
    bg.paste(scaled, (x, y), scaled)
    return bg


def compose_android_foreground(mark: Image.Image, size: int) -> Image.Image:
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    scaled = _scale_mark(mark, size, ANDROID_SAFE_FILL)
    sw, sh = scaled.size
    x = (size - sw) // 2
    y = (size - sh) // 2
    fg.paste(scaled, (x, y), scaled)
    return fg


def _save_rgb_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, "PNG", optimize=True)
    check = Image.open(path)
    if check.mode in ("RGBA", "LA") or "transparency" in check.info:
        raise SystemExit(f"Output still has alpha: {path}")


def _save_rgba_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.convert("RGBA").save(path, "PNG", optimize=True)


def write_android_icons(mark: Image.Image, store_icon: Image.Image) -> None:
    for folder, px in ANDROID_LAUNCHER.items():
        out = ANDROID_RES / folder / "ic_launcher.png"
        resized = store_icon.resize((px, px), Image.Resampling.LANCZOS)
        _save_rgb_png(resized, out)
        round_out = ANDROID_RES / folder / "ic_launcher_round.png"
        _save_rgb_png(resized, round_out)
        print(f"Wrote {out.relative_to(ROOT)}")

    for folder, px in ANDROID_FOREGROUND.items():
        fg = compose_android_foreground(mark, px)
        out = ANDROID_RES / folder / "ic_launcher_foreground.png"
        _save_rgba_png(fg, out)
        print(f"Wrote {out.relative_to(ROOT)}")


def main() -> None:
    source = SOURCE if SOURCE.exists() else FALLBACK_SOURCE
    mark = extract_monogram(source)
    mw, mh = mark.size
    print(f"Monogram source: {source.relative_to(ROOT)} ({mw}×{mh}, aspect {mw / mh:.2f})")

    store_icon = compose_store_icon(mark, STORE_SIZE)

    ios_targets = [IOS_ICON, OUT_ASSETS_1024, OUT_PUBLIC_1024]
    for path in ios_targets:
        _save_rgb_png(store_icon, path)
        print(f"Wrote {path.relative_to(ROOT)}")

    _save_rgb_png(store_icon.resize((512, 512), Image.Resampling.LANCZOS), OUT_PUBLIC_512)
    print(f"Wrote {OUT_PUBLIC_512.relative_to(ROOT)}")

    _save_rgb_png(store_icon.resize((192, 192), Image.Resampling.LANCZOS), OUT_PUBLIC_192)
    print(f"Wrote {OUT_PUBLIC_192.relative_to(ROOT)}")

    _save_rgb_png(store_icon.resize((180, 180), Image.Resampling.LANCZOS), OUT_APPLE_TOUCH)
    print(f"Wrote {OUT_APPLE_TOUCH.relative_to(ROOT)}")

    write_android_icons(mark, store_icon)
    print("Done — run `pnpm --dir web cap sync` to copy assets into native projects.")


if __name__ == "__main__":
    main()
