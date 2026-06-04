alter table public.customers
  add column if not exists tally_ledger_name text,
  add column if not exists tally_guid text,
  add column if not exists tally_master_id text,
  add column if not exists tally_alter_id text,
  add column if not exists tally_synced_at timestamptz,
  add column if not exists preferred_channel text not null default 'whatsapp',
  add column if not exists whatsapp_opt_in boolean not null default true,
  add column if not exists email_opt_in boolean not null default true,
  add column if not exists payment_followup_enabled boolean not null default true,
  add column if not exists order_received_enabled boolean not null default true,
  add column if not exists order_dispatch_enabled boolean not null default true,
  add column if not exists order_delivered_enabled boolean not null default true,
  add column if not exists product_requirement_enabled boolean not null default true,
  add column if not exists billing_contact_name text,
  add column if not exists billing_contact_phone text,
  add column if not exists billing_contact_email text,
  add column if not exists dispatch_contact_name text,
  add column if not exists dispatch_contact_phone text,
  add column if not exists dispatch_contact_email text,
  add column if not exists escalation_contact_name text,
  add column if not exists escalation_contact_phone text,
  add column if not exists escalation_contact_email text;

create index if not exists customers_tally_guid_idx on public.customers (organization_id, tally_guid);
create index if not exists customers_tally_ledger_name_idx on public.customers (organization_id, tally_ledger_name);
