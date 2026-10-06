-- B1 domain schema normalization.
-- Converts legacy text identifiers/counters into typed relational values.
-- Safe for existing data: known legacy Gotra aliases are mapped before type change.

begin;

update public.profiles p
set gotra_id = g.id::text
from public.gotras g
where p.gotra_id is not null
  and (
    lower(trim(p.gotra_id)) = lower(trim(g.name))
    or (lower(trim(p.gotra_id)) = 'bharadwaja' and g.name = 'Bharadwaj')
    or (lower(trim(p.gotra_id)) = 'kashyapa' and g.name = 'Kashyap')
  );

do $$
begin
  if exists (
    select 1
    from public.profiles
    where gotra_id is not null
      and gotra_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception 'Unmapped legacy profiles.gotra_id values remain';
  end if;
end;
$$;

alter table public.profiles
  drop constraint if exists profiles_gotra_id_fkey;

alter table public.profiles
  alter column gotra_id type uuid
  using nullif(gotra_id, '')::uuid;

alter table public.profiles
  add constraint profiles_gotra_id_fkey
  foreign key (gotra_id) references public.gotras(id) on delete set null;

create index if not exists idx_profiles_gotra_id
  on public.profiles(gotra_id);

update public.gurubas
set review_count = coalesce(nullif(trim(review_count), ''), '0');

alter table public.gurubas
  alter column review_count type integer
  using review_count::integer;

alter table public.gurubas
  alter column review_count set default 0,
  alter column review_count set not null;

alter table public.gurubas
  drop constraint if exists gurubas_review_count_nonnegative;

alter table public.gurubas
  add constraint gurubas_review_count_nonnegative
  check (review_count >= 0);

commit;