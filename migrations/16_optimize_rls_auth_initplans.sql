-- Normalize auth helper calls in RLS policies to init-plan form.
-- This preserves authorization semantics while avoiding per-row auth function evaluation.
do $$
declare
  p record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname='public'
      and (
        coalesce(qual,'') like '%auth.uid()%'
        or coalesce(qual,'') like '%auth.role()%'
        or coalesce(with_check,'') like '%auth.uid()%'
        or coalesce(with_check,'') like '%auth.role()%'
      )
  loop
    v_using := p.qual;
    v_check := p.with_check;
    if v_using is not null then
      v_using := replace(v_using, 'auth.uid()', '(select auth.uid())');
      v_using := replace(v_using, 'auth.role()', '(select auth.role())');
    end if;
    if v_check is not null then
      v_check := replace(v_check, 'auth.uid()', '(select auth.uid())');
      v_check := replace(v_check, 'auth.role()', '(select auth.role())');
    end if;
    if p.cmd = 'INSERT' then
      v_sql := format('alter policy %I on %I.%I with check (%s)', p.policyname,p.schemaname,p.tablename,coalesce(v_check,'true'));
    elsif p.cmd = 'DELETE' then
      v_sql := format('alter policy %I on %I.%I using (%s)', p.policyname,p.schemaname,p.tablename,coalesce(v_using,'true'));
    else
      v_sql := format('alter policy %I on %I.%I using (%s)%s', p.policyname,p.schemaname,p.tablename,coalesce(v_using,'true'),case when v_check is not null then format(' with check (%s)',v_check) else '' end);
    end if;
    execute v_sql;
  end loop;
end $$;