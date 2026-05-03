-- tool_history: per-tool usage log shown on /history.
-- Run once in the Supabase SQL editor.

create table if not exists public.tool_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  input_preview text not null,
  output_preview text,
  metadata jsonb default '{}'::jsonb,
  tokens_used int default 0,
  created_at timestamptz not null default now()
);

create index if not exists tool_history_user_created_idx
  on public.tool_history (user_id, created_at desc);

create index if not exists tool_history_tool_idx
  on public.tool_history (user_id, tool);

alter table public.tool_history enable row level security;

drop policy if exists "Users read own history" on public.tool_history;
create policy "Users read own history"
  on public.tool_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users delete own history" on public.tool_history;
create policy "Users delete own history"
  on public.tool_history
  for delete
  using (auth.uid() = user_id);

-- Inserts only happen from the server using the service-role key, which
-- bypasses RLS — no insert policy needed for end users.
