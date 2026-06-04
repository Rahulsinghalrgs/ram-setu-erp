create table if not exists public.workflow_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow text not null,
  reference_key text,
  client_name text not null,
  contact_person text,
  phone text,
  email text,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'call', 'internal')),
  template_name text,
  subject text,
  message_preview text,
  due_date date not null,
  priority text not null default 'medium',
  status text not null default 'scheduled',
  owner_name text,
  last_sent_at timestamptz,
  next_attempt_at timestamptz,
  remarks text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_reminders_org_due_idx
  on public.workflow_reminders (organization_id, due_date, status);

create index if not exists workflow_reminders_reference_idx
  on public.workflow_reminders (organization_id, workflow, reference_key);

drop trigger if exists workflow_reminders_set_updated_at on public.workflow_reminders;

create trigger workflow_reminders_set_updated_at
  before update on public.workflow_reminders
  for each row execute function public.set_updated_at();

alter table public.workflow_reminders enable row level security;

drop policy if exists "Allowed users can read workflow reminders" on public.workflow_reminders;
drop policy if exists "Allowed users can write workflow reminders" on public.workflow_reminders;

create policy "Allowed users can read workflow reminders" on public.workflow_reminders
  for select using (
    public.has_module_permission(organization_id, 'reports', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
    or public.has_module_permission(organization_id, 'sales', 'view')
    or public.has_module_permission(organization_id, 'customers', 'view')
  );

create policy "Allowed users can write workflow reminders" on public.workflow_reminders
  for all using (
    public.has_module_permission(organization_id, 'reports', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
    or public.has_module_permission(organization_id, 'sales', 'edit')
    or public.has_module_permission(organization_id, 'customers', 'edit')
  )
  with check (
    public.has_module_permission(organization_id, 'reports', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
    or public.has_module_permission(organization_id, 'sales', 'edit')
    or public.has_module_permission(organization_id, 'customers', 'edit')
  );
