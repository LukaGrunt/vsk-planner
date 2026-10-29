-- Lock down member data.
-- Run AFTER the vsk-landing-page change "insert without reading the row back" is live,
-- otherwise the public membership form would fail.

-- Helper (same as 20261029000001, repeated so this file runs on its own)
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.members
    where user_id = auth.uid() and role in ('admin','superadmin'));
$$;
revoke all on function public.is_coach() from public, anon;
grant execute on function public.is_coach() to authenticated;

-- ---------- members ----------
-- "members_select" (using true) let every logged-in member read everyone.
drop policy if exists "members_select" on public.members;
-- Coach read rule rebuilt on is_coach() (no self-referencing subquery)
drop policy if exists "Allow admins to SELECT all members" on public.members;
create policy "Coaches can read all members"
  on public.members for select to authenticated
  using (public.is_coach());
-- Kept as is: "Allow SELECT own member record" (user_id = auth.uid()),
-- update/insert/delete rules.

-- ---------- membership_applications ----------
alter table public.membership_applications enable row level security;

drop policy if exists "Anyone can submit an application" on public.membership_applications;
create policy "Anyone can submit an application"
  on public.membership_applications for insert to anon, authenticated
  with check (true);

drop policy if exists "Own application or coach can read" on public.membership_applications;
create policy "Own application or coach can read"
  on public.membership_applications for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach());

drop policy if exists "Own application or coach can update" on public.membership_applications;
create policy "Own application or coach can update"
  on public.membership_applications for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach())
  with check (lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach());
