-- =====================================================================
-- DIGILEX HR — Supabase schema
-- Run this once in your Supabase project: SQL Editor -> New query -> Run.
--
-- Design note: each table keeps the small set of columns that security
-- rules and reporting need as real columns, plus a `data` JSONB column
-- holding the full record in exactly the shape the app already uses.
-- That lets the existing app code keep working unchanged while the
-- database still enforces who may read what.
--
-- SECURITY: Row Level Security is enabled on every table. Without it,
-- the public anon key shipped in the front-end would expose salaries and
-- government ID numbers to anyone. Do not disable RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profiles — links a Supabase Auth user to an employee + their role
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  employee_id text unique not null,
  role        text not null default 'employee' check (role in ('admin', 'employee')),
  created_at  timestamptz not null default now()
);

-- A separate ALTER, not an inline column above: CREATE TABLE IF NOT EXISTS
-- is a no-op against a table that already exists, so this is what actually
-- adds the column when re-running this script against a project that ran
-- an earlier version of it.
alter table public.profiles add column if not exists email text; -- the literal Supabase Auth email for this account (real or synthetic)

alter table public.profiles enable row level security;

-- Helper functions. SECURITY DEFINER so they can read profiles without
-- the caller needing read access to the whole table (which would leak
-- the roster). STABLE so Postgres can cache them within a statement.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_employee_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select employee_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "admin manages profiles" on public.profiles;
create policy "admin manages profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Employees
-- ---------------------------------------------------------------------
create table if not exists public.employees (
  id         text primary key,              -- e.g. DLX-009
  full_name  text,
  department text,
  status     text,
  archived   boolean not null default false,
  data       jsonb  not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.employees enable row level security;

-- Staff may read ONLY their own record (it contains their salary).
drop policy if exists "employee reads own record" on public.employees;
create policy "employee reads own record" on public.employees
  for select using (id = public.my_employee_id());

drop policy if exists "admin manages employees" on public.employees;
create policy "admin manages employees" on public.employees
  for all using (public.is_admin()) with check (public.is_admin());

-- Login lookup: the app needs to turn "Maria Santos" or "DLX-002" into the
-- Supabase Auth email to sign in with, and it has to do that BEFORE the
-- person is authenticated (chicken-and-egg). This view exposes only a name
-- and a login email for active, non-archived employees — never salary,
-- government IDs, or anything from the `data` column. Views run with the
-- privileges of their owner by default, so this intentionally reads across
-- all employees despite the RLS policy above restricting the base table.
-- security_invoker = false is stated explicitly (it is also the default)
-- because this view MUST run with its owner's privileges: the person
-- signing in is still anonymous at that moment, so an invoker-rights
-- view would return zero rows and nobody could ever log in.
create or replace view public.login_directory with (security_invoker = false) as
select
  p.employee_id,
  trim(coalesce(e.data->>'firstName', '') || ' ' || coalesce(e.data->>'lastName', '')) as full_name,
  coalesce(e.data->>'firstName', '') as first_name,
  coalesce(e.data->>'lastName', '')  as last_name,
  p.email
from public.profiles p
join public.employees e on e.id = p.employee_id
where not e.archived;

grant select on public.login_directory to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Attendance — staff clock themselves in/out, and read only their own
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
  id          text primary key,             -- ATT-<employee>-<date>
  employee_id text not null references public.employees(id) on delete cascade,
  work_date   date not null,
  status      text,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (employee_id, work_date)
);

create index if not exists attendance_employee_date_idx
  on public.attendance (employee_id, work_date desc);

alter table public.attendance enable row level security;

drop policy if exists "employee reads own attendance" on public.attendance;
create policy "employee reads own attendance" on public.attendance
  for select using (employee_id = public.my_employee_id());

drop policy if exists "employee clocks self in" on public.attendance;
create policy "employee clocks self in" on public.attendance
  for insert with check (employee_id = public.my_employee_id());

drop policy if exists "employee updates own attendance" on public.attendance;
create policy "employee updates own attendance" on public.attendance
  for update using (employee_id = public.my_employee_id())
          with check (employee_id = public.my_employee_id());

drop policy if exists "admin manages attendance" on public.attendance;
create policy "admin manages attendance" on public.attendance
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Leave requests — staff may file and read their own, but NEVER
--    approve. Only an admin can change status.
-- ---------------------------------------------------------------------
create table if not exists public.leave_requests (
  id          text primary key,
  employee_id text not null references public.employees(id) on delete cascade,
  status      text not null default 'Pending',
  date_from   date,
  date_to     date,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.leave_requests enable row level security;

drop policy if exists "employee reads own leave" on public.leave_requests;
create policy "employee reads own leave" on public.leave_requests
  for select using (employee_id = public.my_employee_id());

-- The status check is what stops someone filing a pre-approved request.
drop policy if exists "employee files own leave" on public.leave_requests;
create policy "employee files own leave" on public.leave_requests
  for insert with check (
    employee_id = public.my_employee_id() and status = 'Pending'
  );

-- Deliberately no UPDATE/DELETE policy for employees: approval is admin-only.
drop policy if exists "admin manages leave" on public.leave_requests;
create policy "admin manages leave" on public.leave_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Payroll — admin only. Staff never read the payroll table; their
--    own payslip is derived in-app from their own attendance.
-- ---------------------------------------------------------------------
create table if not exists public.payroll_runs (
  id         text primary key,
  year       int,
  month      int,
  half       int,
  processed  boolean not null default false,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.payroll_runs enable row level security;

drop policy if exists "admin only payroll" on public.payroll_runs;
create policy "admin only payroll" on public.payroll_runs
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 6. Admin-managed reference tables
-- ---------------------------------------------------------------------
create table if not exists public.performance (
  id          text primary key,
  employee_id text,
  month       text,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.performance enable row level security;

drop policy if exists "employee reads own performance" on public.performance;
create policy "employee reads own performance" on public.performance
  for select using (employee_id = public.my_employee_id());

drop policy if exists "admin manages performance" on public.performance;
create policy "admin manages performance" on public.performance
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.positions (
  id text primary key, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.applicants (
  id text primary key, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.documents (
  id text primary key, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id text primary key, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.positions   enable row level security;
alter table public.applicants  enable row level security;
alter table public.documents   enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "admin only positions" on public.positions;
create policy "admin only positions" on public.positions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only applicants" on public.applicants;
create policy "admin only applicants" on public.applicants
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin only documents" on public.documents;
create policy "admin only documents" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- Company name/address/work hours are needed by every signed-in user.
drop policy if exists "everyone reads settings" on public.app_settings;
create policy "everyone reads settings" on public.app_settings
  for select using (auth.uid() is not null);

drop policy if exists "admin writes settings" on public.app_settings;
create policy "admin writes settings" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Announcements: readable by all signed-in staff, written by admin.
create table if not exists public.announcements (
  id text primary key, data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

drop policy if exists "everyone reads announcements" on public.announcements;
create policy "everyone reads announcements" on public.announcements
  for select using (auth.uid() is not null);

drop policy if exists "admin writes announcements" on public.announcements;
create policy "admin writes announcements" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- AFTER RUNNING THIS:
--
-- 1. Authentication -> Users -> "Add user" -> create your own login
--    (your email + a password). Copy the generated User UID.
--
-- 2. Make yourself the admin AND record your login email, with your
--    real values (this is what lets the app resolve your name to this
--    account before you're signed in):
--
--      insert into public.profiles (id, employee_id, role, email)
--      values ('<paste-your-User-UID>', 'DLX-001', 'admin', '<the email you used in step 1>')
--      on conflict (id) do update set role = excluded.role, email = excluded.email;
--
-- 3. Send me your Project URL and the anon public key from
--    Project Settings -> API, and I'll connect the app to it.
--
-- This script is safe to re-run — every statement either checks "if not
-- exists" first or replaces its own prior version, so running it again
-- (e.g. after a schema update) won't duplicate or destroy anything.
--
-- The anon key is safe to put in front-end code — it is designed for
-- that, and the policies above are what actually protect the data.
-- The service_role key is NOT safe: never paste it into the app or
-- into the repository.
-- =====================================================================
