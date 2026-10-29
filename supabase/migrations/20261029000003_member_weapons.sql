-- Weapons belong to the member, not only to their sign-up application.
-- Members added by hand (Novi član) have no application, so their weapons
-- had nowhere to be saved.
alter table public.members add column if not exists orozje jsonb;

-- One-time copy from applications (matched by email) where the member has none yet
update public.members m
set orozje = a.weapons
from public.membership_applications a
where lower(a.email) = lower(m.email)
  and (m.orozje is null or m.orozje = '[]'::jsonb)
  and a.weapons is not null
  and jsonb_typeof(a.weapons) = 'array'
  and jsonb_array_length(a.weapons) > 0;
