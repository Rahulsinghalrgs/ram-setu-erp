create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email')),
  provider text not null default 'wati',
  workflow text not null,
  reference_key text,
  recipient_name text,
  recipient_contact text not null,
  template_name text,
  subject text,
  message_preview text,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists communication_logs_org_created_idx
  on public.communication_logs(organization_id, created_at desc);

create index if not exists communication_logs_reference_idx
  on public.communication_logs(organization_id, workflow, reference_key);

alter table public.communication_logs enable row level security;

drop policy if exists "Allowed users can read communication logs" on public.communication_logs;
drop policy if exists "Allowed users can write communication logs" on public.communication_logs;

create policy "Allowed users can read communication logs" on public.communication_logs
  for select using (
    public.has_module_permission(organization_id, 'invoices', 'view')
    or public.has_module_permission(organization_id, 'reports', 'view')
  );

create policy "Allowed users can write communication logs" on public.communication_logs
  for all using (
    public.has_module_permission(organization_id, 'invoices', 'edit')
    or public.has_module_permission(organization_id, 'reports', 'edit')
  )
  with check (
    public.has_module_permission(organization_id, 'invoices', 'edit')
    or public.has_module_permission(organization_id, 'reports', 'edit')
  );
