SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
      'categories',
      'transactions',
      'budgets'
  )
ORDER BY table_name;


SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
      'categories',
      'transactions',
      'budgets'
  )
ORDER BY tablename;

SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'categories',
      'transactions',
      'budgets'
  )
ORDER BY tablename, policyname;