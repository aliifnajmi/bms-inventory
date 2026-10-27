create table if not exists public.ot_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','supervisor','worker')),
  created_at timestamptz not null default now()
);

create table if not exists public.ot_workers (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  full_name text not null,
  department text not null default '',
  position text not null default '',
  phone text not null default '',
  email text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.ot_records (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.ot_workers(id) on delete restrict,
  ot_date date not null,
  ot_type text not null default 'Weekday' check (ot_type in ('Weekday','Weekend','Public Holiday')),
  start_time time not null,
  end_time time not null,
  hours numeric(6,2) not null check (hours > 0 and hours <= 24),
  reason text not null,
  remarks text not null default '',
  status text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ot_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ot_records_date_idx on public.ot_records (ot_date desc);
create index if not exists ot_records_worker_idx on public.ot_records (worker_id);
create index if not exists ot_records_status_idx on public.ot_records (status);
create index if not exists ot_audit_logs_created_at_idx on public.ot_audit_logs (created_at desc);

create or replace function public.ot_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.ot_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin');
$$;
revoke all on function public.ot_is_admin() from public, anon;
grant execute on function public.ot_is_admin() to authenticated;

create or replace function public.ot_set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.ot_audit_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.ot_audit_logs (actor_id, table_name, record_id, action, old_data, new_data)
  values ((select auth.uid()), tg_table_name,
    case when tg_op = 'DELETE' then old.id::text else new.id::text end,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists ot_workers_updated_at on public.ot_workers;
create trigger ot_workers_updated_at before update on public.ot_workers for each row execute function public.ot_set_updated_at();
drop trigger if exists ot_records_updated_at on public.ot_records;
create trigger ot_records_updated_at before update on public.ot_records for each row execute function public.ot_set_updated_at();
drop trigger if exists ot_workers_audit on public.ot_workers;
create trigger ot_workers_audit after insert or update or delete on public.ot_workers for each row execute function public.ot_audit_change();
drop trigger if exists ot_records_audit on public.ot_records;
create trigger ot_records_audit after insert or update or delete on public.ot_records for each row execute function public.ot_audit_change();

alter table public.ot_user_roles enable row level security;
alter table public.ot_workers enable row level security;
alter table public.ot_records enable row level security;
alter table public.ot_audit_logs enable row level security;

drop policy if exists ot_roles_select_self on public.ot_user_roles;
create policy ot_roles_select_self on public.ot_user_roles for select to authenticated using (user_id = (select auth.uid()) or (select public.ot_is_admin()));
drop policy if exists ot_roles_admin_all on public.ot_user_roles;
create policy ot_roles_admin_all on public.ot_user_roles for all to authenticated using ((select public.ot_is_admin())) with check ((select public.ot_is_admin()));

drop policy if exists ot_workers_read_authenticated on public.ot_workers;
create policy ot_workers_read_authenticated on public.ot_workers for select to authenticated using (true);
drop policy if exists ot_workers_admin_write on public.ot_workers;
create policy ot_workers_admin_write on public.ot_workers for all to authenticated using ((select public.ot_is_admin())) with check ((select public.ot_is_admin()));

drop policy if exists ot_records_read_authenticated on public.ot_records;
create policy ot_records_read_authenticated on public.ot_records for select to authenticated using (true);
drop policy if exists ot_records_insert_own_pending on public.ot_records;
create policy ot_records_insert_own_pending on public.ot_records for insert to authenticated with check (created_by = (select auth.uid()) and status = 'Pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists ot_records_update_own_pending on public.ot_records;
create policy ot_records_update_own_pending on public.ot_records for update to authenticated using (created_by = (select auth.uid()) and status = 'Pending') with check (created_by = (select auth.uid()) and status = 'Pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists ot_records_admin_update on public.ot_records;
create policy ot_records_admin_update on public.ot_records for update to authenticated using ((select public.ot_is_admin())) with check ((select public.ot_is_admin()));
drop policy if exists ot_records_admin_delete on public.ot_records;
create policy ot_records_admin_delete on public.ot_records for delete to authenticated using ((select public.ot_is_admin()));

drop policy if exists ot_audit_admin_read on public.ot_audit_logs;
create policy ot_audit_admin_read on public.ot_audit_logs for select to authenticated using ((select public.ot_is_admin()));

grant select on public.ot_user_roles, public.ot_workers, public.ot_records, public.ot_audit_logs to authenticated;
grant insert, update, delete on public.ot_user_roles, public.ot_workers, public.ot_records to authenticated;
grant insert on public.ot_audit_logs to authenticated;

insert into public.ot_user_roles (user_id, role)
select id, 'admin' from auth.users where (select count(*) from auth.users) = 1
on conflict (user_id) do nothing;
