-- Create or refresh HR dashboard tenant membership for the demo client.
-- Replace the email if you use a different HR login.

with demo_user as (
  select id
  from auth.users
  where lower(email) = lower('elvisntumngia@gmail.com')
  limit 1
),
demo_client as (
  select id
  from public.clients
  where name ilike '%demo%'
  order by created_at
  limit 1
)
insert into public.client_user_memberships (client_id, user_id, role, status)
select demo_client.id, demo_user.id, 'client_admin', 'active'
from demo_user, demo_client
on conflict (user_id, client_id)
do update set
  role = excluded.role,
  status = 'active',
  updated_at = now();

select
  users.email,
  clients.name as client_name,
  memberships.role,
  memberships.status
from public.client_user_memberships memberships
join auth.users users on users.id = memberships.user_id
join public.clients clients on clients.id = memberships.client_id
where lower(users.email) = lower('elvisntumngia@gmail.com');
