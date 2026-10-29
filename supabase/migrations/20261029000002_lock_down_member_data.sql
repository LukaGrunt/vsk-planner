-- Lock down member data: turn on row-level security for members and
-- membership_applications (both were OFF, so the public anon key could read
-- and change every row).
-- Run AFTER LukaGrunt/vsk-landing-page#1 is live (the public form must not
-- read applications back), and after vsk-planner#5 (members load names only).
-- Edge functions use the service role key and are not affected.

-- ---------- helpers (security definer = no recursion into members' own rules) ----------
create or replace function public.is_coach()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.members
    where user_id = auth.uid() and role in ('admin','superadmin'));
$$;

create or replace function public.is_superadmin_self()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.members
    where user_id = auth.uid() and role = 'superadmin');
$$;

revoke all on function public.is_coach() from public, anon;
revoke all on function public.is_superadmin_self() from public, anon;
grant execute on function public.is_coach() to authenticated;
grant execute on function public.is_superadmin_self() to authenticated;

-- Names-only directory for regular members (coaches' phone/email included)
create or replace function public.member_directory()
returns table (id text, ime text, priimek text, role text, email text, telefon text)
language sql stable security definer set search_path = public
as $$
  select m.id::text, m.ime::text, m.priimek::text,
    coalesce(m.role, 'user')::text,
    case when m.role in ('admin','superadmin') then m.email::text end,
    case when m.role in ('admin','superadmin') then m.telefon::text end
  from public.members m
  where auth.uid() is not null
  order by m.priimek, m.ime;
$$;
revoke all on function public.member_directory() from public, anon;
grant execute on function public.member_directory() to authenticated;

-- ---------- members: replace the old rules with a clean set ----------
drop policy if exists "Allow SELECT own member record" on public.members;
drop policy if exists "Allow admins to SELECT all members" on public.members;
drop policy if exists "Allow admins to UPDATE members" on public.members;
drop policy if exists "Allow users to UPDATE own profile" on public.members;
drop policy if exists "members_delete" on public.members;
drop policy if exists "members_insert" on public.members;
drop policy if exists "members_select" on public.members;
drop policy if exists "members_update" on public.members;

create policy "members read own row or coach reads all"
  on public.members for select to authenticated
  using (user_id = auth.uid() or lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach());

create policy "members update own row or coach updates"
  on public.members for update to authenticated
  using (user_id = auth.uid() or public.is_coach())
  with check (user_id = auth.uid() or public.is_coach());

-- The app never inserts members itself (create-member uses the service role)
create policy "only coaches insert members"
  on public.members for insert to authenticated
  with check (public.is_coach());

create policy "only superadmin deletes members"
  on public.members for delete to authenticated
  using (public.is_superadmin_self());

-- Members may edit their own profile, but never their role, payment status or
-- account link. Only a superadmin changes roles; coaches may change payment.
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
  if not public.is_coach() then
    new.membership_paid := old.membership_paid;
    new.user_id := old.user_id;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_member_fields on public.members;
create trigger protect_member_fields
  before update on public.members
  for each row execute function public.protect_member_fields();

alter table public.members enable row level security;

-- ---------- membership_applications ----------
drop policy if exists "Anyone can submit an application" on public.membership_applications;
drop policy if exists "Own application or coach can read" on public.membership_applications;
drop policy if exists "Own application or coach can update" on public.membership_applications;
drop policy if exists "Only superadmin deletes applications" on public.membership_applications;

create policy "Anyone can submit an application"
  on public.membership_applications for insert to anon, authenticated
  with check (true);

create policy "Own application or coach can read"
  on public.membership_applications for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach());

create policy "Own application or coach can update"
  on public.membership_applications for update to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach())
  with check (lower(email) = lower(auth.jwt() ->> 'email') or public.is_coach());

create policy "Only superadmin deletes applications"
  on public.membership_applications for delete to authenticated
  using (public.is_superadmin_self());

alter table public.membership_applications enable row level security;
