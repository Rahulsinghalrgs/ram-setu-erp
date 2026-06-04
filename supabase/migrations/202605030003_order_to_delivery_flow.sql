alter table public.sales_orders
  add column if not exists delivery_date date,
  add column if not exists sales_executive text,
  add column if not exists order_source text,
  add column if not exists priority text not null default 'medium',
  add column if not exists stock_status text not null default 'pending',
  add column if not exists dispatch_status text not null default 'pending',
  add column if not exists billing_status text not null default 'pending',
  add column if not exists delivery_status text not null default 'pending',
  add column if not exists feedback_status text not null default 'pending',
  add column if not exists order_proof_url text,
  add column if not exists dispatch_proof_url text,
  add column if not exists invoice_proof_url text,
  add column if not exists po_url text,
  add column if not exists remarks text,
  add column if not exists payment_check_status text not null default 'pending',
  add column if not exists fms_synced_at timestamptz,
  add column if not exists fms_stage_payload jsonb not null default '{}'::jsonb,
  add column if not exists tally_invoice_number text,
  add column if not exists tally_invoice_guid text,
  add column if not exists tally_synced_at timestamptz;

create index if not exists sales_orders_flow_stage_idx
  on public.sales_orders (organization_id, stock_status, dispatch_status, billing_status, delivery_status);

create index if not exists sales_orders_delivery_date_idx
  on public.sales_orders (organization_id, delivery_date);

create index if not exists sales_orders_tally_invoice_idx
  on public.sales_orders (organization_id, tally_invoice_number);
