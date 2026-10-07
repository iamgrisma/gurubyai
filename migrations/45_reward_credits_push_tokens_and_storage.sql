-- Migration 45: Reward Points Ad Model, Mobile Push Tokens, and R2 Media Tracking
-- Replaces direct manual fiat top-ups with Rewarded Video Ad credits.
-- Adds device push token registration for iOS, Android, and Web.
-- Adds Cloudflare R2 media asset registration.

begin;

-- ============================================================================
-- 1. RETIRE MANUAL PAYMENT & TOP-UP RPCS
-- ============================================================================
revoke execute on function public.request_topup(integer) from public, anon, authenticated;
revoke execute on function public.approve_topup_request(uuid) from public, anon, authenticated;
revoke execute on function public.reject_topup_request(uuid) from public, anon, authenticated;

comment on function public.request_topup(integer) is 'Deprecated: payments replaced by rewarded ad credits model.';

-- ============================================================================
-- 2. REWARDED ADS & REWARD POINTS ENGINE
-- ============================================================================
create table if not exists public.ad_reward_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reward_type text not null check (reward_type in ('rewarded_video', 'daily_checkin', 'offer_wall')),
  reward_points integer not null check (reward_points > 0 and reward_points <= 100),
  ad_network text not null default 'admob',
  ad_placement text default null,
  idempotency_key text not null,
  created_at timestamptz default now() not null,
  unique(user_id, idempotency_key)
);

create index if not exists idx_ad_reward_events_user_created
  on public.ad_reward_events(user_id, created_at desc);

alter table public.ad_reward_events enable row level security;
revoke all on public.ad_reward_events from anon, authenticated;

-- Function: Claim Ad Reward with anti-abuse & rate-limiting
create or replace function public.claim_ad_reward(
  p_reward_type text default 'rewarded_video',
  p_idempotency_key text default null,
  p_ad_placement text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_today_start timestamptz;
  v_today_count integer;
  v_last_claim timestamptz;
  v_points integer;
  v_daily_limit integer := 25;       -- Maximum 25 video ads per day
  v_cooldown_seconds integer := 20;  -- Minimum 20 seconds between claims
  v_new_balance integer;
  v_existing record;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 or length(trim(p_idempotency_key)) > 128 then
    raise exception 'Valid idempotency key is required (8-128 chars)';
  end if;

  if p_reward_type not in ('rewarded_video', 'daily_checkin', 'offer_wall') then
    raise exception 'Invalid reward type';
  end if;

  -- Acquire transaction advisory lock on user ad rewards to prevent concurrency races
  perform pg_advisory_xact_lock(hashtextextended('ad_reward:' || v_uid::text, 0));

  -- Check if already claimed with this idempotency key
  select reward_points, created_at into v_existing
  from public.ad_reward_events
  where user_id = v_uid and idempotency_key = trim(p_idempotency_key);

  if v_existing is not null then
    select coalesce(credits, 0) into v_new_balance from public.profiles where id = v_uid;
    return jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'points_awarded', v_existing.reward_points,
      'new_balance', v_new_balance,
      'message', 'Reward already processed'
    );
  end if;

  -- Calculate day start in Asia/Kathmandu timezone
  v_today_start := (now() at time zone 'Asia/Kathmandu')::date::timestamptz at time zone 'Asia/Kathmandu';

  -- Calculate points by reward type
  if p_reward_type = 'daily_checkin' then
    v_points := 50;
    -- Only one daily checkin allowed per calendar day
    if exists (
      select 1 from public.ad_reward_events
      where user_id = v_uid
        and reward_type = 'daily_checkin'
        and created_at >= v_today_start
    ) then
      raise exception 'Daily check-in reward already claimed for today';
    end if;
  elsif p_reward_type = 'offer_wall' then
    v_points := 50;
  else
    -- Default: rewarded video
    v_points := 20;
  end if;

  -- Check daily video ad cap
  select count(*), max(created_at) into v_today_count, v_last_claim
  from public.ad_reward_events
  where user_id = v_uid
    and reward_type = 'rewarded_video'
    and created_at >= v_today_start;

  if p_reward_type = 'rewarded_video' and coalesce(v_today_count, 0) >= v_daily_limit then
    raise exception 'Daily rewarded ad limit reached (%/%). Please return tomorrow!', v_daily_limit, v_daily_limit;
  end if;

  -- Check anti-farming cooldown between successive ad views
  if v_last_claim is not null and now() < (v_last_claim + make_interval(secs => v_cooldown_seconds)) then
    raise exception 'Please wait a moment before claiming another ad reward (cooldown active)';
  end if;

  -- Insert reward event
  insert into public.ad_reward_events (
    user_id, reward_type, reward_points, ad_network, ad_placement, idempotency_key
  ) values (
    v_uid, p_reward_type, v_points, 'admob', p_ad_placement, trim(p_idempotency_key)
  );

  -- Credit user balance
  update public.profiles
  set credits = coalesce(credits, 0) + v_points
  where id = v_uid
  returning credits into v_new_balance;

  -- Insert immutable transaction ledger record
  insert into public.transactions (
    user_id, amount, type, description, status, reference_key
  ) values (
    v_uid,
    v_points,
    'credit',
    'Ad reward: ' || p_reward_type,
    'completed',
    'ad_reward:' || v_uid::text || ':' || trim(p_idempotency_key)
  )
  on conflict (reference_key) do nothing;

  return jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'points_awarded', v_points,
    'new_balance', v_new_balance,
    'today_ads_viewed', coalesce(v_today_count, 0) + case when p_reward_type = 'rewarded_video' then 1 else 0 end,
    'daily_limit', v_daily_limit
  );
end;
$function$;

-- Function: Get user's current ad reward quota and balance
create or replace function public.get_ad_reward_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_today_start timestamptz;
  v_today_count integer;
  v_daily_checkin_done boolean;
  v_last_claim timestamptz;
  v_credits integer;
  v_daily_limit integer := 25;
  v_cooldown_seconds integer := 20;
  v_seconds_until_ready integer := 0;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  v_today_start := (now() at time zone 'Asia/Kathmandu')::date::timestamptz at time zone 'Asia/Kathmandu';

  select coalesce(credits, 0) into v_credits from public.profiles where id = v_uid;

  select count(*), max(created_at) into v_today_count, v_last_claim
  from public.ad_reward_events
  where user_id = v_uid
    and reward_type = 'rewarded_video'
    and created_at >= v_today_start;

  select exists (
    select 1 from public.ad_reward_events
    where user_id = v_uid
      and reward_type = 'daily_checkin'
      and created_at >= v_today_start
  ) into v_daily_checkin_done;

  if v_last_claim is not null and now() < (v_last_claim + make_interval(secs => v_cooldown_seconds)) then
    v_seconds_until_ready := extract(epoch from ((v_last_claim + make_interval(secs => v_cooldown_seconds)) - now()))::integer;
  end if;

  return jsonb_build_object(
    'credits_balance', coalesce(v_credits, 0),
    'today_ads_viewed', coalesce(v_today_count, 0),
    'daily_limit', v_daily_limit,
    'daily_ads_remaining', greatest(0, v_daily_limit - coalesce(v_today_count, 0)),
    'daily_checkin_claimed', v_daily_checkin_done,
    'seconds_until_ready', greatest(0, v_seconds_until_ready),
    'points_per_video', 20,
    'points_per_daily_checkin', 50
  );
end;
$function$;

revoke execute on function public.claim_ad_reward(text, text, text) from public, anon;
grant execute on function public.claim_ad_reward(text, text, text) to authenticated;

revoke execute on function public.get_ad_reward_status() from public, anon;
grant execute on function public.get_ad_reward_status() to authenticated;


-- ============================================================================
-- 3. MOBILE PUSH NOTIFICATION TOKEN INFRASTRUCTURE
-- ============================================================================
create table if not exists public.user_push_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  device_id text default null,
  is_active boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, token)
);

create index if not exists idx_user_push_tokens_lookup
  on public.user_push_tokens(user_id)
  where is_active = true;

alter table public.user_push_tokens enable row level security;
revoke all on public.user_push_tokens from anon, authenticated;

-- Function: Register Push Token
create or replace function public.register_push_token(
  p_token text,
  p_platform text,
  p_device_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_token is null or length(trim(p_token)) < 10 or length(trim(p_token)) > 512 then
    raise exception 'Invalid push token';
  end if;

  if p_platform not in ('ios', 'android', 'web') then
    raise exception 'Invalid platform (must be ios, android, or web)';
  end if;

  insert into public.user_push_tokens (
    user_id, token, platform, device_id, is_active, updated_at
  ) values (
    v_uid, trim(p_token), p_platform, trim(p_device_id), true, now()
  )
  on conflict (user_id, token) do update
  set is_active = true,
      platform = excluded.platform,
      device_id = coalesce(excluded.device_id, public.user_push_tokens.device_id),
      updated_at = now();
end;
$function$;

-- Function: Unregister Push Token
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  update public.user_push_tokens
  set is_active = false,
      updated_at = now()
  where user_id = v_uid and token = trim(p_token);
end;
$function$;

revoke execute on function public.register_push_token(text, text, text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;

revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;


-- ============================================================================
-- 4. CLOUDFLARE R2 MEDIA ASSET LEDGER
-- ============================================================================
create table if not exists public.media_assets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  bucket text not null default 'purohit',
  key text not null unique,
  content_type text not null,
  file_size_bytes integer,
  category text not null check (category in ('avatar', 'verification_doc', 'chat_attachment', 'service_cover')),
  public_url text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_media_assets_user_category
  on public.media_assets(user_id, category);

alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated;

-- Function: Register uploaded R2 media asset
create or replace function public.register_media_asset(
  p_key text,
  p_content_type text,
  p_category text,
  p_public_url text,
  p_file_size_bytes integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_key is null or length(trim(p_key)) < 3 then
    raise exception 'Invalid storage key';
  end if;

  if p_category not in ('avatar', 'verification_doc', 'chat_attachment', 'service_cover') then
    raise exception 'Invalid media category';
  end if;

  if p_public_url is null or not (p_public_url like 'https://%' or p_public_url like 'http://%') then
    raise exception 'Invalid public media URL';
  end if;

  insert into public.media_assets (
    user_id, bucket, key, content_type, file_size_bytes, category, public_url
  ) values (
    v_uid, 'purohit', trim(p_key), p_content_type, p_file_size_bytes, p_category, trim(p_public_url)
  )
  on conflict (key) do update
  set public_url = excluded.public_url,
      file_size_bytes = coalesce(excluded.file_size_bytes, public.media_assets.file_size_bytes)
  returning id into v_id;

  -- If avatar, update profile directly
  if p_category = 'avatar' then
    update public.profiles
    set avatar_url = trim(p_public_url)
    where id = v_uid;
  end if;

  return v_id;
end;
$function$;

revoke execute on function public.register_media_asset(text, text, text, text, integer) from public, anon;
grant execute on function public.register_media_asset(text, text, text, text, integer) to authenticated;

commit;
