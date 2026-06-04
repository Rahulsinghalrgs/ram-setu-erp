create extension if not exists "pgcrypto";

create type public.member_role as enum ('owner', 'admin', 'manager', 'staff');
create type public.document_status as enum ('draft', 'sent', 'approved', 'received', 'invoiced', 'paid', 'cancelled');
create type public.inventory_movement_type as enum ('purchase_receipt', 'sale_issue', 'adjustment', 'transfer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gstin text,
  state_code text,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  gstin text,
  state_code text,
  email text,
  phone text,
  billing_address text,
  credit_limit numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  gstin text,
  state_code text,
  email text,
  phone text,
  billing_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  sku text not null,
  name text not null,
  hsn_sac text,
  unit text not null default 'pcs',
  gst_rate numeric(5,2) not null default 18.00,
  sales_price numeric(14,2) not null default 0,
  purchase_price numeric(14,2) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  state_code text,
  address text,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity numeric(14,3) not null,
  reference_type text,
  reference_id uuid,
  notes text,
  moved_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  order_number text not null,
  status public.document_status not null default 'draft',
  order_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  cgst numeric(14,2) not null default 0,
  sgst numeric(14,2) not null default 0,
  igst numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  gst_rate numeric(5,2) not null,
  line_total numeric(14,2) not null
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  order_number text not null,
  status public.document_status not null default 'draft',
  order_date date not null default current_date,
  subtotal numeric(14,2) not null default 0,
  cgst numeric(14,2) not null default 0,
  sgst numeric(14,2) not null default 0,
  igst numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  gst_rate numeric(5,2) not null,
  line_total numeric(14,2) not null
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete restrict,
  vendor_id uuid references public.vendors(id) on delete restrict,
  invoice_number text not null,
  invoice_type text not null check (invoice_type in ('sales', 'purchase')),
  status public.document_status not null default 'draft',
  invoice_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  cgst numeric(14,2) not null default 0,
  sgst numeric(14,2) not null default 0,
  igst numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number),
  check ((customer_id is not null) <> (vendor_id is not null))
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null,
  unit_price numeric(14,2) not null,
  gst_rate numeric(5,2) not null,
  line_total numeric(14,2) not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_date date not null default current_date,
  amount numeric(14,2) not null,
  method text not null default 'bank_transfer',
  reference text,
  created_at timestamptz not null default now()
);

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_organization_with_owner(
  organization_name text,
  organization_gstin text default null,
  organization_state_code text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  created_organization public.organizations;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (name, gstin, state_code, currency)
  values (organization_name, organization_gstin, organization_state_code, 'INR')
  returning * into created_organization;

  insert into public.organization_members (organization_id, user_id, role)
  values (created_organization.id, auth.uid(), 'owner');

  return created_organization;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger touch_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_organizations_updated_at before update on public.organizations
  for each row execute function public.touch_updated_at();
create trigger touch_customers_updated_at before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger touch_vendors_updated_at before update on public.vendors
  for each row execute function public.touch_updated_at();
create trigger touch_products_updated_at before update on public.products
  for each row execute function public.touch_updated_at();
create trigger touch_sales_orders_updated_at before update on public.sales_orders
  for each row execute function public.touch_updated_at();
create trigger touch_purchase_orders_updated_at before update on public.purchase_orders
  for each row execute function public.touch_updated_at();
create trigger touch_invoices_updated_at before update on public.invoices
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customers enable row level security;
alter table public.vendors enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.warehouses enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

create policy "Users can read their profile" on public.profiles
  for select using (id = auth.uid());
create policy "Users can update their profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can read organizations" on public.organizations
  for select using (public.is_org_member(id));
create policy "Authenticated users can create organizations" on public.organizations
  for insert to authenticated with check (true);
create policy "Admins can update organizations" on public.organizations
  for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy "Members can read memberships" on public.organization_members
  for select using (public.is_org_member(organization_id));
create policy "Admins can manage memberships" on public.organization_members
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Org members can read customers" on public.customers
  for select using (public.is_org_member(organization_id));
create policy "Org members can write customers" on public.customers
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read vendors" on public.vendors
  for select using (public.is_org_member(organization_id));
create policy "Org members can write vendors" on public.vendors
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read product categories" on public.product_categories
  for select using (public.is_org_member(organization_id));
create policy "Org members can write product categories" on public.product_categories
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read products" on public.products
  for select using (public.is_org_member(organization_id));
create policy "Org members can write products" on public.products
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read warehouses" on public.warehouses
  for select using (public.is_org_member(organization_id));
create policy "Org members can write warehouses" on public.warehouses
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read inventory movements" on public.inventory_movements
  for select using (public.is_org_member(organization_id));
create policy "Org members can write inventory movements" on public.inventory_movements
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read sales orders" on public.sales_orders
  for select using (public.is_org_member(organization_id));
create policy "Org members can write sales orders" on public.sales_orders
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read sales order items" on public.sales_order_items
  for select using (public.is_org_member(organization_id));
create policy "Org members can write sales order items" on public.sales_order_items
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read purchase orders" on public.purchase_orders
  for select using (public.is_org_member(organization_id));
create policy "Org members can write purchase orders" on public.purchase_orders
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read purchase order items" on public.purchase_order_items
  for select using (public.is_org_member(organization_id));
create policy "Org members can write purchase order items" on public.purchase_order_items
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read invoices" on public.invoices
  for select using (public.is_org_member(organization_id));
create policy "Org members can write invoices" on public.invoices
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read invoice items" on public.invoice_items
  for select using (public.is_org_member(organization_id));
create policy "Org members can write invoice items" on public.invoice_items
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "Org members can read payments" on public.payments
  for select using (public.is_org_member(organization_id));
create policy "Org members can write payments" on public.payments
  for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create index customers_organization_id_idx on public.customers (organization_id);
create index vendors_organization_id_idx on public.vendors (organization_id);
create index products_organization_id_idx on public.products (organization_id);
create index inventory_movements_lookup_idx on public.inventory_movements (organization_id, product_id, warehouse_id);
create index invoices_organization_id_idx on public.invoices (organization_id);
