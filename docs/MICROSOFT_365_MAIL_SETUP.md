# Microsoft 365 Mail Integration Setup

The Microsoft 365 Mail integration enables wizards to access Outlook mail via Microsoft Graph API through an MCP server.

## Prerequisites

1. **Azure App Registration** – Create an app in [Azure Portal](https://portal.azure.com) → App registrations → New registration
2. **MCP Server** – Deploy a Microsoft 365 Mail MCP server (e.g. self-hosted or third-party) that exposes Outlook tools via Microsoft Graph

## 1. Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com) → **App registrations** → **New registration**
2. Name: e.g. "Magic Wizards Microsoft 365"
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
4. Redirect URI: **Web** → `https://<your-admin-domain>/api/integrations/microsoft/auth/callback`
5. Register

### API Permissions

1. **API permissions** → **Add a permission**
2. **Microsoft Graph** → **Delegated permissions**
3. Add:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `offline_access` (for refresh tokens)
4. Grant admin consent if required

### Client Secret

1. **Certificates & secrets** → **New client secret**
2. Copy the **Value** (not the Secret ID) – you won't see it again

## 2. Platform Admin Configuration

1. Go to **Admin** → **System Admin** → **Integrations**
2. Find **Microsoft 365** and click **Configure**
3. Enable the provider
4. Enter:
   - **OAuth Client ID**: Application (client) ID from Azure
   - **OAuth Client Secret**: The client secret value
   - **OAuth Redirect URI**: `https://<your-admin-domain>/api/integrations/microsoft/auth/callback` (optional; defaults to origin + path)
5. Save

## 3. Add MCP Server for Tenant

1. Go to **Admin** → **System Admin** → **Magic Wizards**
2. Under **Tenant MCP Servers**, add:
   - **Tenant**: Select the tenant
   - **Server name**: `microsoft-365-mail` (must match exactly)
   - **Server URL**: Your Microsoft 365 Mail MCP server URL (e.g. `https://microsoft-mail-mcp-xxx.run.app`)
3. Click **Add MCP Server**

## 4. User Connection

Users connect their Microsoft account via:

- **Portal** → **My Tools** → **Connect** for Microsoft 365
- Or: `https://<admin-domain>/api/integrations/microsoft/auth/start?returnTo=/tools`

## Plan Requirements

The tenant's plan must allow `microsoft-365-mail`. It's included in **enterprise** and **custom** plans.

## MCP Server Options

Microsoft provides a remote MCP server at:
```
https://agent365.svc.cloud.microsoft/agents/tenants/{tenant_id}/servers/mcp_MailTools
```
This URL is tenant-specific and requires Microsoft 365 / Agent 365 setup.

For a self-hosted or third-party MCP server that wraps Microsoft Graph Mail, deploy it (e.g. on Cloud Run) and use that URL in step 3.
