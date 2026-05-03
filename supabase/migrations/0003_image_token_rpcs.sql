-- Atomic image-token RPCs mirroring the text-token ones in 0001.
-- Run once in the Supabase SQL editor.
-- Before running, optionally normalize NULLs:
--   UPDATE public."PurchasedToken" SET "imageTokens" = 0 WHERE "imageTokens" IS NULL;

create or replace function public.decrement_image_tokens(p_user_id uuid, p_amount int)
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

  update public."PurchasedToken"
  set "imageTokens" = "imageTokens" - p_amount
  where "userId" = p_user_id
    and "imageTokens" >= p_amount
  returning "imageTokens" into new_balance;

  return new_balance;
end;
$$;

create or replace function public.refund_image_tokens(p_user_id uuid, p_amount int)
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

  update public."PurchasedToken"
  set "imageTokens" = "imageTokens" + p_amount
  where "userId" = p_user_id
  returning "imageTokens" into new_balance;

  return new_balance;
end;
$$;

revoke all on function public.decrement_image_tokens(uuid, int) from public;
revoke all on function public.refund_image_tokens(uuid, int) from public;
