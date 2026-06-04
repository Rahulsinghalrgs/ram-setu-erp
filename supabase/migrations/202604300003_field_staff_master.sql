create table if not exists public.field_staff (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.field_trips
  add column if not exists field_staff_id uuid references public.field_staff(id) on delete set null;

create or replace trigger touch_field_staff_updated_at
  before update on public.field_staff
  for each row execute function public.touch_updated_at();

alter table public.field_staff enable row level security;

drop policy if exists "Allowed users can read field staff" on public.field_staff;
drop policy if exists "Allowed users can write field staff" on public.field_staff;

create policy "Allowed users can read field staff" on public.field_staff
  for select using (public.has_module_permission(organization_id, 'field_operations', 'view'));

create policy "Allowed users can write field staff" on public.field_staff
  for all using (public.has_module_permission(organization_id, 'field_operations', 'edit'))
  with check (public.has_module_permission(organization_id, 'field_operations', 'edit'));
