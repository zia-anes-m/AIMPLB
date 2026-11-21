-- =============================================================================
-- AIMPLB 30th Annual Session - Database Schema & Concurrency Inspector
-- Safe, Read-Only Diagnostic Script for Supabase SQL Editor
-- This script does NOT modify, drop, or alter any table, policy, or data.
-- =============================================================================

-- 1. Table Inventory & Row Counts
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS approximate_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- 2. Column Specifications & Nullability
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Primary Keys & Foreign Key Constraints
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type;

-- 4. Unique Indexes & High-Concurrency Constraints
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. Row Level Security (RLS) Status
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. RLS Policies & Permitted Roles
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Stored Procedures & High-Concurrency RPC Functions
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_function_arguments(p.oid) AS arguments,
  pg_catalog.pg_get_function_result(p.oid) AS return_type,
  p.prosecdef AS is_security_definer
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'record_gate_entry',
    'record_gate_exit',
    'resolve_username_to_auth_email',
    'get_active_event_entry',
    'check_duplicate_phone'
  )
ORDER BY p.proname;

-- 8. Triggers (Auditing, Validation & Automation)
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
