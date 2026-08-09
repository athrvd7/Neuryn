-- Neuryn — user accounts + per-user article shelf
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Safe to re-run: uses "if not exists" / "drop policy if exists".

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, holds the public-facing handle + bio.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique not null,
  display_name text,
  bio          text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Handles are used in public URLs (/u/:username) so keep them URL-safe.
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_-]{3,30}$');

-- ---------------------------------------------------------------------------
-- user_articles: content a signed-in user adds to their own shelf.
-- Mirrors the .qmd frontmatter used by the curated (CLI) pipeline so the
-- same React components can render both.
-- ---------------------------------------------------------------------------
create table if not exists public.user_articles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  title               text not null,
  author              text not null default '',
  author_url          text,
  type                text not null default 'article'
                        check (type in ('article', 'blog', 'research', 'video')),
  category            text not null default 'Other',
  tags                text[] not null default '{}',
  source_url          text,
  video_url           text,
  body                text not null default '',   -- rendered HTML
  excerpt             text not null default '',
  estimated_read_time int  not null default 1,
  gists               jsonb not null default '{}'::jsonb,  -- { quick, medium, full } as HTML
  is_own_work         boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists user_articles_user_id_idx  on public.user_articles (user_id);
create index if not exists user_articles_created_at_idx on public.user_articles (created_at desc);

-- ---------------------------------------------------------------------------
-- Row-Level Security: anyone can READ (public profile shelf),
-- but only the owner can INSERT / UPDATE / DELETE their own rows.
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.user_articles enable row level security;

-- profiles
drop policy if exists "profiles: public read"      on public.profiles;
drop policy if exists "profiles: owner insert"     on public.profiles;
drop policy if exists "profiles: owner update"     on public.profiles;

create policy "profiles: public read"
  on public.profiles for select using (true);
create policy "profiles: owner insert"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: owner update"
  on public.profiles for update using (auth.uid() = id);

-- user_articles
drop policy if exists "articles: public read"  on public.user_articles;
drop policy if exists "articles: owner insert" on public.user_articles;
drop policy if exists "articles: owner update" on public.user_articles;
drop policy if exists "articles: owner delete" on public.user_articles;

create policy "articles: public read"
  on public.user_articles for select using (true);
create policy "articles: owner insert"
  on public.user_articles for insert with check (auth.uid() = user_id);
create policy "articles: owner update"
  on public.user_articles for update using (auth.uid() = user_id);
create policy "articles: owner delete"
  on public.user_articles for delete using (auth.uid() = user_id);
