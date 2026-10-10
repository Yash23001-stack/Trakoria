# Trakoria — STARTUP.md

> **Track Money. Own Your Data.**
>
> Internal engineering and onboarding guide for the Trakoria development team.

---

## 1. Project Mission

Trakoria is a privacy-first personal finance application designed to help people track income, expenses, budgets, and spending patterns without unnecessary complexity.

### Product principles

1. **Privacy First** — financial data must be protected and isolated per user.
2. **Offline-Friendly** — the product should remain useful during poor/no connectivity where practical.
3. **Simple Manual Entry** — users should be able to add transactions quickly without Telegram.
4. **Own Your Data** — users must be able to export their financial data.
5. **Fast and Focused** — avoid unnecessary features and over-engineering.
6. **Cross-Platform** — the same Trakoria account should work on Web and Android.
7. **Reliable Before Clever** — correctness and data integrity take priority over flashy features.

---

## 2. Team Structure

### ChatGPT — Manager / Technical Lead / Guide / Review

Responsibilities:
- Own project direction and architecture decisions.
- Break work into implementation tasks.
- Review development decisions and completed work.
- Maintain engineering standards.
- Define Definition of Done.
- Coordinate Yash, Gemini, and Codex workflows.
- Reject unnecessary scope and over-engineering.

### Yash — Developer

Responsibilities:
- Implement assigned features.
- Propose product and engineering ideas.
- Test changes locally.
- Raise technical concerns early.
- Keep documentation aligned with implementation.

### Gemini — Developer

Responsibilities:
- Development partner for Yash.
- Implement assigned work and investigate technical alternatives.
- Help solve bugs and implementation problems.
- Follow the architecture and rules in this document.

### Codex — Full-Stack QA & QC

Responsibilities:
- Review completed implementation.
- Test frontend, backend, database, authentication, APIs, and integration flows.
- Identify regressions and security/data-isolation issues.
- Fix issues when appropriate.
- Re-test after fixes.
- Give the final technical quality signal before release.

---

## 3. Development Workflow

```text
Requirement
    ↓
Architecture / Task Definition
    ↓
Yash + Gemini Development
    ↓
Local Testing
    ↓
ChatGPT Review
    ↓
Codex Full-Stack QA/QC
    ↓
Fixes if required
    ↓
Regression Test
    ↓
Approved
    ↓
Commit / Deploy
```

No feature is considered complete merely because the code compiles.

---

## 4. Current Prototype

The current repository is the original Trakoria/ExpenseTracker prototype.

### Current stack

- React 19
- Vite
- Tailwind CSS
- Recharts
- FastAPI
- Python
- SQLite
- Telegram Bot API

### Current architecture

```text
React
  ↓
FastAPI
  ↓
SQLite

Telegram Bot
  ↓
SQLite
```

### Local Development Startup

Quick start from the repository root:

```powershell
.\start-dev.ps1
```

For an isolated smoke-test database that does not touch the prototype `expenses.db`:

```powershell
.\start-dev.ps1 -UseSmokeDb
```

Manual startup:

```powershell
uvicorn backend.api:app --reload
```

```powershell
cd frontend
npm run dev
```

Expected local URLs:

```text
Backend API:          http://127.0.0.1:8000
Frontend:             http://localhost:5175
Local Supabase API:   http://127.0.0.1:56000
Local Supabase DB:    postgresql://postgres:postgres@127.0.0.1:56001/postgres
Local Supabase Studio:http://127.0.0.1:56004
Local Supabase Mail:  http://127.0.0.1:56005
```

The frontend is React + TypeScript + Vite. The normal frontend development command is `npm run dev`, and Vite is configured to use port `5175`.

### Important prototype characteristics

- Single global application PIN.
- SQLite database.
- Telegram is a major transaction input path.
- API returns all transactions after PIN verification.
- Frontend stores the PIN in browser localStorage.
- Configuration is stored in `config.json`.
- Export functionality is local/server-side.
- Current database contains Telegram `chat_id` for transaction ownership.

This architecture is suitable for a personal prototype but **must not be deployed publicly as-is**.

---

## 5. Target V1 Architecture

```text
                         TRAKORIA
                            │
              ┌─────────────┴─────────────┐
              │                           │
          React Web                  Android App
              │                       Capacitor
              └─────────────┬─────────────┘
                            │
                         HTTPS
                            │
                         FastAPI
                            │
                  Authentication Layer
                            │
                    PostgreSQL / Supabase
                            │
              ┌─────────────┼─────────────┐
              │             │             │
            User A        User B        User C
              │             │             │
           private       private       private
            data          data          data
```

### V1 rule

**Every user-owned record must have a clear ownership boundary.**

Do not rely on frontend-supplied user IDs.

The backend determines the authenticated user from the authenticated session/token.

---

## 6. V1 Product Scope

### Account

- Registration
- Login
- Logout
- Secure password handling
- Session/JWT management
- Account deletion

### Transactions

- Add expense
- Add income
- Edit transaction
- Delete transaction
- Historical transaction date
- Category
- Note
- Created/updated timestamps
- Transaction ownership

### Dashboard

- Current balance
- Income
- Expenses
- Monthly spending
- Category breakdown
- Budget tracking
- Transaction timeline
- Calendar/heatmap
- Filters/search

### Data

- CSV export
- JSON export
- User data export
- Backup strategy

### Platforms

- Responsive web application
- Android APK
- Shared backend/API

### Not required for V1

- Telegram as a core dependency
- AI financial advisor
- Bank account integration
- Complex microservices
- Kubernetes
- Real-time collaboration
- Subscription billing

---

## 7. Database Direction

### Current

SQLite:

```text
txns
 ├── id
 ├── date
 ├── category
 ├── amount
 ├── note
 ├── type
 ├── chat_id
 └── created_at
```

### Target

PostgreSQL.

Minimum conceptual model:

```text
users
 ├── id
 ├── email
 ├── password_hash
 ├── display_name
 ├── created_at
 └── updated_at

transactions
 ├── id
 ├── user_id
 ├── date
 ├── category_id/category
 ├── amount
 ├── note
 ├── type
 ├── created_at
 └── updated_at

categories
 ├── id
 ├── user_id / system ownership
 ├── name
 └── created_at

budgets
 ├── id
 ├── user_id
 ├── category
 ├── amount
 ├── period
 └── created_at
```

The exact schema must be finalized before migration.

### Supabase/PostgreSQL foundation

T-002 introduces reproducible Supabase migration files under:

```text
supabase/migrations/
```

Current foundation migration:

```text
supabase/migrations/001_initial_schema.sql
```

Supabase Auth is the V1 identity source. Application data references `auth.users(id)` and is protected by PostgreSQL Row Level Security.

V1 financial tables:

```text
categories
transactions
budgets
```

The current SQLite prototype remains active until a later approved migration task. Do not point existing dashboard endpoints at Supabase/PostgreSQL yet.

### Supabase environment configuration

Use `.env.example` as the placeholder template. Never commit real Supabase credentials.

Backend-only values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=
```

Frontend public values for browser client/auth work:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_REDIRECT_URL=
```

Local frontend Supabase development normally uses:

```env
VITE_SUPABASE_URL=http://127.0.0.1:56000
VITE_SUPABASE_REDIRECT_URL=http://localhost:5175/auth/callback
```

Use the local public publishable or anonymous key from `npx supabase status -o env`. Never expose `SUPABASE_SERVICE_ROLE_KEY`, JWT signing secrets, OAuth client secrets, or database passwords to the React frontend.

### Local Supabase development

The repository uses the official Supabase CLI through a project-local npm dev dependency.

Check the local CLI:

```powershell
npx supabase --version
```

Initialize local Supabase configuration, if `supabase/config.toml` is missing:

```powershell
npx supabase init --yes
```

Run the local Supabase stack only when Docker Desktop is installed and running:

```powershell
npx supabase start
```

Expected local Supabase ports from `supabase/config.toml`:

```text
API:       http://127.0.0.1:56000
DB:        postgresql://postgres:postgres@127.0.0.1:56001/postgres
Shadow DB: localhost:56002
Pooler:    localhost:56003 (disabled by default)
Studio:    http://127.0.0.1:56004
SMTP UI:   http://127.0.0.1:56005
Analytics: localhost:56006
```

The local Supabase Auth callback URL for the Vite frontend is:

```text
http://localhost:5175/auth/callback
```

Keep this URL in the local Supabase redirect allow-list. Hosted frontend callback URLs must be configured deliberately for the target hosting domain and are not guessed in this repository.

Do not run hosted-project link, push, or remote database commands during local environment setup. The current SQLite prototype remains the active application database until a later approved migration task.

---

## 8. Authentication & Authorization Rules

The prototype's global PIN is not acceptable for public multi-user deployment.

### Required

- Passwords must never be stored in plaintext.
- Use a strong password hashing algorithm such as Argon2id.
- Use secure sessions or short-lived access tokens with an appropriate refresh strategy.
- HTTPS is mandatory in production.
- Backend authorization must determine the current user.
- Every transaction query must be scoped to the authenticated user.
- Delete/update operations must verify ownership.
- Never trust `user_id` supplied by the frontend.
- Never put secrets in frontend source code.
- Never commit `.env` files.

### Example safe pattern

```text
Authenticated Request
        ↓
Backend validates session/token
        ↓
Backend obtains current_user.id
        ↓
Query:
WHERE transactions.user_id = current_user.id
```

---

## 9. Manual Transaction Entry

Manual entry is the primary V1 input method.

### Quick Add

The ideal common flow:

```text
Amount
Category
Date
Optional Note
      ↓
Save
```

The form should be fast enough that a user can record an expense in seconds.

Advanced fields can be progressively disclosed rather than making every transaction form large.

---

## 10. Telegram

Telegram is **not a V1 dependency**.

It can be restored later as an optional integration:

```text
Telegram
    ↓
Telegram identity linked to Trakoria account
    ↓
FastAPI
    ↓
Transaction service
    ↓
PostgreSQL
```

The Telegram bot must never become the source of truth.

The database is the source of truth.

---

## 11. API Design

Use a versioned API structure where practical.

Example:

```text
/api/v1/auth/register
/api/v1/auth/login
/api/v1/auth/logout

/api/v1/users/me

/api/v1/transactions
/api/v1/transactions/{id}

/api/v1/categories
/api/v1/budgets

/api/v1/dashboard
/api/v1/export
```

### API rules

- Validate all request bodies.
- Return consistent HTTP status codes.
- Return useful error messages without leaking internals.
- Validate ownership on resource operations.
- Keep business logic out of route handlers where it becomes complex.
- Prefer service/repository layers as the codebase grows.

---

## 12. Frontend Rules

- React components should have clear responsibilities.
- Avoid giant components.
- API calls should be centralized rather than scattered everywhere.
- Authentication state must be handled consistently.
- Never store sensitive secrets in frontend code.
- Do not trust frontend authorization.
- Loading, empty, error, and success states should be implemented.
- Preserve Trakoria's terminal-inspired visual identity unless a product decision changes it.

---

## 13. Android Strategy

The preferred initial Android approach is to reuse the React application through Capacitor where practical.

```text
React/Vite
    ↓
Capacitor
    ↓
Android
    ↓
APK
```

Native functionality should only be introduced where it provides meaningful value.

Potential future native capabilities:

- Local/offline database
- Notifications
- Biometrics
- Receipt/camera capture
- Background sync

---

## 14. Offline Strategy

Offline support should be introduced deliberately.

Target model:

```text
User action
    ↓
Local client state/storage
    ↓
Immediate UI response
    ↓
Sync queue
    ↓
FastAPI
    ↓
PostgreSQL
```

The synchronization model must define:
- Unique transaction IDs.
- Created/updated timestamps.
- Sync status.
- Retry behavior.
- Conflict handling.
- Duplicate prevention.

Do not implement offline sync casually; it affects data integrity.

---

## 15. Security Checklist

Before public beta:

- [ ] No secrets committed to Git.
- [ ] Rotate any credentials that were previously committed/exposed.
- [ ] HTTPS enabled.
- [ ] Authentication implemented.
- [ ] Password hashing implemented.
- [ ] Authorization tested.
- [ ] User data isolation tested.
- [ ] CORS restricted to approved origins.
- [ ] Rate limiting considered for authentication endpoints.
- [ ] Request validation implemented.
- [ ] Database backups configured.
- [ ] Account deletion implemented.
- [ ] Data export implemented.
- [ ] Production error responses do not expose stack traces.
- [ ] Dependency vulnerabilities reviewed.

---

## 16. Repository Hygiene

Do not commit generated or secret files.

Never commit:

```text
.env
*.db
*.sqlite3
__pycache__/
node_modules/
dist/
build/
```

The repository should contain source code and reproducible configuration, not local secrets or personal financial records.

The current project archive contains generated/local artifacts that must be cleaned before the public repository is treated as production source.

---

## 17. Git Rules

Use meaningful commits.

Examples:

```text
feat: add user authentication
feat: add transaction creation API
feat: add transaction ownership checks
refactor: migrate database layer to PostgreSQL
fix: prevent cross-user transaction access
test: add transaction authorization tests
docs: update startup guide
```

Do not make giant commits containing unrelated changes.

---

## 18. Definition of Done

A feature is DONE only when:

1. Requirement is understood.
2. Architecture impact is considered.
3. Implementation is complete.
4. Existing functionality still works.
5. Error cases are handled.
6. Security/authorization implications are checked.
7. Tests have been run.
8. Codex QA/QC has reviewed it where applicable.
9. Documentation is updated when needed.
10. The feature is ready for the next environment.

---

## 19. Current Known Technical Debt

### Critical

- Global PIN authentication.
- PIN stored in localStorage.
- Wildcard CORS configuration.
- No real user/account model.
- API can expose all transactions to an authenticated PIN holder.
- Delete endpoint is not ownership-scoped.
- SQLite is not appropriate as the shared production database.
- `.env` must never be included in the repository.
- Personal `expenses.db` and generated data must not be part of the public source repository.

### High

- No proper transaction creation API for the web application.
- Telegram currently writes directly through the local database layer.
- Configuration is global rather than user-specific.
- No proper migration system.
- No automated test suite.
- No production deployment configuration.
- No robust offline synchronization layer.

### Medium

- Legacy `dashboard.html` exists alongside the React application.
- Generated `data.json` duplicates application data.
- Root `package.json` is minimal and frontend dependencies live separately.
- Repository archive contains `node_modules` and `.git` history.
- Documentation describes the prototype rather than the target product.

---

## 20. Migration Strategy

Do not rewrite everything at once.

### Step 1
Freeze the existing prototype as a known baseline.

### Step 2
Create the target database schema.

### Step 3
Implement authentication.

### Step 4
Introduce a transaction service/repository layer.

### Step 5
Migrate transaction CRUD to PostgreSQL.

### Step 6
Update React to use authenticated APIs.

### Step 7
Remove global PIN dependency.

### Step 8
Add manual transaction entry.

### Step 9
Add dashboard/user-specific configuration.

### Step 10
Prepare Android build.

### Step 11
Run full QA/QC.

### Step 12
Deploy private beta.

---

## 21. Environment Variables

Production secrets belong in the hosting provider's secret/environment-variable system.

Example:

```env
DATABASE_URL=
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=
CORS_ORIGINS=
TELEGRAM_BOT_TOKEN=
```

Never place real values in:
- README
- source code
- frontend bundle
- Git
- screenshots
- issue reports

---

## 22. Testing Strategy

### Backend

Test:
- Authentication
- Registration/login failures
- Transaction CRUD
- Ownership isolation
- Invalid IDs
- Invalid amounts
- Invalid dates
- Export
- Budget calculations

### Frontend

Test:
- Login/logout
- Add transaction
- Edit/delete
- Filters
- Dashboard calculations
- Empty states
- Error states
- Mobile responsiveness

### Cross-user security test

Create:

```text
User A
User B
```

Then verify:

```text
User A CANNOT:
- read User B transactions
- edit User B transactions
- delete User B transactions
- export User B transactions
```

This test is mandatory before public beta.

---

## 23. Release Gates

### Internal Alpha

- Core features work.
- No known critical security issue.
- Database migration works.
- Web application works.

### Private Beta

- 5–10 users.
- Real accounts.
- Real transaction data with informed testers.
- Backup/recovery verified.
- Cross-user isolation verified.

### Public Release

- Production monitoring.
- Reliable backups.
- Account deletion.
- Data export.
- Privacy policy/terms appropriate for the release.
- Security review completed.
- Android release process completed.

---

## 24. Current Sprint

### Trakoria V1 Sprint

Target:

**Monday → Saturday**

### Day 1 — Architecture & Foundation
- Repository audit
- Clean repository
- Finalize architecture
- Finalize database schema
- Setup PostgreSQL/Supabase
- Migration plan

### Day 2 — Authentication
- User model
- Registration
- Login
- Session/token handling
- Authorization middleware

### Day 3 — Transactions
- Create
- Read
- Update
- Delete
- Historical dates
- Ownership checks
- Manual entry UI

### Day 4 — Dashboard
- Metrics
- Charts
- Calendar
- Categories
- Budgets
- Search/filter

### Day 5 — Platform
- Responsive web
- Capacitor setup
- Android build
- Offline groundwork

### Day 6 — QA/QC
- Full regression
- Security tests
- Cross-user isolation
- API tests
- Android tests
- Bug fixing
- Release candidate

---

## 25. Working Rule for AI Agents

Before changing code:

1. Read the relevant files.
2. Understand the existing implementation.
3. Identify dependencies and side effects.
4. Make the smallest correct change.
5. Run relevant tests/builds.
6. Report what changed.
7. Report what was tested.
8. Clearly state anything not verified.

### AI agents must NOT

- Invent files or APIs without checking the repository.
- Claim tests passed without running them.
- Remove functionality without approval.
- Rewrite the entire project for convenience.
- Expose secrets.
- Commit `.env`.
- Bypass authentication.
- Trust client-supplied ownership IDs.
- Add dependencies without a reason.
- Introduce unnecessary architectural complexity.

---

## 26. Product Decision Log

Important architecture decisions should be recorded here.

### Decision: Manual entry is primary

**Status:** Approved

Manual transaction entry is the primary V1 input mechanism. Telegram is optional future functionality.

### Decision: PostgreSQL for shared production data

**Status:** Approved

SQLite remains useful for local prototyping but shared production data will use PostgreSQL.

### Decision: One backend, multiple clients

**Status:** Approved

Web and Android use the same backend and database rather than maintaining separate business logic.

### Decision: Multi-user from V1

**Status:** Approved

Trakoria must support proper user isolation before public beta.

### Decision: Supabase Auth is the V1 identity source

**Status:** Approved

Application tables reference Supabase Auth's `auth.users(id)`. Trakoria will not create a separate password/authentication system.

### Decision: Per-user default categories

**Status:** Approved

Default categories are copied into each user's account when the Supabase Auth user is created. This keeps category ownership and RLS simple, and it allows future custom category edits without affecting other users.

### Decision: PostgreSQL RLS protects financial rows

**Status:** Approved

`categories`, `transactions`, and `budgets` use Row Level Security policies based on `auth.uid()`. Client-supplied `user_id` values are not trusted.

### Decision: Money is stored as NUMERIC

**Status:** Approved

PostgreSQL financial amounts use `numeric(12, 2)`, never `float`, `real`, or JavaScript-style binary floating point.

---

## 27. Startup Checklist

When beginning a new Trakoria development session:

```text
[ ] Read STARTUP.md
[ ] Check current Git status
[ ] Understand the current branch
[ ] Review recent changes
[ ] Identify today's task
[ ] Inspect affected files
[ ] Confirm architecture impact
[ ] Implement
[ ] Test
[ ] Review
[ ] Update documentation if required
```

---

## 28. Final Principle

Trakoria should remain simple.

We are not trying to build a giant fintech platform in V1.

We are building a reliable personal finance product where a person can say:

> **"I know where my money is going, and I control my data."**

**Track Money. Own Your Data.**
