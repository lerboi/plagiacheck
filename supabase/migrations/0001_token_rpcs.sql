-- Atomic token RPCs for server-authoritative token management.
-- Run these once in the Supabase SQL editor.

create or replace function public.decrement_user_tokens(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  update public.user_profiles
  set tokens = tokens - p_amount,
      updated_at = now()
  where id = p_user_id
    and tokens >= p_amount
  returning tokens into new_balance;

  return new_balance;
end;
$$;

create or replace function public.refund_user_tokens(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return null;
  end if;

  update public.user_profiles
  set tokens = tokens + p_amount,
      updated_at = now()
  where id = p_user_id
  returning tokens into new_balance;

  return new_balance;
end;
$$;

revoke all on function public.decrement_user_tokens(uuid, int) from public;
revoke all on function public.refund_user_tokens(uuid, int) from public;
