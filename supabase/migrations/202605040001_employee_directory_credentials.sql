create table if not exists public.employee_directory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  employee_code text not null,
  full_name text not null,
  login_email text,
  personal_email text,
  phone text,
  whatsapp text,
  department text not null default 'General',
  designation text,
  role public.member_role not null default 'staff',
  reporting_manager text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'part_time', 'contract', 'intern', 'consultant')),
  joining_date date,
  exit_date date,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'on_leave', 'left', 'blocked')),
  app_access_status text not null default 'not_created'
    check (app_access_status in ('not_created', 'invited', 'active', 'blocked', 'disabled')),
  document_folder_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  address text,
  remarks text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_code),
  unique (organization_id, login_email)
);

create index if not exists employee_directory_organization_department_idx
  on public.employee_directory (organization_id, department);

create index if not exists employee_directory_auth_user_idx
  on public.employee_directory (auth_user_id);

create or replace trigger touch_employee_directory_updated_at
  before update on public.employee_directory
  for each row execute function public.touch_updated_at();

alter table public.employee_directory enable row level security;

drop policy if exists "Admins can read employee directory" on public.employee_directory;
drop policy if exists "Admins can manage employee directory" on public.employee_directory;
drop policy if exists "Employees can read own directory row" on public.employee_directory;

create policy "Admins can read employee directory" on public.employee_directory
  for select using (public.is_org_admin(organization_id));

create policy "Employees can read own directory row" on public.employee_directory
  for select using (auth_user_id = auth.uid());

create policy "Admins can manage employee directory" on public.employee_directory
  for all using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
