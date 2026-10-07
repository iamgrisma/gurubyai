-- B12 invariants: ad rewards, push tokens, and R2 media tracking
do $$
declare
  v_count integer;
begin
  -- 1. Verify ad_reward_events table and constraints
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ad_reward_events'::regclass
      and conname like '%reward_type%'
  ) then raise exception 'missing ad_reward_events reward_type check constraint'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ad_reward_events'::regclass
      and conname like '%user_id%idempotency_key%'
  ) then raise exception 'missing ad_reward_events user_id/idempotency_key uniqueness'; end if;

  -- 2. Verify user_push_tokens table and constraints
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_push_tokens'::regclass
      and conname like '%platform%'
  ) then raise exception 'missing user_push_tokens platform check constraint'; end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_push_tokens'::regclass
      and conname like '%user_id%token%'
  ) then raise exception 'missing user_push_tokens user_id/token uniqueness'; end if;

  -- 3. Verify media_assets table
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.media_assets'::regclass
      and conname like '%category%'
  ) then raise exception 'missing media_assets category check constraint'; end if;

  -- 4. Verify RPC functions exist with security definer
  if not exists (
    select 1 from pg_proc
    where proname = 'claim_ad_reward' and prosecdef = true
  ) then raise exception 'claim_ad_reward must be security definer'; end if;

  if not exists (
    select 1 from pg_proc
    where proname = 'get_ad_reward_status' and prosecdef = true
  ) then raise exception 'get_ad_reward_status must be security definer'; end if;

  if not exists (
    select 1 from pg_proc
    where proname = 'register_push_token' and prosecdef = true
  ) then raise exception 'register_push_token must be security definer'; end if;

  if not exists (
    select 1 from pg_proc
    where proname = 'register_media_asset' and prosecdef = true
  ) then raise exception 'register_media_asset must be security definer'; end if;

  -- 5. Verify deprecated payment RPCs have no grants for anon or authenticated
  if exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('request_topup', 'approve_topup_request', 'reject_topup_request')
      and grantee in ('anon', 'authenticated', 'PUBLIC')
  ) then raise exception 'deprecated payment topup RPCs must have execution revoked'; end if;

  raise notice 'B12 ad rewards, push tokens, and R2 media tests passed successfully!';
end $$;
