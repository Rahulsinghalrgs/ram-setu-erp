alter table public.organization_member_permissions
  drop constraint if exists organization_member_permissions_module_key_check;

alter table public.organization_member_permissions
  add constraint organization_member_permissions_module_key_check
    check (module_key in (
      'customers',
      'vendors',
      'products',
      'inventory',
      'field_operations',
      'sales',
      'purchases',
      'invoices',
      'reports'
    ));

create table if not exists public.field_vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_no text not null,
  assigned_user_id uuid references public.profiles(id) on delete set null,
  opening_km numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, vehicle_no)
);

create table if not exists public.field_trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.field_vehicles(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'closed')),
  visit_address text not null,
  purpose text not null,
  checkin_time timestamptz not null default now(),
  checkout_time timestamptz,
  checkin_km numeric(14,2) not null,
  checkout_km numeric(14,2),
  distance_km numeric(14,2) not null default 0,
  checkin_lat numeric(10,6),
  checkin_lng numeric(10,6),
  checkin_accuracy_m numeric(10,2),
  checkout_lat numeric(10,6),
  checkout_lng numeric(10,6),
  checkout_accuracy_m numeric(10,2),
  checkin_photo_name text,
  checkout_photo_name text,
  fuel_filled boolean not null default false,
  fuel_litres numeric(10,2) not null default 0,
  fuel_rate numeric(10,2) not null default 0,
  fuel_bill_photo_name text,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.field_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trip_id uuid references public.field_trips(id) on delete cascade,
  type text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create or replace trigger touch_field_vehicles_updated_at
  before update on public.field_vehicles
  for each row execute function public.touch_updated_at();

create or replace trigger touch_field_trips_updated_at
  before update on public.field_trips
  for each row execute function public.touch_updated_at();

alter table public.field_vehicles enable row level security;
alter table public.field_trips enable row level security;
alter table public.field_exceptions enable row level security;

drop policy if exists "Allowed users can read field vehicles" on public.field_vehicles;
drop policy if exists "Allowed users can write field vehicles" on public.field_vehicles;
create policy "Allowed users can read field vehicles" on public.field_vehicles
  for select using (public.has_module_permission(organization_id, 'field_operations', 'view'));
create policy "Allowed users can write field vehicles" on public.field_vehicles
  for all using (public.has_module_permission(organization_id, 'field_operations', 'edit'))
  with check (public.has_module_permission(organization_id, 'field_operations', 'edit'));

drop policy if exists "Allowed users can read field trips" on public.field_trips;
drop policy if exists "Allowed users can write field trips" on public.field_trips;
create policy "Allowed users can read field trips" on public.field_trips
  for select using (
    public.has_module_permission(organization_id, 'field_operations', 'view')
    or staff_user_id = auth.uid()
  );
create policy "Allowed users can write field trips" on public.field_trips
  for all using (
    public.has_module_permission(organization_id, 'field_operations', 'edit')
    or staff_user_id = auth.uid()
  )
  with check (
    public.has_module_permission(organization_id, 'field_operations', 'edit')
    or staff_user_id = auth.uid()
  );

drop policy if exists "Allowed users can read field exceptions" on public.field_exceptions;
drop policy if exists "Allowed users can write field exceptions" on public.field_exceptions;
create policy "Allowed users can read field exceptions" on public.field_exceptions
  for select using (public.has_module_permission(organization_id, 'field_operations', 'view'));
create policy "Allowed users can write field exceptions" on public.field_exceptions
  for all using (public.has_module_permission(organization_id, 'field_operations', 'edit'))
  with check (public.has_module_permission(organization_id, 'field_operations', 'edit'));
