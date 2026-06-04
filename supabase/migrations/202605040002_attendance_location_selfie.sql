create table if not exists public.attendance_punches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid references public.employee_directory(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_code text,
  employee_name text not null,
  punch_type text not null default 'check_in'
    check (punch_type in ('check_in', 'check_out', 'leave', 'manual_note')),
  captured_at timestamptz not null default now(),
  gps_lat numeric(10,6),
  gps_lng numeric(10,6),
  gps_accuracy_m numeric(10,2),
  location_note text,
  selfie_path text,
  device_info text,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists attendance_punches_org_date_idx
  on public.attendance_punches (organization_id, captured_at desc);

create index if not exists attendance_punches_user_date_idx
  on public.attendance_punches (user_id, captured_at desc);

alter table public.attendance_punches enable row level security;

drop policy if exists "Admins can read attendance punches" on public.attendance_punches;
drop policy if exists "Employees can read own attendance punches" on public.attendance_punches;
drop policy if exists "Employees can insert own attendance punches" on public.attendance_punches;
drop policy if exists "Admins can manage attendance punches" on public.attendance_punches;

create policy "Admins can read attendance punches" on public.attendance_punches
  for select using (public.is_org_admin(organization_id));

create policy "Employees can read own attendance punches" on public.attendance_punches
  for select using (user_id = auth.uid());

create policy "Employees can insert own attendance punches" on public.attendance_punches
  for insert with check (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );

create policy "Admins can manage attendance punches" on public.attendance_punches
  for all using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-selfies',
  'attendance-selfies',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
