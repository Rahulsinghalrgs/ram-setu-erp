alter table public.customers
  add column if not exists client_code text,
  add column if not exists contact_person text,
  add column if not exists designation text,
  add column if not exists whatsapp text,
  add column if not exists alternate_phone text,
  add column if not exists website text,
  add column if not exists pan text,
  add column if not exists udyam text,
  add column if not exists client_type text not null default 'buyer',
  add column if not exists industry text,
  add column if not exists source text,
  add column if not exists owner_name text,
  add column if not exists city text,
  add column if not exists state_name text,
  add column if not exists pincode text,
  add column if not exists country text not null default 'India',
  add column if not exists shipping_address text,
  add column if not exists credit_days integer not null default 0,
  add column if not exists payment_terms text,
  add column if not exists opening_outstanding numeric(14,2) not null default 0,
  add column if not exists outstanding_as_of date,
  add column if not exists status text not null default 'active',
  add column if not exists priority text not null default 'medium',
  add column if not exists last_contact_date date,
  add column if not exists next_follow_up_date date,
  add column if not exists remarks text;

create index if not exists customers_client_code_idx on public.customers (organization_id, client_code);
create index if not exists customers_status_idx on public.customers (organization_id, status);
create index if not exists customers_next_follow_up_idx on public.customers (organization_id, next_follow_up_date);
