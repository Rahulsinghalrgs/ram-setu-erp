-- Task Delegation: one-time tasks assigned to a person with planned/target/done dates.
create table if not exists public.task_delegations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_key text not null default 'dashboard',
  delegation_code text,
  title text not null,
  description text,
  assigned_by text,
  assigned_to text,
  priority text not null default 'medium',
  planned_date date,
  target_date date,
  revised_date date,
  completed_date date,
  status text not null default 'pending',
  proof_url text,
  remarks text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, delegation_code)
);

create index if not exists task_delegations_department_idx
  on public.task_delegations (organization_id, department_key, status);

create index if not exists task_delegations_target_idx
  on public.task_delegations (organization_id, target_date);

-- reuse the shared set_updated_at() function created in the checklist migration
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists task_delegations_set_updated_at on public.task_delegations;

create trigger task_delegations_set_updated_at
  before update on public.task_delegations
  for each row execute function public.set_updated_at();

alter table public.task_delegations enable row level security;

create policy "Allowed users can read task delegations" on public.task_delegations
  for select using (
    public.has_module_permission(organization_id, 'reports', 'view')
    or public.has_module_permission(organization_id, 'sales', 'view')
    or public.has_module_permission(organization_id, 'purchases', 'view')
    or public.has_module_permission(organization_id, 'inventory', 'view')
    or public.has_module_permission(organization_id, 'field_operations', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
  );

create policy "Allowed users can write task delegations" on public.task_delegations
  for all using (
    public.has_module_permission(organization_id, 'reports', 'edit')
    or public.has_module_permission(organization_id, 'sales', 'edit')
    or public.has_module_permission(organization_id, 'purchases', 'edit')
    or public.has_module_permission(organization_id, 'inventory', 'edit')
    or public.has_module_permission(organization_id, 'field_operations', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
  )
  with check (
    public.has_module_permission(organization_id, 'reports', 'edit')
    or public.has_module_permission(organization_id, 'sales', 'edit')
    or public.has_module_permission(organization_id, 'purchases', 'edit')
    or public.has_module_permission(organization_id, 'inventory', 'edit')
    or public.has_module_permission(organization_id, 'field_operations', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
  );
