#!/bin/sh
# Repo-scoped Git credential helper for theoutreachprojectpodcast-ui/top-app-v2.
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
TOP_REPO="theoutreachprojectpodcast-ui/top-app-v2"

if ! node "$ROOT/scripts/gh-top-account.mjs" --can-push >/dev/null 2>&1; then
  echo "gh-credential-top: no gh account with push access to $TOP_REPO." >&2
  echo "Run: pnpm run setup:github-auth" >&2
  exit 1
fi

exec gh auth git-credential "$@"
