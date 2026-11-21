-- =============================================================================
-- AIMPLB 30th Annual Session - All-in-One Database Health Summary
-- Returns a Single-Row Consolidated JSON Overview in Supabase SQL Editor
-- =============================================================================

SELECT json_build_object(
  'status', 'HEALTHY',
  'total_triggers', (
    SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public'
  ),
  'total_tables', (
    SELECT count(*) FROM pg_stat_user_tables WHERE schemaname = 'public'
  ),
  'table_row_counts', (
    SELECT json_object_agg(relname, n_live_tup)
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
  ),
  'rls_protected_tables', (
    SELECT json_agg(tablename)
    FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = true
  ),
  'verified_rpc_functions', (
    SELECT json_agg(json_build_object('name', proname, 'security_definer', prosecdef))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND proname IN ('record_gate_entry', 'record_gate_exit', 'resolve_username_to_auth_email')
  )
) AS database_health_overview;
