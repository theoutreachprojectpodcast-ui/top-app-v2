# Sync committed header logos from VolenteLabs design assets (byte copy + derive).
# Adjust $AssetsRoot if your machine uses a different clone path.

$ErrorActionPreference = "Stop"
$AssetsRoot = "C:\Users\andre\OneDrive\Documents\VolenteLabs\Active Projects\TheOutreachProject\tORPApp\top-app-v2\assets"
$DigitalAssets = "C:\Users\andre\OneDrive\Documents\VolenteLabs\Active Projects\TheOutreachProject\DigitalAssets"
$Pub = Join-Path $PSScriptRoot "..\public"

$dark = Join-Path $AssetsRoot "The Outreach Project logo _ darkmode.png"
$light = Join-Path $AssetsRoot "The Outreach Project logo _Lightmode.png"
$mark = Join-Path $DigitalAssets "The Outreach Project logomark.png"

foreach ($pair in @(
    @{ Src = $dark;  Dst = Join-Path $Pub "brand-logo-site-dark-import.png" },
    @{ Src = $light; Dst = Join-Path $Pub "brand-logo-site-light-import.png" },
    @{ Src = $mark;  Dst = Join-Path $Pub "brand-logo-mark-import.png" }
)) {
    if (-not (Test-Path -LiteralPath $pair.Src)) {
        Write-Error "Missing: $($pair.Src)"
    }
    Copy-Item -LiteralPath $pair.Src -Destination $pair.Dst -Force
}

Push-Location (Join-Path $PSScriptRoot "..")
try {
    python scripts/derive-logo-variants.py
} finally {
    Pop-Location
}

Write-Host "Done. Public logos updated from assets folder."
