import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inlined at build so client code can mirror server `VERCEL_ENV` (not available in the browser otherwise).
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || "",
  },
  // pnpm workspace: Turbopack must resolve from the repo root so `next` and the app tree stay consistent.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
