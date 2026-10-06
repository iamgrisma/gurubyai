-- B2 security hardening: pin every client-executable SECURITY DEFINER function to a safe search_path.
-- This prevents caller-controlled search_path resolution from affecting privileged functions.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid,
           n.nspname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;
