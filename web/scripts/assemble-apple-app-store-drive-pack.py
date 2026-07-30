"""Assemble a Google Drive–ready Apple App Store upload pack."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "apple-app-store-upload" / "DRIVE-SHARE"
PBX = ROOT / "web" / "ios" / "App" / "App.xcodeproj" / "project.pbxproj"


def read_ios_versions() -> tuple[str, str]:
    text = PBX.read_text(encoding="utf-8")
    marketing = re.search(r"MARKETING_VERSION = ([^;]+);", text)
    build = re.search(r"CURRENT_PROJECT_VERSION = ([^;]+);", text)
    return (
        (marketing.group(1).strip() if marketing else "1.0"),
        (build.group(1).strip() if build else "?"),
    )


def main() -> None:
    marketing, build = read_ios_versions()
    if OUT.exists():
        shutil.rmtree(OUT)

    dirs = {
        "xcode": OUT / "01-xcode-project-notes",
        "assets": OUT / "02-store-listing-assets",
        "iphone": OUT / "02-store-listing-assets" / "iphone-screenshots",
        "ipad": OUT / "02-store-listing-assets" / "ipad-screenshots",
        "copy": OUT / "03-listing-copy",
        "policy": OUT / "04-policy-and-review",
        "legal": OUT / "05-legal",
        "mac": OUT / "06-mac-archive-runbook",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    # App icon (1024 no alpha) from iOS asset if present
    icon_candidates = [
        ROOT
        / "web"
        / "ios"
        / "App"
        / "App"
        / "Assets.xcassets"
        / "AppIcon.appiconset"
        / "AppIcon-512@2x.png",
        ROOT / "docs" / "store-screenshots" / "app-icon-dark-1024.png",
        ROOT / "web" / "public" / "icon-1024.png",
    ]
    icon_src = next(p for p in icon_candidates if p.exists())
    icon = Image.open(icon_src).convert("RGB")  # strip alpha for App Store
    icon = icon.resize((1024, 1024), Image.Resampling.LANCZOS)
    icon.save(dirs["assets"] / "app-icon-1024x1024.png", "PNG", optimize=True)

    # Screenshots
    src_shots = ROOT / "docs" / "store-screenshots" / "svg"
    for name in [
        "01-home.png",
        "02-directory.png",
        "03-trusted-resources.png",
        "04-podcast.png",
        "05-sponsors.png",
        "06-profile.png",
        "07-saved-organizations.png",
        "08-community.png",
    ]:
        src = src_shots / name
        if src.exists():
            Image.open(src).convert("RGB").save(dirs["iphone"] / name, "PNG", optimize=True)

    tab = ROOT / "docs" / "store-screenshots" / "ipad-13" / "01-home.png"
    if tab.exists():
        Image.open(tab).convert("RGB").save(dirs["ipad"] / "01-home-ipad.png", "PNG", optimize=True)

    # Version / identity
    (dirs["xcode"] / "IDENTITY.txt").write_text(
        f"""Apple App Store identity
=======================
App name (Connect): The Outreach Project. Nonprofit Directory
Display name: The Outreach Project
Bundle ID: com.theoutreachproject.theoutreachproject
Marketing version (CFBundleShortVersionString): {marketing}
Build number (CFBundleVersion): {build}
Deployment target: iOS 15.0
Devices: iPhone + iPad
Xcode project: web/ios/App/App.xcodeproj
Workspace (prefer): web/ios/TOP.xcworkspace
Scheme: App
WebView URL: https://theoutreachproject.app
Embedded config: web/ios/App/App/capacitor.config.json

IMPORTANT
---------
- IPA is produced on a Mac with Xcode — not included in this pack.
- Before each upload, build number must be HIGHER than any build already in App Store Connect.
- Current repo build is {build}. If Connect already has {build}, bump CURRENT_PROJECT_VERSION first.
""",
        encoding="utf-8",
    )

    (dirs["copy"] / "01-app-name.txt").write_text("The Outreach Project\n", encoding="utf-8")
    (dirs["copy"] / "02-subtitle.txt").write_text("Veteran resource network\n", encoding="utf-8")
    (dirs["copy"] / "03-promotional-text.txt").write_text(
        "Mission-first resources for veterans, first responders, and supporters — directory, community, sponsors, and membership in one place.\n",
        encoding="utf-8",
    )
    (dirs["copy"] / "04-description.txt").write_text(
        """The Outreach Project (TOP) connects veterans, first responders, and supporters with trusted nonprofits, community stories, podcasts, and membership benefits — in one clear, mobile-first experience.

Discover
• Search the nonprofit directory by cause, location, and need
• Browse trusted resource partners vetted for the TOP community
• Explore sponsor organizations supporting the mission

Connect
• Join community conversations and share stories
• Save organizations and favorites to your profile
• Stay informed with in-app notifications

Membership
• Support the mission with optional Support or Pro membership tiers
• Manage billing securely through Stripe on our website

Built for clarity under pressure
TOP is designed for quick navigation when it matters most — with a trust-driven approach to resource discovery.

Sign in with your TOP account to sync profile, saved items, and membership across web and mobile.

Questions? Contact us at support@theoutreachproject.app or via the in-app contact form.

Privacy Policy: https://theoutreachproject.app/privacy
Terms of Use: https://theoutreachproject.app/terms
""",
        encoding="utf-8",
    )
    (dirs["copy"] / "05-keywords.txt").write_text(
        "veterans,first responders,nonprofit,directory,resources,community,podcast,membership,support\n",
        encoding="utf-8",
    )
    (dirs["copy"] / "06-whats-new.txt").write_text(
        f"""Version {marketing} (build {build})

Improvements to the native app shell and production experience:
• Portrait-focused mobile layout
• Sign-in and session reliability updates
• Sponsors, community, and directory experience polish
• Membership billing continues via Stripe on our website (not Apple In-App Purchase)

Thank you for supporting The Outreach Project.
""",
        encoding="utf-8",
    )
    (dirs["copy"] / "07-support-and-marketing-urls.txt").write_text(
        """Support URL: https://theoutreachproject.app/contact
Marketing URL: https://theoutreachproject.app
Privacy Policy URL: https://theoutreachproject.app/privacy
Support email: support@theoutreachproject.app
""",
        encoding="utf-8",
    )

    (dirs["policy"] / "app-privacy-summary.txt").write_text(
        """APP STORE CONNECT — APP PRIVACY (summary)

Data linked to you: Yes — account and user content
Data used to track you: No

Contact info: Email, name — App functionality / Account management
User content: Photos (optional), posts — App functionality
Identifiers: No advertising ID
Purchases: Purchase history / subscription status — App functionality (via Stripe on web; card data held by Stripe)
Location: Not collected
Contacts / SMS / microphone: Not collected

Third parties: WorkOS (auth), Stripe (checkout in browser), Supabase (data), Vercel (hosting)
Encryption in transit: HTTPS
""",
        encoding="utf-8",
    )
    (dirs["policy"] / "review-notes.txt").write_text(
        """APP REVIEW NOTES (paste into App Store Connect)

The Outreach Project iOS app (Capacitor) loads our production web application inside a native WebView.
Sign-in uses WorkOS AuthKit inside the app.
Account creation, membership purchases, sponsor packages, and all billing (Stripe Checkout and Customer Portal) happen only on https://theoutreachproject.app in the device system browser (Safari) — not inside the app WebView.
The app does not collect payment details, does not show Apple In-App Purchase products, and does not embed Stripe checkout.

Users share one account across web and mobile. After completing signup or payment on the web, they return to the app and tap Refresh account status (or use the deep link on the web success page) to sync membership.

Test account: create a Production WorkOS user and paste email/password ONLY into App Store Connect Review Notes.
Example mailbox: appreview+ios@theoutreachproject.app
(Prefer a password manager — avoid putting real passwords in shared Drive docs.)

Reviewer steps:
1. Launch app → Sign in with test account
2. Browse Home, Directory, Community, Profile
3. Tap Upgrade / Manage billing → confirm Safari opens the website (no in-app payment form)
4. Optional: complete membership on the website, return to app, refresh account status

Short disclosure:
Subscriptions are purchased on our website (Stripe); no in-app purchase products.
""",
        encoding="utf-8",
    )
    (dirs["policy"] / "export-compliance.txt").write_text(
        """Export compliance

Info.plist: ITSAppUsesNonExemptEncryption = false
Uses only standard HTTPS / TLS. No custom crypto.
Answer App Store Connect accordingly (exempt / standard encryption only).
""",
        encoding="utf-8",
    )

    for name in ["privacy-policy.md", "terms-and-conditions.md"]:
        src = ROOT / "docs" / "legal" / name
        if src.exists():
            shutil.copy2(src, dirs["legal"] / name)
    (dirs["legal"] / "URLS.txt").write_text(
        """Privacy: https://theoutreachproject.app/privacy
Terms: https://theoutreachproject.app/terms
Contact: https://theoutreachproject.app/contact
Website: https://theoutreachproject.app
Download (after live URL set): https://theoutreachproject.app/download
""",
        encoding="utf-8",
    )

    (dirs["mac"] / "ARCHIVE-AND-SUBMIT.txt").write_text(
        f"""MAC ARCHIVE + APP STORE CONNECT RUNBOOK
=======================================
Repo must be current (git pull). Build in repo: Marketing {marketing} / Build {build}

1) Prep on Mac (repo root)
   pnpm install
   pnpm run mobile:store:prep
   # Confirm:
   grep url web/ios/App/App/capacitor.config.json
   # Expect: "url": "https://theoutreachproject.app"

2) Open Xcode
   pnpm --dir web run cap:open:ios
   # Prefer workspace if prompted: web/ios/TOP.xcworkspace

3) Signing
   Target App → Signing & Capabilities
   Team = your Apple Developer team
   Bundle ID = com.theoutreachproject.theoutreachproject
   Automatic signing ON

4) Version check
   General → Version = {marketing}
   Build = {build}
   If App Store Connect already has build {build}, increment CURRENT_PROJECT_VERSION and archive again.

5) Archive
   Product → Clean Build Folder
   Destination: Any iOS Device (arm64)
   Product → Archive
   Organizer → Validate App → Distribute App → App Store Connect

6) TestFlight
   Wait for processing
   Internal testers: install + smoke (sign-in, home, directory, community, profile, billing opens Safari)
   Then submit for App Review from the version page

7) App Store Connect listing
   Paste copy from 03-listing-copy/
   Upload screenshots from 02-store-listing-assets/
   Paste review notes from 04-policy-and-review/review-notes.txt
   Privacy URLs from 05-legal/URLS.txt

8) After approval / Ready for Sale
   Set Vercel production: NEXT_PUBLIC_IOS_APP_STORE_URL=https://apps.apple.com/app/idYOUR_APPLE_ID
   Confirm https://theoutreachproject.app/download shows App Store badge

Related docs in repo:
  IOS_APP_STORE_RELEASE_CHECKLIST.md
  docs/IOS_XCODE_SETUP.md
""",
        encoding="utf-8",
    )

    (OUT / "00-START-HERE.txt").write_text(
        f"""THE OUTREACH PROJECT — Apple App Store upload pack
==================================================
Version {marketing} · Build {build}
Bundle ID: com.theoutreachproject.theoutreachproject

Share this folder (or the ZIP) via Google Drive.

This pack has listing assets + paste-ready copy.
The signed IPA is built on a Mac with Xcode (see 06-mac-archive-runbook/).

Folders
-------
01-xcode-project-notes/   Bundle ID, version, paths
02-store-listing-assets/  App icon + iPhone/iPad screenshots
03-listing-copy/          Name, description, keywords, What's New
04-policy-and-review/     Privacy summary + App Review notes
05-legal/                 Privacy/terms drafts + URLs
06-mac-archive-runbook/   Exact Mac steps to archive & submit

Do NOT put in Drive
-------------------
Apple certificates, provisioning profiles, or reviewer passwords.
""",
        encoding="utf-8",
    )

    lines = ["FILE MANIFEST\n=============\n"]
    for p in sorted(OUT.rglob("*")):
        if p.is_file():
            lines.append(f"{p.stat().st_size:>12}  {p.relative_to(OUT).as_posix()}")
    (OUT / "MANIFEST.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"OUT={OUT}")
    print(f"version={marketing} build={build}")
    print(f"icon={Image.open(dirs['assets'] / 'app-icon-1024x1024.png').size}")
    print(f"iphone={len(list(dirs['iphone'].glob('*.png')))}")


if __name__ == "__main__":
    main()
