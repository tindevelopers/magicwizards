# Reset Password Guide for systemadmin@tin.info

## Step 1: Get Supabase API Keys

1. Go to Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/jruxnkslobykshunucwa/settings/api
   ```

2. Copy these keys:
   - **Project URL**: `https://jruxnkslobykshunucwa.supabase.co`
   - **anon/public key**: Copy the `anon` or `public` key
   - **service_role key**: Copy the `service_role` key (secret - keep it safe!)

## Step 2: Run Password Reset Script

### Option A: Run with environment variables inline

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key-here> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-your-anon-key-here> \
npx tsx scripts/reset-systemadmin-password.ts
```

### Option B: Add to .env.local and run

1. Create or update `.env.local` in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

2. Run the script:
   ```bash
   npx tsx scripts/reset-systemadmin-password.ts
   ```

## Step 3: Verify

The script will:
- ✅ Find the user `systemadmin@tin.info`
- ✅ Reset password to `88888888`
- ✅ Test login to verify it works

## Step 4: Test Login

After resetting, try logging in at your Vercel deployment:
- Email: `systemadmin@tin.info`
- Password: `88888888`

## Troubleshooting

### If script fails with "Service Role Key" error:
- Make sure you copied the `service_role` key (not the `anon` key)
- The service_role key starts with `eyJ...` and is much longer

### If login still fails after reset:
1. Verify Vercel environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL=https://jruxnkslobykshunucwa.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches your Supabase anon key
2. Redeploy Vercel after updating environment variables
3. Check Vercel logs for any errors

