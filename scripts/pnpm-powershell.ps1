# Makes `pnpm` reliable in Windows PowerShell by invoking pnpm.cmd instead of
# Corepack's pnpm.ps1 (which PowerShell prefers and which fails under Restricted execution policy).
#
# One-time setup — pick ONE:
#
# A) Allow local scripts (recommended; one line, persists for your user):
#    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#
# B) Load this file from your PowerShell profile (works even with Restricted policy
#    for *other* scripts, because this file is dot-sourced by you explicitly):
#    notepad $PROFILE
#    Add a line (fix the path to your clone):
#    . "C:\path\to\top-app-v2\scripts\pnpm-powershell.ps1"

function global:pnpm {
    $cmd = Get-Command pnpm.cmd -CommandType Application -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Source -First 1
    if (-not $cmd) {
        Write-Error "pnpm.cmd not found. Install Node.js LTS, then run: corepack enable"
        return
    }
    & $cmd @args
}
