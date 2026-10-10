-- Trakoria V1 foundation schema.
-- Supabase Auth (`auth.users`) is the identity source.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(name)) > 0)
);

create unique index categories_user_type_name_unique
  on public.categories (user_id, type, lower(name));

create index categories_user_type_idx
  on public.categories (user_id, type);

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'INR' check (currency = upper(currency)),
  type text not null check (type in ('income', 'expense')),
  transaction_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

create index transactions_user_category_idx
  on public.transactions (user_id, category_id);

create trigger transactions_set_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'INR' check (currency = upper(currency)),
  period text not null check (period in ('weekly', 'monthly', 'yearly', 'custom')),
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create unique index budgets_user_category_period_start_unique
  on public.budgets (user_id, category_id, period, start_date);

create index budgets_user_period_idx
  on public.budgets (user_id, period, start_date desc);

create trigger budgets_set_updated_at
before update on public.budgets
for each row
execute function public.set_updated_at();

create or replace function public.ensure_owned_category_matches_transaction()
returns trigger
language plpgsql
as $$
declare
  category_owner uuid;
  category_type text;
begin
  select user_id, type
    into category_owner, category_type
  from public.categories
  where id = new.category_id;

  if category_owner is null then
    raise exception 'Category does not exist.';
  end if;

  if category_owner <> new.user_id then
    raise exception 'Category does not belong to transaction owner.';
  end if;

  if category_type <> new.type then
    raise exception 'Category type does not match transaction type.';
  end if;

  return new;
end;
$$;

create trigger transactions_category_guard
before insert or update of user_id, category_id, type on public.transactions
for each row
execute function public.ensure_owned_category_matches_transaction();

create or replace function public.ensure_owned_category_matches_budget()
returns trigger
language plpgsql
as $$
declare
  category_owner uuid;
  category_type text;
begin
  select user_id, type
    into category_owner, category_type
  from public.categories
  where id = new.category_id;

  if category_owner is null then
    raise exception 'Category does not exist.';
  end if;

  if category_owner <> new.user_id then
    raise exception 'Category does not belong to budget owner.';
  end if;

  if category_type <> 'expense' then
    raise exception 'Budgets can only be attached to expense categories.';
  end if;

  return new;
end;
$$;

create trigger budgets_category_guard
before insert or update of user_id, category_id on public.budgets
for each row
execute function public.ensure_owned_category_matches_budget();

create or replace function public.create_default_categories_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, is_default)
  values
    (target_user_id, 'Salary', 'income', true),
    (target_user_id, 'Bonus', 'income', true),
    (target_user_id, 'Extra Income', 'income', true),
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
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_default_categories_for_user(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created_create_default_categories
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

create policy categories_select_own
  on public.categories for select
  using (user_id = auth.uid());

create policy categories_insert_own
  on public.categories for insert
  with check (user_id = auth.uid());

create policy categories_update_own
  on public.categories for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy categories_delete_own
  on public.categories for delete
  using (user_id = auth.uid());

create policy transactions_select_own
  on public.transactions for select
  using (user_id = auth.uid());

create policy transactions_insert_own
  on public.transactions for insert
  with check (user_id = auth.uid());

create policy transactions_update_own
  on public.transactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy transactions_delete_own
  on public.transactions for delete
  using (user_id = auth.uid());

create policy budgets_select_own
  on public.budgets for select
  using (user_id = auth.uid());

create policy budgets_insert_own
  on public.budgets for insert
  with check (user_id = auth.uid());

create policy budgets_update_own
  on public.budgets for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy budgets_delete_own
  on public.budgets for delete
  using (user_id = auth.uid());
