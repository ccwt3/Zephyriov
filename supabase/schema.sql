-- ============================================================================
-- Zephyriov — Database schema
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Then run supabase/seed.sql to load the opening catalog.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type chess_color as enum ('white', 'black');
create type line_state as enum ('new', 'review');
create type grade as enum ('bad', 'mid', 'good');
create type session_status as enum ('in_progress', 'completed');
create type session_item_type as enum ('new', 'review');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- CATALOG (global, curated content — read-only for users)
-- ============================================================================

-- An opening studied as a repertoire unit (e.g. "Sicilian Dragon").
-- playable_colors: sides from which it makes sense to study it.
-- detection_keys: lowercase name prefixes / ECO codes used to match the
-- opening tags returned by the Lichess and Chess.com APIs.
create table public.openings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  eco text not null,
  playable_colors chess_color[] not null,
  detection_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- The 3-4 most important theoretical lines of each opening.
create table public.opening_lines (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references public.openings (id) on delete cascade,
  name text not null,
  rank smallint not null check (rank between 1 and 4),
  created_at timestamptz not null default now(),
  unique (opening_id, rank)
);

-- Every half-move of a line, with a curated explanation of the idea.
-- ply is 1-based: odd plies are White's moves, even plies are Black's.
create table public.line_moves (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.opening_lines (id) on delete cascade,
  ply smallint not null check (ply >= 1),
  san text not null,
  explanation text not null,
  unique (line_id, ply)
);

create index line_moves_line_idx on public.line_moves (line_id, ply);

alter table public.openings enable row level security;
alter table public.opening_lines enable row level security;
alter table public.line_moves enable row level security;

create policy "Catalog is readable by authenticated users"
  on public.openings for select to authenticated using (true);
create policy "Catalog lines are readable by authenticated users"
  on public.opening_lines for select to authenticated using (true);
create policy "Catalog moves are readable by authenticated users"
  on public.line_moves for select to authenticated using (true);

-- ============================================================================
-- USER DATA (row-level security: each user only sees their own rows)
-- ============================================================================

-- One profile per auth user, created automatically on sign-up.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lichess_username text,
  chesscom_username text,
  lines_per_session smallint not null default 6 check (lines_per_session between 1 and 12),
  moves_per_block smallint not null default 4 check (moves_per_block between 2 and 10),
  timezone text not null default 'UTC',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The openings detected for (and chosen by) the user.
-- color: the side the user practices this opening from.
create table public.user_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  opening_id uuid not null references public.openings (id) on delete cascade,
  color chess_color not null,
  games_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, opening_id)
);

-- SRS card state, one row per (user, line).
-- unlocked_moves counts the *student's* moves unlocked so far (starts at
-- moves_per_block, grows by one block each time the full block is passed
-- with a clean "good").
create table public.user_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  line_id uuid not null references public.opening_lines (id) on delete cascade,
  state line_state not null default 'new',
  unlocked_moves smallint not null default 4 check (unlocked_moves >= 1),
  interval_days numeric(8, 2) not null default 0,
  due_date date not null default current_date,
  reps integer not null default 0,
  lapses integer not null default 0,
  last_result grade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, line_id)
);

create index user_lines_due_idx on public.user_lines (user_id, due_date);

create trigger user_lines_updated_at
  before update on public.user_lines
  for each row execute function public.set_updated_at();

-- One study session per user per day.
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null,
  status session_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, session_date)
);

-- Each line reviewed inside a session. A line that fails is re-queued as a
-- new item with attempt_number + 1, so the full history is kept.
create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions (id) on delete cascade,
  user_line_id uuid not null references public.user_lines (id) on delete cascade,
  sort_order smallint not null,
  item_type session_item_type not null,
  attempt_number smallint not null default 1,
  result grade,
  completed_at timestamptz,
  unique (session_id, user_line_id, attempt_number)
);

create index session_items_session_idx on public.session_items (session_id, sort_order);

-- Every graded move attempt (audit + timing data).
create table public.move_attempts (
  id uuid primary key default gen_random_uuid(),
  session_item_id uuid not null references public.session_items (id) on delete cascade,
  ply smallint not null,
  expected_san text not null,
  played_san text not null,
  is_correct boolean not null,
  elapsed_ms integer not null,
  created_at timestamptz not null default now()
);

create index move_attempts_item_idx on public.move_attempts (session_item_id);

-- Streak tracking, one row per user.
create table public.user_streaks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  last_active_date date,
  updated_at timestamptz not null default now()
);

create trigger user_streaks_updated_at
  before update on public.user_streaks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS for user data
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_openings enable row level security;
alter table public.user_lines enable row level security;
alter table public.study_sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.move_attempts enable row level security;
alter table public.user_streaks enable row level security;

create policy "Users manage their own profile"
  on public.profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their own openings"
  on public.user_openings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their own lines"
  on public.user_lines for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their own sessions"
  on public.study_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- session_items and move_attempts have no user_id column; ownership is
-- resolved through their parent rows.
create policy "Users manage their own session items"
  on public.session_items for all to authenticated
  using (
    exists (
      select 1 from public.study_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.study_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );

create policy "Users manage their own move attempts"
  on public.move_attempts for all to authenticated
  using (
    exists (
      select 1
      from public.session_items i
      join public.study_sessions s on s.id = i.session_id
      where i.id = session_item_id and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.session_items i
      join public.study_sessions s on s.id = i.session_id
      where i.id = session_item_id and s.user_id = (select auth.uid())
    )
  );

create policy "Users manage their own streak"
  on public.user_streaks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
