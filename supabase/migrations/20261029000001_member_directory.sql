-- Member directory for regular members: names for everyone, plus phone/email
-- only for coaches (admin/superadmin) so the "Vodja / Trener" contact on
-- trainings and coach badges in chat keep working.
-- Coaches still read the full members table directly.

create or replace function public.member_directory()
returns table (id text, ime text, priimek text, role text, email text, telefon text)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id::text,
    m.ime::text,
    m.priimek::text,
    coalesce(m.role, 'user')::text,
    case when m.role in ('admin', 'superadmin') then m.email::text end,
    case when m.role in ('admin', 'superadmin') then m.telefon::text end
  from public.members m
  where auth.uid() is not null
  order by m.priimek, m.ime;
$$;

revoke all on function public.member_directory() from public, anon;
grant execute on function public.member_directory() to authenticated;

-- Helper for row-level security rules: is the logged-in user a coach?
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

revoke all on function public.is_coach() from public, anon;
grant execute on function public.is_coach() to authenticated;
