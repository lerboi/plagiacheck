-- Creates the Payment, Package and PurchasedToken tables that were missing
-- from the current Supabase project, plus RLS policies so authenticated users
-- can read/write their own rows.
-- Run once in the Supabase SQL editor.

-- ── PurchasedToken ───────────────────────────────────────────────────────────
create table if not exists public."PurchasedToken" (
  "userId"      uuid    not null,
  "textTokens"  integer not null default 0,
  "imageTokens" integer not null default 0,
  constraint "PurchasedToken_pkey" primary key ("userId"),
  constraint "PurchasedToken_userId_fkey" foreign key ("userId") references auth.users(id)
);

alter table public."PurchasedToken" enable row level security;

drop policy if exists "Users can view own purchased tokens" on public."PurchasedToken";
create policy "Users can view own purchased tokens"
  on public."PurchasedToken" for select
  using (auth.uid() = "userId");

-- Normalise any NULL imageTokens so the >= comparison in the RPC works
update public."PurchasedToken" set "imageTokens" = 0 where "imageTokens" is null;
update public."PurchasedToken" set "textTokens"  = 0 where "textTokens"  is null;

-- ── Payment ──────────────────────────────────────────────────────────────────
create table if not exists public."Payment" (
  id            uuid    not null default gen_random_uuid(),
  "userId"      text    not null,
  amount        numeric not null default 0,
  status        text    not null default 'succeeded',
  "paymentType" text,
  "createdAt"   timestamp with time zone not null default now(),
  constraint "Payment_pkey" primary key (id)
);

alter table public."Payment" enable row level security;

drop policy if exists "Users can view own payments" on public."Payment";
create policy "Users can view own payments"
  on public."Payment" for select
  using (auth.uid()::text = "userId");

-- ── Package ───────────────────────────────────────────────────────────────────
create table if not exists public."Package" (
  id            uuid not null default gen_random_uuid(),
  "userId"      text not null,
  "packageName" text not null,
  status        text not null default 'ACTIVE',
  "startDate"   timestamp with time zone not null default now(),
  "expiryDate"  timestamp with time zone,
  constraint "Package_pkey" primary key (id)
);

alter table public."Package" enable row level security;

drop policy if exists "Users can view own packages" on public."Package";
create policy "Users can view own packages"
  on public."Package" for select
  using (auth.uid()::text = "userId");
