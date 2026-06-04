alter table public.sales_orders
  add column if not exists payment_check_status text not null default 'pending',
  add column if not exists fms_synced_at timestamptz,
  add column if not exists fms_stage_payload jsonb not null default '{}'::jsonb,
  add column if not exists tally_invoice_number text,
  add column if not exists tally_invoice_guid text,
  add column if not exists tally_synced_at timestamptz;

create index if not exists sales_orders_tally_invoice_idx
  on public.sales_orders (organization_id, tally_invoice_number);
