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

## 2026-10-11 - T-003.3 FastAPI JWT Verification

### Objective

- Add secure backend verification of Supabase access tokens.
- Keep the existing SQLite/PIN transaction flow working.
- Do not migrate transaction routes, change database schemas, modify RLS, or use service-role keys for browser authentication.

### Implementation

- Added `backend/auth.py` with:
  - reusable FastAPI bearer-token dependency;
  - Supabase JWT verifier using PyJWT and Supabase JWKS from the configured project URL;
  - signature, issuer, audience, expiration, and subject validation;
  - normalized authenticated identity model containing safe user fields only.
- Added `GET /api/auth/me` in `backend/api.py`.
  - Returns `user_id` from the verified token subject and optional token email.
  - Does not trust frontend-supplied user IDs.
- Extended `backend/config.py` with Supabase JWT audience configuration.
  - `SUPABASE_URL` drives issuer and JWKS URL derivation.
  - `SUPABASE_JWT_AUDIENCE` defaults to `authenticated`.
- Updated `.env.example` with `SUPABASE_JWT_AUDIENCE=authenticated`.
- Left all existing `x-pin` protected SQLite transaction, dashboard, export, and backup routes unchanged.

### Tests Added

- Added `backend/tests/test_auth_jwt.py`.
- Coverage includes:
  - valid RS256-signed token accepted through a mocked JWKS signing key;
  - wrong audience rejected;
  - wrong issuer rejected;
  - expired token rejected;
  - `/api/auth/me` returns only verified identity fields;
  - frontend-supplied identity headers do not affect authenticated identity;
  - missing, malformed, and invalid bearer tokens return `401`.

### Test Results

- `pytest -q backend\tests\test_auth_jwt.py`
  - Result: passed.
  - Output summary: `8 passed in 0.44s`.
- `pytest -q`
  - Result: passed.
  - Output summary: `29 passed, 3 skipped in 0.84s`.
  - Skips: local Supabase RLS integration tests skipped because local Supabase credentials were not provided for this run.
- `python -m compileall backend`
  - Result: passed.
  - Output included compilation of `backend\tests\test_auth_jwt.py`.
- `npm test` from `frontend/`
  - Result: passed.
  - Output summary: `Test Files 5 passed (5)`, `Tests 28 passed (28)`.

### Warnings And Limitations

- JWKS verification was unit-tested with a mocked JWKS signing key; no hosted Supabase or live local Supabase Auth integration test was performed in this pass.
- Browser verification was not performed.
- Transaction routes still use the legacy PIN flow by design for this ticket.
- Backend JWT verification requires `SUPABASE_URL` to match the issuing Supabase project and `SUPABASE_JWT_AUDIENCE` to match the expected token audience, defaulting to `authenticated`.

## 2026-10-11 - T-003.3 Security Review And Local Integration Readiness

### Objective

- Review the FastAPI Supabase JWT verification implementation for security and local integration readiness.
- Do not add product features, modify database migrations, RLS, transaction routes, or frontend behavior.

### Review Findings

- `backend/auth.py` verifies Supabase access tokens through PyJWT with a JWKS-derived signing key.
- JWT validation requires:
  - a valid signature;
  - issuer matching `${SUPABASE_URL}/auth/v1`;
  - audience matching `SUPABASE_JWT_AUDIENCE`, defaulting to `authenticated`;
  - a valid, unexpired `exp`;
  - a non-empty `sub`.
- Algorithm handling is explicit with `algorithms=["RS256", "ES256"]`; tokens using unexpected algorithms are rejected.
- JWKS lookup failures, including unknown `kid` and network/client failures represented by `PyJWKClientError`, fail closed as `401`.
- `GET /api/auth/me` returns identity only from verified token claims and does not use frontend-supplied user ID headers.
- Local and hosted configuration remain environment-driven through `SUPABASE_URL` and `SUPABASE_JWT_AUDIENCE`; no JWT secret, OAuth secret, service-role key, or hosted credential is embedded in source.
- Existing SQLite/PIN transaction endpoints remain unchanged and continue to use `x-pin`.
- Tests remain isolated. They use generated local keys, mocked JWKS behavior, and temporary SQLite databases through the existing test fixture.

### Test Coverage Added

- Extended `backend/tests/test_auth_jwt.py` to cover:
  - invalid signatures;
  - JWKS signing-key lookup failure/unknown `kid` behavior;
  - unexpected JWT algorithms;
  - expired bearer-token rejection at the `/api/auth/me` endpoint boundary.

### Test Results

- `pytest -q backend\tests\test_auth_jwt.py`
  - Result: passed.
  - Output summary: `12 passed in 0.59s`.
- `pytest -q`
  - Result: passed.
  - Output summary: `33 passed, 3 skipped in 1.30s`.
  - Skips: local Supabase RLS integration tests skipped because local Supabase credentials were not provided for this run.
- `python -m compileall backend`
  - Result: passed.
  - Output included compilation of `backend\tests\test_auth_jwt.py`.
- `npm test` from `frontend/`
  - Result: passed.
  - Output summary: `Test Files 5 passed (5)`, `Tests 28 passed (28)`.

### Remaining Limitations

- Live local Supabase Auth/JWKS verification was not performed.
- Hosted Supabase verification was not performed.
- Browser verification was not performed.
- The current implementation is ready for local integration once local Supabase is running and `SUPABASE_URL` points at the local API URL that issued the token.

## 2026-10-11 - T-003.4 Authenticated Frontend-To-Backend Integration

### Objective

- Integrate the existing Supabase frontend session with protected FastAPI requests by sending the current access token as `Authorization: Bearer <token>`.
- Keep the existing SQLite/PIN dashboard and transaction flow unchanged.
- Do not migrate transaction CRUD or modify database behavior.

### Inspection Summary

- Existing frontend backend calls are centralized in `frontend/src/services/api.ts`.
- Existing dashboard, transaction, export, and backup requests use the legacy `x-pin` header.
- Supabase session state is restored and exposed through `AuthProvider` and `useAuth`.
- Backend JWT verification is available through `GET /api/auth/me`.
- No existing frontend helper used bearer authentication before this task.

### Changes Made

- Added `fetchAuthenticatedIdentity()` in `frontend/src/services/api.ts`.
  - Sends `Authorization: Bearer <access_token>` only to `GET /api/auth/me`.
  - Rejects missing or blank tokens before making a request.
  - Maps backend `401` responses to a predictable frontend auth error.
  - Does not log tokens or response headers.
- Extended the auth context with `verifyBackendIdentity()`.
- Wired `AuthProvider` to call `fetchAuthenticatedIdentity(session?.access_token)` using the current Supabase session.
- Left existing PIN-based helpers and SQLite-backed transaction/dashboard/export/backup flows unchanged.

### Tests Added Or Updated

- Added `frontend/src/__tests__/services/api.test.ts`.
- Updated `frontend/src/__tests__/auth/AuthProvider.test.tsx`.
- Coverage includes:
  - bearer token attached to protected `/api/auth/me` requests;
  - missing session token does not call `fetch`;
  - `401` handling;
  - tokens are not logged on failure;
  - legacy dashboard requests still send `x-pin` and no `Authorization` header;
  - `AuthProvider` uses the current Supabase access token when verifying backend identity.

### Test Results

- `npm test -- src/__tests__/services/api.test.ts src/__tests__/auth/AuthProvider.test.tsx`
  - Result: passed.
  - Output summary: `Test Files 2 passed (2)`, `Tests 11 passed (11)`.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 6 passed (6)`, `Tests 34 passed (34)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `846 modules transformed`, built in `1.17s`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,211.19 kB` minified.
- `pytest -q`
  - Result: passed.
  - Output summary: `33 passed, 3 skipped in 0.68s`.
  - Skips: local Supabase RLS integration tests skipped because local Supabase credentials were not provided for this run.
- `python -m compileall backend`
  - Result: passed.

### Warnings And Limitations

- Backend files were not modified for T-003.4; backend tests and compile checks were rerun because the working tree still contains uncommitted backend JWT changes from T-003.3.
- Browser verification was not performed.
- Live local or hosted Supabase integration verification was not performed.
- This does not approve or migrate transaction APIs to bearer authentication; legacy SQLite transaction requests still use the PIN flow.

## 2026-10-11 - T-003.4 Security Investigation And Corrective Plan

### Objective

- Investigate why `GET /api/auth/me` is not requested during sign-in or session restoration.
- Investigate why switching Supabase accounts can still show an existing PIN/lock state and legacy SQLite expenses.
- Do not implement fixes, migrate data, modify schemas, reset/delete financial data, or expose PINs/tokens.

### Investigation Performed

- Inspected `frontend/src/auth/AuthProvider.tsx`, `frontend/src/auth/auth-context.ts`, `frontend/src/services/api.ts`, `frontend/src/App.tsx`, `frontend/src/hooks/useTransactions.ts`, `backend/api.py`, and `backend/db.py`.
- Searched the codebase for `verifyBackendIdentity`, `fetchAuthenticatedIdentity`, `/api/auth/me`, `ledger_pin`, `localStorage`, `x-pin`, `/api/data`, and transaction request paths.
- Did not run browser verification.
- Did not run tests in this investigation pass.
- Did not inspect, print, or modify real financial rows.

### Findings

- `verifyBackendIdentity()` is exposed by `AuthProvider`, but no production component or effect calls it.
- The only current caller of `verifyBackendIdentity()` is a frontend test probe.
- Therefore `/api/auth/me` is not expected to appear in Chrome Network during sign-in or session restoration.
- `fetchAuthenticatedIdentity()` correctly targets `/api/auth/me`, but it is dormant until a caller invokes `verifyBackendIdentity()`.
- The legacy dashboard PIN is initialized from browser `localStorage.getItem('ledger_pin')`.
- Successful PIN unlock writes the PIN back to `localStorage` under the global `ledger_pin` key.
- This key is not scoped by Supabase user ID or email.
- `handleLogout()` clears `ledger_pin`, `pin`, and local authenticated state, then calls Supabase `signOut()`.
- Switching Supabase accounts without first using that app logout path can leave the old global `ledger_pin` value available in the same browser profile.
- `useTransactions(pin)` loads dashboard data through `fetchDashboardData(pin)`.
- `fetchDashboardData()` calls `/api/data` with only the `x-pin` header.
- Backend `/api/data` uses only `Depends(verify_pin)` and then returns `db.all_rows()`.
- `db.all_rows()` selects all SQLite rows ordered by date/id and does not filter by Supabase user, email, session, or owner.
- The SQLite `txns` table has `chat_id`, but no Supabase `user_id`, and `/api/data` does not filter by `chat_id`.

### Root Cause

- Missing identity request: no production code calls `verifyBackendIdentity()` after Supabase sign-in, OAuth callback restoration, or session restoration.
- Cross-account expense visibility: the current dashboard remains a shared legacy SQLite/PIN flow. Supabase identity gates access to the app shell, but the financial data request is authorized only by the global PIN and returns all SQLite rows. This is legacy shared-data behavior, not per-user isolation.
- The observed PIN/lock-code carryover is consistent with the global `localStorage` key `ledger_pin`, which is not tied to the active Supabase account.

### Security Boundary

- Supabase Auth currently identifies the signed-in frontend user.
- `GET /api/auth/me` can verify a bearer token on the backend, but the frontend does not yet call it automatically.
- Legacy SQLite dashboard data is not isolated by Supabase identity.
- Legacy transaction/dashboard/export/backup endpoints still trust the PIN boundary, not the Supabase JWT boundary.
- PostgreSQL tables and RLS are the intended per-user isolation target, but transaction CRUD has not yet been migrated there.

### Corrective Plan For Review

- Add an explicit production call to `verifyBackendIdentity()` after Supabase session restoration and auth-state changes, or in the app gate immediately after `session` becomes available.
- Store verified backend identity in auth context or a small identity state hook.
- On Supabase account change, clear legacy PIN-authenticated UI state and require PIN unlock again.
- Scope any cached legacy PIN state by verified Supabase user ID if legacy PIN persistence remains temporarily necessary.
- Keep `/api/data` and transaction routes PIN-based until the PostgreSQL/RLS migration ticket; do not imply SQLite is user-isolated.

### Tests Required Before Approval

- AuthProvider or app-gate test proving `/api/auth/me` is requested after session restoration.
- Auth-state-change test proving `/api/auth/me` is requested when a user signs in.
- Account-switching test proving previous PIN/authenticated dashboard state is cleared when Supabase user identity changes.
- Regression test proving no bearer token is sent to legacy `/api/data` until transaction routes are deliberately migrated.
- Legacy PIN regression test proving the current SQLite/PIN flow still works for the intended prototype scope.

### Recommended Next Ticket

- T-004: authenticated PostgreSQL transaction CRUD with Supabase user ownership and RLS-backed isolation.
- Scope should include replacing SQLite dashboard reads/writes with user-scoped PostgreSQL queries, removing global PIN authorization from financial data access, and testing cross-user isolation end to end.

## 2026-10-11 - T-003.5 Temporary Containment Of Shared SQLite Financial Access

### Objective

- Implement the smallest safe temporary containment so Supabase-authenticated accounts cannot access shared SQLite financial data through the application while user-owned storage is unfinished.
- Preserve existing SQLite records.
- Do not migrate transaction CRUD, modify schemas, reset/delete data, or connect Supabase Auth to shared SQLite as a substitute for ownership.

### Investigation

- Inspected dashboard loading and financial API paths:
  - `frontend/src/App.tsx`
  - `frontend/src/hooks/useTransactions.ts`
  - `frontend/src/services/api.ts`
  - `frontend/src/pages/DashboardPage.tsx`
  - `frontend/src/components/Header.tsx`
  - `frontend/src/components/ActivitySidebar.tsx`
  - `frontend/src/components/activity/DataOperations.tsx`
  - `frontend/src/components/AiInsights.tsx`
  - `backend/api.py`
  - `backend/db.py`
  - `backend/export.py`
  - `backend/bot.py`
- Confirmed the dashboard, transaction create/delete, CSV export, and SQLite backup paths all use the legacy PIN/API flow.
- Confirmed `/api/data` returns `db.all_rows()` and SQLite records are not Supabase-user-owned.
- Confirmed backup/export are alternate shared-data exfiltration paths and must be blocked with dashboard reads.

### Implementation

- Added a backend containment dependency in `backend/api.py` that returns `403` for shared SQLite financial access.
- Applied the containment dependency after PIN validation to:
  - `GET /api/data`
  - `POST /api/transactions`
  - `DELETE /api/transactions/{txn_id}`
  - `GET /api/export`
  - `GET /api/backup`
- Left `GET /api/auth/me` available for JWT identity verification.
- Updated frontend API helpers to surface a temporary-disabled error when legacy financial routes return `403`.
- Updated backend tests to assert blocked access and unchanged isolated test data.
- Updated frontend API tests to assert temporary-disabled handling.

### Access Paths Now Blocked

- Dashboard data retrieval through `/api/data`.
- Transaction creation through `/api/transactions`.
- Transaction deletion through `/api/transactions/{txn_id}`.
- Server CSV export through `/api/export`.
- SQLite database backup through `/api/backup`.

### Legacy Paths Remaining

- `GET /api/auth/me` remains available because it verifies Supabase JWT identity and does not expose financial rows.
- Direct non-HTTP code paths such as Telegram bot/database utilities were not changed in this ticket because the objective was application/API containment and no migration or bot redesign was requested.
- Existing SQLite records remain untouched.

### Test Results

- `pytest -q backend\tests\test_transactions_api.py`
  - Result: passed.
  - Output summary after final account-switching containment test: `7 passed in 0.16s`.
- `pytest -q`
  - Result: passed.
  - Output summary after final account-switching containment test: `31 passed, 3 skipped in 0.69s`.
  - Skips: local Supabase RLS integration tests skipped because local Supabase credentials were not provided for this run.
- `python -m compileall backend`
  - Result: passed.
  - Output included compilation of `backend\tests\test_transactions_api.py`.
- `npm test -- src/__tests__/services/api.test.ts`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 9 passed (9)`.
- `npm test`
  - Result: passed.
  - Output summary before the backend-only final test addition: `Test Files 6 passed (6)`, `Tests 38 passed (38)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `846 modules transformed`, built in `1.13s`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,211.46 kB` minified.

### Warnings And Limitations

- Browser verification was not performed.
- Live local or hosted Supabase integration verification was not performed.
- This is temporary containment, not per-user financial isolation.
- Financial dashboard access must remain blocked until transaction/dashboard CRUD uses authenticated, user-owned storage with RLS-backed isolation.
- Restoring financial dashboard access requires T-004 or equivalent work: PostgreSQL transaction CRUD, user ownership on all financial reads/writes, RLS enforcement, frontend/backend integration tests, and cross-user isolation verification.

## 2026-10-11 - T-003 Completion Attempt: Auth Lifecycle And Per-User Financial Isolation

### Objective

- Complete the remaining T-003 authentication, verified identity, account display, and per-user financial isolation work after T-003.5 containment.
- Preserve T-003.5 blocking of shared SQLite financial routes.
- Preserve existing SQLite records without assigning ownership or importing legacy data.

### Investigation

- Inspected the working tree before editing and confirmed prior T-003.3/T-003.4/T-003.5 changes were still uncommitted.
- Reviewed authentication provider state, backend JWT verification, `/api/auth/me`, legacy PIN/SQLite routes, frontend API helpers, dashboard data loading, transaction components, existing migrations/RLS tests, and the T-003.5 containment log.
- Confirmed the legacy SQLite financial API is still not user-owned and must stay blocked for app/API access.
- Confirmed the production auth lifecycle needed to invoke backend identity verification instead of exposing only a callable helper.

### Implementation

- Wired backend identity verification into the Supabase auth lifecycle:
  - Initial session restoration verifies `/api/auth/me`.
  - Auth state changes verify the new access token.
  - Logout and missing sessions clear verified identity.
  - Stale verification responses are ignored when the active account changes.
- Added authenticated identity state to the auth context: verified backend identity, identity loading, verified flag, and identity error.
- Added a compact account board showing the signed-in email, backend verification state, verification errors, and logout.
- Added authenticated PostgreSQL/PostgREST-backed financial API routes:
  - `GET /api/secure/data`
  - `POST /api/secure/transactions`
  - `PATCH /api/secure/transactions/{txn_id}`
  - `DELETE /api/secure/transactions/{txn_id}`
  - `GET /api/secure/export`
  - `GET /api/secure/backup`
- The secure backend financial client uses the verified user's access token with the Supabase anon key so PostgREST/RLS evaluates requests in the ordinary authenticated context.
- Transaction inserts derive `user_id` from the verified backend identity and ignore any client-supplied ownership value.
- Secure reads, writes, exports, and backups do not fall back to SQLite if PostgreSQL/PostgREST fails.
- Updated frontend financial loading to use the current Supabase access token and verified backend identity key.
- Cleared frontend financial state when the authenticated/verified user changes or disappears.
- Removed server backup/export UI paths that previously depended on shared SQLite routes; local in-memory export options remain.
- Kept T-003.5 legacy containment in place for:
  - `GET /api/data`
  - `POST /api/transactions`
  - `DELETE /api/transactions/{txn_id}`
  - `GET /api/export`
  - `GET /api/backup`

### Tests Added Or Updated

- Auth provider lifecycle tests for session restoration, sign-in verification, user switching, logout clearing, failed verification, stale verification response handling, and token header behavior.
- Account board tests for email display, verified/unverified state, verification errors, and logout.
- Frontend API tests for authenticated identity requests, missing-token behavior, 401 handling, token-safe logging behavior, secure financial bearer headers, and legacy PIN route preservation.
- Backend secure financial API tests using mocked PostgREST calls and synthetic users:
  - User-scoped dashboard reads.
  - Owner derivation on create while ignoring forged `user_id`.
  - RLS-context delete requests.
  - User-scoped exports.
  - No SQLite fallback when PostgREST fails.
- Legacy containment tests remain in place for valid-PIN denial and unchanged SQLite data.

### Validation Results

- `npx tsc --noEmit`
  - Initial result: failed with two TypeScript issues after changing transaction IDs to strings.
  - Fixes: updated auth callback test invocation typing and changed string-ID sort comparison in PDF export.
  - Final result: passed.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 7 passed (7)`, `Tests 45 passed (45)`.
- `npm run lint`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `847 modules transformed`, built in `673ms`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,210.84 kB` minified.
- `pytest -q`
  - Result: passed.
  - Output summary: `36 passed, 3 skipped in 1.04s`.
  - Skips: local Supabase RLS integration tests remain skipped because local Supabase credentials/environment were not provided for this run.
- `python -m compileall backend`
  - Result: passed.

### Security Notes

- Existing SQLite financial data was not deleted, modified, migrated, or assigned to any Supabase user.
- The secure PostgreSQL routes derive identity from verified JWTs, not frontend-supplied user IDs.
- The frontend sends bearer tokens only through Authorization headers for protected requests and does not log tokens.
- Backend tests mock PostgREST and do not require hosted Supabase credentials or a real financial database.
- The T-003.5 legacy SQLite routes remain blocked even with a valid PIN, so the application does not restore shared financial access through those endpoints.

### Remaining Limitations

- Browser verification with two real test accounts was not performed.
- Live hosted Supabase verification was not performed.
- Local Supabase RLS integration tests were skipped because the required local Supabase test environment was unavailable in this run.
- Because browser/live two-user verification is an explicit acceptance criterion, T-003 must remain incomplete until that verification is completed and recorded.

## 2026-10-11 - T-003 Final Security Audit And Verification Attempt

### Objective

- Audit the current T-003 implementation after the completion attempt.
- Run the available automated gates.
- Determine whether local PostgreSQL/RLS and browser two-account verification can be completed safely in this environment.

### Audit Findings

- Authentication path:
  - `AuthProvider` restores the Supabase session, listens for auth-state changes, verifies the backend identity through `/api/auth/me`, clears identity on logout/missing sessions, and ignores stale verification responses.
  - `/api/auth/me` depends on verified bearer JWTs and returns only safe identity fields.
- Active dashboard path:
  - `App` only renders the dashboard after a Supabase session and verified backend identity are available.
  - `useTransactions` loads financial data from `/api/secure/data` using the current access token and clears state when the identity key or token disappears.
- Active financial backend path:
  - Secure routes under `/api/secure/*` use `get_current_user`.
  - `backend/postgres/financial.py` calls Supabase REST/PostgREST with the verified user's bearer token and the public anon key, relying on ordinary authenticated RLS context.
  - Transaction create derives `user_id` from the verified backend identity and ignores client-supplied ownership.
  - Secure dashboard, export, and backup are based on PostgREST responses and do not fall back to SQLite.
- Legacy path:
  - The five T-003.5 shared SQLite API routes remain blocked after PIN validation.
  - The old `AiInsights` component still contains an `x-pin` request, but it is not imported or rendered by the active app.
  - `backend/bot.py` and `backend/export.py` still directly use SQLite utilities outside the active authenticated web/API dashboard path; these were not changed in this audit.

### Defect Fixed During Audit

- Found an active local PDF export label in `DataOperations` that hardcoded a previous account holder name and "Verified Offline".
- Fixed the PDF export to receive the current account email and verified state through the dashboard component path.
- Added a regression test proving the PDF export uses the current account email and no longer emits the hardcoded identity or offline verification label.

### Verification Results

- `pytest -q`
  - Result: passed.
  - Output summary: `36 passed, 3 skipped in 4.92s`.
- `python -m compileall backend`
  - Result: passed.
- `npm test -- src/__tests__/components/DataOperations.test.tsx`
  - Initial result: failed because the new test's `jsPDF` mock was not constructable.
  - Fix: changed the mock to a constructable mock implementation.
  - Final result: passed, `Test Files 1 passed (1)`, `Tests 1 passed (1)`.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 8 passed (8)`, `Tests 46 passed (46)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `847 modules transformed`, built in `1.51s`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,211.07 kB` minified.
- `python -m pytest -q backend\tests\test_supabase_foundation.py`
  - Result: passed.
  - Output summary: `12 passed in 0.03s`.
- `python -m pytest -q backend\tests\test_supabase_rls_integration.py -rs`
  - Result: skipped.
  - Output summary: `3 skipped in 0.02s`.
  - Skip reason: local Supabase RLS integration tests require `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Local environment readiness checks:
  - `SUPABASE_URL`, `LOCAL_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOCAL_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `LOCAL_SUPABASE_SERVICE_ROLE_KEY` were not configured.
  - `supabase --version` failed because the Supabase CLI is not installed.
  - `psql` was not found on PATH.

### PostgreSQL/RLS Verification Status

- Real PostgreSQL/RLS two-user verification was not completed.
- The blocker is missing isolated local Supabase configuration/tooling.
- Required setup before this can run safely:
  - Install or provide the Supabase CLI/local Supabase stack.
  - Apply the repository migrations to an isolated local Supabase database.
  - Configure local-only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` or their `LOCAL_*` equivalents.
  - Run `backend\tests\test_supabase_rls_integration.py` against that isolated local instance.

### Browser Verification Status

- Browser two-account verification was not performed.
- It remains blocked until a safe local Supabase environment with dedicated synthetic accounts and test records is available.
- No hosted production database or real financial data was used.

### T-003 Status

- T-003 remains incomplete.
- Mocked and static automated tests pass, and the active code path is designed to use verified identity plus RLS-backed PostgREST access.
- The required live RLS and browser two-account verification have not run, so this audit does not mark T-003 complete.

## 2026-10-11 - T-003 Local Supabase Verification Environment Recovery

### Objective

- Recover and verify the isolated local Supabase environment needed for T-003 PostgreSQL/RLS integration tests.
- Use only synthetic test data.
- Do not connect to the hosted Supabase project or modify real financial records.

### Environment Checks

- Inspected:
  - `supabase/config.toml`
  - `supabase/migrations/001_initial_schema.sql`
  - `backend/tests/test_supabase_rls_integration.py`
  - `backend/tests/test_supabase_foundation.py`
  - `.env.example`
  - local `.env` variable names only, without printing values
  - `start-dev.ps1`
  - `STARTUP.md`
  - root `package.json`
- Confirmed configured local Supabase ports from `supabase/config.toml`:
  - API: `56000`
  - DB: `56001`
  - Shadow DB: `56002`
  - Pooler: `56003`, disabled
  - Studio: `56004`
  - SMTP UI: `56005`
  - Analytics: `56006`
- Confirmed `.env` is ignored by Git:
  - `git check-ignore -v .env`
  - Result: `.gitignore:21:.env .env`
- Local `.env` contained these relevant key names:
  - `APP_PIN`
  - `BOT_TOKEN`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`
  - `SUPABASE_DATABASE_URL`
  - `SUPABASE_JWT_AUDIENCE`
  - `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` was not present in local `.env`; the local Supabase CLI status output provides `SERVICE_ROLE_KEY`.

### Tooling Checks

- `npx supabase --version`
  - Initial sandbox result: failed because the CLI tried to write telemetry under the user profile.
  - Escalated local tooling check result: passed, version `2.120.0`.
- `docker version`
  - Initial sandbox result: failed due Docker config/engine pipe permission.
  - Escalated local tooling check result: passed.
  - Docker Desktop: `4.90.0`.
  - Docker Engine: `29.7.2`.
- `docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"`
  - Result: local Supabase containers were already running for project `ExpenseTracker`.
  - Confirmed local containers exposed API `56000`, DB `56001`, Studio `56004`, SMTP UI `56005`, and analytics `56006`.
  - No hosted project connection was used.

### Skip Root Cause

- The RLS tests were skipped because they expect:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `npx supabase status -o env` emits local names:
  - `API_URL`
  - `ANON_KEY`
  - `SERVICE_ROLE_KEY`
- The tests can run when those local values are mapped in-process to the expected `SUPABASE_*` names.
- No keys or token values were printed or persisted.

### Local RLS Test Results

- Command:
  - Captured `npx supabase status -o env` in PowerShell, mapped local values in-process to `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, stripped surrounding quotes, then ran:
  - `python -m pytest -q backend\tests\test_supabase_rls_integration.py -rs`
- Result:
  - `3 passed in 1.69s`
- Notes:
  - The CLI reported stopped optional services: `supabase_imgproxy_ExpenseTracker` and `supabase_pooler_ExpenseTracker`.
  - Those stopped services did not block Auth, PostgREST, or database RLS verification.

### Schema Validation

- Command:
  - `python -m pytest -q backend\tests\test_supabase_foundation.py`
- Result:
  - `12 passed in 0.03s`
- No database reset, hosted migration, or destructive hosted operation was run.

### Actual Secure Route Two-Account Verification

- Ran an in-process verifier using `fastapi.testclient.TestClient(app)` and the already-running local Supabase stack.
- The verifier:
  - Created two synthetic local Supabase users.
  - Used their real local access tokens.
  - Created distinguishable synthetic transactions through `POST /api/secure/transactions`.
  - Inserted distinguishable synthetic budgets through the ordinary authenticated PostgREST context.
  - Verified `GET /api/secure/data` returned only each user's own transactions and own budget values.
  - Verified a forged `user_id` submitted by User A did not assign ownership to User B.
  - Verified User A could not modify or delete User B's transaction through the secure FastAPI route, and User B could not modify or delete User A's transaction.
  - Verified `GET /api/secure/export` and `GET /api/secure/backup` did not mix user records.
  - Verified missing and invalid bearer tokens were rejected.
  - Verified the legacy SQLite route remained blocked/rejected when accessed with a bearer token and PIN header.
  - Cleaned up synthetic budgets, transactions, categories, and auth users through the local service-role context.
- Result:
  - `actual_secure_routes_two_user_verification: passed`
  - Checks covered: `create/read/update/delete/export/backup/missing-token/invalid-token/legacy-containment`

### Configuration Or Tooling Changes

- No application behavior changes were made.
- No Supabase config changes were made.
- No local database reset was run.
- No hosted Supabase command was run.
- No credentials were written to source files, tests, logs, or documentation.

### Remaining Verification

- Browser two-account verification remains outstanding.
- T-003 is still not marked complete by this environment-recovery task.

## 2026-10-11 - T-003 Browser Two-Account Verification Attempt

### Objective

- Perform the final browser verification against the local Supabase environment using two synthetic accounts and synthetic financial data.
- Preserve all uncommitted implementation work and keep T-003.5 legacy containment active.

### Local App Startup

- Confirmed ports before startup:
  - Backend port `8000`: initially appeared free, then a transient bind conflict occurred.
  - Frontend port `5175`: free.
- Started Vite with local Supabase public values mapped in-process from `npx supabase status -o env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Started FastAPI on `http://127.0.0.1:8000`.
- Confirmed `GET /api/auth/me` returned `401` without authentication once the backend was available.
- No hosted Supabase project was used.

### Browser Sequence Performed

- Opened the local app at `http://127.0.0.1:5175`.
- Created synthetic browser User A through the app sign-up UI.
- Verified User A account board displayed User A's synthetic email and `Backend Identity: Verified`.
- Added synthetic transaction `BROWSER_USER_A_ONLY` through the dashboard UI.
- Verified User A saw only User A's transaction and User A's financial summary values.
- Refreshed the page.
- Verified User A identity and User A transaction were restored after refresh.
- Logged out.
- Verified User A's email and transaction were no longer visible on the sign-in screen.
- Created synthetic browser User B through the app sign-up UI.
- Verified User B account board displayed User B's synthetic email and `Backend Identity: Verified`.
- Added synthetic transaction `BROWSER_USER_B_ONLY` through the dashboard UI.
- Verified User B saw only User B's transaction and User B's financial summary values.
- Verified User A email/transaction were not visible while signed in as User B.
- Logged out as User B and signed back in as User A.
- Verified User A saw `BROWSER_USER_A_ONLY`, did not see User B's email, and did not see `BROWSER_USER_B_ONLY`.
- Browser console error check:
  - Result: `0` console errors captured.

### Direct Cross-Account Browser Request

- Attempted to perform the direct cross-account request from the browser automation context while authenticated as User B.
- The Codex in-app browser Playwright evaluate sandbox did not expose `fetch`, `XMLHttpRequest`, `localStorage`, or `sessionStorage`.
- Because custom Authorization-header requests could not be issued from this browser context, the direct browser request step was not completed in-browser.
- This limitation does not invalidate the earlier local FastAPI/PostgREST route verification, but it means the requested browser sequence was not fully completed.

### Synthetic Data Cleanup

- Cleaned up synthetic browser-test local Supabase users through the local service-role admin API.
- Cleanup command printed only the count, not credentials:
  - `synthetic_browser_users_deleted=3`
- Auth user deletion cascaded the synthetic local financial rows through the schema's `on delete cascade` relationships.
- No real financial data was used.

### Result

- Visible browser verification for account board, refresh restoration, logout clearing, account switching, and visible financial isolation passed.
- Direct browser custom-header unauthorized request verification was blocked by the browser automation sandbox.
- T-003 remains incomplete until the direct browser request step is completed in a browser automation context that supports custom-header requests, or manually verified with browser devtools without exposing tokens.

## 2026-10-11 - T-003 Direct Authorization Verification And Closure Review

### Objective

- Complete the remaining direct unauthorized-request verification using a safe local method outside the restricted browser evaluate sandbox.
- Run final regression checks.
- Make an evidence-based T-003 closure decision.

### Defect Found And Fixed

- Found that cross-user `PATCH` and `DELETE` requests against `/api/secure/transactions/{txn_id}` were protected by RLS as no-ops, but the FastAPI route still returned success because PostgREST returned an empty affected set.
- Fixed `backend/postgres/financial.py` to request `return=representation` with `select=id` for update/delete operations and convert empty affected sets to `404 Transaction not found`.
- This keeps RLS as the isolation authority while avoiding false-success responses for hidden or nonexistent records.

### Tests Added Or Updated

- Updated `backend/tests/test_secure_financial_api.py`:
  - Delete now expects a returned affected row for success.
  - Added regression coverage for RLS-hidden update/delete returning `404`.
- Added `backend/tests/test_secure_financial_local_integration.py`:
  - Creates two synthetic local Supabase users.
  - Uses real local Supabase access tokens against the actual FastAPI secure routes.
  - Verifies User B cannot read, update, or delete User A's transaction.
  - Verifies User A's original record remains unchanged.
  - Verifies User B can still access User B's own record.
  - Verifies forged `user_id` values cannot assign ownership to another user.
  - Verifies missing/invalid tokens are rejected.
  - Verifies the legacy SQLite route remains blocked with a valid PIN.
  - Cleans up only synthetic local users and rows created for the test.

### Direct Authorization Evidence

- Command:
  - Local Supabase env was mapped in-process from `npx supabase status -o env`, without printing values.
  - `python -m pytest -q backend\tests\test_secure_financial_local_integration.py -rs`
- Result:
  - `1 passed in 1.57s`
- Combined local RLS/direct route command:
  - `python -m pytest -q backend\tests\test_supabase_rls_integration.py backend\tests\test_secure_financial_local_integration.py -rs`
- Result:
  - `4 passed in 2.74s`
- Notes:
  - The Supabase CLI reported stopped optional services: `supabase_imgproxy_ExpenseTracker` and `supabase_pooler_ExpenseTracker`.
  - Auth, PostgREST, database, and RLS verification succeeded without those optional services.

### Final Regression Results

- `pytest -q`
  - Result: passed.
  - Output summary: `38 passed, 4 skipped in 3.72s`.
  - Skips: local Supabase integration tests skip in the default suite unless local Supabase variables are mapped into the process.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 8 passed (8)`, `Tests 46 passed (46)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `847 modules transformed`, built in `954ms`.
  - Warning: Vite chunk-size warning remains; main app chunk is `1,211.07 kB` minified.
- `python -m compileall backend`
  - Result: passed.
- `python -m pytest -q backend\tests\test_supabase_foundation.py`
  - Result: passed.
  - Output summary: `12 passed in 0.04s`.
- `git diff --check`
  - Result: passed.
  - Warnings: Git reported LF-to-CRLF conversion warnings for existing modified files.

### Closure Review

- Auth lifecycle invokes backend identity verification after session restoration and auth-state changes.
- The account board displays the current authenticated account and backend verification state.
- Secure financial routes use verified JWT identity and ordinary local Supabase/PostgREST authenticated access.
- RLS and backend route behavior enforce per-user ownership for transactions, categories, budgets, summaries, export, and backup.
- Dashboard and browser-visible account switching did not leak stale financial state in the local browser verification.
- Missing and invalid tokens are rejected.
- Forged `user_id` values do not change ownership.
- T-003.5 legacy SQLite financial API routes remain blocked.
- Existing SQLite records were preserved; no ownership was guessed or imported.
- No hosted Supabase project or real financial data was used.

### T-003 Status

- T-003 is COMPLETE based on:
  - Passing mocked/unit regression tests.
  - Passing local Supabase RLS integration tests.
  - Passing direct local FastAPI/PostgREST two-user authorization verification.
  - Passing visible browser two-account verification.
  - Passing final frontend/backend/build/type/lint/diff gates.

## 2026-10-11 - T-005 Account UX, Password Recovery, Budgets, And Telegram UI Cleanup

### Objective

- Improve post-T-003 account UX without weakening JWT verification, RLS, or T-003.5 containment.
- Add password-strength feedback, password recovery, authenticated password update, and user-owned budget management.
- Remove active Telegram connection/options from the V1 UI while leaving backend bot implementation untouched for a future V3 review.

### Implementation

- Added shared frontend password feedback in `frontend/src/utils/password.ts`.
  - Validation is aligned with current local Supabase configuration: `minimum_password_length = 6`; stronger feedback is advisory, not presented as a hard Supabase rule.
- Updated `AuthPanel` sign-in/sign-up UX:
  - Password strength feedback while typing.
  - Password visibility toggle.
  - Confirm-password validation for sign-up.
  - Neutral forgot-password request copy that does not reveal whether an arbitrary email has an account.
- Added Supabase password recovery support:
  - `AuthProvider.resetPassword(email)` calls Supabase Auth password reset with a recovery redirect.
  - Added `PasswordRecoveryPage` at `/auth/recovery` for recovery-session password updates.
  - Added `VITE_SUPABASE_RECOVERY_REDIRECT_URL` to `.env.example`.
  - Added `http://localhost:5175/auth/recovery` to local Supabase `additional_redirect_urls`.
  - Hosted Supabase deployments must allow-list the same hosted recovery URL in the Supabase Auth redirect settings.
- Added authenticated change-password support:
  - `AuthProvider.updatePassword(password)` calls Supabase Auth `updateUser`.
  - `AccountBoard` provides the authenticated change-password form.
  - Plaintext passwords are not stored or logged.
- Removed visible `Backend Identity: Verified` text from the active account UI.
  - Backend identity verification remains active; user-facing errors now describe account access verification without exposing internal implementation labels.
- Added user-owned budget CRUD through secure FastAPI/PostgREST routes:
  - `GET /api/secure/budgets`
  - `POST /api/secure/budgets`
  - `PATCH /api/secure/budgets/{budget_id}`
  - `DELETE /api/secure/budgets/{budget_id}`
  - Budget ownership is derived from the verified bearer token and sent to Supabase/PostgREST with the user's access token and the public anon key so RLS remains in force.
  - Dashboard data now includes `config.budgetItems` with spending and remaining values derived from the current user's transactions.
  - No SQLite fallback was added.
- Added `BudgetManager` to the dashboard:
  - Create, view, edit, and delete budgets.
  - Required field, amount, period, and custom end-date validation.
  - INR formatting and empty state.
  - Spending/remaining display from current user transaction data.
- Removed Telegram UI entry points from active V1:
  - `ActivitySidebar` no longer renders `BotStatus`.
  - `DataOperations` no longer states that Telegram capture is active.
  - `backend/bot.py` and bot configuration were not deleted or changed.
  - Telegram remains deferred for a future V3 integration; no claim is made that Telegram entries write to the new PostgreSQL financial store.
- Legacy SQLite financial API containment remains in place. Existing SQLite data was not deleted, reset, migrated, or assigned to any Supabase account.

### Tests Added Or Updated

- Frontend:
  - `AuthPanel` tests for password feedback, confirm-password mismatch, forgot-password flow, and recovery redirect.
  - `AuthProvider` tests for Supabase password recovery/update methods and no token/password logging through those flows.
  - `PasswordRecoveryPage` tests for missing recovery sessions, successful password update, weak password, and mismatch handling.
  - `AccountBoard` tests for current email display, absence of the technical backend identity string, generic verification errors, logout, and password change.
  - `BudgetManager` tests for empty state, create, edit, delete, validation, and displayed remaining budget.
  - API helper tests for secure budget create/update/delete bearer headers.
  - Data operations regression test for current-account PDF labels and no visible Telegram text.
- Backend:
  - Secure financial API tests for budget create/update/delete requests, owner derivation from verified identity, and RLS-hidden budget update denial.
  - Local secure-route integration test now verifies two-user budget isolation, forged `user_id` rejection by ownership derivation, and cross-user budget update/delete denial.

### Validation Results

- `npm test -- --runInBand`
  - Result: failed before tests ran.
  - Reason: Vitest does not support the Jest `--runInBand` option in this project.
- `npm test`
  - Result: passed.
  - Output summary: `Test Files 10 passed (10)`, `Tests 56 passed (56)`.
- `pytest`
  - Initial default run result: `40 passed, 4 skipped in 1.30s`.
  - Skip reason: local Supabase service-role-backed integration variables were not present in the default shell environment.
- Full backend run with local Supabase env derived in-process from `npx supabase status -o env`, without printing values:
  - Result: passed.
  - Output summary: `44 passed in 4.74s`.
- Local Supabase RLS and secure-route integration subset with in-process local env:
  - Result: passed.
  - Output summary: `4 passed in 3.33s`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Warning: Vite chunk-size warning remains; largest built chunk reported as `1,227.21 kB` minified.
- `python -m compileall backend`
  - Result: passed.
- TOML syntax validation:
  - Command: `python -c "import pathlib, tomllib; tomllib.loads(pathlib.Path('supabase/config.toml').read_text(encoding='utf-8')); print('supabase/config.toml OK')"`
  - Result: passed.
- Supabase schema lint:
  - Command: `npx supabase db lint --local`
  - Result: passed; `No schema errors found`.
- `git diff --check`
  - Result: passed.
  - Warning: Git reported LF-to-CRLF conversion warnings for modified files.

### Manual Browser Verification

- Not performed for T-005 in this pass.
- Remaining manual checks:
  - Weak-password feedback during sign-up.
  - Password recovery email request and recovery session.
  - Password update and subsequent login.
  - Account board email display without the technical verification string.
  - Create/edit/delete budgets as one local synthetic user.
  - Confirm another local synthetic user cannot read or modify that user's budgets.
  - Empty budget state for a new user.
  - Confirm Telegram connection controls no longer appear in the active UI.
  - Confirm manual income and expense entry still works.
  - Confirm existing transaction isolation remains intact.

### Known Limitations

- Password recovery requires the hosted Supabase Auth redirect allow-list to include the deployed `/auth/recovery` URL before hosted recovery emails are used.
- Current password strength feedback is intentionally conservative and aligned to the configured Supabase minimum length; it is not a cryptographic password-quality guarantee.
- Budget spending is calculated from currently returned user-owned transactions for matching expense categories; date-window-specific budget spending can be refined later if product requirements demand it.
- Telegram is intentionally hidden from the active V1 UI and remains deferred to V3; existing backend bot code was not audited or migrated to PostgreSQL in this ticket.

## 2026-10-11 - Trakoria V2 Design-Driven Implementation And Password Recovery Follow-Up

### Objective

- Use `C:\Users\Admin\Downloads\Trakoria Dashboard Redesign (1).html` as the primary visual reference for the authenticated dashboard.
- Align the active React app with the approved V2 Overview, Add Transaction popup, Budgets, Transactions desktop/phone, and Settings patterns where practical within the current architecture.
- Keep T-003 secure `/api/secure/*` financial access, per-user PostgreSQL/RLS isolation, and T-003.5 legacy SQLite containment intact.
- Tighten password recovery/change-password UX to the configured local Supabase password policy.

### Design Reference Inspection

- The supplied HTML reference was accessible and inspected locally.
- The reference contains approved variants for:
  - first-run/auth,
  - dashboard/overview,
  - budget view,
  - desktop transaction ledger states,
  - phone overview,
  - phone transactions,
  - add-transaction dialog,
  - settings.
- Approved visual patterns identified:
  - dark terminal-inspired shell,
  - persistent desktop sidebar,
  - mobile bottom navigation with a central add action,
  - compact metric cards,
  - modal add-transaction flow,
  - grouped transaction ledger,
  - calendar/date filter,
  - risk-oriented budget rows,
  - account/settings panels.
- The design reference includes placeholder sample amounts, transaction labels, budget examples, and Telegram copy; these were not hardcoded into production behavior.

### Comparison Findings

- Existing secure auth, backend identity verification, PostgreSQL/RLS-backed transaction reads/writes, and budget CRUD were already present from T-003/T-005 work.
- The current dashboard was still a simpler one-page composition and did not match the approved multi-screen V2 shell.
- The app lacked the approved V2 navigation set: Overview, Transactions, Budgets, Insights, Data, Settings.
- Add transaction existed, but not as the approved modal-only entry flow from the desktop top bar and mobile center add button.
- Transactions lacked the approved combined search/filter/chip/calendar/grouped-ledger interaction model.
- Settings existed only partially through account/password components, not as a dedicated V2 screen.
- Active Telegram UI had already been mostly removed, but this pass rechecked the active V2 surfaces for Telegram/bot copy.

### Implementation

- Reworked `frontend/src/pages/DashboardPage.tsx` into a V2 authenticated shell:
  - desktop sidebar and mobile bottom navigation,
  - Overview, Transactions, Budgets, Insights, Data, and Settings screens,
  - approved Add Transaction modal entry points,
  - real authenticated transaction and budget data only,
  - meaningful empty/loading/error states,
  - no production hardcoded sample financial data.
- Added transaction update support through the existing secure frontend/backend path:
  - `frontend/src/services/api.ts`,
  - `frontend/src/hooks/useTransactions.ts`,
  - `frontend/src/types/transaction.ts`,
  - `frontend/src/App.tsx`.
- Transactions screen now supports:
  - live search,
  - numeric `above` / `below` search expressions,
  - type/category/date filters,
  - active filter chips and Clear all,
  - day calendar with upcoming dates disabled,
  - accessible calendar-day total labels,
  - grouped-by-day ledger rows with daily totals,
  - prefilled edit dialog,
  - delete confirmation,
  - real retry callback through `useTransactions.refresh`.
- Budgets screen uses the existing user-owned `BudgetManager` with secure budget endpoints.
- Settings screen now includes:
  - read-only signed-in email,
  - change-password form with show/hide, confirmation, requirement feedback, and disabled submit until valid,
  - terminal-lock section that does not pretend the legacy PIN is active in V2,
  - currency/grouping/decimal preview and non-conversion warning,
  - logout action.
- Password policy alignment:
  - `frontend/src/utils/password.ts` now requires at least 8 characters and at least one number.
  - `supabase/config.toml` now uses `minimum_password_length = 8` and `password_requirements = "letters_digits"`.
  - Sign-up, recovery, account-board, and settings password flows were updated to match that policy.
- Password recovery remains implemented through Supabase Auth:
  - recovery request uses `resetPasswordForEmail(...)` with `VITE_SUPABASE_RECOVERY_REDIRECT_URL`.
  - `/auth/recovery` accepts a restored Supabase recovery session and calls `updateUser({ password })`.
  - UI uses privacy-safe recovery request confirmation.
- Telegram/bot UI:
  - active V2 dashboard surfaces do not expose Telegram connection controls, bot-online status, `/add` hints, or visible "via bot" labels.
  - backend bot code remains in place for future V3 scope.
- Visible `Backend Identity: Verified` text remains removed from user-facing account UI while backend identity verification remains active.

### Tests Added Or Updated

- Added `frontend/src/__tests__/pages/DashboardPage.test.tsx` for V2 navigation, Telegram UI absence, add-transaction modal save, transaction numeric filtering/editing, settings password validation, and logout.
- Updated existing auth/account/recovery tests for the 8-character plus number password policy and disabled invalid-submit behavior.
- Updated API helper tests for secure transaction update requests.

### Automated Validation Results

- `npm test`
  - Result: passed.
  - Output summary: `Test Files 11 passed (11)`, `Tests 60 passed (60)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `75 modules transformed`; output included `dist/index.html`, CSS, and JS bundle; no Vite chunk-size warning in this run.
- `pytest -q`
  - Result: passed with skips.
  - Output summary: `40 passed, 4 skipped in 1.89s`.
- `pytest -q -rs`
  - Result: passed with skips.
  - Output summary: `40 passed, 4 skipped in 2.15s`.
  - Skips: local Supabase RLS integration tests require `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the process environment.
- Local Supabase RLS/secure-route subset with local CLI values mapped in-process without printing values:
  - Command: `python -m pytest -q backend\tests\test_supabase_rls_integration.py backend\tests\test_secure_financial_local_integration.py -rs`
  - Result: passed.
  - Output summary: `4 passed in 4.13s`.
- Full backend suite with local CLI values mapped in-process without printing values:
  - Command: `python -m pytest -q -rs`
  - Result: passed.
  - Output summary: `44 passed in 5.69s`.
- `python -m compileall backend`
  - Result: passed.
- TOML syntax validation:
  - Command: `python -c "import pathlib, tomllib; tomllib.loads(pathlib.Path('supabase/config.toml').read_text(encoding='utf-8')); print('supabase/config.toml OK')"`
  - Result: passed; `supabase/config.toml OK`.
- Supabase schema lint:
  - Initial sandboxed run failed because the Supabase CLI attempted to write telemetry/cache data under `C:\Users\Admin\.supabase`.
  - Escalated rerun command: `npx supabase db lint --local`
  - Result: passed; `No schema errors found`.
- `git diff --check`
  - Result: passed before this log entry.
  - Warning: Git reported LF-to-CRLF conversion warnings for modified files.

### Manual And Browser Verification

- Browser verification was not performed in this pass.
- Local Mailpit or hosted recovery email delivery was not verified in this pass.
- No hosted Supabase project, hosted SMTP provider, real financial data, real passwords, or real recovery tokens were used.

### Required Supabase Password Recovery Configuration

- Local development:
  - `supabase/config.toml` allow-lists `http://localhost:5175/auth/recovery`.
  - `VITE_SUPABASE_RECOVERY_REDIRECT_URL` should point to `http://localhost:5175/auth/recovery`.
  - Local email delivery should be verified through local Supabase Mailpit when performing browser/manual recovery checks.
- Hosted deployment:
  - Add the deployed `https://<production-domain>/auth/recovery` URL to Supabase Auth redirect allow-list.
  - Configure Supabase Auth SMTP with a verified sender domain and provider credentials in the Supabase dashboard or hosting secret store.
  - Do not commit SMTP credentials or place them in frontend code.
  - Do not treat a successful reset API response as proof that email delivery works; verify an actual recovery email link end-to-end before release.

### Known Limitations And Remaining Verification

- This V2 pass is not marked complete because browser verification and actual email-delivery/recovery-link verification were not performed.
- The active V2 dashboard is substantially closer to the approved reference, but `DashboardPage.tsx` is now large and should be split into focused components in a follow-up cleanup pass.
- Currency/format settings currently affect the displayed V2 session preview/rendering but are not yet persisted as user preferences.
- Data screen exports the currently loaded authenticated account data from the frontend state; hosted export/download behavior should be browser-verified before release.
- Password reset email delivery still requires local Mailpit or hosted SMTP verification.
- Existing SQLite data was preserved and no ownership was guessed or migrated.

## 2026-10-11 - V2 Critical Fixes: Mobile Filter Dropdown And Password Recovery

### Objective

- Fix the Transactions filter dropdown presentation defect without changing working financial logic.
- Verify and harden password recovery request/session/update behavior.
- Preserve Supabase Auth, secure `/api/secure/*` routes, JWT verification, PostgreSQL RLS, and T-003.5 legacy SQLite containment.

### Issue A - Mobile Filter Dropdown

#### Investigation

- Inspected `frontend/src/pages/DashboardPage.tsx`.
- Confirmed the Transactions filter controls for type, category, and date range were native HTML `<select>` elements.
- The closed controls were styled dark, but native select option popups are rendered by the browser/OS and cannot be reliably styled with app CSS, especially on mobile browsers.
- This explains the observed giant white popup over the dark V2 dashboard.

#### Implementation

- Replaced the three Transactions filter `<select>` controls with an accessible custom dark `FilterDropdown` listbox component in `frontend/src/pages/DashboardPage.tsx`.
- The new dropdowns preserve existing filter state and filtering behavior.
- Added:
  - dark V2 styling for closed and open states,
  - selected-value display,
  - `aria-haspopup="listbox"`, `aria-expanded`, `role="listbox"`, and `role="option"`,
  - focus on the selected option when opened,
  - Escape-to-close behavior,
  - outside-click dismissal,
  - bounded dropdown height with scrolling.
- Backend APIs and financial logic were not changed for this issue.

#### Tests

- Updated `frontend/src/__tests__/pages/DashboardPage.test.tsx`.
- Added coverage for:
  - opening the type dropdown,
  - selecting a type,
  - opening/selecting category,
  - opening date range,
  - Escape-to-close,
  - preserving selected values and existing filtering behavior.

#### Browser Check

- Used the in-app browser against `http://localhost:5175`.
- Created and then deleted a synthetic local Supabase user for the check.
- Verified the Transactions type filter rendered as an in-app dark listbox, not a native white popup.
- Observed viewport reported by the browser page: `1280x720`.
- Attempted to open a mobile-sized browser tab with a `390x844` viewport option, but the in-app browser still reported/rendered at `1280x720`; true narrow viewport emulation was not available through this tool in this pass.
- No real-device verification was performed.

### Issue B - Password Recovery

#### Investigation

- Inspected:
  - `frontend/src/pages/PasswordRecoveryPage.tsx`,
  - `frontend/src/App.tsx`,
  - `frontend/src/auth/AuthProvider.tsx`,
  - `frontend/src/auth/auth-context.ts`,
  - `frontend/src/services/supabase.ts`,
  - `supabase/config.toml`,
  - `.env.example`,
  - password recovery tests,
  - this development log.
- Confirmed the app already calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- Confirmed the local redirect URL is configured as `http://localhost:5175/auth/recovery` in `.env.example` and `supabase/config.toml`.
- Confirmed `createSupabaseBrowserClient()` has `detectSessionInUrl: true`.
- Found a recovery-page state gap: `/auth/recovery` accepted any existing Supabase session as eligible to show the new-password form, rather than requiring a Supabase recovery context.
- Email non-delivery cannot be fixed from frontend code alone when SMTP/provider/domain configuration is missing or blocked. A successful Supabase API response only means the request was accepted by Supabase Auth, not that an email reached an inbox.

#### Implementation

- Added `isPasswordRecovery` to the auth context.
- `AuthProvider` now sets recovery mode when:
  - Supabase emits the `PASSWORD_RECOVERY` auth event, or
  - the URL contains a recovery marker from the reset link.
- Sign-up, sign-in, and sign-out clear recovery mode.
- `PasswordRecoveryPage` now:
  - shows the password reset form only when both a session and a recovery context are present,
  - treats ordinary sessions on `/auth/recovery` as invalid recovery state,
  - shows a useful expired/missing/already-used link message,
  - validates weak and mismatched passwords before update,
  - reports success only after `updateUser({ password })` succeeds,
  - provides a Return To Sign In action after success or invalid recovery state.

#### Tests

- Updated `frontend/src/__tests__/pages/PasswordRecoveryPage.test.tsx`.
- Updated `frontend/src/__tests__/components/AuthPanel.test.tsx`.
- Added/covered:
  - reset request success and redirect URL,
  - reset request API error handling,
  - missing/expired recovery state,
  - ordinary non-recovery session rejected on recovery route,
  - valid recovery session password update,
  - weak password disabled state,
  - mismatch validation,
  - password update failure,
  - successful update with return-to-sign-in action present.

#### Local Email Integration Verification

- Used local Supabase and Mailpit only.
- Created a synthetic local user.
- Requested password recovery via Supabase Auth.
- Confirmed an actual recovery email was captured in local Mailpit.
- Opened the captured Supabase auth link programmatically without printing the URL or tokens.
- Confirmed the link redirected to `/auth/recovery` with a recovery session marker.
- Used the recovery session to update the password.
- Confirmed sign-in with the new password succeeded.
- Deleted the synthetic local user after verification.
- No tokens, recovery links, passwords, SMTP credentials, service-role keys, or `.env` values were printed.

### Required Manual Hosted Configuration

- Hosted Supabase Auth must allow-list the deployed recovery URL:
  - `https://<production-domain>/auth/recovery`
- Local development should keep:
  - `http://localhost:5175/auth/recovery`
- Configure custom SMTP in Supabase Auth with:
  - a production email provider,
  - a verified sender domain,
  - provider credentials stored only in Supabase/hosting secret settings,
  - no SMTP credentials in Git or frontend code.
- Hosted delivery remains unverified until a real hosted recovery email is received and used successfully with a synthetic hosted test account.

### Validation Results

- `npm test`
  - Result: passed.
  - Output summary: `Test Files 11 passed (11)`, `Tests 64 passed (64)`.
- `npm run lint`
  - Result: passed.
- `npx tsc --noEmit`
  - Result: passed.
- `npm run build`
  - Result: passed.
  - Output summary: `75 modules transformed`; built `dist/index.html`, CSS, and JS bundle.
- `pytest -q -rs`
  - Result: passed with local-Supabase integration skips in the default shell.
  - Output summary: `40 passed, 4 skipped in 0.86s`.
  - Skip reason: default shell did not provide `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Local Supabase RLS/secure financial subset with local CLI values mapped in-process:
  - Command: `python -m pytest -q backend\tests\test_supabase_rls_integration.py backend\tests\test_secure_financial_local_integration.py -rs`
  - Result: passed.
  - Output summary: `4 passed in 2.91s`.
- Full backend suite with local CLI values mapped in-process:
  - Command: `python -m pytest -q -rs`
  - Result: passed.
  - Output summary: `44 passed in 3.97s`.
- Local Supabase/Mailpit recovery script:
  - Result: passed.
  - Output summary:
    - `local recovery email captured: yes`
    - `local recovery redirect route: /auth/recovery`
    - `local recovery password update: passed`
    - `local sign-in with new password: passed`
- `python -m compileall backend`
  - Result: passed.
- `git diff --check`
  - Result: passed.
  - Warning: Git reported LF-to-CRLF conversion warnings for modified files.

### Status

- Issue A is fixed in code and automated tests. Browser rendering was verified in the available in-app browser viewport, but not in a true narrow/mobile viewport because viewport emulation was unavailable.
- Issue B is fixed for local Supabase/Mailpit and automated flows. Hosted SMTP/email delivery remains pending project-owner configuration and hosted end-to-end verification.

## 2026-10-11 - V2 Final Mobile Budgets Fix

### Objective

- Fix the remaining native mobile dropdown issue in the Budgets form only.
- Preserve existing budget create, edit, delete, validation, and period calculation behavior.
- Do not modify password recovery, backend authorization, financial APIs, or unrelated screens.

### Investigation

- Inspected `frontend/src/components/BudgetManager.tsx`.
- Found two native `<select>` controls in the Budgets form:
  - `Category`
  - `Period`
- The Period select was the reported mobile white-popup issue, and Category had the same native-popup risk.
- Start and end dates were already stored as date-only input values, but edit mode accepted API values directly. If an API ever returned an ISO timestamp, the browser date input could receive an invalid value or show an inconsistent calendar date.

### Implementation

- Extracted the existing Transactions dark listbox into `frontend/src/components/ui/FilterDropdown.tsx`.
- Updated `frontend/src/pages/DashboardPage.tsx` to import the shared dropdown instead of defining it inline.
- Replaced Budgets form native dropdowns with the shared dark listbox:
  - `Budget category`
  - `Budget period`
- Budget period options remain:
  - Weekly
  - Monthly
  - Yearly
  - Custom
- Added date-only normalization in `BudgetManager`:
  - form state and edit-mode population use `YYYY-MM-DD`,
  - validation compares date-only strings,
  - save payload sends date-only `start_date` and `end_date`,
  - budget cards display date-only start/end dates.
- Kept native date inputs as `type="date"` because they are date pickers, not dropdown selects; no UTC `Date` construction was introduced.
- Adjusted the Budgets form grid so controls stack cleanly on narrow screens and do not require horizontal overflow.

### Tests

- Updated `frontend/src/__tests__/components/BudgetManager.test.tsx`.
- Added/covered:
  - dark category listbox opens and selects a category,
  - all period options can be selected: Weekly, Monthly, Yearly, Custom,
  - custom-period end date is required and must not precede start date,
  - start date payload preserves the selected date,
  - edit mode normalizes ISO-like stored dates to date-only input values,
  - edited start/end dates are submitted as date-only values.

### Validation Results

- Focused frontend tests:
  - Command: `npm test -- BudgetManager DashboardPage`
  - Result: passed.
  - Output summary: `Test Files 2 passed (2)`, `Tests 9 passed (9)`.
- Full frontend tests:
  - Command: `npm test`
  - Result: passed.
  - Output summary: `Test Files 11 passed (11)`, `Tests 66 passed (66)`.
- TypeScript:
  - Command: `npx tsc --noEmit`
  - Result: passed.
- Lint:
  - Command: `npm run lint`
  - Result: passed.
- Production build:
  - Command: `npm run build`
  - Result: passed.
  - Output summary: `76 modules transformed`; built `dist/index.html`, CSS, and JS bundle.
- `git diff --check`
  - Result: passed.
  - Warning: Git reported LF-to-CRLF conversion warnings for modified files.

### Browser Verification

- Real `393 x 852` browser viewport verification was attempted but not available in this environment:
  - the in-app browser previously rendered/reported desktop dimensions even when a mobile viewport was requested,
  - Chrome browser automation was unavailable,
  - Playwright was not installed in the project.
- Therefore, no real iPhone 16 / `393 x 852` verification is claimed in this pass.

### Status

- Budgets native dropdown issue is fixed in code and automated tests.
- Manual Chrome DevTools verification at `393 x 852` remains recommended before release.

## 2026-10-11 - T-006 Deployment Readiness Audit

### Objective

- Audit Trakoria V2 for staging deployment readiness on Cloudflare Pages and Render.
- Preserve local development on `localhost:5175`.
- Avoid deployment, hosted data changes, commits, or secret disclosure.

### Findings

- `backend/api.py` exports `app = FastAPI()`, so Render can start the ASGI app with Uvicorn.
- Secure financial routes remain under `/api/secure/*` and depend on verified bearer JWT identity.
- Supabase JWT verification is environment-driven through `SUPABASE_URL` and `SUPABASE_JWT_AUDIENCE`; issuer and JWKS URLs are derived from the configured Supabase project URL.
- Secure PostgREST financial access uses the Supabase anon key plus the verified user's access token so RLS evaluates requests in the ordinary authenticated context.
- Frontend code uses public `VITE_` variables only. No frontend service-role key usage was found.
- Legacy SQLite/PIN routes remain present but contained by the T-003.5 blocker for `/api/data`, `/api/transactions`, `/api/export`, and `/api/backup`.
- The Telegram bot implementation remains outside the FastAPI app. It should not be run as part of the Render staging web service until the V3 integration is reviewed.
- Pre-audit deployment blockers found:
  - wildcard backend CORS,
  - no backend requirements file for a clean Render install,
  - no Cloudflare Pages SPA rewrite for `/auth/callback` and `/auth/recovery`,
  - hosted frontend could fall back to an invalid same-host `:8000` API URL if `VITE_API_BASE_URL` was missing.

### Implementation

- Added explicit CORS origin handling in `backend/config.py`.
  - `CORS_ORIGINS` is comma-separated.
  - Wildcard `*` is rejected.
  - Local defaults remain `http://localhost:5175` and `http://127.0.0.1:5175`.
- Updated `backend/api.py` to use the CORS allowlist and added `GET /healthz`.
- Added `backend/requirements.txt` for Render installation.
- Added `frontend/public/_redirects` with `/* /index.html 200` for Cloudflare Pages SPA deep links.
- Updated `frontend/src/services/api.ts` so hosted frontends require an explicit `VITE_API_BASE_URL`; localhost still falls back to port `8000`.
- Updated `.env.example` with deployment-relevant public/local placeholders and CORS configuration.
- Added backend tests for CORS configuration and health checks.
- Added frontend API helper tests for hosted API URL behavior.

### Deployment Instructions

- Cloudflare Pages:
  - Project root: `frontend`.
  - Build command: `npm run build`.
  - Build output directory: `dist`.
  - Required environment variable names:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`
    - `VITE_API_BASE_URL`
    - `VITE_SUPABASE_REDIRECT_URL`
    - `VITE_SUPABASE_RECOVERY_REDIRECT_URL`
- Render web service:
  - Build command: `pip install -r backend/requirements.txt`.
  - Start command: `uvicorn backend.api:app --host 0.0.0.0 --port $PORT`.
  - Required environment variable names:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_JWT_AUDIENCE`
    - `CORS_ORIGINS`
    - `APP_PIN`
  - Do not configure frontend-exposed service-role values.
  - `SUPABASE_SERVICE_ROLE_KEY` is not required for the deployed secure financial request path and should remain server-only if ever used for an explicitly reviewed backend task.
- Supabase Auth:
  - Set hosted Site URL to the Cloudflare Pages staging URL.
  - Add hosted redirect URLs for `/auth/callback` and `/auth/recovery`.
  - Preserve local redirect URLs for `http://localhost:5175/auth/callback` and `http://localhost:5175/auth/recovery`.
  - Configure SMTP and sender-domain verification before claiming hosted password recovery delivery.
- Database/RLS:
  - Apply existing migrations only to the intended hosted staging project.
  - Verify RLS is enabled for `categories`, `transactions`, and `budgets`.
  - Confirm Supabase backups and staging retention settings in the Supabase dashboard.
  - Do not import or assign ownership for legacy SQLite records as part of deployment setup.

### Validation Results

- Focused frontend API tests:
  - Command: `npm test -- api`
  - Result: passed.
  - Output summary: `Test Files 1 passed (1)`, `Tests 13 passed (13)`.
- Focused backend deployment/JWT tests:
  - Command: `pytest -q backend\tests\test_deployment_config.py backend\tests\test_auth_jwt.py -rs`
  - Result: passed.
  - Output summary: `16 passed in 0.71s`.
- Full frontend tests:
  - Command: `npm test`
  - Result: passed.
  - Output summary: `Test Files 11 passed (11)`, `Tests 67 passed (67)`.
- Full backend tests:
  - Command: `pytest -q -rs`
  - Result: passed with local-Supabase integration skips in the default shell.
  - Output summary: `44 passed, 4 skipped in 3.30s`.
  - Skip reason: default shell did not provide `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Local Supabase RLS/secure financial subset with local CLI values mapped in-process:
  - Command: `python -m pytest -q backend\tests\test_supabase_rls_integration.py backend\tests\test_secure_financial_local_integration.py -rs`
  - Result: passed.
  - Output summary: `4 passed in 2.92s`.
- Lint:
  - Command: `npm run lint`
  - Result: passed.
- TypeScript:
  - Command: `npx tsc --noEmit`
  - Result: passed.
- Production build:
  - Command: `npm run build`
  - Result: passed.
  - Output summary: `76 modules transformed`; built `dist/index.html`, CSS, and JS bundle.
  - Confirmed `frontend/dist/_redirects` exists after build.
- Python compile check:
  - Command: `python -m compileall backend`
  - Result: passed.
- Supabase schema lint:
  - Command: `npx supabase db lint --local`
  - Result: passed.
  - Output summary: `No schema errors found`.
- Whitespace diff check:
  - Command: `git diff --check`
  - Result: passed.
  - Warning: Git reported LF-to-CRLF conversion warnings for modified files.

### Readiness

- Cloudflare Pages: NEEDS MANUAL ACTION.
  - Code/config is ready for SPA routing, but the project must be created/configured with the required public environment variables.
- Render: NEEDS MANUAL ACTION.
  - Code/config is ready for a Python web service, but the service must be created/configured with explicit CORS and Supabase environment variables.
- Supabase Auth: NEEDS MANUAL ACTION.
  - Hosted redirect URLs, Site URL, and SMTP/sender-domain settings must be configured and tested in the hosted project.
- Database/RLS: NEEDS MANUAL ACTION.
  - Local RLS tests passed. Hosted staging migrations, RLS status, and backups must be verified without touching production data.

### Limitations

- No Cloudflare, Render, or hosted Supabase deployment was performed.
- No hosted browser verification was performed.
- No production or hosted financial data was read or modified.
