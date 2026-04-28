# WorkOS CLI (AuthKit)

Official entrypoint:

```bash
cd web
pnpm workos
```

That runs `pnpm dlx workos@latest`, which matches the intent of `npx workos@latest` but uses the same Node as your pnpm toolchain. On some Windows setups, plain `npx workos@latest` can pick an older Node (for example 20.19.x) and fail the CLI’s `>=20.20` check even when `node -v` in the shell is newer.

## Prerequisites

- **Node.js ≥ 20.20** (the CLI prints an error on older versions, e.g. 20.19.x).
- Upgrade with [nodejs.org](https://nodejs.org/), **fnm**, **nvm-windows**, or **Corepack** + your usual toolchain.

## Commands you’ll use

| Goal | Command |
|------|---------|
| AI installer (new / greenfield AuthKit) | `pnpm workos install` |
| Diagnostics | `pnpm workos doctor` |
| Log in to WorkOS from the CLI | `pnpm workos auth login` |
| CLI help | `pnpm workos --help` |

Docs: [AI Installer & CLI](https://workos.com/docs/authkit/cli-installer).

## This repository already has AuthKit

`tORP` already uses `@workos-inc/authkit-nextjs`, `/callback`, and env vars in `web/.env.local.example`. Step-by-step enablement: **`web/docs/WORKOS_HOSTED_SIGNIN.md`**.

- **Do not** run `workos install` on a clean tree without reviewing diffs — it may rewrite routes and middleware. Prefer **dashboard + `.env.local`** for keys and redirect URIs unless you intend a full reinstall.
- **Do** use the CLI for **`auth login`**, **`doctor`**, and dashboard sync flows that don’t overwrite your app.

## Align with this app

- **Redirect URI** in the WorkOS dashboard must match **`NEXT_PUBLIC_WORKOS_REDIRECT_URI`** (default `http://localhost:3001/callback`).
- After the CLI or dashboard changes env vars, restart **`pnpm dev`** from the repo root.
