create schema if not exists private;

create or replace function private.ot_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.ot_user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin');
$$;
revoke all on function private.ot_is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.ot_is_admin() to authenticated;

create or replace function private.ot_audit_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.ot_audit_logs(actor_id,table_name,record_id,action,old_data,new_data)
  values((select auth.uid()),tg_table_name,case when tg_op='DELETE' then old.id::text else new.id::text end,tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end);
  return case when tg_op='DELETE' then old else new end;
end;
$$;
revoke all on function private.ot_audit_change() from public, anon, authenticated;

drop trigger if exists ot_workers_audit on public.ot_workers;
create trigger ot_workers_audit after insert or update or delete on public.ot_workers for each row execute function private.ot_audit_change();
drop trigger if exists ot_records_audit on public.ot_records;
create trigger ot_records_audit after insert or update or delete on public.ot_records for each row execute function private.ot_audit_change();

drop policy if exists ot_roles_select_self on public.ot_user_roles;
create policy ot_roles_select_self on public.ot_user_roles for select to authenticated using(user_id=(select auth.uid()) or (select private.ot_is_admin()));
drop policy if exists ot_roles_admin_all on public.ot_user_roles;
create policy ot_roles_admin_all on public.ot_user_roles for all to authenticated using((select private.ot_is_admin())) with check((select private.ot_is_admin()));
drop policy if exists ot_workers_admin_write on public.ot_workers;
create policy ot_workers_admin_write on public.ot_workers for all to authenticated using((select private.ot_is_admin())) with check((select private.ot_is_admin()));
drop policy if exists ot_records_admin_update on public.ot_records;
create policy ot_records_admin_update on public.ot_records for update to authenticated using((select private.ot_is_admin())) with check((select private.ot_is_admin()));
drop policy if exists ot_records_admin_delete on public.ot_records;
create policy ot_records_admin_delete on public.ot_records for delete to authenticated using((select private.ot_is_admin()));
drop policy if exists ot_audit_admin_read on public.ot_audit_logs;
create policy ot_audit_admin_read on public.ot_audit_logs for select to authenticated using((select private.ot_is_admin()));

revoke all on function public.ot_is_admin() from public, anon, authenticated;
revoke all on function public.ot_audit_change() from public, anon, authenticated;
drop function public.ot_is_admin();
drop function public.ot_audit_change();
