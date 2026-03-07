import { config as loadEnv } from "dotenv";

loadEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** In development, Telegram bot token is optional (e.g. when using /dev/run-wizard only). */
function requiredUnlessDev(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV !== "development") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

/** Require one of the given env var names (for Cloud Run vs Vercel naming). */
function requiredOneOf(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(
    `Missing required env: set one of ${names.join(", ")}`,
  );
}

export const appConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.WIZARDS_API_PORT ?? process.env.PORT ?? 8787),
  publicBaseUrl: process.env.WIZARDS_API_PUBLIC_URL ?? "",
  telegram: {
    botToken: requiredUnlessDev("MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN"),
    webhookSecret: process.env.MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET ?? "",
    defaultWizardId: process.env.MAGIC_WIZARDS_DEFAULT_WIZARD_ID ?? "builder",
  },
  supabase: {
    url: requiredOneOf("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  },
  runtime: {
    defaultProvider: process.env.MAGIC_WIZARDS_DEFAULT_PROVIDER ?? "anthropic",
    defaultModel: process.env.MAGIC_WIZARDS_DEFAULT_MODEL ?? "claude-sonnet-4",
  },
};
