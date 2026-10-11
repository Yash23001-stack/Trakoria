# Development Log

## 2026-10-07

### T-001 Implementation Status

- Backend code was migrated into `backend/`.
- React frontend was migrated from JSX to TypeScript/TSX.
- Frontend structure was organized into `components/`, `pages/`, `layouts/`, `hooks/`, `services/`, `types/`, and `utils/`.
- V1 dashboard UX updates were implemented:
  - prominent `+ Add Txn` action
  - honest empty states
  - improved contrast
  - more consistent KPI hierarchy
  - clearer Import and Export sections
  - Indian currency formatting
- Initial Add Transaction UI was implemented for income and expense transactions with category, amount, date, and optional note.
- Supabase authentication and PostgreSQL were not implemented.
- Telegram support was preserved.

### T-001 Verification Status

- Frontend build passed.
- Frontend lint passed.
- TypeScript check passed.
- Backend compile/import checks passed.
- FastAPI `/api/data` startup/data check passed with the configured `.env` PIN.
- Manual browser click-through was not performed.
- A real Add Transaction submit against the user's live database was not performed.

### T-002 Test Structure And Coverage

- Frontend tests were added under `frontend/src/__tests__/`.
- Frontend test setup was added under `frontend/src/test/`.
- Backend tests were added under `tests/backend/`.
- Backend test configuration was added in `pytest.ini`.
- Backend tests use a per-test temporary SQLite database by monkeypatching `backend.db.DB_NAME`.
- The user's real `expenses.db` is not used or mutated by the backend tests.

### Tests Added

Frontend Add Transaction tests:

- Valid expense submission.
- Valid income submission.
- Missing amount validation.
- Invalid amount validation.
- Invalid date validation.
- Optional note submission.

Backend transaction API tests:

- Valid expense creation.
- Valid income creation.
- Missing amount rejection.
- Invalid amount rejection.
- Invalid type rejection.
- Invalid category rejection.
- Invalid date rejection.
- Optional note default behavior.
- Unauthorized transaction creation rejection.
- Isolated test database verification.

### Exact Test Results

- `npm test`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 6 passed (6)`.
- `pytest -q`
  - Result: passed.
  - Output summary: `9 passed in 0.15s`.
- `npm run lint`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `797 modules transformed`, `built in 577ms`.
- `npx tsc --noEmit`
  - Result: passed.
- `python -m compileall backend`
  - Result: passed.

### File Size And Responsibility Review

- Reviewed `frontend/src` and `backend` file sizes.
- `frontend/src/components/ActivitySidebar.tsx` had grown into multiple responsibilities: bot status, export/download logic, PDF generation, and live feed rendering.
- Split that area into focused files:
  - `frontend/src/components/activity/BotStatus.tsx`
  - `frontend/src/components/activity/DataOperations.tsx`
  - `frontend/src/components/activity/LiveFeed.tsx`
  - `frontend/src/components/activity/download.ts`
- Remaining larger files were reviewed and left intact because their responsibilities are still cohesive:
  - `frontend/src/components/MetricsGrid.tsx`
  - `frontend/src/components/AddTransactionPanel.tsx`
  - `frontend/src/components/ChartsGrid.tsx`

### Known Warnings And Unresolved Issues

- `npm install` reported audit findings: `1 moderate`, `5 high`.
- `npm run build` reports a Vite chunk-size warning because PDF/export dependencies create a large production chunk.
- The frontend does not currently expose a free-form category input, so invalid category behavior is covered by backend API tests rather than component tests.
- Manual browser QA was not performed in this pass.

## 2026-10-07 - T-001.2

### Objective

- Correct backend test placement after T-001.1.
- Verify the app starts locally with the real Vite and FastAPI development commands.
- Add a Windows startup helper.
- Review Vite alignment, test coverage, file responsibilities, and manual Add Transaction behavior.

### Problems Discovered

- Backend tests were in a top-level `tests/backend/` folder instead of `backend/tests/`.
- A stale Python process was listening on backend port `8000`, causing real HTTP requests to hang.
- A stale Node/Vite process was listening on frontend port `5175`, causing `npm run dev` to fail because Vite has `strictPort: true`.
- The isolated manual smoke database path failed when its parent `.trakoria` directory did not already exist.
- The first startup helper draft called `npm` from nested PowerShell, which resolved to `npm.ps1` and failed under the machine execution policy.

### Root Causes

- Startup was blocked by stale local dev processes occupying the expected ports.
- The backend had no configurable or directory-safe database path for isolated smoke runs.
- Windows PowerShell execution policy can block `npm.ps1`; startup scripts should call `npm.cmd`.

### Files Changed

- Moved backend tests into `backend/tests/`.
- Updated `pytest.ini` to discover `backend/tests`.
- Updated `backend/db.py` to support `TRAKORIA_DB_PATH` and create the configured database directory before connecting.
- Updated `frontend/src/services/api.ts` to support `VITE_API_BASE_URL` with the existing localhost fallback.
- Updated `frontend/src/components/AiInsights.tsx` to reuse centralized API configuration.
- Added frontend tests for invalid type/category UI constraints.
- Added `start-dev.ps1` and `start-dev.bat`.
- Updated `STARTUP.md` with Local Development Startup commands and ports.
- Updated `.gitignore` to ignore `.trakoria/` local smoke artifacts.

### Test Results

- `npm test`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.
- `pytest -q`
  - Result: passed.
  - Output summary: `9 passed in 0.23s`.
- `npm run lint`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `797 modules transformed`, `built in 506ms`.
- `npx tsc --noEmit`
  - Result: passed.
- `python -m compileall backend`
  - Result: passed.

### Manual Runtime Verification

- Backend command verified:
  - `$env:TRAKORIA_DB_PATH='C:\ExpenseTracker\.trakoria\manual-smoke.db'; uvicorn backend.api:app --reload`
  - Backend started at `http://127.0.0.1:8000`.
- Frontend command verified:
  - `cd frontend`
  - `npm run dev`
  - Vite started at `http://localhost:5175`.
- Startup helper verified:
  - `.\start-dev.ps1 -UseSmokeDb`
  - Backend returned HTTP `200`.
  - Frontend returned HTTP `200`.
- Browser smoke verification was performed against `C:\ExpenseTracker\.trakoria\manual-smoke.db`, not the prototype `expenses.db`.
- Verified dashboard loads after PIN unlock.
- Verified Add Transaction UI is visible.
- Verified missing amount validation.
- Verified invalid amount validation.
- Verified invalid date validation by keyboard-clearing the native date input.
- Verified valid expense reaches backend and appears in the UI.
- Verified valid income reaches backend and appears in the UI.
- Verified real prototype database row count remained `96` after smoke testing.

### File Size And Responsibility Review

- Reviewed current frontend and backend file sizes.
- `ActivitySidebar` remains split into focused activity files from T-001.1.
- `DataOperations.tsx` is the largest focused logic file reviewed in this pass; it is cohesive around import/export operations and was not split further.
- `AddTransactionPanel.tsx`, `api.py`, and `schemas.py` were reviewed and left intact.
- No unrelated refactoring was performed.

### Known Warnings

- `npm run build` still reports a Vite chunk-size warning caused by PDF/export dependencies.
- npm audit findings remain present from earlier installs: `1 moderate`, `5 high`.
- Wildcard CORS remains prototype technical debt.

### Deferred Issues

- No Supabase/PostgreSQL migration started.
- Add Transaction edit/delete refinements are still future work.
- The startup helper starts hidden local processes and prints PIDs/log paths; a richer process manager was intentionally not introduced.

## 2026-10-07 - T-002

### Objective

- Establish the V1 Supabase/PostgreSQL database foundation without migrating the current SQLite application.
- Preserve the working React + TypeScript + Vite frontend and FastAPI + SQLite prototype backend.
- Create reproducible migration files, RLS policy design, configuration placeholders, and foundation tests.

### Current Architecture Discovered

- Frontend: React 19 + TypeScript + Vite + Tailwind, with API calls centralized in `frontend/src/services/api.ts`.
- Backend: FastAPI/Python, still using the SQLite prototype through `backend/db.py`.
- Current API: global PIN via `x-pin`, `/api/data`, `/api/transactions`, `/api/export`, and `/api/backup`.
- Current data model: SQLite `txns` table with integer `id`, text date/category/type, real amount, note, chat_id, and created_at.
- Tests: frontend tests under `frontend/src/__tests__`; backend tests under `backend/tests`.

### Schema Decisions

- Supabase Auth's `auth.users(id)` is the identity source.
- Application tables use UUID primary keys.
- `categories`, `transactions`, and `budgets` have `user_id uuid not null references auth.users(id) on delete cascade`.
- Money uses `numeric(12, 2)` with `amount > 0`; no `float` or `real`.
- Currency is stored as uppercase `char(3)` defaulting to `INR`.
- Transaction/category type is constrained to `income` or `expense`.
- Budget period is constrained to `weekly`, `monthly`, `yearly`, or `custom`.
- Historical transaction dates use `transaction_date date not null`.
- Timestamps use `timestamptz not null default now()`, with update triggers.
- Category names are unique per user and type through a lowercased unique index.

### Category Decisions

- Default categories are copied into each user's account when their Supabase Auth user is created.
- Income defaults: Salary, Bonus, Extra Income.
- Expense defaults: Food, Drink, Petrol, Travel, Shopping, Bills, Rent, Entertainment, Health, Other.
- This choice keeps ownership simple under RLS and allows future per-user customization.
- Transaction categories use `on delete restrict` so historical transactions are not orphaned.
- Budget categories use `on delete cascade` because budgets are category-specific configuration.

### Security And RLS Decisions

- RLS is enabled on `categories`, `transactions`, and `budgets`.
- SELECT policies use `user_id = auth.uid()`.
- INSERT policies use `with check (user_id = auth.uid())`.
- UPDATE policies use both `using (user_id = auth.uid())` and `with check (user_id = auth.uid())`.
- DELETE policies use `user_id = auth.uid()`.
- Client-supplied `user_id` cannot bypass ownership checks because policies compare to authenticated identity.
- Trigger guards ensure transaction and budget category ownership matches the row owner.
- Trigger guards ensure transaction type matches category type and budgets attach only to expense categories.

### Files Added Or Changed

- Added `supabase/migrations/001_initial_schema.sql`.
- Added `backend/config.py`.
- Added `backend/postgres/__init__.py`.
- Added `backend/postgres/connection.py`.
- Added `backend/tests/test_supabase_foundation.py`.
- Added `.env.example`.
- Updated `.gitignore`.
- Updated `STARTUP.md`.
- Updated `docs/progress/DEVELOPMENT_LOG.md`.

### Migration Status

- Migration file exists and is the reproducible source of truth for the V1 foundation schema.
- Migration includes tables, constraints, indexes, triggers, default-category seeding, RLS enablement, and CRUD policies.
- Migration was statically validated by tests.
- Migration was not executed against a live Supabase/PostgreSQL instance in this task.

### Tests Performed

- `npm test`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.
- `npm run lint`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `797 modules transformed`, `built in 500ms`.
- `npx tsc --noEmit`
  - Result: passed.
- `pytest -q`
  - Result: passed.
  - Output summary: `21 passed in 0.23s`.
- `python -m compileall backend`
  - Result: passed.

### Existing Application Regression

- `.\start-dev.ps1 -UseSmokeDb` started backend and frontend.
- Backend smoke request returned HTTP `200`.
- Frontend smoke request returned HTTP `200`.
- Current SQLite API and Add Transaction tests continue to pass.

### Known Limitations

- RLS behavior was validated by migration inspection tests only, not by executing against PostgreSQL/Supabase.
- No Supabase credentials were configured or used.
- No current SQLite endpoint was migrated to PostgreSQL.
- No frontend Supabase client/auth UI was implemented.

### Deferred Work

- Execute migrations against a local Supabase or isolated PostgreSQL test database.
- Add live RLS tests that authenticate as User A and User B.
- Implement Supabase Auth integration.
- Migrate transaction APIs from SQLite to PostgreSQL in a later approved task.
- Migrate existing SQLite data in a later approved task.

## 2026-10-07 - T-002.1

### Objective

- Set up the local Supabase CLI/project environment only.
- Do not connect to or mutate the hosted Trakoria Supabase project.
- Preserve the current FastAPI + SQLite prototype application.

### Environment Discovered

- Node.js: `v24.13.0`.
- npm: `11.6.2`.
- Python: `3.11.9`.
- Docker CLI: installed, `Docker version 29.7.2, build a7dcaa6`.
- Docker daemon/Desktop: not reachable from the CLI.
- Docker warning observed: `Error loading config file: open C:\Users\Admin\.docker\config.json: Access is denied.`
- Supabase CLI before setup: not available on PATH.
- Supabase CLI after setup: project-local `npx supabase --version` reports `2.120.0`.

### CLI Status

- Added the official Supabase CLI as a root npm dev dependency.
- Verified the CLI with `npx supabase --version`.
- The CLI writes cache/telemetry under `C:\Users\Admin\.supabase`; sandboxed CLI runs needed normal user-profile access.

### Docker Status

- Docker is installed but not running or not accessible.
- `docker info --format '{{json .ServerVersion}}'` failed because the Docker named pipe was unavailable.
- Local Supabase was not started because Docker was not ready.

### Changes Made

- Installed project-local Supabase CLI dependency.
- Created `supabase/config.toml` using `npx supabase init --yes`.
- Preserved `supabase/migrations/001_initial_schema.sql`.
- Updated `.gitignore` to ignore root `node_modules/` for future generated dependency artifacts.
- Updated `STARTUP.md` with local Supabase setup commands and expected local ports.

### Commands Executed

- `node --version` -> `v24.13.0`.
- `npm --version` -> `11.6.2`.
- `python --version` -> `Python 3.11.9`.
- `docker --version` -> installed, with Docker config access warning.
- `docker info --format '{{json .ServerVersion}}'` -> failed; Docker daemon not reachable.
- `supabase --version` -> failed; CLI not on PATH.
- `npm install -D supabase` -> succeeded, with `1 moderate severity vulnerability`.
- `npx supabase --version` -> `2.120.0`.
- `npx supabase init --yes` -> `Finished supabase init.`

### Test Results

- `npm test`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.
- `npm run lint`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `797 modules transformed`, built in `1.05s`.
  - Warning: Vite chunk-size warning remains.
- `npx tsc --noEmit`
  - Result: passed.
- `pytest -q`
  - Result: passed.
  - Output summary: `21 passed in 0.30s`.
- `python -m compileall backend`
  - Result: passed.

### Existing Application Regression

- `.\start-dev.ps1 -UseSmokeDb` launched backend and frontend using the isolated smoke database at `.trakoria/dev-smoke.db`.
- Frontend smoke request to `http://localhost:5175/` returned HTTP `200`.
- Backend smoke request to `http://127.0.0.1:8000/api/data` returned HTTP `200` when called with the configured local PIN without printing the PIN value.
- The SQLite prototype was not migrated.

### Blockers

- Local Supabase stack could not be started because Docker Desktop/daemon was not reachable.
- A pre-existing/inaccessible listener remained reported on `127.0.0.1:8000` as PID `3296`; the startup helper still launched and verified successfully, but that local port state should be cleaned up if it reappears.

### Next Step

- Start Docker Desktop and fix access to `C:\Users\Admin\.docker\config.json` if needed.
- Then run `npx supabase start` from the repository root.
- The next task should execute and validate migrations only against the local Supabase stack, not the hosted project.

## 2026-10-10 - T-002.2

### Objective

- Complete local PostgreSQL/Supabase verification for the V1 foundation schema.
- Exercise RLS as authenticated Supabase users, not as the privileged `postgres` role.
- Preserve the current SQLite prototype and avoid hosted production data.

### Scope

- Added isolated local Supabase/PostgREST integration tests in `backend/tests/test_supabase_rls_integration.py`.
- Tests create disposable Supabase Auth users through the local Auth API.
- Tests use the users' issued access tokens for all RLS assertions against `categories`, `transactions`, and `budgets`.
- Tests use the local service-role key only for cleanup of disposable public rows and Auth users.
- No login UI, production migration, deployment, or SQLite API migration was implemented.

### RLS Coverage Added

- User A can read their own rows.
- User A cannot read User B's rows.
- User A cannot delete User B's rows.
- User A cannot insert rows with User B's `user_id`.
- User A cannot update their own rows to transfer ownership to User B.
- User A cannot modify User B's rows.
- The same ownership checks are covered for `categories`, `transactions`, and `budgets`.

### Local Migration And Supabase Verification

- `npx supabase status -o env`
  - Result: passed.
  - Local API URL: `http://127.0.0.1:56000`.
  - Local DB URL: `postgresql://postgres:postgres@127.0.0.1:56001/postgres`.
  - Note: `supabase_imgproxy_ExpenseTracker` and `supabase_pooler_ExpenseTracker` were reported stopped, but the API/Auth/PostgREST/database services needed for this task were available.
- `npx supabase db reset`
  - Result: passed.
  - Output included `Applying migration 001_initial_schema.sql`.
  - Output warning: `no files matched pattern: supabase/seed.sql`.
  - Completed with `Finished supabase db reset on branch main.`
- `pytest -q backend\tests\test_supabase_rls_integration.py` after reset
  - Result: passed.
  - Output summary: `3 passed in 1.15s`.

### Test Results

- `pytest -q backend\tests\test_supabase_rls_integration.py`
  - Result: passed.
  - Output summary before reset: `3 passed in 1.48s`.
- `pytest -q`
  - Result: passed.
  - Output summary: `24 passed in 1.50s`.
- `python -m compileall backend`
  - Result: passed.
  - Output included compilation of `backend\tests\test_supabase_rls_integration.py`.
- `npm test` from `frontend/`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.
- `npm run lint` from `frontend/`
  - Result: passed.
- `npx tsc --noEmit` from `frontend/`
  - Result: passed.
- `npm run build` from `frontend/`
  - Result: passed.
  - Output summary: `797 modules transformed`, built in `556ms`.
  - Warning: Vite chunk-size warning remains for the large PDF/export production chunk.

### Warnings And Limitations

- Integration tests intentionally require local Supabase credentials through `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` or the matching `LOCAL_SUPABASE_*` variables; otherwise they skip instead of touching any hosted project.
- The local Supabase database was reset for migration reproducibility verification, so only disposable local data should be kept there.
- The command sandbox helper failed before launching normal commands in this environment, so verification commands were run with approved escalated execution. This did not require changes to application code.
- Hosted Supabase was not contacted.

### Readiness Assessment

- Schema migration reproducibility is verified against local Supabase via `npx supabase db reset`.
- Authenticated cross-user RLS isolation is verified against local Supabase for `categories`, `transactions`, and `budgets`.
- T-002 can be treated as READY for the local foundation scope; application-level Supabase Auth wiring and migration away from SQLite remain future tasks.

## 2026-10-10 - T-003.1

### Objective

- Add only the frontend Supabase client and configuration foundation for future authentication work.
- Preserve the existing PIN-based SQLite dashboard and FastAPI API behavior.
- Do not implement login/signup UI, OAuth callback behavior, backend JWT verification, transaction CRUD migration, database migration, hosted settings changes, or deployment.

### Scope

- Added `@supabase/supabase-js` to the frontend package manifest and lockfile.
- Added a focused browser Supabase client module at `frontend/src/services/supabase.ts`.
- The client reads only public Vite variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_ANON_KEY`
- The client prefers the publishable key and supports the anonymous key name for compatibility.
- The client validates missing and placeholder values when client creation/config resolution is requested.
- The existing application does not import the Supabase client yet, so the current PIN unlock and SQLite dashboard remain unchanged.
- Updated `.env.example` with placeholder-only public frontend Supabase values and the local callback URL.
- Updated `.gitignore` so `.env.example` can be tracked while real `.env` files remain ignored.
- Corrected local Supabase documentation in `STARTUP.md` to the custom ports from `supabase/config.toml`.
- Updated local `supabase/config.toml` redirect settings to match the Vite frontend:
  - Site URL: `http://localhost:5175`
  - Callback allow-list URL: `http://localhost:5175/auth/callback`
- No hosted Supabase project settings were changed or guessed.

### Tests Added

- Added `frontend/src/__tests__/services/supabase.test.ts`.
- Coverage includes:
  - Reading public Supabase URL and publishable key from Vite-style env.
  - Fallback to `VITE_SUPABASE_ANON_KEY` when publishable key is absent.
  - Rejection of missing or placeholder configuration.
  - Initialization options for browser session persistence and OAuth URL detection.

### Test Results

- `npm test` from `frontend/`
  - Result: passed.
  - Output summary: `Test Files 2 passed (2)`, `Tests 12 passed (12)`.
- `npm run lint` from `frontend/`
  - Result: passed.
- `npx tsc --noEmit` from `frontend/`
  - Result: passed.
- `npm run build` from `frontend/`
  - Result: passed.
  - Output summary: `797 modules transformed`, built in `847ms`.
  - Warning: Vite chunk-size warning remains for the large PDF/export production chunk.
- `pytest -q`
  - Result: passed.
  - Output summary: `21 passed, 3 skipped in 0.25s`.
  - Skips: local Supabase RLS integration tests skipped because this run did not set local Supabase credentials.
- `python -m compileall backend`
  - Result: passed.

### Security Notes

- No service-role key, JWT signing secret, OAuth client secret, database URL, or database password was added to frontend code.
- No `.env` file was committed or printed.
- Hosted Supabase and hosted production data were not contacted.
- The local callback URL is documented and configured only for local development.

### Remaining Configuration Questions

- Hosted frontend callback URL is still unresolved and must be configured deliberately once the deployment domain is chosen.
- T-003.2 still needs the AuthProvider/session layer and UI flow; this task only created the client/config foundation.

## 2026-10-10 - T-003.2

### Objective

- Implement the frontend Supabase authentication layer on top of the T-003.1 browser client.
- Preserve the existing PIN-based SQLite dashboard and backend API behavior.
- Do not implement backend JWT verification, transaction migration, database migration, hosted Supabase setting changes, or deployment.

### Scope

- Added an `AuthProvider` with Supabase session restoration, user/session/loading/error state, auth-state subscription, subscription cleanup, sign-up, sign-in, Google OAuth initiation, and sign-out.
- Added `useAuth` and auth context helpers in focused files under `frontend/src/auth/`.
- Added an accessible `AuthPanel` for email/password sign-up, email/password sign-in, Google OAuth initiation, loading/disabled states, validation errors, and provider errors.
- Added a minimal `/auth/callback` path switch in `App.tsx` without introducing a router dependency.
- Added `AuthCallbackPage` to show Supabase callback errors and return to `/` after a restored session.
- Kept the existing PIN gate and SQLite dashboard in place after Supabase authentication; Supabase frontend session state is not treated as backend authorization.
- Added a Supabase sign-out control to the PIN screen so a Supabase-authenticated user can leave before unlocking the legacy dashboard.

### Tests Added

- Added `frontend/src/__tests__/auth/AuthProvider.test.tsx`.
- Added `frontend/src/__tests__/components/AuthPanel.test.tsx`.
- Added `frontend/src/__tests__/pages/AuthCallbackPage.test.tsx`.
- Coverage includes:
  - Session restoration.
  - Null/expired session handling.
  - Auth-state subscription cleanup.
  - Logout.
  - Email/password sign-in.
  - Email/password sign-up.
  - Validation errors before submission.
  - Google OAuth initiation with `http://localhost:5175/auth/callback`.
  - OAuth callback error rendering.
  - Successful callback session restoration and return to `/`.

### Test Results

- `npm test` from `frontend/`
  - Result: passed.
  - Output summary: `Test Files 5 passed (5)`, `Tests 23 passed (23)`.
- `npm run lint` from `frontend/`
  - Result: passed.
- `npx tsc --noEmit` from `frontend/`
  - Result: passed.
- `npm run build` from `frontend/`
  - Result: passed.
  - Output summary: `846 modules transformed`, built in `712ms`.
  - Warning: Vite chunk-size warning remains; main app chunk is now `1,210.34 kB` minified because the frontend auth SDK is included.
- `pytest -q`
  - Result: passed.
  - Output summary: `21 passed, 3 skipped in 0.17s`.
  - Skips: local Supabase RLS integration tests skipped because this run did not set local Supabase credentials.
- `python -m compileall backend`
  - Result: passed.

### Security And Compatibility Notes

- No service-role key, JWT signing secret, OAuth client secret, database URL, database password, access token, or refresh token was added to frontend application code.
- Tests use redacted dummy token strings only.
- No tokens, passwords, or secrets are logged.
- Supabase Auth is not connected to the existing shared SQLite financial endpoints.
- The legacy `x-pin` backend API behavior remains unchanged.
- Hosted Supabase and hosted production data were not contacted.
- Live Google OAuth was not browser-verified in this task.

### Remaining Configuration Requirements

- Hosted frontend callback URL is still unresolved and must be configured deliberately once the deployment domain is chosen.
- Backend JWT verification and transaction API authorization remain future T-003 work.

## 2026-10-11 - T-003.2 Review Fix

### Objective

- Investigate and resolve the Supabase browser warning: `Multiple GoTrueClient instances detected in the same browser context`.
- Keep React StrictMode enabled.
- Preserve the existing Supabase environment-variable validation and supported publishable/anonymous key names.

### Investigation

- Reviewed `frontend/src/services/supabase.ts`, `frontend/src/auth/AuthProvider.tsx`, `frontend/src/main.tsx`, and the relevant frontend tests.
- Confirmed that `frontend/src/main.tsx` wraps the app in `React.StrictMode`.
- Confirmed that `AuthProvider` creates the Supabase browser client inside a mount effect.
- In React development StrictMode, mount effects are intentionally run through a mount/cleanup/remount cycle, so the previous implementation could call `createSupabaseBrowserClient()` twice and create multiple Supabase clients in the same browser context.
- Checked production initialization paths with source search. The only application path creating the browser client is `AuthProvider`; no other production module directly calls `createClient` or `createSupabaseBrowserClient`.

### Cause

- Confirmed cause: repeated `AuthProvider` effect initialization under React StrictMode development lifecycle created more than one Supabase browser client because `createSupabaseBrowserClient()` returned a new client on every call.

### Changes Made

- Updated `frontend/src/services/supabase.ts` to cache a module-level Supabase browser client.
- Repeated initialization with the same normalized URL/key now reuses the existing client.
- Missing and placeholder URL/key validation still happens before client creation.
- If a client already exists and a later call uses a different normalized URL/key, the function throws a clear configuration-change error instead of silently reusing the old client.
- Added a guarded test-only cache reset helper for isolated service unit tests.
- Updated `frontend/src/__tests__/services/supabase.test.ts` to cover repeated initialization, `createClient` call count, normalized equivalent configuration reuse, placeholder rejection before creation, and configuration-change failure.

### Test Results

- `npm test -- --runInBand frontend/src/__tests__/services/supabase.test.ts frontend/src/__tests__/auth/AuthProvider.test.tsx`
  - Result: failed before running tests.
  - Reason: Vitest does not support the Jest-style `--runInBand` option.
- `npm test -- frontend/src/__tests__/services/supabase.test.ts frontend/src/__tests__/auth/AuthProvider.test.tsx`
  - Result: failed before running tests.
  - Reason: filter paths were passed relative to the repository root while the command ran from `frontend/`.
- `npm test -- src/__tests__/services/supabase.test.ts src/__tests__/auth/AuthProvider.test.tsx`
  - Result: passed.
  - Output summary: `Test Files 2 passed (2)`, `Tests 13 passed (13)`.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 5 passed (5)`, `Tests 27 passed (27)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `846 modules transformed`, built in `1.95s`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,210.73 kB` minified.

### Known Limitations

- Browser verification of the warning was not performed in this pass.
- Hosted Supabase and real financial databases were not contacted.

## 2026-10-11 - T-003.2 Callback Redirect Fix

### Objective

- Fix the Google OAuth callback page getting stuck on `Session restored. Redirecting...`.
- Preserve existing email/password, Google OAuth initiation, PIN gate, and transaction behavior.
- Do not modify database migrations.

### Investigation

- Reviewed `frontend/src/App.tsx`, `frontend/src/pages/AuthCallbackPage.tsx`, and `frontend/src/__tests__/pages/AuthCallbackPage.test.tsx`.
- Confirmed `AppRoutes` chooses the callback view from `window.location.pathname`.
- Confirmed the previous callback success path used `window.history.replaceState(null, '', '/')` plus a synthetic `popstate` event.
- Because the app does not subscribe route state to browser history changes, manual history mutation does not guarantee `AppRoutes` rerenders, leaving `AuthCallbackPage` visible.

### Changes Made

- Updated `AuthCallbackPage` to request a real browser redirect to `/` after loading completes with a restored Supabase session and no callback error.
- The production default redirect uses `window.location.replace('/')`, so a successful callback reloads the app at the root route where Supabase can restore the persisted session.
- Kept guards so the page does not redirect while loading, without a session, or when a callback error is present.
- Updated callback tests to verify successful session restoration requests a redirect, callback errors stay visible without redirecting, and missing restored sessions do not redirect.

### Test Results

- `npm test -- src/__tests__/pages/AuthCallbackPage.test.tsx`
  - Result: failed before assertions completed on the first attempt.
  - Reason: jsdom does not allow redefining `window.location.replace` with `vi.spyOn`.
- `npm test -- src/__tests__/pages/AuthCallbackPage.test.tsx`
  - Result: passed after using an injectable redirect function with the production default preserved.
  - Output summary: `Test Files 1 passed (1)`, `Tests 3 passed (3)`.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 5 passed (5)`, `Tests 28 passed (28)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `846 modules transformed`, built in `1.07s`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,210.76 kB` minified.

### Known Limitations

- Google OAuth was not fully browser-verified in this pass.
- The callback tests verify redirect behavior and session restoration handling only.
