# Deploying MCP Servers to Cloud Run

Magic Wizards uses external MCP servers for Gmail, Calendar, Drive, HubSpot CRM, and web search. Each server runs as a separate Cloud Run service (min-instances=0 for scale-to-zero).

## Prerequisites

- Google Cloud project with Cloud Run and Artifact Registry enabled
- `gcloud` CLI authenticated
- For OAuth-backed servers (Google, HubSpot): tokens are injected by wizards-api token proxy from `integration_connection_secrets`

## 1. Google Workspace MCP

**Source:** [aaronsb/google-workspace-mcp](https://github.com/aaronsb/google-workspace-mcp)

**Tools:** Gmail (search, send, labels), Calendar (list, create, manage events), Drive (search, upload, download)

**Deploy from pre-built image:**

```bash
# Deploy directly from GitHub Container Registry
gcloud run deploy google-workspace-mcp \
  --image=ghcr.io/aaronsb/google-workspace-mcp:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --port=8080 \
  --set-env-vars="LOG_MODE=strict"
```

**Note:** The server expects OAuth via its own flow by default. For Magic Wizards, the **token proxy** in wizards-api injects the user's OAuth token when forwarding MCP requests. Ensure the token proxy is configured to pass `Authorization: Bearer <token>` for `google-workspace` provider.

**Custom build (optional):** To build from source and push to your Artifact Registry:

```bash
# From repo root
gcloud builds submit --config=deploy/cloudbuild.google-workspace-mcp.yaml --project=YOUR_PROJECT
```

## 2. HubSpot CRM MCP

**Source:** [peakmojo/mcp-hubspot](https://github.com/peakmojo/mcp-hubspot)

**Tools:** Contacts, companies, deals, activities

**Deploy:** Build from source (see `deploy/cloudbuild.hubspot-mcp.yaml`):

```bash
gcloud builds submit --config=deploy/cloudbuild.hubspot-mcp.yaml --project=YOUR_PROJECT
```

Then deploy the built image:

```bash
gcloud run deploy hubspot-mcp \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT/cloud-run-source-deploy/hubspot-mcp:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --port=8080
```

**Token injection:** The wizards-api token proxy maps `hubspot` provider to this server and injects the user's HubSpot OAuth token.

## 3. Web Search MCP

**Source:** Custom lightweight wrapper (Google Custom Search or SerpAPI)

**Tools:** `search` – web search

**Deploy:** Use the deploy config in `deploy/cloudbuild.web-search-mcp.yaml` after implementing the web-search-mcp package, or use a third-party MCP server that supports web search.

**Platform API key:** Configure `GOOGLE_CSE_API_KEY` or `SERPAPI_KEY` in Cloud Run secrets. This is org-level (tenant admin configures in Admin > Integrations).

## Token Proxy Integration

All MCP requests from wizards-api go through the token proxy (`/mcp-proxy/:serverName`). The proxy:

1. Resolves the tenant/user context from the request
2. Looks up `integration_connections` for the provider (google, hubspot)
3. Decrypts `integration_connection_secrets` and extracts `oauth.access_token`
4. Refreshes the token if expired (using `oauth.refresh_token`)
5. Forwards the MCP request with `Authorization: Bearer <access_token>`
6. Rate limits per server (e.g., HubSpot 100 req/10s)

## Environment Variables (Cloud Run)

| Variable | Server | Description |
|----------|--------|-------------|
| `LOG_MODE` | google-workspace-mcp | `strict` recommended for JSON-RPC only on stdout |
| `PORT` | All | Default 8080 (Cloud Run sets this) |

OAuth credentials are **not** stored in the MCP server; they are injected per-request by the token proxy.
