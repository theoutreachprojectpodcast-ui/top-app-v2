# The Outreach Project — top-app-v2

Next.js web app for the resource network. Legacy static files (`index.html`, `app.js`) remain at the repo root for reference; **the product you run in development is `web/`**.

## Development launch

From the **repository root** (this folder):

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3000** (dev server uses `--hostname localhost --port 3000`).

- **Canonical command:** `pnpm dev` (run at the repo root). Do not use `npm run dev` or `npm dev` at the root; there is no root npm app.
- **Alternate port** (if 3000 is busy): `pnpm --filter web dev:alt` → http://localhost:3001
- **Env:** copy `web/.env.local.example` to `web/.env.local` and set Supabase keys.

### Layout for future work

- **`web/`** — current Next.js application (workspace package `web`).
- **Root `package.json`** — orchestrates `pnpm dev` / `pnpm build` via `pnpm-workspace.yaml`.
- **Mobile** — add a sibling package (e.g. `apps/mobile`) and register it in `pnpm-workspace.yaml` when ready; keep using `pnpm dev` at the root with a script that runs the right targets.

### Troubleshooting

- **Port 3000 in use:** stop the other process or run `pnpm --filter web dev:alt`.
- **pnpm “Ignored build scripts” (e.g. sharp):** run `pnpm approve-builds` in the repo root if image optimization fails after install.
