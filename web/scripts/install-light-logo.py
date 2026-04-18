"""
Copy the light-mode header logo without re-encoding.

1. Export your artwork as a real PNG with transparency (not a JPEG renamed .png).
2. Save it as: web/public/brand-logo-site-light-import.png
3. Run from repo: python web/scripts/install-light-logo.py

Writes: web/public/brand-logo-site-light.png (identical bytes to the import file).
"""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "brand-logo-site-light-import.png"
DST = ROOT / "public" / "brand-logo-site-light.png"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(
            f"Missing {SRC.name} — add a PNG with alpha, then re-run this script."
        )
    sig = SRC.read_bytes()[:8]
    if sig != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(
            f"{SRC.name} is not a PNG (wrong file signature). "
            "Export from your design tool as PNG with transparency."
        )
    shutil.copyfile(SRC, DST)
    print(f"Copied to {DST}")


if __name__ == "__main__":
    main()
