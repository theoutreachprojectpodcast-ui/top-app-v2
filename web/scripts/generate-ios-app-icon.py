"""
Generate the iOS App Store icon (1024×1024, no alpha) from committed brand assets.

Uses:
  - web/public/brand-logo-mark-dark.png — OP mark (readable at small sizes; no wordmark text)
  - Dark-mode gradient aligned with public/home/app-page-background-dark.svg

Outputs:
  - web/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
  - assets/icon-1024.png
  - web/public/icon-1024.png
  - web/public/icon-512.png (downscaled for PWA / manifest)

Run from repo root:
  python3 web/scripts/generate-ios-app-icon.py

Requires: pip install pillow (or use a venv).
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
MARK = WEB / "public" / "brand-logo-mark-dark.png"
OUT_APPICON = WEB / "ios" / "App" / "App" / "Assets.xcassets" / "AppIcon.appiconset" / "AppIcon-512@2x.png"
OUT_ASSETS_1024 = ROOT / "assets" / "icon-1024.png"
OUT_PUBLIC_1024 = WEB / "public" / "icon-1024.png"
OUT_PUBLIC_512 = WEB / "public" / "icon-512.png"

SIZE = 1024
# Fraction of canvas width reserved for logo (remaining space = padding).
LOGO_MAX_WIDTH_RATIO = 0.62

# app-page-background-dark.svg gradient stops
GRAD_TOP = (0x15, 0x20, 0x19)
GRAD_MID = (0x10, 0x18, 0x14)
GRAD_BOTTOM = (0x0C, 0x12, 0x10)


def _lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def _mix_rgb(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (_lerp(c1[0], c2[0], t), _lerp(c1[1], c2[1], t), _lerp(c1[2], c2[2], t))


def dark_mode_background(size: int) -> Image.Image:
    """Diagonal base gradient + subtle top-left glow (matches app dark atmosphere)."""
    base = Image.new("RGB", (size, size))
    px = base.load()
    for y in range(size):
        for x in range(size):
            # Diagonal blend top-left → bottom-right
            t = (x / (size - 1) + y / (size - 1)) / 2
            if t < 0.48:
                local = t / 0.48
                rgb = _mix_rgb(GRAD_TOP, GRAD_MID, local)
            else:
                local = (t - 0.48) / 0.52
                rgb = _mix_rgb(GRAD_MID, GRAD_BOTTOM, local)
            px[x, y] = rgb

    # Soft radial highlight (~14%, 10% from SVG)
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


def compose_icon() -> Image.Image:
    if not MARK.exists():
        raise SystemExit(f"Missing mark logo: {MARK}")

    bg = dark_mode_background(SIZE)
    mark = Image.open(MARK).convert("RGBA")
    mw, mh = mark.size
    max_w = int(SIZE * LOGO_MAX_WIDTH_RATIO)
    scale = max_w / mw
    new_w = int(mw * scale)
    new_h = int(mh * scale)
    mark = mark.resize((new_w, new_h), Image.Resampling.LANCZOS)

    x = (SIZE - new_w) // 2
    y = (SIZE - new_h) // 2
    bg.paste(mark, (x, y), mark)
    return bg


def _save_rgb_png(im: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = im.convert("RGB")
    rgb.save(path, "PNG", optimize=True)
    # Verify no alpha channel in output
    check = Image.open(path)
    if check.mode in ("RGBA", "LA") or "transparency" in check.info:
        raise SystemExit(f"Output still has alpha: {path}")


def main() -> None:
    icon = compose_icon()
    targets = [OUT_APPICON, OUT_ASSETS_1024, OUT_PUBLIC_1024]
    for path in targets:
        _save_rgb_png(icon, path)
        print(f"Wrote {path.relative_to(ROOT)}")

    small = icon.resize((512, 512), Image.Resampling.LANCZOS)
    _save_rgb_png(small, OUT_PUBLIC_512)
    print(f"Wrote {OUT_PUBLIC_512.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
