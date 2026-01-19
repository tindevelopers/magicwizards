# Update Supabase Auth URL Configuration

## Problem
Supabase is sending magic links and password reset emails with `localhost` URLs instead of your Vercel deployment URL.

## Root Cause
Supabase uses **two** settings for redirect URLs:
1. The `redirectTo` parameter in your code (✅ we've fixed this)
2. The **Site URL** and **Redirect URLs** in the Supabase Dashboard (⚠️ must be updated manually)

## Solution: Update Supabase Dashboard Settings

### Step 1: Get Your Vercel Deployment URL

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Find your project
3. Copy your production domain (e.g., `https://your-app.vercel.app`)

Or check your Vercel project settings for the custom domain if you have one.

### Step 2: Update Supabase Auth URL Configuration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (project ref: `jruxnkslobykshunucwa`)
3. Navigate to: **Authentication** → **URL Configuration**

### Step 3: Configure the Settings

**Site URL:**
- Set this to your **production Vercel URL** (e.g., `https://your-app.vercel.app`)
- This is the default URL used when `redirectTo` is not provided

**Redirect URLs (Additional Redirect URLs):**
Add **all** of these URLs (one per line):

```
http://localhost:3000/**
http://localhost:3001/**
http://localhost:3002/**
https://your-app.vercel.app/**
https://*.vercel.app/**
```

**Important Notes:**
- Use `/**` wildcard to allow all paths under that domain
- Include both `http://localhost:3000/**` for local development
- Include `https://*.vercel.app/**` to allow all Vercel preview deployments
- Include your production domain explicitly

### Step 4: Save and Test

1. Click **Save** in the Supabase Dashboard
2. Test password reset from your Vercel deployment
3. Check the email - the link should now point to your Vercel URL, not localhost

## Alternative: Using Supabase Management API

If you prefer to automate this, you can use the Supabase Management API:

```bash
# Get your Supabase access token from: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Update Site URL
curl -X PATCH \
  "https://api.supabase.com/v1/projects/jruxnkslobykshunucwa/auth/config" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SITE_URL": "https://your-app.vercel.app",
    "URI_ALLOW_LIST": [
      "http://localhost:3000/**",
      "http://localhost:3001/**",
      "http://localhost:3002/**",
      "https://your-app.vercel.app/**",
      "https://*.vercel.app/**"
    ]
  }'
```

## Verification

After updating:
1. Trigger a password reset from your Vercel deployment
2. Check the email - the reset link should use your Vercel domain
3. The link should work when clicked

## Troubleshooting

**Still seeing localhost?**
- Clear your browser cache
- Check that you saved the Supabase Dashboard settings
- Verify the `redirectTo` URL matches one of the allowed redirect URLs exactly
- Check Supabase logs for any errors

**Links not working?**
- Ensure the redirect URL path matches exactly (including trailing slashes)
- Check that the URL is in the allowed list
- Verify HTTPS is used for production URLs
