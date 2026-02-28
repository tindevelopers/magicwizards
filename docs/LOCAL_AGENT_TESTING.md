# Testing the Magic Wizards agent locally

This guide explains how the agent (wizard) application works and how to run and trigger it on your machine.

## How it works

- **wizards-api** is an Express server that:
  - Exposes **Telegram** as the first channel: Telegram sends updates to `POST /webhooks/telegram`. Each message is resolved to a **tenant** via `tenant_telegram_identities`, then the selected **wizard** runs and the reply is sent back to the chat.
  - In **development**, it also exposes a **dev route** so you can trigger a wizard over HTTP without Telegram.

- **Wizards** are expert agents defined in `@magicwizards/wizards-core` (builder, research, ops, sales). Each has a system prompt, tool policy, budget, and model routing. The **WizardRuntime** runs one turn: it picks a model (e.g. Anthropic, OpenAI, or mock), calls the provider, and returns the reply.

- **Triggering**:
  - **Telegram**: Send a message in a chat linked to a tenant. Optionally prefix with `/wizard <id>` (e.g. `/wizard research What’s the weather?`). Default wizard is `builder` unless configured otherwise.
  - **Local HTTP (dev only)**: `POST /dev/run-wizard` with a JSON body (see below).

## Run the API locally

1. **Build the core package** (from repo root, once before first run):
   ```bash
   pnpm build:wizards-core
   ```

2. **Start the API** (from repo root):
   ```bash
   pnpm dev:wizards-api
   ```
   Or from `apps/wizards-api`: `pnpm dev`. Server listens on **port 8787** (or `WIZARDS_API_PORT` / `PORT`).

3. **Environment variables**

   Create `apps/wizards-api/.env` (or set in the shell). Minimum for **dev route only** (no Telegram):

   - `NEXT_PUBLIC_SUPABASE_URL` – Supabase project URL (or local Supabase).
   - `SUPABASE_SERVICE_ROLE_KEY` – Service role key (required for tenant/session/usage).
   - `MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN` – **Optional in development.** Omit or leave empty to only use the dev route; the server will still start.

   For **real LLM** (non-mock) runs you also need at least one of:

   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `GOOGLE_API_KEY`

   Optional:

   - `WIZARDS_API_PORT` or `PORT` – default `8787`
   - `MAGIC_WIZARDS_DEFAULT_WIZARD_ID` – default `builder`
   - `MAGIC_WIZARDS_DEFAULT_PROVIDER` / `MAGIC_WIZARDS_DEFAULT_MODEL` – e.g. `anthropic` and `claude-sonnet-4`

## Trigger the agents

### Option A: Dev route (no Telegram, no DB tenant)

Use the **mock** tenant so no Supabase tenant or Telegram is needed:

```bash
curl -s -X POST http://localhost:8787/dev/run-wizard \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"__mock__","prompt":"Say hello in one sentence."}'
```

Example response:

```json
{
  "text": "[MOCK:mock-model] Builder Wizard received: Say hello in one sentence.",
  "wizardId": "builder",
  "costUsd": 0,
  "turns": 1
}
```

To pick a wizard explicitly:

```bash
curl -s -X POST http://localhost:8787/dev/run-wizard \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"__mock__","prompt":"Explain async in one line.","wizardId":"research"}'
```

Or use the prompt prefix (same as Telegram):

```bash
curl -s -X POST http://localhost:8787/dev/run-wizard \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"__mock__","prompt":"/wizard ops How do I roll back a deploy?"}'
```

### Option B: Dev route with a real tenant (Supabase)

1. Have at least one **active** tenant in the `tenants` table (and Magic Wizards columns applied via migration).
2. Call the dev route with that tenant’s UUID:

   ```bash
   curl -s -X POST http://localhost:8787/dev/run-wizard \
     -H "Content-Type: application/json" \
     -d '{"tenantId":"<YOUR_TENANT_UUID>","prompt":"Hello"}'
   ```

   Sessions, usage, and memory will be written to Supabase. To use the **mock** provider (no LLM keys), set that tenant’s `wizard_provider` to `mock` in the DB.

### Option C: Simulate Telegram webhook

1. Link a Telegram chat to a tenant: insert a row in `tenant_telegram_identities` (e.g. `tenant_id`, `telegram_chat_id`, `telegram_user_id`, `is_active = true`).
2. Send a POST to the same path your production webhook uses, e.g.:

   ```bash
   curl -s -X POST http://localhost:8787/webhooks/telegram \
     -H "Content-Type: application/json" \
     -d '{
       "update_id": 1,
       "message": {
         "message_id": 1,
         "chat": {"id": 12345, "type": "private"},
         "from": {"id": 67890},
         "text": "Hello"
       }
     }'
   ```

   Replace `chat.id` (and optionally `from.id`) with values that match your `tenant_telegram_identities` row. The server will resolve the tenant, run the wizard, and try to send the reply via the Telegram API (so `MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN` must be set and valid).

## Health check

```bash
curl -s http://localhost:8787/health
```

Expected: `{"status":"ok","service":"magicwizards-wizards-api","env":"development"}`.

## Test Wizard in Admin and Portal

You can test wizards from the UI:

- **Admin**: Go to **Magic Wizards** (e.g. System Admin → Magic Wizards). At the bottom, use the **Test Wizard** block: choose tenant (e.g. `__mock__` or a real tenant), pick a wizard (builder, research, ops, sales), enter a prompt, and click **Run wizard**. The admin app proxies the request to wizards-api; set `WIZARDS_API_URL` in the admin app env if the API is not at `http://localhost:8787`.
- **Portal**: Go to **Test Wizard** (link in the portal header, or `/wizards`). Pick a wizard, enter a prompt, and click **Run wizard**. The portal uses the current tenant context; set `WIZARDS_API_URL` in the portal app env if needed.

## Summary

| Trigger              | Endpoint                  | When to use                          |
|----------------------|---------------------------|--------------------------------------|
| Dev route (mock)     | `POST /dev/run-wizard`     | Local test, no DB/Telegram/LLM keys  |
| Dev route (tenant)   | `POST /dev/run-wizard`     | Local test with real tenant/usage    |
| Telegram             | `POST /webhooks/telegram`  | Real Telegram chat linked to tenant  |
| Admin Test Wizard    | Admin UI → Magic Wizards   | Test from admin with tenant picker   |
| Portal Test Wizard   | Portal `/wizards`          | Test from portal (current tenant)    |

Agents are selected by the **prompt** (prefix `/wizard <id>` or body `wizardId`) or by the default wizard id from config.
