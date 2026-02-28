import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Creates a Supabase client with service role key
 * This bypasses RLS policies and should only be used server-side
 * NEVER expose the service role key to the client
 * 
 * This function should ONLY be called from server actions or API routes
 */
export function createAdminClient() {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-client.ts:13',message:'createAdminClient called',data:{hasServiceRoleKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY,hasSupabaseUrl:!!process.env.NEXT_PUBLIC_SUPABASE_URL,supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0,30)+'...'},timestamp:Date.now(),runId:'debug-1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  // In Next.js, server-side environment variables are available without NEXT_PUBLIC_ prefix
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-client.ts:18',message:'Missing SUPABASE_SERVICE_ROLE_KEY',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "This is required for admin operations. " +
      "Make sure it's set in your .env.local file."
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-client.ts:26',message:'Missing NEXT_PUBLIC_SUPABASE_URL',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-client.ts:29',message:'createAdminClient success',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      },
    }
  );
}

