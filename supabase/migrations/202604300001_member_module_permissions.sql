create table if not exists public.organization_member_permissions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, module_key),
  constraint organization_member_permissions_module_key_check
    check (module_key in ('customers', 'vendors', 'products', 'inventory', 'sales', 'purchases', 'invoices', 'reports'))
);

create or replace trigger touch_organization_member_permissions_updated_at
  before update on public.organization_member_permissions
  for each row execute function public.touch_updated_at();

alter table public.organization_member_permissions enable row level security;

create or replace function public.has_module_permission(
  target_organization_id uuid,
  target_module_key text,
  target_action text default 'view'
)
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
  )
  or exists (
    select 1
    from public.organization_member_permissions
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and module_key = target_module_key
      and case
        when target_action = 'edit' then can_edit
        else can_view
      end
  );
$$;

drop policy if exists "Members can read member permissions" on public.organization_member_permissions;
drop policy if exists "Admins can manage member permissions" on public.organization_member_permissions;

create policy "Members can read own member permissions" on public.organization_member_permissions
  for select using (user_id = auth.uid() or public.is_org_admin(organization_id));
create policy "Admins can manage member permissions" on public.organization_member_permissions
  for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

drop policy if exists "Members can read memberships" on public.organization_members;
create policy "Members can read own membership" on public.organization_members
  for select using (user_id = auth.uid() or public.is_org_admin(organization_id));

drop policy if exists "Org members can read customers" on public.customers;
drop policy if exists "Org members can write customers" on public.customers;
create policy "Allowed users can read customers" on public.customers
  for select using (public.has_module_permission(organization_id, 'customers', 'view'));
create policy "Allowed users can write customers" on public.customers
  for all using (public.has_module_permission(organization_id, 'customers', 'edit'))
  with check (public.has_module_permission(organization_id, 'customers', 'edit'));

drop policy if exists "Org members can read vendors" on public.vendors;
drop policy if exists "Org members can write vendors" on public.vendors;
create policy "Allowed users can read vendors" on public.vendors
  for select using (public.has_module_permission(organization_id, 'vendors', 'view'));
create policy "Allowed users can write vendors" on public.vendors
  for all using (public.has_module_permission(organization_id, 'vendors', 'edit'))
  with check (public.has_module_permission(organization_id, 'vendors', 'edit'));

drop policy if exists "Org members can read product categories" on public.product_categories;
drop policy if exists "Org members can write product categories" on public.product_categories;
create policy "Allowed users can read product categories" on public.product_categories
  for select using (public.has_module_permission(organization_id, 'products', 'view'));
create policy "Allowed users can write product categories" on public.product_categories
  for all using (public.has_module_permission(organization_id, 'products', 'edit'))
  with check (public.has_module_permission(organization_id, 'products', 'edit'));

drop policy if exists "Org members can read products" on public.products;
drop policy if exists "Org members can write products" on public.products;
create policy "Allowed users can read products" on public.products
  for select using (public.has_module_permission(organization_id, 'products', 'view'));
create policy "Allowed users can write products" on public.products
  for all using (public.has_module_permission(organization_id, 'products', 'edit'))
  with check (public.has_module_permission(organization_id, 'products', 'edit'));

drop policy if exists "Org members can read warehouses" on public.warehouses;
drop policy if exists "Org members can write warehouses" on public.warehouses;
create policy "Allowed users can read warehouses" on public.warehouses
  for select using (public.has_module_permission(organization_id, 'inventory', 'view'));
create policy "Allowed users can write warehouses" on public.warehouses
  for all using (public.has_module_permission(organization_id, 'inventory', 'edit'))
  with check (public.has_module_permission(organization_id, 'inventory', 'edit'));

drop policy if exists "Org members can read inventory movements" on public.inventory_movements;
drop policy if exists "Org members can write inventory movements" on public.inventory_movements;
create policy "Allowed users can read inventory movements" on public.inventory_movements
  for select using (public.has_module_permission(organization_id, 'inventory', 'view'));
create policy "Allowed users can write inventory movements" on public.inventory_movements
  for all using (public.has_module_permission(organization_id, 'inventory', 'edit'))
  with check (public.has_module_permission(organization_id, 'inventory', 'edit'));

drop policy if exists "Org members can read sales orders" on public.sales_orders;
drop policy if exists "Org members can write sales orders" on public.sales_orders;
create policy "Allowed users can read sales orders" on public.sales_orders
  for select using (public.has_module_permission(organization_id, 'sales', 'view'));
create policy "Allowed users can write sales orders" on public.sales_orders
  for all using (public.has_module_permission(organization_id, 'sales', 'edit'))
  with check (public.has_module_permission(organization_id, 'sales', 'edit'));

drop policy if exists "Org members can read sales order items" on public.sales_order_items;
drop policy if exists "Org members can write sales order items" on public.sales_order_items;
create policy "Allowed users can read sales order items" on public.sales_order_items
  for select using (public.has_module_permission(organization_id, 'sales', 'view'));
create policy "Allowed users can write sales order items" on public.sales_order_items
  for all using (public.has_module_permission(organization_id, 'sales', 'edit'))
  with check (public.has_module_permission(organization_id, 'sales', 'edit'));

drop policy if exists "Org members can read purchase orders" on public.purchase_orders;
drop policy if exists "Org members can write purchase orders" on public.purchase_orders;
create policy "Allowed users can read purchase orders" on public.purchase_orders
  for select using (public.has_module_permission(organization_id, 'purchases', 'view'));
create policy "Allowed users can write purchase orders" on public.purchase_orders
  for all using (public.has_module_permission(organization_id, 'purchases', 'edit'))
  with check (public.has_module_permission(organization_id, 'purchases', 'edit'));

drop policy if exists "Org members can read purchase order items" on public.purchase_order_items;
drop policy if exists "Org members can write purchase order items" on public.purchase_order_items;
create policy "Allowed users can read purchase order items" on public.purchase_order_items
  for select using (public.has_module_permission(organization_id, 'purchases', 'view'));
create policy "Allowed users can write purchase order items" on public.purchase_order_items
  for all using (public.has_module_permission(organization_id, 'purchases', 'edit'))
  with check (public.has_module_permission(organization_id, 'purchases', 'edit'));

drop policy if exists "Org members can read invoices" on public.invoices;
drop policy if exists "Org members can write invoices" on public.invoices;
create policy "Allowed users can read invoices" on public.invoices
  for select using (public.has_module_permission(organization_id, 'invoices', 'view'));
create policy "Allowed users can write invoices" on public.invoices
  for all using (public.has_module_permission(organization_id, 'invoices', 'edit'))
  with check (public.has_module_permission(organization_id, 'invoices', 'edit'));

drop policy if exists "Org members can read invoice items" on public.invoice_items;
drop policy if exists "Org members can write invoice items" on public.invoice_items;
create policy "Allowed users can read invoice items" on public.invoice_items
  for select using (public.has_module_permission(organization_id, 'invoices', 'view'));
create policy "Allowed users can write invoice items" on public.invoice_items
  for all using (public.has_module_permission(organization_id, 'invoices', 'edit'))
  with check (public.has_module_permission(organization_id, 'invoices', 'edit'));

drop policy if exists "Org members can read payments" on public.payments;
drop policy if exists "Org members can write payments" on public.payments;
create policy "Allowed users can read payments" on public.payments
  for select using (public.has_module_permission(organization_id, 'invoices', 'view'));
create policy "Allowed users can write payments" on public.payments
  for all using (public.has_module_permission(organization_id, 'invoices', 'edit'))
  with check (public.has_module_permission(organization_id, 'invoices', 'edit'));
