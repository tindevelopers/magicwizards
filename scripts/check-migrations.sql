-- Check which migrations have been applied
-- Run this in Supabase SQL Editor or via psql

-- Check if support tickets tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'support_tickets',
    'support_ticket_threads',
    'support_ticket_attachments',
    'support_categories',
    'support_ticket_history'
  )
ORDER BY table_name;

-- Check if storage bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'support-tickets';

-- Check if storage policies exist
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%support ticket%';

-- Check migration history (if using supabase_migrations table)
-- Note: This query may fail if the migrations table doesn't exist or has different structure
-- You can safely skip this query if it errors
SELECT 
  version,
  name
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%support%'
ORDER BY version DESC;

