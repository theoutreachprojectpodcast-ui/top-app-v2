import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // pnpm workspace: Turbopack must resolve from the repo root so `next` and the app tree stay consistent.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
