#!/usr/bin/env node
/**
 * Pushes Supabase env vars to the linked Vercel project via Vercel CLI.
 *
 * Mode 1 – Fetch from Supabase (requires Supabase CLI with org access):
 *   node scripts/sync-supabase-env-to-vercel.mjs <project-ref> [vercel-project-name]
 *
 * Mode 2 – Read from .env file (use if Supabase API returns 403):
 *   node scripts/sync-supabase-env-to-vercel.mjs --from-file apps/admin/.env.local [vercel-project-name]
 *
 * Requires: Vercel CLI installed and authenticated (vercel login)
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const fromFileIdx = args.indexOf("--from-file");
const useFile = fromFileIdx !== -1;
const FILE_PATH = useFile ? args[fromFileIdx + 1] : null;
const PROJECT_REF = !useFile && args[0] && !args[0].startsWith("--") ? args[0] : process.env.SUPABASE_PROJECT_REF;
const VERCEL_PROJECT =
  (useFile ? args[2] : args[1]) || process.env.VERCEL_PROJECT_NAME || "magicwizards-admin";

if (!useFile && !PROJECT_REF) {
  console.error(
    [
      "Missing Supabase project ref or --from-file.",
      "",
      "Usage:",
      "  node scripts/sync-supabase-env-to-vercel.mjs <project-ref> [vercel-project-name]",
      "  node scripts/sync-supabase-env-to-vercel.mjs --from-file apps/admin/.env.local [vercel-project-name]",
      "",
    ].join("\n")
  );
  process.exit(1);
}

function loadFromEnvFile(filePath) {
  const abs = path.resolve(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Env file not found: ${abs}`);
  }
  const content = fs.readFileSync(abs, "utf8");
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  const url = vars.NEXT_PUBLIC_SUPABASE_URL;
  const anon = vars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = vars.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error(
      `Env file must contain NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Found: ${Object.keys(vars).join(", ")}`
    );
  }
  return { url, anonKey: anon, serviceRoleKey: service };
}

function redact(secret) {
  if (!secret) return "MISSING";
  const s = String(secret);
  if (s.length <= 12) return "SET (redacted)";
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function getApiKeysJson(projectRef) {
  try {
    return execFileSync(
      "supabase",
      ["projects", "api-keys", "--project-ref", projectRef, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], cwd: ROOT }
    );
  } catch (err) {
    console.error(
      [
        "",
        "Failed to fetch API keys via Supabase CLI.",
        "",
        "Fixes:",
        "- Ensure the Supabase CLI is installed (`supabase --version`).",
        "- Ensure you're authenticated:",
        "    supabase login",
        "  or: supabase login --token <YOUR_SUPABASE_ACCESS_TOKEN>",
        "",
      ].join("\n")
    );
    throw err;
  }
}

function extractKey(keysArray, kind) {
  const target = kind.toLowerCase();
  const found = keysArray.find((k) =>
    String(k?.name ?? k?.title ?? "").toLowerCase().includes(target)
  );
  return found?.api_key ?? found?.value ?? found?.key ?? found?.token ?? null;
}

function vercelEnvAdd(name, value, environment, sensitive = false) {
  const args = ["env", "add", name, environment, "--force"];
  if (sensitive) args.push("--sensitive");
  const result = spawnSync("vercel", args, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
    cwd: ROOT,
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`vercel env add ${name} ${environment} failed with code ${result.status}`);
  }
}

// --- main

let SUPABASE_URL;
let anonKey;
let serviceRoleKey;

if (useFile) {
  console.log("Reading from", FILE_PATH, "…");
  const loaded = loadFromEnvFile(FILE_PATH);
  SUPABASE_URL = loaded.url;
  anonKey = loaded.anonKey;
  serviceRoleKey = loaded.serviceRoleKey;
} else {
  console.log("Fetching Supabase API keys…");
  const raw = getApiKeysJson(PROJECT_REF);
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Unexpected `supabase projects api-keys` output: expected a JSON array."
    );
  }

  SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
  anonKey = extractKey(parsed, "anon");
  serviceRoleKey = extractKey(parsed, "service_role");

  if (!anonKey) {
    throw new Error("Could not find anon key in `supabase projects api-keys` output.");
  }
  if (!serviceRoleKey) {
    throw new Error(
      "Could not find service_role key in `supabase projects api-keys` output."
    );
  }
}

console.log("Supabase URL:", SUPABASE_URL);
console.log("Anon key:", redact(anonKey));
console.log("Service role key:", redact(serviceRoleKey));
console.log("");

console.log("Linking Vercel project:", VERCEL_PROJECT);
const linkResult = spawnSync(
  "vercel",
  ["link", "--yes", "--project", VERCEL_PROJECT],
  { stdio: "inherit", cwd: ROOT }
);
if (linkResult.status !== 0) {
  console.error("Run from repo root and ensure you're logged in: vercel login");
  process.exit(1);
}

const vars = [
  ["NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL, false],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey, false],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey, true],
];

for (const env of ["production", "preview"]) {
  console.log(`Adding env vars to ${env}…`);
  for (const [name, value, sensitive] of vars) {
    vercelEnvAdd(name, value, env, sensitive);
    console.log(`  ✓ ${name}`);
  }
}

console.log("");
console.log("Done. Redeploy the admin app for changes to take effect.");
