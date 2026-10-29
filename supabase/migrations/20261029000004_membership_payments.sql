-- Membership fee paid per year (replaces the single yes/no "membership_paid").
-- On 1 January everyone is automatically unpaid for the new year; history stays.
-- Only a SUPERADMIN can mark or unmark payments.

create table if not exists public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  year int not null check (year between 2020 and 2100),
  paid_at timestamptz not null default now(),
  marked_by uuid default auth.uid(),
  note text,
  unique (member_id, year)
);

create index if not exists membership_payments_year_idx on public.membership_payments (year);

alter table public.membership_payments enable row level security;

-- Logged-in users only (the rules below decide which rows); the public key gets nothing
revoke all on public.membership_payments from anon;
grant select, insert, update, delete on public.membership_payments to authenticated;

drop policy if exists "Coaches read all payments, members their own" on public.membership_payments;
create policy "Coaches read all payments, members their own"
  on public.membership_payments for select to authenticated
  using (
    public.is_coach()
    or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid())
  );

drop policy if exists "Only superadmin adds payments" on public.membership_payments;
create policy "Only superadmin adds payments"
  on public.membership_payments for insert to authenticated
  with check (public.is_superadmin_self());

drop policy if exists "Only superadmin changes payments" on public.membership_payments;
create policy "Only superadmin changes payments"
  on public.membership_payments for update to authenticated
  using (public.is_superadmin_self())
  with check (public.is_superadmin_self());

drop policy if exists "Only superadmin removes payments" on public.membership_payments;
create policy "Only superadmin removes payments"
  on public.membership_payments for delete to authenticated
  using (public.is_superadmin_self());

-- Everyone currently marked "Plačano" counts as paid for 2026
insert into public.membership_payments (member_id, year, paid_at, note)
select id, 2026, now(), 'Preneseno iz starega statusa Plačano'
from public.members
where membership_paid = true
on conflict (member_id, year) do nothing;

-- The old yes/no field: from now on only a superadmin may change it too
create or replace function public.protect_member_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return new; -- service role / SQL editor
  end if;
  if new.role is distinct from old.role and not public.is_superadmin_self() then
    new.role := old.role;
  end if;
  if new.membership_paid is distinct from old.membership_paid and not public.is_superadmin_self() then
    new.membership_paid := old.membership_paid;
  end if;
  if not public.is_coach() then
    new.user_id := old.user_id;
    new.email := old.email;
  end if;
  return new;
end;
$$;
