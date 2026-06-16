# GitHub auth for `top-app-v2`

This repo lives at **`theoutreachprojectpodcast-ui/top-app-v2`**. Git push/pull must use a GitHub account with **push access** to that repository (for example `VolenteLabs` or `theoutreachprojectpodcast-ui`).

## One-time setup (this machine)

From the repo root:

```bash
pnpm run setup:github-auth
```

That script:

1. Binds **repo-local** git credentials to `scripts/gh-credential-top.sh` (does not change global git config for other repos).
2. Prompts **`gh auth login`** if no logged-in account can push to this repo.
3. Clears stale `github.com` HTTPS entries from the macOS keychain when needed.
4. Installs a **pre-push hook** (`.githooks/pre-push`) that verifies push access before every push.

When `gh auth login` runs and you already use another account elsewhere, choose **Add account**.

## Day-to-day

```bash
pnpm run verify:github-remote   # quick check before push
git push origin main
```

If you switched `gh` to another account for a different repo:

```bash
gh auth switch -u VolenteLabs
# or
gh auth switch -u theoutreachprojectpodcast-ui
```

## How it works

| Layer | Behavior |
|-------|----------|
| `credential.https://github.com/theoutreachprojectpodcast-ui.helper` | Repo-local only; uses active `gh` account if it can push |
| Global `credential.https://github.com.helper` | Unchanged — still serves your other repos |
| `.githooks/pre-push` | Runs `verify-github-remote` before every push |

## Troubleshooting

**403 Permission denied**  
Run `pnpm run setup:github-auth` or switch to an account with push access: `gh auth switch -u <account>`.

**Push blocked by pre-push hook**  
Run `pnpm run verify:github-remote` for the exact error, fix the active `gh` account, then retry.
