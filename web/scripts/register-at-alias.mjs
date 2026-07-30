/**
 * Resolve Next.js `@/` imports for plain Node test runners.
 * Usage: node --import ./scripts/register-at-alias.mjs scripts/test-….mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./at-alias-hooks.mjs", import.meta.url);
