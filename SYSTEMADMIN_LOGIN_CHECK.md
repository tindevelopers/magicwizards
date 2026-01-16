# System Admin Login Credentials Check

## Overview
This document explains how to verify if `systemadmin@tin.info` with password `88888888` is working correctly.

## Credentials
- **Email**: `systemadmin@tin.info`
- **Password**: `88888888`

## Analysis of Login Script

The login script is located at `apps/admin/app/actions/auth.ts` in the `signIn` function. The script:

1. ✅ Uses `createClient()` to get a Supabase server client
2. ✅ Calls `signInWithPassword()` with email and password
3. ✅ Fetches user data from the `users` table using admin client
4. ✅ Updates `last_active_at` timestamp
5. ✅ Returns user data with role and tenant information

The login script logic appears to be **correct**. Any issues are likely related to:
- User not existing in Supabase Auth
- User not existing in the `users` table
- Incorrect password
- Missing Platform Admin role
- Session/cookie issues

## Test Script

A test script has been created at `scripts/test-systemadmin-login.ts` that will:

1. ✅ Check if user exists in Supabase Auth
2. ✅ Check if user exists in the `users` table
3. ✅ Verify the user has Platform Admin role
4. ✅ Test login with the credentials
5. ✅ Verify session works correctly

## How to Run the Test

```bash
# Make sure you have the environment variables set
# Check your .env.local file has:
# - NEXT_PUBLIC_SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)

# Run the test script
npx tsx scripts/test-systemadmin-login.ts
```

## Expected Output

If everything is working:
```
✅ ALL CHECKS PASSED - Credentials are working correctly!
```

If there are issues, the script will identify:
- ❌ User not found in Auth
- ❌ User not found in users table
- ❌ Wrong password
- ❌ Missing Platform Admin role
- ❌ Session issues

## Creating/Updating the User

If the user doesn't exist or needs to be recreated:

```bash
# Option 1: Use the platform admin creation script
npx tsx scripts/create-platform-admin.ts

# Option 2: Use the system admin script (uses env vars)
PLATFORM_ADMIN_EMAIL=systemadmin@tin.info PLATFORM_ADMIN_PASSWORD=88888888 npx tsx scripts/create-system-admin.ts
```

## Common Issues

### 1. User Not Found in Auth
**Solution**: Run `npx tsx scripts/create-platform-admin.ts`

### 2. User Not Found in Users Table
**Solution**: The create script should handle this, but if it doesn't, the user record needs to be created manually or the script needs to be re-run.

### 3. Wrong Password
**Solution**: 
- Check if password was changed
- Recreate user with correct password: `npx tsx scripts/create-platform-admin.ts`
- Or reset password using Supabase Admin API

### 4. Missing Platform Admin Role
**Solution**: The create script assigns the role, but if missing:
- Check if "Platform Admin" role exists in `roles` table
- Update user's `role_id` to point to Platform Admin role

### 5. Session/Cookie Issues
**Solution**: 
- Check browser cookies are enabled
- Check CORS settings
- Verify environment variables are correct
- Check middleware is not blocking requests

## Login Flow

1. User submits credentials via `SignInForm` component
2. `signIn` server action is called (`apps/admin/app/actions/auth.ts`)
3. Supabase Auth authenticates the user
4. User data is fetched from `users` table
5. Session is created and stored in cookies
6. User is redirected to `/saas/dashboard`

## Debugging Tips

1. **Check Vercel Logs**: Look for `[signIn]` log messages
2. **Check Browser Console**: Look for any client-side errors
3. **Check Network Tab**: Verify API calls are successful
4. **Check Supabase Dashboard**: Verify user exists and is confirmed
5. **Run Test Script**: Use the test script to isolate the issue

## Next Steps

1. Run the test script: `npx tsx scripts/test-systemadmin-login.ts`
2. Review the output to identify any issues
3. Fix any identified issues
4. Retry login in the application
5. Check Vercel logs if issues persist

