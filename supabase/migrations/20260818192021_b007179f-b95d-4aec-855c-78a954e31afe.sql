create or replace function public.shares_org_with(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m1
    join public.organization_members m2 on m1.org_id = m2.org_id
    where m1.user_id = auth.uid() and m2.user_id = _user_id
  )
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select
using (id = auth.uid() or (org_id is not null and is_org_member(org_id)) or public.shares_org_with(id));