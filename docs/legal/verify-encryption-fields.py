#!/usr/bin/env python3
"""Verify character counts for docs/legal/app-encryption-apple.md paste blocks."""

from __future__ import annotations

import re
import sys
from pathlib import Path

DOC = Path(__file__).with_name("app-encryption-apple.md")

# name -> (expected_limit, text)
FIELDS: dict[str, tuple[int, str]] = {
    "purpose_300": (
        300,
        "The Outreach Project (org.theoutreachproject.torp) helps veterans, first responders, and supporters find nonprofits, trusted resources, community, podcasts, and membership. Capacitor loads https://theoutreachproject.app in WKWebView. Consumer app; not for military or surveillance. No custom crypto.",
    ),
    "purpose_500": (
        500,
        "The Outreach Project (org.theoutreachproject.torp) is a consumer iOS app for veterans, first responders, and supporters. Users sign in to search nonprofits, browse trusted resources, read community posts, access podcasts, save organizations, and manage optional membership. Capacitor shell loads https://theoutreachproject.app in WKWebView. Not for military, intelligence, or surveillance. Membership billing uses Stripe on the web. Profile and saved orgs sync via Supabase over HTTPS.",
    ),
    "encryption_500": (
        500,
        "Encryption is limited to HTTPS (TLS 1.2+) via Apple WebKit/WKWebView and iOS networking. Traffic goes to https://theoutreachproject.app and APIs: WorkOS (sign-in), Supabase (profiles, saved orgs, community), Stripe (membership checkout). No proprietary or non-standard algorithms in the iOS binary. No VPN, E2E chat, encrypted vault, or user keys. Optional photo upload for profile or community images only. Server encryption at rest is provider-managed (Vercel, Supabase), not client crypto.",
    ),
    "encryption_1000": (
        1000,
        "Encryption is limited to HTTPS (TLS 1.2+) through Apple WebKit/WKWebView and iOS networking. All traffic goes to https://theoutreachproject.app and third-party APIs: WorkOS (sign-in), Supabase (profiles, saved orgs, community), Stripe (membership checkout in browser). No proprietary, custom, or non-standard algorithms ship in the iOS binary. No VPN, end-to-end chat, encrypted vault, or user-managed keys. Optional camera or photo access only when the user uploads a profile or community image. Server-side encryption at rest is handled by hosting providers (Vercel, Supabase), not client-side crypto. The Capacitor native shell links only @capacitor/core and @capacitor/share; TLS is provided by Apple OS frameworks. Session cookies use HTTPS secure transport. WorkOS AuthKit handles sign-in over TLS. No local encrypted database beyond iOS defaults. Share sheet uses system APIs only. No certificate pinning beyond the OS trust store. No OpenSSL or custom crypto SDKs in the iOS binary.",
    ),
    "exempt_500": (
        500,
        "Mass-market consumer resource app distributed on the App Store. Encryption is standard TLS/HTTPS only for authentication, protecting data in transit, and secure API calls to WorkOS, Supabase, and Stripe. Exempt under EAR Category 5 Part 2 mass-market treatment. No CCATS, ERN, or proprietary cryptography. The iOS binary contains no OpenSSL, no custom crypto SDKs, and no encryption beyond what Apple OS and WebKit provide for HTTPS connections to the production web app at theoutreachproject.app.",
    ),
    "third_250": (
        250,
        "WorkOS, Supabase, and Stripe are reached only via HTTPS inside WKWebView. Capacitor bridge and Share plugin only. No bundled third-party crypto libraries; all TLS is provided by Apple OS and WebKit. Vercel hosts the web origin over HTTPS.",
    ),
    "combined_appDescription": (
        4000,
        "The Outreach Project (org.theoutreachproject.torp) is a consumer iOS app for veterans, first responders, and supporters (nonprofit directory, trusted resources, community, podcasts, membership). Capacitor/WKWebView loads https://theoutreachproject.app. Encryption: HTTPS (TLS 1.2+) only via Apple WebKit and iOS networking to WorkOS, Supabase, and Stripe. No proprietary, custom, or non-standard crypto in the iOS binary. No VPN, E2E chat, encrypted vault, or user-managed keys. Mass-market consumer app; exempt under EAR Category 5 Part 2. No CCATS, ERN, or proprietary cryptography. Capacitor links @capacitor/core and @capacitor/share only; TLS from Apple OS/WebKit. Not for military, intelligence, or surveillance use. Server encryption at rest is provider-managed (Vercel, Supabase), not client-side crypto. Optional photo upload for profile or community images only.",
    ),
}


def extract_fence_blocks(markdown: str) -> list[str]:
    return re.findall(r"```\n([\s\S]*?)```", markdown)


def main() -> int:
    if not DOC.exists():
        print(f"Missing {DOC}", file=sys.stderr)
        return 1

    doc = DOC.read_text(encoding="utf-8")
    blocks = extract_fence_blocks(doc)
    expected_texts = [text for _, text in FIELDS.values()]

    missing = [t for t in expected_texts if t not in doc]
    if missing:
        print("ERROR: doc is out of sync with verify script (missing paste blocks).", file=sys.stderr)
        return 1

    print(f"{'Field':<28} {'Used':>5} {'Limit':>6}  Status")
    print("-" * 52)
    failed = False
    for name, (limit, text) in FIELDS.items():
        used = len(text)
        ok = used <= limit
        if not ok:
            failed = True
        print(f"{name:<28} {used:>5} {limit:>6}  {'OK' if ok else 'OVER'}")

    print(f"\nFence blocks in doc: {len(blocks)}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
