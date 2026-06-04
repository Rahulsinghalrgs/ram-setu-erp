create table if not exists public.field_visit_punches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  field_staff_id uuid references public.field_staff(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  staff_name text not null,
  staff_phone text,
  action text not null default 'check_in'
    check (action in ('check_in', 'check_out', 'visit_update', 'fuel_update')),
  visit_address text not null,
  vehicle_no text,
  vehicle_reading numeric(14,2),
  cover_distance numeric(14,2),
  fuel_litres numeric(10,2),
  fuel_rate numeric(10,2),
  gps_lat numeric(10,6) not null,
  gps_lng numeric(10,6) not null,
  gps_accuracy_m numeric(10,2),
  reading_proof_path text,
  fuel_bill_path text,
  selfie_path text,
  comments text,
  device_info text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists field_visit_punches_org_date_idx
  on public.field_visit_punches (organization_id, captured_at desc);

create index if not exists field_visit_punches_user_date_idx
  on public.field_visit_punches (user_id, captured_at desc);

alter table public.field_visit_punches enable row level security;

drop policy if exists "Allowed users can read field visit punches" on public.field_visit_punches;
drop policy if exists "Field staff can insert own visit punches" on public.field_visit_punches;
drop policy if exists "Allowed users can manage field visit punches" on public.field_visit_punches;

create policy "Allowed users can read field visit punches" on public.field_visit_punches
  for select using (
    public.has_module_permission(organization_id, 'field_operations', 'view')
    or user_id = auth.uid()
  );

create policy "Field staff can insert own visit punches" on public.field_visit_punches
  for insert with check (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

create policy "Allowed users can manage field visit punches" on public.field_visit_punches
  for all using (public.has_module_permission(organization_id, 'field_operations', 'edit'))
  with check (public.has_module_permission(organization_id, 'field_operations', 'edit'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'field-visit-proofs',
  'field-visit-proofs',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
