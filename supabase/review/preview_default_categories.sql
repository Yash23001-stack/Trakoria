-- READ-ONLY, UNEXECUTED. Requires the reviewed auth.users/categories tables.
-- Scope matches the separate 003 draft: all users visible to postgres at statement
-- time. Results are aggregate only; do not publish user IDs or category records.
with expected(name, type) as (
  values
    ('Salary', 'income'),
    ('Bonus', 'income'),
    ('Extra Income', 'income'),
    ('Other', 'income'),
    ('Food', 'expense'),
    ('Drink', 'expense'),
    ('Petrol', 'expense'),
    ('Travel', 'expense'),
    ('Shopping', 'expense'),
    ('Bills', 'expense'),
    ('Rent', 'expense'),
    ('Entertainment', 'expense'),
    ('Health', 'expense'),
    ('Other', 'expense')
), missing as (
  select u.id as user_id, e.name, e.type
  from auth.users u
  cross join expected e
  where not exists (
    select 1 from public.categories c
    where c.user_id = u.id and c.type = e.type
      and lower(c.name) = lower(e.name)
  )
)
select 'total'::text as scope, null::text as category_name,
       null::text as category_type, count(distinct user_id) as affected_users,
       count(*) as missing_category_rows
from missing
union all
select 'category', e.name, e.type, count(m.user_id), count(m.user_id)
from expected e
left join missing m on m.name = e.name and m.type = e.type
group by e.name, e.type
order by scope, category_type, category_name;
