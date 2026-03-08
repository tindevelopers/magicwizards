#!/bin/bash
# Securely create Secret Manager secrets and update Cloud Run.
# Reads from apps/wizards-api/.env - ensure it has real values before running.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/apps/wizards-api/.env"
PROJECT="magicwizards"
REGION="europe-west1"
SERVICE="magicwizards-git"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# Load env (export for subshells)
set -a
source "$ENV_FILE"
set +a

# Temp dir for secret files (deleted after use)
TMPDIR_SECRETS=$(mktemp -d)
chmod 700 "$TMPDIR_SECRETS"
cleanup() { rm -rf "$TMPDIR_SECRETS"; }
trap cleanup EXIT

create_secret() {
  local name=$1
  local value=$2
  if [ -z "$value" ] || [ "$value" = "REPLACE_WITH_TELEGRAM_BOT_TOKEN" ] || [ "$value" = "REPLACE_WITH_TELEGRAM_WEBHOOK_SECRET" ]; then
    echo "Skipping $name (missing or placeholder)"
    return 0
  fi
  local f="$TMPDIR_SECRETS/$name"
  printf '%s' "$value" > "$f"
  chmod 600 "$f"
  if gcloud secrets describe "$name" --project="$PROJECT" &>/dev/null; then
    echo "Adding new version to $name..."
    gcloud secrets versions add "$name" --data-file="$f" --project="$PROJECT"
  else
    echo "Creating secret $name..."
    gcloud secrets create "$name" --data-file="$f" --project="$PROJECT"
  fi
}

echo "=== 1. Creating secrets ==="
create_secret "telegram-bot-token" "${MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN:-}"
create_secret "supabase-url" "${NEXT_PUBLIC_SUPABASE_URL:-}"
create_secret "supabase-service-role-key" "${SUPABASE_SERVICE_ROLE_KEY:-}"
create_secret "anthropic-api-key" "${ANTHROPIC_API_KEY:-}"
create_secret "openai-api-key" "${OPENAI_API_KEY:-}"
if [ -n "${MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET:-}" ] && [ "$MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET" != "REPLACE_WITH_TELEGRAM_WEBHOOK_SECRET" ]; then
  create_secret "telegram-webhook-secret" "$MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET"
fi

echo ""
echo "=== 2. Granting Cloud Run access to secrets ==="
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for secret in telegram-bot-token supabase-url supabase-service-role-key anthropic-api-key openai-api-key telegram-webhook-secret; do
  if gcloud secrets describe "$secret" --project="$PROJECT" &>/dev/null; then
    echo "Granting $SA access to $secret..."
    gcloud secrets add-iam-policy-binding "$secret" \
      --member="serviceAccount:${SA}" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT" \
      --quiet
  fi
done

echo ""
echo "=== 3. Updating Cloud Run service ==="
# Build --set-secrets from available secrets
SECRETS_ARGS=""
gcloud secrets describe telegram-bot-token --project="$PROJECT" &>/dev/null && SECRETS_ARGS="${SECRETS_ARGS}MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,"
gcloud secrets describe supabase-url --project="$PROJECT" &>/dev/null && SECRETS_ARGS="${SECRETS_ARGS}NEXT_PUBLIC_SUPABASE_URL=supabase-url:latest,"
gcloud secrets describe supabase-service-role-key --project="$PROJECT" &>/dev/null && SECRETS_ARGS="${SECRETS_ARGS}SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,"
gcloud secrets describe anthropic-api-key --project="$PROJECT" &>/dev/null && SECRETS_ARGS="${SECRETS_ARGS}ANTHROPIC_API_KEY=anthropic-api-key:latest,"
gcloud secrets describe openai-api-key --project="$PROJECT" &>/dev/null && SECRETS_ARGS="${SECRETS_ARGS}OPENAI_API_KEY=openai-api-key:latest,"
gcloud secrets describe telegram-webhook-secret --project="$PROJECT" &>/dev/null && SECRETS_ARGS="${SECRETS_ARGS}MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET=telegram-webhook-secret:latest,"

SECRETS_ARGS="${SECRETS_ARGS%,}"  # trim trailing comma

# Telegram token is REQUIRED for production - wizards-api will not start without it
if ! gcloud secrets describe telegram-bot-token --project="$PROJECT" &>/dev/null; then
  echo "Error: MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN is required. Add your real token to $ENV_FILE and run this script again."
  exit 1
fi

if [ -z "$SECRETS_ARGS" ]; then
  echo "Error: No secrets available."
  exit 1
fi

echo "Updating $SERVICE with secrets..."
gcloud run services update "$SERVICE" \
  --region="$REGION" \
  --project="$PROJECT" \
  --set-secrets="$SECRETS_ARGS" \
  --update-env-vars="WIZARDS_API_PUBLIC_URL=https://magicwizards-git-kaybjlukya-ew.a.run.app"

echo ""
echo "=== Done ==="
echo "Service URL: https://magicwizards-git-kaybjlukya-ew.a.run.app"
echo "Telegram webhook: https://magicwizards-git-kaybjlukya-ew.a.run.app/webhooks/telegram"
if ! gcloud secrets describe telegram-bot-token --project="$PROJECT" &>/dev/null; then
  echo ""
  echo "Note: MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN was skipped (placeholder in .env)."
  echo "Add your real token to apps/wizards-api/.env and run this script again."
fi
