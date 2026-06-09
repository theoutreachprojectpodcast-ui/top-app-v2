"""
Export 1024×1024 App Store icon: prominent dark-mode logo on dark topo background.

Uses the same dark page atmosphere texture as the app (topographic map plate)
and scales the OP mark to fill the icon safe area.

Outputs (docs/store-screenshots/):
  - app-icon-dark-1024.png
  - app-icon-dark-1024.svg

Run: python web/scripts/export-app-icon-dark.py
"""

from __future__ import annotations

import base64
import io
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
LOGO_SRC = ROOT / "public" / "brand-logo-site-dark.png"
BG_TOPO = ROOT / "public" / "home" / "app-page-background-dark-topo.png"
BG_FALLBACK = ROOT / "public" / "home" / "app-page-background-dark.png"
OUT_DIR = REPO_ROOT / "docs" / "store-screenshots"
OUT_PNG = OUT_DIR / "app-icon-dark-1024.png"
OUT_SVG = OUT_DIR / "app-icon-dark-1024.svg"

SIZE = 1024
ICON_Y0 = 265
ICON_Y1 = 545
LOGO_WIDTH_RATIO = 0.88
GLOW_BLUR = 18
GLOW_ALPHA = 0.42


def extract_op_mark(src: Image.Image) -> Image.Image:
    band = src.convert("RGBA").crop((0, ICON_Y0, src.width, ICON_Y1))
    bbox = band.getbbox()
    if not bbox:
        raise SystemExit("Could not find OP mark in brand-logo-site-dark.png")
    return band.crop(bbox)


def center_square_crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def load_background() -> Image.Image:
    src_path = BG_TOPO if BG_TOPO.is_file() else BG_FALLBACK
    if not src_path.is_file():
        raise SystemExit(f"Missing background texture: {BG_TOPO} or {BG_FALLBACK}")

    raw = Image.open(src_path).convert("RGB")
    square = center_square_crop(raw)
    bg = square.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

    # Edge vignette — matches in-app atmosphere, keeps focus on center logo.
    vignette = Image.new("L", (SIZE, SIZE), 0)
    draw = ImageDraw.Draw(vignette)
    draw.ellipse((-SIZE * 0.08, -SIZE * 0.08, SIZE * 1.08, SIZE * 1.08), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=SIZE * 0.09))
    dark = Image.new("RGB", (SIZE, SIZE), (8, 12, 10))
    bg = Image.composite(bg, dark, ImageChops.invert(vignette))

    # Soft top-left lift (same direction as app-page-background-dark.svg glow).
    lift = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    lift_draw = ImageDraw.Draw(lift)
    lift_draw.ellipse((-SIZE * 0.35, -SIZE * 0.45, SIZE * 0.85, SIZE * 0.55), fill=(36, 58, 46, 72))
    lift = lift.filter(ImageFilter.GaussianBlur(radius=SIZE * 0.12))
    bg = Image.alpha_composite(bg.convert("RGBA"), lift).convert("RGB")
    return bg


def glow_layer(mark: Image.Image) -> Image.Image:
    alpha = mark.split()[3]
    glow = Image.new("RGBA", mark.size, (72, 168, 98, 0))
    glow.putalpha(alpha)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=GLOW_BLUR))
    glow = Image.merge(
        "RGBA",
        (
            glow.split()[0],
            glow.split()[1],
            glow.split()[2],
            glow.split()[3].point(lambda a: int(a * GLOW_ALPHA)),
        ),
    )
    return glow


def composite_icon(mark: Image.Image, background: Image.Image) -> Image.Image:
    canvas = background.convert("RGBA")
    target_w = int(SIZE * LOGO_WIDTH_RATIO)
    w, h = mark.size
    scale = target_w / w
    target = (target_w, max(1, int(h * scale)))
    resized = mark.resize(target, Image.Resampling.LANCZOS)
    glow = glow_layer(resized)

    x = (SIZE - target[0]) // 2
    y = (SIZE - target[1]) // 2 - int(SIZE * 0.015)

    glow_canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    glow_canvas.paste(glow, (x, y), glow)
    canvas = Image.alpha_composite(canvas, glow_canvas)
    canvas.paste(resized, (x, y), resized)
    return canvas.convert("RGB")


def write_svg(png_bytes: bytes, path: Path) -> None:
    b64 = base64.b64encode(png_bytes).decode("ascii")
    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
  width="{SIZE}" height="{SIZE}" viewBox="0 0 {SIZE} {SIZE}">
  <title>The Outreach Project — app icon (dark)</title>
  <image width="{SIZE}" height="{SIZE}" xlink:href="data:image/png;base64,{b64}"/>
</svg>
"""
    path.write_text(svg, encoding="utf-8")


def main() -> None:
    if not LOGO_SRC.is_file():
        raise SystemExit(f"Missing source logo: {LOGO_SRC}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    mark = extract_op_mark(Image.open(LOGO_SRC))
    background = load_background()
    icon = composite_icon(mark, background)

    icon.save(OUT_PNG, "PNG", optimize=True)
    buf = io.BytesIO()
    icon.save(buf, format="PNG", optimize=True)
    write_svg(buf.getvalue(), OUT_SVG)

    print(f"Wrote {OUT_PNG}")
    print(f"Wrote {OUT_SVG}")
    print(f"Size: {icon.size[0]}×{icon.size[1]} px")
    print(f"Background: {BG_TOPO.name if BG_TOPO.is_file() else BG_FALLBACK.name}")
    print(f"Logo width: {int(SIZE * LOGO_WIDTH_RATIO)} px ({int(LOGO_WIDTH_RATIO * 100)}% of canvas)")


if __name__ == "__main__":
    main()
