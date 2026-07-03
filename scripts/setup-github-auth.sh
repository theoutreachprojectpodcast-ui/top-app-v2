#!/usr/bin/env bash
# One-time (or re-run) GitHub auth setup for top-app-v2.
set -euo pipefail

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TOP_USER="theoutreachprojectpodcast-ui"
TOP_REPO="theoutreachprojectpodcast-ui/top-app-v2"
CREDENTIAL_HELPER="$ROOT/scripts/gh-credential-top.sh"

echo "==> Outreach Project GitHub auth setup ($TOP_REPO)"

origin="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$origin" != *"$TOP_REPO"* ]]; then
  echo "ERROR: origin must point at $TOP_REPO (got: ${origin:-none})" >&2
  exit 1
fi

chmod +x "$CREDENTIAL_HELPER" "$ROOT/scripts/setup-github-auth.sh" "$ROOT/.githooks/pre-push" 2>/dev/null || true

echo "==> Configuring repo-local git credentials (Outreach Project repo only)"
git config --local "credential.https://github.com/${TOP_USER}.helper" "!$CREDENTIAL_HELPER"
git config --local --unset-all "credential.helper" 2>/dev/null || true
git config --local core.hooksPath .githooks

if ! node "$ROOT/scripts/gh-top-account.mjs" --can-push; then
  echo ""
  echo "==> Log in to GitHub with an account that can push to $TOP_REPO"
  echo "    (Use Add account in gh if you already have other logins on this machine.)"
  echo ""
  gh auth login -h github.com -p https -w --git-protocol https
fi

if ! node "$ROOT/scripts/gh-top-account.mjs" --can-push; then
  echo "ERROR: No gh account with push access to $TOP_REPO. Re-run: pnpm run setup:github-auth" >&2
  exit 1
fi

echo "==> Clearing stale github.com HTTPS credentials from macOS keychain (if any)"
printf "protocol=https\nhost=github.com\n\n" | git credential-osxkeychain erase 2>/dev/null || true

echo "==> Verifying push access to $TOP_REPO"
node "$ROOT/scripts/gh-top-account.mjs" --verify-push
node "$ROOT/scripts/verify-github-remote.mjs"

active="$(node "$ROOT/scripts/gh-top-account.mjs" --active)"
echo ""
echo "Done. This repo will push as: $active"
echo ""
echo "Optional smoke test: git push --dry-run origin main"
