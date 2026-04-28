/**
 * Fail fast if the chosen dev port is already in use.
 * Port is passed from package.json (`dev` → 3000, `dev:alt` → 3001).
 */
import net from "node:net";

const PORT = (() => {
  const n = Number(process.argv[2]);
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : 3000;
})();

await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error("");
      console.error(`[dev] Port ${PORT} is already in use.`);
      console.error(`[dev] Free http://localhost:${PORT} for this app, then run pnpm dev again.`);
      console.error("");
      console.error("[dev] Windows (PowerShell) — find the process:");
      console.error(`        Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object LocalAddress, OwningProcess`);
      console.error("[dev] Then stop it, e.g.:");
      console.error("        Stop-Process -Id <OwningProcess> -Force");
      console.error("");
      process.exit(1);
    }
    reject(err);
  });
  server.listen(PORT, "localhost", () => {
    server.close(() => resolve());
  });
});
