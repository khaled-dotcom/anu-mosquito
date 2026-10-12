-- Restrict Team management to existing admin users.
-- No existing table or policy is modified.

create policy "Admins can manage teams"
on public.teams
for all
to authenticated
using (get_my_role() = 'admin'::user_role)
with check (get_my_role() = 'admin'::user_role);

create policy "Admins can manage team members"
on public.team_members
for all
to authenticated
using (get_my_role() = 'admin'::user_role)
with check (get_my_role() = 'admin'::user_role);
