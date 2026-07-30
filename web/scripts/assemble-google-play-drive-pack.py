"""Assemble a Google Drive–ready Google Play upload asset pack."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "google-play-upload" / "DRIVE-SHARE"


def load_font(paths: list[str], size: int) -> ImageFont.ImageFont:
    for p in paths:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)

    dirs = {
        "bundle": OUT / "01-app-bundle",
        "assets": OUT / "02-store-listing-assets",
        "phone": OUT / "02-store-listing-assets" / "phone-screenshots",
        "tablet": OUT / "02-store-listing-assets" / "tablet-screenshots-optional",
        "copy": OUT / "03-listing-copy",
        "policy": OUT / "04-policy-and-review",
        "legal": OUT / "05-legal",
    }
    for d in dirs.values():
        d.mkdir(parents=True, exist_ok=True)

    # Exact 512×512 icon
    icon_src = ROOT / "web" / "public" / "brand-app-icon-master.png"
    if not icon_src.exists():
        icon_src = ROOT / "web" / "public" / "icon-1024.png"
    icon = Image.open(icon_src).convert("RGBA")
    icon_512 = icon.resize((512, 512), Image.Resampling.LANCZOS)
    icon_512_path = dirs["assets"] / "app-icon-512x512.png"
    icon_512.save(icon_512_path, "PNG", optimize=True)
    icon.resize((1024, 1024), Image.Resampling.LANCZOS).save(
        dirs["assets"] / "app-icon-1024x1024-source.png", "PNG", optimize=True
    )

    # Feature graphic 1024×500 from brand photography
    bg_candidates = [
        ROOT / "web" / "public" / "home" / "home-header-mountain-patriotic.png",
        ROOT / "web" / "public" / "home" / "home-atmosphere-cinematic-scene.png",
        ROOT / "web" / "public" / "home" / "home-hero-flag-mission.png",
    ]
    bg_path = next(p for p in bg_candidates if p.exists())
    bg = Image.open(bg_path).convert("RGB")
    target_w, target_h = 1024, 500
    bw, bh = bg.size
    scale = max(target_w / bw, target_h / bh)
    nw, nh = int(bw * scale), int(bh * scale)
    bg = bg.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - target_w) // 2
    top = max(0, (nh - target_h) // 3)
    bg = bg.crop((left, top, left + target_w, top + target_h))
    overlay = Image.new("RGB", (target_w, target_h), (8, 16, 28))
    bg = Image.blend(bg, overlay, 0.42)
    feat = bg.convert("RGBA")

    grad = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    for x in range(620):
        a = int(170 * (1 - x / 620))
        gdraw.line([(x, 0), (x, target_h)], fill=(6, 14, 26, a))
    feat = Image.alpha_composite(feat, grad)
    draw = ImageDraw.Draw(feat)

    logo_path = ROOT / "web" / "public" / "brand-logo-mark-light.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        logo.thumbnail((120, 80), Image.Resampling.LANCZOS)
        feat.alpha_composite(logo, (48, 48))

    title_font = load_font(
        [r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\segoeuib.ttf"], 54
    )
    sub_font = load_font(
        [r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\segoeui.ttf"], 26
    )
    draw.text((48, 160), "The Outreach Project", font=title_font, fill=(255, 255, 255, 255))
    draw.text(
        (48, 230),
        "Mission-first resources for veterans,",
        font=sub_font,
        fill=(220, 230, 240, 255),
    )
    draw.text(
        (48, 268),
        "first responders, and supporters.",
        font=sub_font,
        fill=(220, 230, 240, 255),
    )

    feat_path = dirs["assets"] / "feature-graphic-1024x500.png"
    feat.convert("RGB").save(feat_path, "PNG", optimize=True)

    # Phone screenshots
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
            Image.open(src).convert("RGB").save(dirs["phone"] / name, "PNG", optimize=True)

    tab = ROOT / "docs" / "store-screenshots" / "ipad-13" / "01-home.png"
    if tab.exists():
        Image.open(tab).convert("RGB").save(
            dirs["tablet"] / "01-home-tablet.png", "PNG", optimize=True
        )

    # AAB
    aab_src = (
        ROOT
        / "web"
        / "android"
        / "app"
        / "build"
        / "outputs"
        / "bundle"
        / "release"
        / "app-release.aab"
    )
    aab_dst = dirs["bundle"] / "app-release-v1.0-versionCode-6.aab"
    if aab_src.exists():
        shutil.copy2(aab_src, aab_dst)
        (dirs["bundle"] / "VERSION.txt").write_text(
            "package: com.theoutreachproject\n"
            "versionName: 1.0\n"
            "versionCode: 6\n"
            "file: app-release-v1.0-versionCode-6.aab\n",
            encoding="utf-8",
        )
    else:
        (dirs["bundle"] / "MISSING-AAB.txt").write_text(
            "AAB not found. Run:\npnpm run mobile:android:bundle\n",
            encoding="utf-8",
        )

    (dirs["copy"] / "01-app-name.txt").write_text("The Outreach Project\n", encoding="utf-8")
    (dirs["copy"] / "02-short-description.txt").write_text(
        "Mission-first resources for veterans, first responders, and supporters.\n",
        encoding="utf-8",
    )
    (dirs["copy"] / "03-full-description.txt").write_text(
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
    (dirs["copy"] / "04-release-notes-closed-testing.txt").write_text(
        """The Outreach Project 1.0 — closed test build.

• Sign in with your TOP account (WorkOS)
• Browse directory, trusted resources, sponsors, community & podcasts
• Profile sync across web and mobile
• Membership and billing via Stripe on our website (not Google Play Billing)

Please report crashes, login issues, or layout problems on your device.
""",
        encoding="utf-8",
    )
    (dirs["copy"] / "05-release-notes-production.txt").write_text(
        """Welcome to The Outreach Project 1.0.

Find trusted nonprofits and resources, join the community, explore sponsors and podcasts, and manage your membership — all in one place.

Sign in with your TOP account. Membership purchases are completed securely on our website via Stripe.
""",
        encoding="utf-8",
    )
    (dirs["copy"] / "06-category-and-contacts.txt").write_text(
        """Category: Lifestyle (or Social Networking)
Support email: support@theoutreachproject.app
Website: https://theoutreachproject.app
Privacy: https://theoutreachproject.app/privacy
Terms: https://theoutreachproject.app/terms
Contact: https://theoutreachproject.app/contact
""",
        encoding="utf-8",
    )

    (dirs["policy"] / "data-safety.txt").write_text(
        """GOOGLE PLAY — DATA SAFETY (paste into Console)

Email address: Collected=Yes, Shared=No, Purpose=Account, Required for sign-in
Name: Collected=Yes, Shared=No, Purpose=Profile, Optional
Photos: Collected=Yes, Shared=No, Purpose=Profile/community, Optional
User-generated content: Collected=Yes, Shared=No, Purpose=Community, Optional
Purchase history: Collected=Yes, Shared=No, Purpose=Membership status, Optional
Device or other IDs: No
Location: No

Data encrypted in transit: Yes (HTTPS)
Users can request deletion: Yes — Settings / support@theoutreachproject.app
Ads: No
Account required: Yes for most features

Payments: Memberships and sponsor packages via Stripe on the website — NOT Google Play Billing.
""",
        encoding="utf-8",
    )
    (dirs["policy"] / "ads-content-audience.txt").write_text(
        """Ads: No

Target audience: Not directed at children under 13.
Attractive to adults (veterans, first responders, supporters).

Content rating (IARC): Disclose social features and user-generated content (posts, comments, photos).
No gambling. Not targeted at children.
""",
        encoding="utf-8",
    )
    (dirs["policy"] / "reviewer-notes-and-billing.txt").write_text(
        """APP ACCESS / REVIEW NOTES

The Outreach Project Android app (Capacitor) loads our production web app in a native WebView.
Sign-in: WorkOS AuthKit in-app.
Membership / sponsor billing: Stripe Checkout + Customer Portal on https://theoutreachproject.app in Chrome (system browser).
This app does NOT use Google Play Billing and does NOT collect card details.

Test account: create a Production WorkOS user and paste email/password ONLY into Play Console App access.
Example mailbox pattern: appreview+android@theoutreachproject.app
(Prefer a password manager — avoid putting real passwords in shared Drive docs.)

Reviewer steps:
1. Launch → Sign in
2. Browse Home, Directory, Community, Profile
3. Tap Upgrade / Manage billing → Chrome opens website
4. Optional: complete membership on web, return, refresh account status

Short billing disclosure:
Subscriptions and sponsor packages are purchased through our website (Stripe). The app does not offer Google Play in-app products.
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
Download (after live): https://theoutreachproject.app/download
Support email: support@theoutreachproject.app
""",
        encoding="utf-8",
    )

    (OUT / "00-START-HERE.txt").write_text(
        """THE OUTREACH PROJECT — Google Play upload pack
==============================================
Upload this whole folder (or the ZIP) to Google Drive for the team.

WHAT TO UPLOAD IN PLAY CONSOLE
------------------------------
1) App bundle
   01-app-bundle/app-release-v1.0-versionCode-6.aab
   Package: com.theoutreachproject | versionName 1.0 | versionCode 6

2) Store listing graphics
   02-store-listing-assets/app-icon-512x512.png
   02-store-listing-assets/feature-graphic-1024x500.png
   02-store-listing-assets/phone-screenshots/*.png  (min 2; all 8 included)

3) Text fields — paste from 03-listing-copy/
4) Policy forms — paste from 04-policy-and-review/
5) Legal URLs — 05-legal/URLS.txt

CLOSED TESTING
--------------
Personal accounts (after Nov 2023): need 12 opted-in closed testers for 14 continuous days before Production unlocks.

DO NOT SHARE IN THIS FOLDER
---------------------------
- Upload keystore / keystore.properties
- Real reviewer passwords

Rebuild AAB if needed (repo root):
  pnpm run mobile:store:prep
  pnpm run mobile:android:bundle
  python web/scripts/assemble-google-play-drive-pack.py
""",
        encoding="utf-8",
    )

    lines = ["FILE MANIFEST\n=============\n"]
    for p in sorted(OUT.rglob("*")):
        if p.is_file():
            lines.append(f"{p.stat().st_size:>12}  {p.relative_to(OUT).as_posix()}")
    (OUT / "MANIFEST.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"OUT={OUT}")
    print(f"icon={Image.open(icon_512_path).size} {icon_512_path}")
    print(f"feature={Image.open(feat_path).size} {feat_path}")
    print(f"phone={len(list(dirs['phone'].glob('*.png')))}")
    print(f"aab={aab_dst.exists()} size={aab_dst.stat().st_size if aab_dst.exists() else 0}")


if __name__ == "__main__":
    main()
