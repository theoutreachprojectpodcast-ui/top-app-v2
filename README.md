# The Outreach Project — top-app-v2

Next.js web app for the resource network. Legacy static files (`index.html`, `app.js`) remain at the repo root for reference; **the product you run in development is `web/`**.

**Source of truth:** [github.com/theoutreachprojectpodcast-ui/top-app-v2](https://github.com/theoutreachprojectpodcast-ui/top-app-v2). Ship changes with `git commit` and `git push origin main` (or your branch + PR) so GitHub always reflects the latest product.

## Development launch

From the **repository root** (this folder):

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3001** (dev server uses `--hostname localhost --port 3001`).

- **Canonical command:** `pnpm dev` (run at the repo root). Do not use `npm run dev` or `npm dev` at the root; there is no root npm app.
- **Alternate port** (if 3001 is busy): `pnpm --filter web dev:alt` → http://localhost:3000
- **Env:** copy `web/.env.local.example` to `web/.env.local` and set Supabase keys.

### Layout for future work

- **`web/`** — current Next.js application (workspace package `web`).
- **Root `package.json`** — orchestrates `pnpm dev` / `pnpm build` via `pnpm-workspace.yaml`.
- **Mobile** — add a sibling package (e.g. `apps/mobile`) and register it in `pnpm-workspace.yaml` when ready; keep using `pnpm dev` at the root with a script that runs the right targets.

### Troubleshooting

- **Port 3001 in use:** The `dev` script checks the port first; free it or run `pnpm --filter web dev:alt` on port 3000. If Next reports another dev server in this repo, stop that PID (e.g. `taskkill /PID … /F` on Windows).
- **Asset sync warnings:** If `[sync-public-assets] copy failed` appears, something is locking `web/public/assets` (often **OneDrive**). The dev server still starts; fix locks or pause sync for that folder. Production builds on CI still fail the copy if `CI=true` (set by most hosts).
- **pnpm “Ignored build scripts” (e.g. sharp):** run `pnpm approve-builds` in the repo root if image optimization fails after install.
