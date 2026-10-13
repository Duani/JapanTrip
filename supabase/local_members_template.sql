-- Run this in Supabase Studio SQL editor AFTER creating Auth users.
-- Replace the emails below with the exact emails you created under Authentication → Users.
-- The SQL editor runs as an admin role, so it can create the first trip_members rows.

insert into public.trip_members (trip_id, user_id, display_name, role)
select 'japan-2026-elad-gal-riva-jacob', id, 'Elad', 'admin'
from auth.users
where email = 'elad@example.com'
on conflict (trip_id, user_id) do update set display_name = excluded.display_name, role = excluded.role;

insert into public.trip_members (trip_id, user_id, display_name, role)
select 'japan-2026-elad-gal-riva-jacob', id, 'Gal', 'editor'
from auth.users
where email = 'gal@example.com'
on conflict (trip_id, user_id) do update set display_name = excluded.display_name, role = excluded.role;

insert into public.trip_members (trip_id, user_id, display_name, role)
select 'japan-2026-elad-gal-riva-jacob', id, 'Riva', 'viewer'
from auth.users
where email = 'riva@example.com'
on conflict (trip_id, user_id) do update set display_name = excluded.display_name, role = excluded.role;

insert into public.trip_members (trip_id, user_id, display_name, role)
select 'japan-2026-elad-gal-riva-jacob', id, 'Jacob', 'viewer'
from auth.users
where email = 'jacob@example.com'
on conflict (trip_id, user_id) do update set display_name = excluded.display_name, role = excluded.role;

select tm.display_name, tm.role, u.email
from public.trip_members tm
join auth.users u on u.id = tm.user_id
where tm.trip_id = 'japan-2026-elad-gal-riva-jacob'
order by case tm.role when 'admin' then 1 when 'editor' then 2 else 3 end, tm.display_name;
