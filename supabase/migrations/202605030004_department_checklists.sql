create table if not exists public.department_checklists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_key text not null,
  checklist_code text,
  title text not null,
  description text,
  owner_name text,
  frequency text not null default 'daily',
  priority text not null default 'medium',
  due_date date,
  status text not null default 'pending',
  proof_url text,
  remarks text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, department_key, checklist_code)
);

create index if not exists department_checklists_department_idx
  on public.department_checklists (organization_id, department_key, status);

create index if not exists department_checklists_due_date_idx
  on public.department_checklists (organization_id, due_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists department_checklists_set_updated_at on public.department_checklists;

create trigger department_checklists_set_updated_at
  before update on public.department_checklists
  for each row execute function public.set_updated_at();

alter table public.department_checklists enable row level security;

create policy "Allowed users can read department checklists" on public.department_checklists
  for select using (
    public.has_module_permission(organization_id, 'reports', 'view')
    or public.has_module_permission(organization_id, 'sales', 'view')
    or public.has_module_permission(organization_id, 'purchases', 'view')
    or public.has_module_permission(organization_id, 'inventory', 'view')
    or public.has_module_permission(organization_id, 'field_operations', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
  );

create policy "Allowed users can write department checklists" on public.department_checklists
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
