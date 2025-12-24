-- Comprehensive Migration Verification Script
-- Run this in Supabase SQL Editor to verify all migrations ran successfully

-- ============================================================================
-- 1. CHECK SUPPORT TICKET TABLES
-- ============================================================================
SELECT 
  'Tables Check' as check_type,
  COUNT(*) as found_count,
  CASE 
    WHEN COUNT(*) = 5 THEN '✓ All tables exist'
    ELSE '✗ Missing tables'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'support_tickets',
    'support_ticket_threads',
    'support_ticket_attachments',
    'support_categories',
    'support_ticket_history'
  );

-- List the tables that exist
SELECT 
  'Table: ' || table_name as detail
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

-- ============================================================================
-- 2. CHECK STORAGE BUCKET
-- ============================================================================
SELECT 
  'Storage Bucket Check' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Bucket exists'
    ELSE '✗ Bucket missing'
  END as status,
  id,
  name,
  public as is_public,
  file_size_limit,
  array_length(allowed_mime_types, 1) as allowed_types_count
FROM storage.buckets
WHERE id = 'support-tickets';

-- ============================================================================
-- 3. CHECK STORAGE POLICIES
-- ============================================================================
SELECT 
  'Storage Policies Check' as check_type,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✓ All policies exist'
    ELSE '✗ Missing policies'
  END as status
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%support ticket%';

-- List the policies that exist
SELECT 
  'Policy: ' || policyname as detail
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%support ticket%'
ORDER BY policyname;

-- ============================================================================
-- 4. CHECK RLS POLICIES ON TABLES
-- ============================================================================
SELECT 
  'RLS Policies Check' as check_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'support_tickets',
    'support_ticket_threads',
    'support_ticket_attachments',
    'support_categories',
    'support_ticket_history'
  )
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 5. CHECK FUNCTIONS AND TRIGGERS
-- ============================================================================
-- Check for ticket number generation function
SELECT 
  'Functions Check' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_ticket_number',
    'set_ticket_number',
    'track_ticket_history'
  )
ORDER BY routine_name;

-- Check for triggers
SELECT 
  'Triggers Check' as check_type,
  trigger_name,
  event_object_table as table_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'set_support_ticket_number',
    'track_support_ticket_changes',
    'update_support_categories_updated_at',
    'update_support_tickets_updated_at',
    'update_support_ticket_threads_updated_at'
  )
ORDER BY trigger_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================
SELECT 
  '=== MIGRATION VERIFICATION SUMMARY ===' as summary;

SELECT 
  'Expected: 5 tables' as item,
  COUNT(*)::text as actual
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'support_tickets',
    'support_ticket_threads',
    'support_ticket_attachments',
    'support_categories',
    'support_ticket_history'
  );

SELECT 
  'Expected: 1 storage bucket' as item,
  COUNT(*)::text as actual
FROM storage.buckets
WHERE id = 'support-tickets';

SELECT 
  'Expected: 3+ storage policies' as item,
  COUNT(*)::text as actual
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%support ticket%';

