# Supabase foundation execution checklist

Status: local review package only, 2026-10-20. No hosted execution is authorized.
Keep `supabase/migrations/001_initial_schema.sql` unchanged. Git history records
its introduction in `4fdba79`; the development log records prior local application.
An absent intended-project ledger does not establish global migration history.

## Package and intentional boundaries

- `supabase/migrations/002_foundation_hardening.sql` follows unchanged 001.
- `supabase/review/preview_default_categories.sql` is aggregate, read-only SQL.
- `supabase/review/003_backfill_default_categories.sql.draft` is NOT a discovered
  migration. Separate approval is required before promoting a reviewed copy.
- 002 requires PostgreSQL 17+, effective role postgres, postgres-owned foundation
  objects, RLS enabled without FORCE, and the reviewed original foundation.
- Schema ownership is independent: public remains pg_database_owner-owned and
  auth remains supabase_admin-owned. 002 changes neither schema/object owners nor
  global default ACLs. The runtime guard is in 002, not before 001.
- Ordinary authenticated users get categories SELECT and transactions/budgets
  CRUD under owner policies. Anon gets no financial access. Nine policies remain.
- Five functions use `pg_catalog, pg_temp`; two definers retain the trusted
  postgres execution path. The existing Auth trigger is not dropped/recreated.
- **service_role table/column access is preserved; internal function EXECUTE is
  revoked by explicit approval.** A transaction-local snapshot covers effective
  table and column privileges only. Rights
  formerly obtained through PUBLIC are restored explicitly only when previously
  available. Final assertions compare every saved privilege. BYPASSRLS is required
  for service_role so narrowing application policies does not change its row access.
  No function execution is snapshotted or restored. Effective EXECUTE on all five
  internal functions must be denied to anon, authenticated, authenticator and
  service_role; inherited grants cause 002 to fail rather than silently retain
  seeder access. Do not expose a service-role key to browsers/Render.
- The shared postgres owner retains explicit EXECUTE on all five functions and
  category SELECT/INSERT. Auth inserts invoke the existing definer handler, whose
  nested call runs as postgres and invokes the postgres-owned definer seeder.
  Installed trigger invocation does not need direct API/service_role EXECUTE.
  This path is statically reviewed, not verified by PostgreSQL execution.
- The helper adds income Other; no existing Auth user is backfilled by 002.
- Category types cannot be changed by ordinary API roles. Trusted administrative
  changes remain possible and must preserve child-row integrity.

## Remaining blockers, in priority order

1. Approve coordinated containment: stop Trakoria financial traffic at its backend
   ingress/service boundary (including direct callers and any writers), and block
   intended-project Data API exposure across 001 and 002. Disabling that project's
   API does NOT contain Render traffic still sent to the other project. Keep Auth
   enabled; do not revoke shared project keys or disrupt unrelated integrations.
2. Review complete default ACL/membership conclusions and the final effective ACL
   expectations. The service_role function decision is resolved: direct internal
   execution is revoked, while existing table/column administrative access remains.
   No additional service_role EXECUTE exception or dependency approval is required.
3. Verify actual pinned CLI artifact, selected connection path, and effective role.
   SQL Editor identity and Management API queries do not prove the migration
   connection identity. Pinned source documents postgres step-down on its linked
   temporary-login/supabase_admin paths. Establish that the actual invocation uses
   that path; if pre-001 runtime proof is required, approve a same-connection
   bootstrap guard mechanism separately. Do not pretend 002's guard protects 001.
4. Confirm postgres Auth USAGE/REFERENCES/TRIGGER privileges and authenticated
   auth.uid() execution, no ordinary API escalation path, and no conflicting
   explicit index names. Supplied checks already established PG17.11, prerequisites,
   absent financial tables/functions/queried ledger and disabled event triggers;
   do not repeat unrelated inventory. Keep DDL actors quiescent during application.
5. Review recovery capability, exact pending artifacts and installation history.
   Never use resets, --include-all, or migration repair to bypass unexplained state.
6. After 002, separately approve aggregate backfill preview, ALL-user scope,
   transaction volume and forward-recovery limitations before preparing 003.

## Read-only preflight fragments (not executed)

Run the existing reviewed catalog inventory privately; report conclusions, not
credentials, user IDs, raw function/history bodies or financial records. These
checks supplement the manually supplied results; they are not verified outcomes.

```sql
select has_schema_privilege('postgres', 'auth', 'USAGE') as auth_usage,
       has_column_privilege('postgres', 'auth.users', 'id', 'REFERENCES') as auth_reference,
       has_table_privilege('postgres', 'auth.users', 'TRIGGER') as auth_trigger,
       has_schema_privilege('authenticated', 'auth', 'USAGE') as client_auth_usage,
       has_function_privilege('authenticated', 'auth.uid()', 'EXECUTE') as client_auth_uid;

select c.relname, c.relkind
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in (
  'categories_user_type_name_unique', 'categories_user_type_idx',
  'transactions_user_date_idx', 'transactions_user_category_idx',
  'budgets_user_category_period_start_unique', 'budgets_user_period_idx')
order by c.relname;
```

The index query must return zero rows before 001; any relation kind can conflict.
An index collision inside compatible 001 fails its batch rather than skipping it.

## Pinned command sequence — future approval only

Nothing below was run. Use existing approved operator authentication; never put
credentials on command lines. No CLI linking or login is performed by this package.
Replace only the non-secret project-reference placeholder after privately checking
the intended project/branch. The npm --yes flag permits package acquisition; no
Supabase auto-confirm flag is used. Stop unless the version reports 2.120.0.

```powershell
Set-Location -LiteralPath 'C:\Yash Personal\Trakoria'
$TrakoriaProjectRef = '<approved-intended-project-reference>'
npx.cmd --yes --package=supabase@2.120.0 -- supabase --version
npx.cmd --yes --package=supabase@2.120.0 -- supabase db push --help
npx.cmd --yes --package=supabase@2.120.0 -- supabase migration list --linked --project-ref $TrakoriaProjectRef
npx.cmd --yes --package=supabase@2.120.0 -- supabase db push --linked --project-ref $TrakoriaProjectRef --skip-vault --dry-run
```

Approve only a plan containing the reviewed 001 and 002, with containment in place.
If the target has 001 already installed, reconcile definitions/history and expect
only 002. Do not promote 003 yet. After a separate hosted-application approval:

```powershell
npx.cmd --yes --package=supabase@2.120.0 -- supabase db push --linked --project-ref $TrakoriaProjectRef --skip-vault
npx.cmd --yes --package=supabase@2.120.0 -- supabase migration list --linked --project-ref $TrakoriaProjectRef
```

Reference behavior (source reviewed in the investigation, not a tested local binary):
[pinned db push side effects](https://raw.githubusercontent.com/supabase/cli/v2.120.0/apps/cli/src/commands/db/push/SIDE_EFFECTS.md).
The runner provisions history infrastructure separately and batches compatible
SQL plus each file's history INSERT. **There is no cross-file atomicity.** These
files contain no explicit transaction control or pipeline-incompatible operations.
The temporary ACL snapshot requires this per-file transaction; do not run 002
statement-by-statement in the SQL Editor. --skip-vault excludes Vault sync;
do not add --include-seed, --include-roles, --include-all or --yes to Supabase.

## Backfill approval

Only after tables exist and 002 is verified, review the aggregate preview file.
Scope is all auth.users visible to postgres at statement time: no provider,
confirmation, activity or account-status filters. Approve that scope explicitly,
or design a private fixed cohort first. Counts can change between statements.
Matching lower(name)/type/user categories count as present irrespective of
is_default; no existing row is renamed, updated, reclassified or removed.
Unique-conflict DO NOTHING handles concurrent matching inserts. Whitespace variants
are not merged. If no gaps exist, no mutation is required. Large volumes need a
separate batching plan. There is no durable inserted-ID rollback journal.
After separate approval, promote only the reviewed draft as migration 003, repeat
the dry-run, and accept only 003 as pending. Do not add it to the first push.

## Post-migration verification and recovery

- Verify recorded 001/002 (003 only if separately approved), three postgres-owned
  tables, valid constraints, six explicit plus three PK indexes, five functions,
  six non-internal foundation triggers, and nine financial policies. Counts alone
  do not verify definitions. Disabled DDL event triggers are a separate class.
- Verify two definers/three invokers, all trusted paths, handler/helper owner and
  execution chain, effective ordinary API ACLs (including columns/inheritance),
  and service_role table/column baseline preservation. Verify effective EXECUTE
  denial for service_role as well as ordinary API roles on all five functions;
  preserve trusted postgres execution. Retain RLS on all three tables.
- Check owner FK/category relationships and duplicate groups privately. After an
  approved backfill, confirm zero proposed-default gaps for the approved scope.
- Runtime trigger, SQL syntax/permissions and hosted RLS behavior remain untested
  by local source-contract tests. Do not call the seeder RPC as a smoke test.
- If 001 fails, inspect schema/history before retrying. If 001 succeeds and 002
  fails, 001 remains installed/recorded; keep containment, fix the reviewed 002
  issue and inspect the next pending plan. History infrastructure may remain even
  if an initial file fails. Never drop tables or repair history merely to proceed.
- After commit, prefer forward correction. Do not blanket-delete default rows:
  category deletion may cascade budgets or hit transaction restrictions. Do not
  restore PUBLIC helper EXECUTE or drop Supabase-managed objects/pgcrypto.

## Configuration cutover and smoke order

1. Keep the wrong-project financial traffic gate in place. Independently verify
   frontend project and API base configuration; Auth can remain available.
2. After DB/default readiness, restore intended Data API exposure under approval.
3. Stage Render URL/public-key pair together; stage frontend project/public key and
   API base, rebuild Vite and coordinate release. Do not add service-role keys or
   weaken JWT issuer/JWKS checks. Verify RS256/ES256 signing compatibility.
4. Under the gate, use an intended-project session: healthz 200, auth/me without
   bearer 401, auth/me with valid session 200; then secure data/budgets/export/
   backup GETs succeed with no PGRST205. Old-project tokens should fail. Report only
   pass/fail; do not log response records or credentials. Release traffic afterward.
5. Signup and financial-write tests require separate isolated-account/data approval.
   One operator/tab/submission; inspect request and resulting row counts privately.
   If a POST times out, read before retrying. Transactions have no proven idempotency
   key. Disabled Save buttons and budget uniqueness are not exactly-once delivery.

BUG mapping: only TRK-BUG-001 (sanitized warning diagnostics) is defined in the
repository. Keep its allowlisted logs intact during smoke verification. BUG-002
schema-readiness and BUG-003 project/write-path mappings remain provisional until
their acceptance criteria are supplied; this package does not close those bugs.

## Offline tests and limits

```powershell
$env:PYTEST_DISABLE_PLUGIN_AUTOLOAD = '1'
.\backend\.venv\Scripts\python.exe -B -m pytest supabase/tests/test_migration_package.py -q -p no:cacheprovider --confcutdir=supabase/tests
```

Tests read SQL source and check security contracts, category sets and packaging;
they block socket connections and avoid backend conftest/application imports.
They do not parse/execute SQL or prove PostgreSQL privileges or signup behavior.
Existing foundation tests continue to describe unchanged 001's original policies;
the new suite describes 002's final policies rather than rewriting that history.
