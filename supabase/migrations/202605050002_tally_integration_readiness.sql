create table if not exists public.tally_integration_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider_name text,
  access_method text not null default 'xml_api'
    check (access_method in ('xml_api', 'odbc', 'rest_api', 'manual_csv', 'not_confirmed')),
  browser_url text,
  api_url text,
  static_ip text,
  company_names text[] not null default '{}',
  reports_enabled jsonb not null default '{
    "ledger_master": true,
    "bills_receivable": true,
    "sales_register": true,
    "receipt_register": true,
    "outstanding_ageing": true
  }'::jsonb,
  sync_frequency text not null default 'hourly'
    check (sync_frequency in ('15_min', 'hourly', 'daily_fixed', 'manual')),
  sync_time time,
  provider_notes text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tally_sync_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null check (status in ('running', 'success', 'error')),
  access_method text not null default 'xml_api',
  provider_name text,
  company_names text[] not null default '{}',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ledgers_read integer not null default 0,
  clients_upserted integer not null default 0,
  vouchers_read integer not null default 0,
  invoices_upserted integer not null default 0,
  payments_created integer not null default 0,
  warnings text[] not null default '{}',
  message text
);

create or replace trigger touch_tally_integration_settings_updated_at
  before update on public.tally_integration_settings
  for each row execute function public.touch_updated_at();

alter table public.tally_integration_settings enable row level security;
alter table public.tally_sync_logs enable row level security;

drop policy if exists "Allowed users can read tally settings" on public.tally_integration_settings;
drop policy if exists "Allowed users can write tally settings" on public.tally_integration_settings;
drop policy if exists "Allowed users can read tally logs" on public.tally_sync_logs;
drop policy if exists "Allowed users can write tally logs" on public.tally_sync_logs;

create policy "Allowed users can read tally settings" on public.tally_integration_settings
  for select using (
    public.has_module_permission(organization_id, 'customers', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
    or public.has_module_permission(organization_id, 'reports', 'view')
  );

create policy "Allowed users can write tally settings" on public.tally_integration_settings
  for all using (public.has_module_permission(organization_id, 'customers', 'edit'))
  with check (public.has_module_permission(organization_id, 'customers', 'edit'));

create policy "Allowed users can read tally logs" on public.tally_sync_logs
  for select using (
    public.has_module_permission(organization_id, 'customers', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
    or public.has_module_permission(organization_id, 'reports', 'view')
  );

create policy "Allowed users can write tally logs" on public.tally_sync_logs
  for all using (public.has_module_permission(organization_id, 'customers', 'edit'))
  with check (public.has_module_permission(organization_id, 'customers', 'edit'));

create index if not exists tally_sync_logs_organization_started_idx
  on public.tally_sync_logs (organization_id, started_at desc);
