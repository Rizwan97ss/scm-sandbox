# Architecture

## Overview

```
scm/
  backend/   Laravel 13 API (PHP 8.4) — /api/v1/*, session-based auth via Sanctum
  frontend/  React 19 + TypeScript SPA (Vite) — consumes the API, no server rendering
  docs/      This documentation set
```

The two apps are independently deployable. In dev they run on separate ports
(`localhost:8000` backend, `localhost:5173` frontend) and talk over HTTP with
cookies; in production they can be served from the same origin (SPA behind a
reverse proxy that forwards `/api` to Laravel) or different subdomains, as
long as CORS and Sanctum's stateful-domain list agree — see
[deployment.md](deployment.md).

## Deployment model

**One instance, one school, one database.** This app is white-labeled: sold
and deployed once per customer, each customer running their own private
instance for their own one school. There is no shared multi-school platform
behind it, no `school_id` column or scoping trait anywhere in the schema,
and no cross-deployment admin console — a query issued by one deployment
can only ever reach that deployment's own database, because that's the only
database it's configured to connect to.

A school's identity (name, contact info, address) and branding (logo,
colors) are DB-driven `Settings` rows, editable from the Settings page —
that's the entire white-labeling mechanism. Standing up a new customer
means provisioning a new instance (new database, new deploy) and filling in
Settings, not creating a new row in a shared table. See
[configuration.md § Theming & branding](configuration.md#theming--branding)
and [school-setup-guide.md](school-setup-guide.md).

## Backend layering

Each module (Users, Roles, Settings, AcademicYear, Student, ...) follows the
same shape, so once you've read one you've read them all:

```
Route (routes/api.php)
  → Controller (thin: validate via Form Request, delegate, wrap in ApiResponse)
    → Form Request (authorization delegated to Policy, validation rules)
    → Policy (per-model, decides view/create/update/delete/... per user)
    → Service (only where there's real logic beyond a save — id generation,
       enrollment transitions, dashboard aggregation, settings caching)
    → Model (Eloquent)
  → API Resource (shapes the JSON response)
→ ApiResponse::success()/created()/error() envelope
```

Controllers stay thin on purpose: a controller method's job is "validate,
authorize, call one thing, return a Resource." Anything with real branching
logic (student ID generation, promotion/transfer/withdrawal rules, dashboard
role-context switching) lives in `app/Services/`, unit-testable without HTTP.

Ten of the simpler CRUD entities (departments, grade levels, rooms, subjects,
etc.) share a generic `App\Http\Controllers\Api\V1\CrudController` base for
`index`/`show`/`destroy`, with `store`/`update` overridden per entity where
validation differs. This isn't a framework — it's boilerplate reduction for
genuinely identical CRUD shapes; anything with distinct behavior (Student,
User, Role, Settings) has its own full controller.

### Response envelope

Every API response — success or error — is wrapped by `App\Support\ApiResponse`:

```json
{ "success": true, "message": "...", "data": { ... }, "meta": { ... } }
{ "success": false, "message": "...", "errors": { "field": ["..."] } }
```

`ApiResponse::noContent()` still returns HTTP 200 with `data: null` (not 204)
so the frontend's response interceptor has one shape to handle universally.

## RBAC

`spatie/laravel-permission`, teams disabled (`'teams' => false` in
`config/permission.php`) — with one school per database there's nothing
left for "teams" to partition.

- **Roles/permissions live in this deployment's own database**, seeded by
  `database/seeders/RolePermissionSeeder.php`, the single source of truth
  for the default role→permission matrix (12 default roles).
- **School Admin is the top role.** There is no cross-role bypass — every
  request goes through the normal Policy + permission check, including for
  School Admin, whose default permission set is simply comprehensive (see
  `RolePermissionSeeder::ROLE_PERMISSIONS`).
- **Full detail:** see [rbac.md](rbac.md) for the permission catalogue,
  default role matrix, and how to add a new role or module.

## Authentication

`auth:sanctum`, one guard, one session type:

1. Frontend calls `GET /sanctum/csrf-cookie` before the first mutating
   request (`ensureCsrfCookie()` in `src/api/client.ts`), which sets the
   `XSRF-TOKEN` cookie.
2. `POST /api/v1/auth/login` verifies via `Hash::check()` and calls
   `Auth::login()`.
3. Every subsequent request rides the session cookie.
4. `AuthContext` (frontend) re-fetches via `GET /api/v1/auth/me` on app
   boot.

Deliberately session-based rather than token-based: no token to leak from
`localStorage`, no manual expiry/refresh logic. If a future phase needs a
public/mobile API, that would be a separate token-issuing guard alongside
this one, not a replacement for it.

## Frontend architecture

Feature-folder organization under `src/features/<module>/{pages,components,schemas}`,
plus shared layers:

```
src/
  api/          axios client, one endpoints file per module, crudFactory for
                simple CRUD resources, centralized query key registry
  app/          AppProviders (QueryClientProvider, ThemeProvider, AuthProvider,
                Toaster), queryClient config
  components/
    ui/         Reusable primitive kit (Button, Modal, DataTable, FormField,
                Tabs, ...), each with a Vitest test
    layout/     AppShell, Sidebar, Topbar, RoleBasedNav, AuthLayout
    feedback/   ErrorBoundary, NotFound, Forbidden, LoadingScreen
  context/      AuthContext (session + hasRole/hasPermission), ThemeContext
                (runtime branding)
  features/     One folder per business module
  hooks/        useCrudResource, usePagination, usePermission, useDebounce, ...
  routes/       AppRouter (React.lazy per page), ProtectedRoute, PermissionRoute
  types/        Shared TypeScript types mirroring backend API Resources
  config/       env.ts (import.meta.env wrapper), constants.ts, navigation.ts
```

- **Route-based code splitting:** every page component in `AppRouter.tsx` is
  `React.lazy()`-loaded behind a single `<Suspense fallback={<LoadingScreen/>}>`,
  which is why the production bundle is split into a small main chunk plus
  per-route chunks instead of one large bundle.
- **Server state** is TanStack Query exclusively — no component holds
  fetched data in local `useState`. `queryKeys.ts` centralizes cache keys
  so invalidation after a mutation is consistent across features.
- **Forms** are react-hook-form + zod, with schemas colocated in each
  feature's `schemas/` folder — validation rules live in one place and are
  shared between the form's live validation and its submit-time check.
- **Permission-gated UI:** `usePermission().can('module.action')` drives
  both route access (`PermissionRoute`) and conditional rendering (hiding
  buttons/nav items a role can't use) — see [rbac.md](rbac.md) for how
  permission strings map to backend Policies.

### Runtime theming

Branding (primary/secondary color, logo, favicon) and this deployment's
school identity (name, contact info, address) are **not** a build-time
Tailwind config — they're DB-driven. `GET /api/v1/settings/public` returns
the public settings, and `ThemeContext` applies the branding ones by
setting CSS custom properties
(`document.documentElement.style.setProperty('--brand-primary', ...)`) on
boot. Tailwind's `@theme inline` (v4, CSS-first config) consumes those same
variables, so a School Admin changing "Primary Color" in Settings updates
the whole UI live, no rebuild or redeploy required. See
[configuration.md § Theming](configuration.md#theming--branding).

## Security posture

- **CSRF:** Sanctum's cookie/header double-submit pattern, automatic once
  `ensureCsrfCookie()` has run.
- **XSS:** React's default escaping; no `dangerouslySetInnerHTML` in the
  codebase.
- **SQL injection:** Eloquent/query builder only — no raw interpolated SQL
  anywhere in the codebase.
- **Authorization:** every mutating/listing endpoint is backed by a Policy;
  controllers call `$this->authorize(...)` or rely on `Route::apiResource`'s
  automatic policy resolution. `tests/Feature/Authorization/*` asserts
  cross-role denial.
- **Rate limiting:** `throttle:10,1` on login, `throttle:5,1` on
  forgot/reset-password, `throttle:6,1` on verification-email resend, plus
  a general `throttle:api` backstop — 150 requests/minute per authenticated
  user (or per IP if unauthenticated) — on every other endpoint, via a
  named `api` limiter registered in `AppServiceProvider::boot()`. Skipped
  in the `testing` environment: the `array` cache store persists for the
  whole `phpunit` process (`phpunit.xml`), so a real limit there would
  accumulate across all tests sharing an IP/user rather than resetting per
  test.
- **Security headers:** `App\Http\Middleware\SecurityHeaders`, appended
  globally, sets `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  a restrictive `Permissions-Policy`, and `Strict-Transport-Security`
  (only when the request is already HTTPS — sending it over plain HTTP
  does nothing but confuse local dev). This app is a JSON API with no
  browser-rendered HTML of its own, so no CSP is set here — the SPA is a
  separate origin/build served by whatever sits in front of it (see
  [deployment.md § 4](deployment.md)), and CSP belongs at that layer.
- **Trusted proxies:** unset by default — `TRUSTED_PROXIES` env var
  (`bootstrap/app.php`) must be set explicitly once a reverse proxy sits in
  front, otherwise `X-Forwarded-*` headers are ignored and
  `Request::ip()`/`isSecure()` reflect the direct TCP connection, not the
  spoofable header a client could send.
- **Password policy:** production-only (gated on `app()->isProduction()` in
  `AppServiceProvider::boot()`, since `uncompromised()` makes a live Have I
  Been Pwned API call on every submission — undesirable in tests/local
  dev) — min 10 chars, mixed case, numbers, and breach-checked via
  `uncompromised()`. Local/testing keep Laravel's bare `min(8)` default.
- **File uploads:** routed through `spatie/laravel-medialibrary`, which
  enforces mime/size validation per collection (see `Student::DOCUMENT_COLLECTIONS`).
- **Audit trail:** `spatie/laravel-activitylog` on sensitive models (User,
  Role, Setting, Student, and enrollment actions), capturing actor,
  before/after, and timestamp — visible via the Audit Log admin page.
- **Password hashing:** bcrypt via Laravel's default hasher (`BCRYPT_ROUNDS=12`).
- **Dependency audit:** `composer audit` / `npm audit` — re-run before
  every production deploy.
- **Two-factor authentication:** mandatory TOTP for every account, no
  opt-out — see [mfa.md](mfa.md) for the full model (grace period,
  recovery codes, admin reset) and `App\Http\Middleware\EnsureMfaEnrolled`
  for enforcement.
- **Field-level encryption:** the most sensitive PII/financial columns
  (`Student.medical_info`, guardian national IDs, phone numbers, MFA
  secrets, etc.) carry Laravel's `encrypted`/`encrypted:array` cast — see
  [deployment.md](deployment.md)'s encryption-backfill deploy-order note
  for the one real gotcha (existing plaintext rows need a one-off backfill
  command run before the cast goes live, not after).
- **Data export & right to erasure:** self-service "export my data" /
  "delete my account" for any user, plus admin-level bulk equivalents —
  see [api.md](api.md)'s "Data export" and "Account deletion &
  anonymization" sections. `AnonymizationService` documents exactly what's
  scrubbed vs. retained per model.
- **Configurable retention:** `retention.*` Settings drive three scheduled
  commands (audit log pruning, expired data-export cleanup, opt-in
  stale-account anonymization) — see
  [deployment.md § 6](deployment.md#6-scheduled-jobs).

See [rbac.md](rbac.md) for the authorization model in depth and
[deployment.md](deployment.md) for production hardening (HTTPS, secure
cookie flags, `APP_DEBUG=false`, etc.).
