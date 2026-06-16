#!/usr/bin/env node
import { execSync } from "node:child_process";
import {
  TOP_GH_REPO,
  TOP_GH_USER,
  activeAccountCanPushToTopRepo,
  activeGithubLogin,
  hasTopGithubAccount,
  listGithubAccounts,
} from "./gh-top-account.mjs";

const EXPECTED = TOP_GH_REPO;

let origin = "";
try {
  origin = execSync("git remote get-url origin", { encoding: "utf8" }).trim();
} catch {
  console.error("[verify:github-remote] No git origin remote configured.");
  process.exit(1);
}

if (!origin.includes(EXPECTED)) {
  console.error(`[verify:github-remote] Wrong origin: ${origin}`);
  console.error(`[verify:github-remote] Expected URL containing: ${EXPECTED}`);
  process.exit(1);
}

const helper = (() => {
  try {
    return execSync("git config --local --get credential.https://github.com/theoutreachprojectpodcast-ui.helper", {
      encoding: "utf8",
    }).trim();
  } catch {
    return "";
  }
})();
if (!helper.includes("gh-credential-top.sh")) {
  console.error("[verify:github-remote] Repo credential helper not configured.");
  console.error("[verify:github-remote] Run: pnpm run setup:github-auth");
  process.exit(1);
}

if (!hasTopGithubAccount() && !activeAccountCanPushToTopRepo()) {
  console.error(`[verify:github-remote] No gh account with push access to ${TOP_GH_REPO}.`);
  console.error("[verify:github-remote] Run: pnpm run setup:github-auth");
  process.exit(1);
}

const active = activeGithubLogin();
if (!activeAccountCanPushToTopRepo()) {
  const accounts = listGithubAccounts().map((a) => a.login).join(", ");
  console.error(
    `[verify:github-remote] Active gh account "${active || "(none)"}" (${accounts}) cannot push to ${TOP_GH_REPO}.`,
  );
  console.error("[verify:github-remote] Run: pnpm run setup:github-auth");
  process.exit(1);
}

console.log(`[verify:github-remote] OK origin → ${origin} (gh: ${active}, push access verified)`);
