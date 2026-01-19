import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_REF = process.argv[2] || process.env.SUPABASE_PROJECT_REF;

if (!PROJECT_REF) {
  console.error(
    [
      "Missing project ref.",
      "",
      "Usage:",
      "  node scripts/install-remote-supabase-env.mjs <project-ref>",
      "",
      "Example:",
      "  node scripts/install-remote-supabase-env.mjs jruxnkslobykshunucwa",
      "",
    ].join("\n")
  );
  process.exit(1);
}

const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

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
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
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
        "    supabase login --token <YOUR_SUPABASE_ACCESS_TOKEN>",
        "",
      ].join("\n")
    );
    throw err;
  }
}

function extractKey(keysArray, kind) {
  const target = kind.toLowerCase();
  const found = keysArray.find((k) =>
    String(k?.name || "").toLowerCase().includes(target)
  );
  return found?.api_key ?? found?.value ?? found?.key ?? found?.token ?? null;
}

function upsertEnvFile(filePath, vars) {
  const abs = path.resolve(process.cwd(), filePath);
  const existing = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
  const lines = existing.split(/\r?\n/);

  const keysToSet = Object.keys(vars);
  const seen = new Set();
  const out = lines.map((line) => {
    for (const key of keysToSet) {
      if (line.startsWith(`${key}=`)) {
        seen.add(key);
        return `${key}=${vars[key]}`;
      }
    }
    return line;
  });

  for (const key of keysToSet) {
    if (!seen.has(key)) out.push(`${key}=${vars[key]}`);
  }

  // Normalize trailing newline
  const final = out.join("\n").replace(/\n+$/, "\n");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, final, "utf8");
}

const raw = getApiKeysJson(PROJECT_REF);
const parsed = JSON.parse(raw);

if (!Array.isArray(parsed)) {
  throw new Error(
    "Unexpected `supabase projects api-keys` output: expected a JSON array."
  );
}

const anonKey = extractKey(parsed, "anon");
const serviceRoleKey = extractKey(parsed, "service_role");

if (!anonKey) {
  throw new Error("Could not find anon key in `supabase projects api-keys` output.");
}
if (!serviceRoleKey) {
  throw new Error(
    "Could not find service_role key in `supabase projects api-keys` output."
  );
}

upsertEnvFile("apps/admin/.env.local", {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
});

upsertEnvFile("apps/portal/.env.local", {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
});

console.log("✅ Installed Supabase env vars for remote project:");
console.log(`   - Project ref: ${PROJECT_REF}`);
console.log(`   - URL: ${SUPABASE_URL}`);
console.log(`   - Anon key: ${redact(anonKey)}`);
console.log(`   - Service role key: ${redact(serviceRoleKey)}`);
console.log("");
console.log("📄 Updated:");
console.log("   - apps/admin/.env.local");
console.log("   - apps/portal/.env.local");

