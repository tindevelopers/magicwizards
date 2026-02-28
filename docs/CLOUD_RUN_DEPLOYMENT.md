# Deploy wizards-api to Google Cloud Run (magicwizards)

Deploy the **wizards-api** Express service to [Google Cloud Run](https://console.cloud.google.com/run/overview?project=magicwizards) in project `magicwizards`.

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and initialized
- Project **magicwizards** created and billing enabled
- Your gcloud identity must have **Cloud Build Editor** (or Owner) and **Cloud Run Admin** (or Owner) on project **magicwizards**. If you see `PERMISSION_DENIED` on `gcloud builds submit`, add the [Cloud Build Editor role](https://console.cloud.google.com/iam-admin/iam?project=magicwizards) for your account.
- Required APIs enabled (see below)

## 1. Set project and enable APIs

```bash
gcloud config set project magicwizards

# Enable Cloud Run, Artifact Registry, and Cloud Build
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

## 2. Create Artifact Registry repository (one-time)

If you haven’t used Cloud Run from source in this project before, create the repo:

```bash
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=us-central1 \
  --description="Cloud Run source deploy" \
  --project=magicwizards
```

(Skip if the repository already exists.)

## 3. Build the image

From the **repository root**:

```bash
gcloud builds submit --config=cloudbuild.wizards-api.yaml --project=magicwizards
```

This uses `Dockerfile.wizards-api` and pushes the image to Artifact Registry.

## 4. Deploy to Cloud Run

Deploy the service (replace env values with your own; use Secret Manager in production):

```bash
gcloud run deploy wizards-api \
  --image=us-central1-docker.pkg.dev/magicwizards/cloud-run-source-deploy/wizards-api:latest \
  --region=us-central1 \
  --platform=managed \
  --port=8080 \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,NEXT_PUBLIC_SUPABASE_URL=supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest" \
  --allow-unauthenticated
```

**Without Secret Manager** (env vars only; use only for quick tests):

```bash
gcloud run deploy wizards-api \
  --image=us-central1-docker.pkg.dev/magicwizards/cloud-run-source-deploy/wizards-api:latest \
  --region=us-central1 \
  --platform=managed \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN=your-token,NEXT_PUBLIC_SUPABASE_URL=your-url,SUPABASE_SERVICE_ROLE_KEY=your-key" \
  --allow-unauthenticated
```

Required env vars for wizards-api (see `apps/wizards-api/src/config.ts`):

| Variable | Required | Notes |
|----------|----------|--------|
| `MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN` | Yes | Telegram bot token |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET` | Optional | Webhook secret |
| `WIZARDS_API_PUBLIC_URL` | Optional | Public URL for webhooks (e.g. Cloud Run URL) |

**LLM Provider API Keys** (required for non-mock wizard runs):

| Variable | Required | Notes |
|----------|----------|--------|
| `OPENAI_API_KEY` | Conditional | Required if wizards use OpenAI models (e.g. `gpt-4.1-mini`) |
| `ANTHROPIC_API_KEY` | Conditional | Required if wizards use Anthropic models (e.g. `claude-sonnet-4`) |
| `GOOGLE_API_KEY` | Conditional | Required if wizards use Google models |

Add these to your Cloud Run deployment:
```bash
--set-env-vars="...,OPENAI_API_KEY=sk-your-key,ANTHROPIC_API_KEY=sk-ant-your-key"
```

Or use Secret Manager (recommended for production):
```bash
--set-secrets="...,OPENAI_API_KEY=openai-key:latest,ANTHROPIC_API_KEY=anthropic-key:latest"
```

## 5. One-shot build + deploy (from repo root)

```bash
# Build
gcloud builds submit --config=cloudbuild.wizards-api.yaml --project=magicwizards

# Deploy (update env/secret flags as above)
gcloud run deploy wizards-api \
  --image=us-central1-docker.pkg.dev/magicwizards/cloud-run-source-deploy/wizards-api:latest \
  --region=us-central1 \
  --platform=managed \
  --port=8080 \
  --allow-unauthenticated
```

## 6. Git-triggered deploy (europe-west1)

Builds from **Developer Connect** (GitHub → Cloud Build) deploy to the **magicwizards-git** service in **europe-west1**. The trigger builds the repo root `Dockerfile` and runs `gcloud run services update magicwizards-git`. For the new revision to start, the service must have the **required env vars or secrets** set; otherwise the container exits on startup (config throws for missing `MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and the deploy step reports "container failed to start and listen on the port".

Set them in [Cloud Run → magicwizards-git → Edit & deploy new revision → Variables & secrets](https://console.cloud.google.com/run/detail/europe-west1/magicwizards-git/variables?project=magicwizards) (or via `gcloud run services update magicwizards-git --region=europe-west1 --set-secrets=...`).

## 7. After deploy

- **Service URL**: Shown in the deploy output and in [Cloud Run Console](https://console.cloud.google.com/run/overview?project=magicwizards).
- **Health**: `https://<service-url>/health`
- **Telegram webhook**: Set your bot webhook to `https://<service-url>/webhooks/telegram` (and set `WIZARDS_API_PUBLIC_URL` to the same base URL).

## 8. Files added for Cloud Run

| File | Purpose |
|------|--------|
| `Dockerfile.wizards-api` | Multi-stage build for wizards-api (monorepo-aware) |
| `cloudbuild.wizards-api.yaml` | Cloud Build config to build the image |
| `.gcloudignore` | Keeps build context small by excluding other apps and dev files |
