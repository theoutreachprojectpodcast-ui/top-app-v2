# Loader: dot-source this from Cursor/VS Code or PowerShell. If the full repo is on disk,
# loads `scripts/pnpm-powershell.ps1` at the repo root; otherwise defines `pnpm` inline.
$webDir = Split-Path $PSScriptRoot -Parent
$repoRoot = Split-Path $webDir -Parent
$canonical = Join-Path $repoRoot "scripts\pnpm-powershell.ps1"
if (Test-Path $canonical) {
    . $canonical
} else {
    function global:pnpm {
        $cmd = Get-Command pnpm.cmd -CommandType Application -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Source -First 1
        if (-not $cmd) {
            Write-Error "pnpm.cmd not found. Install Node.js LTS, then run: corepack enable"
            return
        }
        & $cmd @args
    }
}
