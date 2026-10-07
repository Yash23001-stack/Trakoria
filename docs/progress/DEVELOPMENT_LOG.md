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
