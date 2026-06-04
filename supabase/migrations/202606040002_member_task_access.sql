-- User-wise task access:
-- Every organization member (including plain "staff" without any module
-- permission) must be able to see and close the delegation / checklist
-- tasks assigned to them from their personal dashboard.
--
-- The existing read/write policies are scoped to module permissions, so a
-- staff login with no modules would otherwise get an empty list. These
-- additive policies (RLS policies are OR'd together) open up read + status
-- updates for any member of the same organization. Insert/delete stay gated
-- by the module-permission policies created earlier, so only managers/admins
-- can create or remove tasks.

-- Task delegations -----------------------------------------------------------
drop policy if exists "Members can read task delegations" on public.task_delegations;
create policy "Members can read task delegations" on public.task_delegations
  for select using (public.is_org_member(organization_id));

drop policy if exists "Members can update task delegations" on public.task_delegations;
create policy "Members can update task delegations" on public.task_delegations
  for update using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- Department checklists ------------------------------------------------------
drop policy if exists "Members can read department checklists" on public.department_checklists;
create policy "Members can read department checklists" on public.department_checklists
  for select using (public.is_org_member(organization_id));

drop policy if exists "Members can update department checklists" on public.department_checklists;
create policy "Members can update department checklists" on public.department_checklists
  for update using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
