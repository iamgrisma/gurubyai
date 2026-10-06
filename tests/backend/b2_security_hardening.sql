-- B2 production security assertions.
DO $$
DECLARE
  v_count integer;
BEGIN
  -- Every public table must have RLS enabled.
  SELECT count(*) INTO v_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'B2: % public tables have RLS disabled', v_count;
  END IF;

  -- No public table/action/role combination may have overlapping permissive policies.
  SELECT count(*) INTO v_count
  FROM (
    SELECT tablename, cmd, roles
    FROM pg_policies
    WHERE schemaname='public' AND permissive='PERMISSIVE'
    GROUP BY tablename, cmd, roles
    HAVING count(*) > 1
  ) q;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'B2: overlapping permissive policy groups remain: %', v_count;
  END IF;

  -- No client-executable SECURITY DEFINER function may have an unset search_path.
  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.prosecdef
    AND (has_function_privilege('anon',p.oid,'EXECUTE')
         OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
    AND NOT EXISTS (
      SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg LIKE 'search_path=%'
    );
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'B2: % client-executable SECURITY DEFINER functions lack pinned search_path', v_count;
  END IF;

  -- Internal queue/event tables must not be directly executable by clients.
  IF has_table_privilege('authenticated','public.job_queue','SELECT')
     OR has_table_privilege('authenticated','public.domain_events','SELECT')
     OR has_table_privilege('authenticated','public.booking_events','SELECT') THEN
    RAISE EXCEPTION 'B2: internal event/queue table exposure remains';
  END IF;

  -- Private profiles must not be readable by anonymous clients.
  IF has_table_privilege('anon','public.profiles','SELECT') THEN
    RAISE EXCEPTION 'B2: anon can still SELECT profiles';
  END IF;
END $$;
