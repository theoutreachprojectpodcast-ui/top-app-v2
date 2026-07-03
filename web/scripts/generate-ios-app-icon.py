"""Backward-compatible entry point — delegates to generate-mobile-app-icons.py."""
from __future__ import annotations

import runpy
from pathlib import Path

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("generate-mobile-app-icons.py")), run_name="__main__")
