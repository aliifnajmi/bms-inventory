-- Add the technician role while preserving existing role assignments.
-- Existing accounts using admin, supervisor, or worker remain valid.
alter table public.ot_user_roles
  drop constraint if exists ot_user_roles_role_check;

alter table public.ot_user_roles
  add constraint ot_user_roles_role_check
  check (role in ('admin','supervisor','technician','worker'));
