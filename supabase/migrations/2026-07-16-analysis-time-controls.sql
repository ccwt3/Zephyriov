-- Adds the analyzed-time-controls preference to existing databases.
-- schema.sql already includes the column for fresh installs; run this ONCE
-- in the Supabase SQL editor if your database predates it.
-- "slow" maps to lichess "classical" and chess.com "daily".
alter table public.profiles
  add column analysis_time_controls text[] not null default '{blitz,rapid,slow}'
  check (analysis_time_controls <@ array['bullet','blitz','rapid','slow']);
