create table if not exists public.payment_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  bill_key text not null,
  party_name text not null,
  company text,
  bill_no text,
  mode text not null default 'Phone Call',
  status text not null default 'Pending',
  followup_date date not null default current_date,
  promised_pay_date date,
  promised_amount numeric(14,2) not null default 0,
  next_followup_date date,
  remarks text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_followups_org_bill_idx
  on public.payment_followups(organization_id, bill_key, created_at desc);

create index if not exists payment_followups_next_date_idx
  on public.payment_followups(organization_id, next_followup_date)
  where next_followup_date is not null;

create or replace trigger touch_payment_followups_updated_at
  before update on public.payment_followups
  for each row execute function public.touch_updated_at();

alter table public.payment_followups enable row level security;

drop policy if exists "Allowed users can read payment followups" on public.payment_followups;
drop policy if exists "Allowed users can write payment followups" on public.payment_followups;

create policy "Allowed users can read payment followups" on public.payment_followups
  for select using (public.has_module_permission(organization_id, 'invoices', 'view'));

create policy "Allowed users can write payment followups" on public.payment_followups
  for all using (public.has_module_permission(organization_id, 'invoices', 'edit'))
  with check (public.has_module_permission(organization_id, 'invoices', 'edit'));
