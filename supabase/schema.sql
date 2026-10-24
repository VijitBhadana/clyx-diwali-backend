-- Supabase schema used by SupabaseStore (src/storage/supabase.store.ts).
-- Safe to re-run: every statement is idempotent.

create table if not exists rsvps (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  attending   text not null check (attending in ('yes', 'maybe', 'no')),
  plus_ones   int  not null default 0 check (plus_ones between 0 and 10),
  message     text,
  created_at  timestamptz not null default now()
);
create unique index if not exists rsvps_name_idx on rsvps (lower(name));

create table if not exists outfits (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  outfit      text not null,
  color       text not null,
  accent      text not null,
  vibe        text,
  created_at  timestamptz not null default now()
);
create unique index if not exists outfits_name_idx on outfits (lower(name));

create table if not exists photos (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  uploader    text not null,
  phase       text not null check (phase in ('before', 'after')),
  caption     text,
  created_at  timestamptz not null default now()
);

-- Only the backend (service role / secret key) touches these tables. RLS with no
-- policies blocks the public anon / publishable key from reading or writing them.
alter table rsvps   enable row level security;
alter table outfits enable row level security;
alter table photos  enable row level security;

-- Public bucket for party photos (≤10MB images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('party-photos', 'party-photos', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
on conflict (id) do nothing;
