create table if not exists public.client_ledger_share_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  token text not null unique,
  client_name text not null,
  tally_ledger_name text,
  period_from date,
  period_to date,
  outstanding_amount numeric(14,2) not null default 0,
  outstanding_as_of date,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  last_opened_at timestamptz
);

create index if not exists client_ledger_share_links_org_created_idx
  on public.client_ledger_share_links (organization_id, created_at desc);

create index if not exists client_ledger_share_links_customer_idx
  on public.client_ledger_share_links (organization_id, customer_id, created_at desc);

alter table public.client_ledger_share_links enable row level security;

drop policy if exists "Allowed users can read client ledger links" on public.client_ledger_share_links;
drop policy if exists "Allowed users can write client ledger links" on public.client_ledger_share_links;

create policy "Allowed users can read client ledger links" on public.client_ledger_share_links
  for select using (
    public.has_module_permission(organization_id, 'customers', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
  );

create policy "Allowed users can write client ledger links" on public.client_ledger_share_links
  for all using (
    public.has_module_permission(organization_id, 'customers', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
  )
  with check (
    public.has_module_permission(organization_id, 'customers', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
  );

drop policy if exists "Allowed users can read communication logs" on public.communication_logs;
drop policy if exists "Allowed users can write communication logs" on public.communication_logs;

create policy "Allowed users can read communication logs" on public.communication_logs
  for select using (
    public.has_module_permission(organization_id, 'customers', 'view')
    or public.has_module_permission(organization_id, 'invoices', 'view')
    or public.has_module_permission(organization_id, 'reports', 'view')
  );

create policy "Allowed users can write communication logs" on public.communication_logs
  for all using (
    public.has_module_permission(organization_id, 'customers', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
    or public.has_module_permission(organization_id, 'reports', 'edit')
  )
  with check (
    public.has_module_permission(organization_id, 'customers', 'edit')
    or public.has_module_permission(organization_id, 'invoices', 'edit')
    or public.has_module_permission(organization_id, 'reports', 'edit')
  );
