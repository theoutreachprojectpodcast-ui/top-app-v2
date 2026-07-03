#!/usr/bin/env node
/**
 * Shared helpers + CLI for TOP repo GitHub auth (theoutreachprojectpodcast-ui).
 */
import { execSync } from "node:child_process";

export const TOP_GH_USER = "theoutreachprojectpodcast-ui";
export const TOP_GH_HOST = "github.com";
export const TOP_GH_REPO = "theoutreachprojectpodcast-ui/top-app-v2";

/** @returns {{ login: string, active: boolean }[]} */
export function listGithubAccounts() {
  try {
    const raw = execSync("gh auth status -a --json hosts", { encoding: "utf8" });
    const data = JSON.parse(raw);
    return (data?.hosts?.[TOP_GH_HOST] || []).map((row) => ({
      login: String(row.login || ""),
      active: !!row.active,
    }));
  } catch {
    return [];
  }
}

export function hasTopGithubAccount() {
  return listGithubAccounts().some((a) => a.login === TOP_GH_USER);
}

export function activeGithubLogin() {
  return listGithubAccounts().find((a) => a.active)?.login || "";
}

export function switchToTopGithubAccount() {
  execSync(`gh auth switch -h ${TOP_GH_HOST} -u ${TOP_GH_USER}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function verifyTopPushAccess() {
  execSync(`gh api repos/${TOP_GH_REPO} --jq .full_name`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Active gh account may push to TOP repo (e.g. VolenteLabs collaborator — not PoseFitness). */
export function activeAccountCanPushToTopRepo() {
  const login = activeGithubLogin();
  if (!login) return false;
  try {
    const perms = JSON.parse(
      execSync(`gh api repos/${TOP_GH_REPO} --jq .permissions`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
    return !!perms?.push;
  } catch {
    return false;
  }
}

function isDirectRun() {
  const entry = process.argv[1] || "";
  return entry.endsWith("gh-top-account.mjs");
}

if (isDirectRun()) {
  const arg = process.argv[2] || "";
  if (arg === "--require") {
    process.exit(hasTopGithubAccount() ? 0 : 1);
  }
  if (arg === "--verify-push") {
    if (!hasTopGithubAccount() && !activeAccountCanPushToTopRepo()) {
      console.error(`[gh-top-account] No gh account with push access to ${TOP_GH_REPO}.`);
      process.exit(1);
    }
    if (hasTopGithubAccount()) switchToTopGithubAccount();
    try {
      verifyTopPushAccess();
      if (!activeAccountCanPushToTopRepo()) {
        throw new Error("active account lacks push permission");
      }
      console.log(`[gh-top-account] Push access OK for ${TOP_GH_REPO} (gh: ${activeGithubLogin()})`);
    } catch (err) {
      console.error(`[gh-top-account] Cannot push to ${TOP_GH_REPO}: ${err.message || err}`);
      process.exit(1);
    }
    process.exit(0);
  }
  if (arg === "--can-push") {
    process.exit(activeAccountCanPushToTopRepo() ? 0 : 1);
  }
  if (arg === "--active") {
    console.log(activeGithubLogin() || "(none)");
    process.exit(0);
  }
  console.error("Usage: node scripts/gh-top-account.mjs [--require|--verify-push|--active]");
  process.exit(2);
}
