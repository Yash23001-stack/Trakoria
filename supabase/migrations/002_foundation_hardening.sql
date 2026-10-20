-- Trakoria foundation hardening; requires the unchanged 001 foundation.
-- PostgreSQL 17+, effective migration role postgres. One-time migration.
-- The pinned runner supplies the per-file transaction and history INSERT.
-- On a fresh installation, contain Data API exposure across 001 and 002:
-- these files are NOT committed atomically together.
-- No existing-user backfill or global default-privilege changes belong here.
-- Approved boundary: preserve service_role table/column administrative access,
-- but deny it direct EXECUTE on all five internal foundation functions.

do $$
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'Trakoria 002 requires PostgreSQL 17 or newer.';
  end if;
  if current_user <> 'postgres' then
    raise exception 'Expected effective migration role postgres.';
  end if;
  if (select count(*) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('categories', 'transactions', 'budgets')
        and c.relkind = 'r' and c.relowner = 'postgres'::regrole
        and c.relrowsecurity and not c.relforcerowsecurity) <> 3 then
    raise exception 'Unexpected foundation table ownership or RLS state.';
  end if;
  if (select count(*) from pg_proc p
      where p.oid in (
        to_regprocedure('public.set_updated_at()'),
        to_regprocedure('public.ensure_owned_category_matches_transaction()'),
        to_regprocedure('public.ensure_owned_category_matches_budget()'),
        to_regprocedure('public.create_default_categories_for_user(uuid)'),
        to_regprocedure('public.handle_new_auth_user()'))
        and p.prokind = 'f' and p.proowner = 'postgres'::regrole) <> 5
     or (select count(*) from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in (
           'set_updated_at', 'ensure_owned_category_matches_transaction',
           'ensure_owned_category_matches_budget',
           'create_default_categories_for_user', 'handle_new_auth_user')) <> 5 then
    raise exception 'Unexpected foundation function ownership or overloads.';
  end if;
  if not exists (select 1 from pg_roles
                 where rolname = 'service_role' and rolbypassrls) then
    raise exception 'Review service_role RLS dependencies before hardening.';
  end if;
  if exists (select 1 from pg_roles r
             where r.rolname in ('anon', 'authenticated') and (
               r.rolsuper or r.rolbypassrls
               or pg_has_role(r.oid, 'postgres'::regrole, 'USAGE')
               or pg_has_role(r.oid, 'postgres'::regrole, 'SET')
               or pg_has_role(r.oid, 'service_role'::regrole, 'USAGE')
               or pg_has_role(r.oid, 'service_role'::regrole, 'SET'))) then
    raise exception 'Unexpected ordinary API role escalation path.';
  end if;
end;
$$;

-- Snapshot effective table/column administrative access before removing PUBLIC grants.
-- Table ACL revocation also affects corresponding column grants. Restore only
-- rights that service_role already has; assert exact equivalence at the end.
-- This transaction-local table disappears on commit or rollback.
create temporary table trakoria_002_service_acl on commit drop as
select 'table'::text as object_kind, c.oid as object_oid,
       null::smallint as column_number, null::text as column_name,
       v.privilege, has_table_privilege('service_role', c.oid, v.privilege) as allowed
from pg_class c
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                  ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) v(privilege)
where c.oid in (to_regclass('public.categories'),
                to_regclass('public.transactions'), to_regclass('public.budgets'))
union all
select 'column', a.attrelid, a.attnum, a.attname::text, v.privilege,
       has_column_privilege('service_role', a.attrelid, a.attnum, v.privilege)
from pg_attribute a
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')) v(privilege)
where a.attrelid in (to_regclass('public.categories'),
                    to_regclass('public.transactions'), to_regclass('public.budgets'))
  and a.attnum > 0 and not a.attisdropped;

create or replace function public.create_default_categories_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
  insert into public.categories (user_id, name, type, is_default)
  values
    (target_user_id, 'Salary', 'income', true),
    (target_user_id, 'Bonus', 'income', true),
    (target_user_id, 'Extra Income', 'income', true),
    (target_user_id, 'Other', 'income', true),
    (target_user_id, 'Food', 'expense', true),
    (target_user_id, 'Drink', 'expense', true),
    (target_user_id, 'Petrol', 'expense', true),
    (target_user_id, 'Travel', 'expense', true),
    (target_user_id, 'Shopping', 'expense', true),
    (target_user_id, 'Bills', 'expense', true),
    (target_user_id, 'Rent', 'expense', true),
    (target_user_id, 'Entertainment', 'expense', true),
    (target_user_id, 'Health', 'expense', true),
    (target_user_id, 'Other', 'expense', true)
  on conflict (user_id, type, (lower(name))) do nothing;
end;
$$;

alter function public.handle_new_auth_user() security definer;
alter function public.handle_new_auth_user() set search_path = pg_catalog, pg_temp;
alter function public.set_updated_at() security invoker;
alter function public.set_updated_at() set search_path = pg_catalog, pg_temp;
alter function public.ensure_owned_category_matches_transaction() security invoker;
alter function public.ensure_owned_category_matches_transaction()
  set search_path = pg_catalog, pg_temp;
alter function public.ensure_owned_category_matches_budget() security invoker;
alter function public.ensure_owned_category_matches_budget()
  set search_path = pg_catalog, pg_temp;

-- Ownership of public/auth schemas is independent of new object ownership.
-- Same trusted function/table owner preserves signup without client EXECUTE.
grant usage on schema public to postgres;
grant select, insert on table public.categories to postgres;
grant execute on function
  public.set_updated_at(),
  public.ensure_owned_category_matches_transaction(),
  public.ensure_owned_category_matches_budget(),
  public.create_default_categories_for_user(uuid),
  public.handle_new_auth_user()
to postgres;

-- Only postgres retains direct execution for the trusted signup-trigger path.
-- service_role table/column rights, including PUBLIC-derived rights, are preserved
-- separately below; internal function execution is intentionally not preserved.
revoke all privileges on function
  public.set_updated_at(),
  public.ensure_owned_category_matches_transaction(),
  public.ensure_owned_category_matches_budget(),
  public.create_default_categories_for_user(uuid),
  public.handle_new_auth_user()
from public, anon, authenticated, authenticator, service_role;

revoke all privileges
on table public.categories, public.transactions, public.budgets
from public, anon, authenticated, authenticator;
grant usage on schema public to authenticated;
grant select on table public.categories to authenticated;
grant select, insert, update, delete
on table public.transactions, public.budgets to authenticated;

do $$
declare
  saved record;
begin
  for saved in select * from pg_temp.trakoria_002_service_acl where allowed loop
    if saved.object_kind = 'table' then
      execute format('grant %s on table %s to service_role',
                     saved.privilege, saved.object_oid::regclass);
    elsif not exists (
      select 1 from pg_temp.trakoria_002_service_acl t
      where t.object_kind = 'table' and t.object_oid = saved.object_oid
        and t.privilege = saved.privilege and t.allowed
    ) then
      execute format('grant %s (%I) on table %s to service_role',
                     saved.privilege, saved.column_name, saved.object_oid::regclass);
    end if;
  end loop;
end;
$$;

drop policy categories_insert_own on public.categories;
drop policy categories_update_own on public.categories;
drop policy categories_delete_own on public.categories;
alter policy categories_select_own on public.categories to authenticated
  using (user_id = auth.uid());
alter policy transactions_select_own on public.transactions to authenticated
  using (user_id = auth.uid());
alter policy transactions_insert_own on public.transactions to authenticated
  with check (user_id = auth.uid());
alter policy transactions_update_own on public.transactions to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter policy transactions_delete_own on public.transactions to authenticated
  using (user_id = auth.uid());
alter policy budgets_select_own on public.budgets to authenticated
  using (user_id = auth.uid());
alter policy budgets_insert_own on public.budgets to authenticated
  with check (user_id = auth.uid());
alter policy budgets_update_own on public.budgets to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter policy budgets_delete_own on public.budgets to authenticated
  using (user_id = auth.uid());

-- Effective checks catch inherited grants; direct ACL inspection is insufficient.
do $$
begin
  if (select count(*) from pg_policies where schemaname = 'public'
      and tablename in ('categories', 'transactions', 'budgets')) <> 9 then
    raise exception 'Unexpected financial policies require reconciliation.';
  end if;
  if exists (select 1 from pg_temp.trakoria_002_service_acl s
             where s.allowed is distinct from case s.object_kind
               when 'table' then has_table_privilege('service_role', s.object_oid, s.privilege)
               when 'column' then has_column_privilege(
                 'service_role', s.object_oid, s.column_number, s.privilege)
             end) then
    raise exception 'Effective service_role table/column access changed.';
  end if;
  if exists (select 1 from pg_roles r
             cross join pg_proc p
             where r.rolname in ('anon', 'authenticated', 'authenticator', 'service_role')
               and p.oid in (
                 to_regprocedure('public.set_updated_at()'),
                 to_regprocedure('public.ensure_owned_category_matches_transaction()'),
                 to_regprocedure('public.ensure_owned_category_matches_budget()'),
                 to_regprocedure('public.create_default_categories_for_user(uuid)'),
                 to_regprocedure('public.handle_new_auth_user()'))
               and has_function_privilege(r.oid, p.oid, 'EXECUTE')) then
    raise exception 'Unexpected API/service_role foundation function execution.';
  end if;
  if exists (select 1 from pg_roles r
             cross join pg_temp.trakoria_002_service_acl s
             where r.rolname in ('anon', 'authenticated')
               and s.object_kind = 'table'
               and has_table_privilege(r.oid, s.object_oid, s.privilege)
                 is distinct from (
                   r.rolname = 'authenticated' and (
                     s.privilege = 'SELECT' or (
                       s.object_oid <> 'public.categories'::regclass
                       and s.privilege in ('INSERT', 'UPDATE', 'DELETE'))))) then
    raise exception 'Unexpected effective ordinary API table privileges.';
  end if;
  if exists (select 1 from pg_roles r
             cross join pg_temp.trakoria_002_service_acl s
             where r.rolname in ('anon', 'authenticated')
               and s.object_kind = 'column'
               and has_column_privilege(r.oid, s.object_oid, s.column_number, s.privilege)
                 is distinct from (
                   r.rolname = 'authenticated' and (
                     s.privilege = 'SELECT' or (
                       s.object_oid <> 'public.categories'::regclass
                       and s.privilege in ('INSERT', 'UPDATE'))))) then
    raise exception 'Unexpected effective ordinary API column privileges.';
  end if;
  if not has_function_privilege('postgres',
       'public.create_default_categories_for_user(uuid)', 'EXECUTE')
     or not has_function_privilege('postgres', 'public.handle_new_auth_user()', 'EXECUTE')
     or not has_table_privilege('postgres', 'public.categories', 'INSERT')
     or not has_table_privilege('postgres', 'public.categories', 'SELECT') then
    raise exception 'Trusted signup seeding privileges are missing.';
  end if;
end;
$$;
