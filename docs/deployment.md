# Deployment

This covers taking a local SQLite dev checkout to a production-style
deployment. Since this app is white-labeled — one instance, one school,
one database per deployment (see [architecture.md](architecture.md)) —
"deploying" means standing up a brand-new instance for a new customer, not
adding a row to some shared platform.

## 1. Switch to MySQL

Local dev uses SQLite for zero-setup convenience; migrations use no
SQLite-only syntax, so the cutover is configuration-only:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=school_management_system
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
```

Create the database (`CREATE DATABASE school_management_system CHARACTER
SET utf8mb4 COLLATE utf8mb4_unicode_ci;`), then:

```bash
php artisan migrate --force
php artisan db:seed --force   # only for a fresh install with demo/starter data —
                               # skip or write a production-specific seeder for a
                               # real school's initial rollout
```

`--force` is required because Laravel blocks destructive commands by
default when `APP_ENV=production`. The DB user only needs ordinary DDL/DML
rights on this one schema — no cross-database privileges, since there's
only ever the one database.

**Gotcha found doing this cutover for real:** two migrations
(`create_online_test_attempts_table`, `create_student_transport_assignments_table`)
had multi-column unique/index definitions with no explicit name.
Laravel's auto-generated name (`{table}_{col1}_{col2}_{col3}_{unique|index}`)
came out over MySQL's 64-character identifier limit for both — SQLite has
no such limit, so this was invisible through SQLite-only development. Both
now pass an explicit short name as the second argument to
`->unique()`/`->index()`. If a *future* migration adds a multi-column
index/unique constraint on a long table/column combination and skips the
explicit name, it'll hit the same wall the first time it's migrated
against MySQL, not before — worth naming these explicitly by habit rather
than waiting for it to fail.

**Encryption backfill — deploy order matters here.** Several PII columns
(`users.phone`, `students.medical_info`/`emergency_contact_phone`/
`address_line1`/`address_line2`, `guardians.national_id`/`address_line1`/
`address_line2`, `payments.reference_number`) carry Laravel's `encrypted`
cast. Adding the cast to a model does nothing to rows already stored as
plaintext — the next read throws `DecryptException` on every one of them.
The correct order for every environment that has existing data (i.e.
anything past a fresh install) is:

1. `php artisan migrate --force` — applies
   `2026_08_12_090001_widen_pii_columns_for_encryption.php`, widening the
   target columns to `text` (the encrypted envelope runs ~3-4x longer than
   plaintext, and these were `string(255)`).
2. `php artisan security:encrypt-pii` (add `--dry-run` first to preview) —
   rewrites existing plaintext values in place via the same encrypter the
   model cast uses. Idempotent and safe to re-run.
3. Only then deploy the application code carrying the `encrypted` casts.

A rolling deploy that serves old (plaintext-expecting) and new
(encrypted-expecting) code against the same rows at the same time
corrupts data — don't skip step 2 or reorder it after step 3.

Also: MySQL's `CREATE TABLE`/`ALTER TABLE` are **not transactional** the
way Laravel's migration wrapping implies — if a migration's `up()` fails
partway through (exactly what happened here: the `CREATE TABLE` succeeded,
the following `ALTER TABLE ... ADD UNIQUE` didn't), the already-run
statements stay committed even though Laravel doesn't mark the migration
as ran. A retry then fails again with "table already exists." Recovery is
manual: inspect what the failed migration actually left behind
(`SHOW COLUMNS FROM the_table`, check row count) and drop it before
re-running `migrate` — don't assume a failed migration left nothing behind
on MySQL the way it would on SQLite/Postgres.

## 2. Environment hardening

- `APP_ENV=production`, `APP_DEBUG=false` — never run production with debug
  mode on; it leaks stack traces and env values in error responses.
- `APP_URL` set to the real backend origin.
- `SESSION_ENCRYPT=true` if not already.
- `SESSION_DOMAIN` set explicitly if frontend and backend share a parent
  domain (needed for the session cookie to be visible cross-subdomain).
- `SANCTUM_STATEFUL_DOMAINS` / `FRONTEND_URLS` updated to the real
  production frontend origin — this is the actual CSRF/session security
  boundary, get it exact.
- Serve over HTTPS only — Sanctum's session cookie should be `Secure` in
  production (Laravel sets this automatically when the request is HTTPS
  and `SESSION_SECURE_COOKIE` isn't forced off).
- `BCRYPT_ROUNDS` — 12 (current default) is reasonable; don't lower it.

## 3. Frontend build

```bash
cd frontend
npm run build     # outputs to dist/, type-checks as part of the build
```

`VITE_API_URL` must point at the real backend origin at build time (Vite
env vars are baked in at build, not read at runtime) — set it in the CI/
build environment, not just a local `.env`. Serve `dist/` as static files
behind any web server (nginx, Caddy, a CDN); it's a pure SPA with
client-side routing, so the server needs a fallback that serves
`index.html` for any unmatched path (React Router handles the rest
client-side).

## 4. Reverse proxy topology

One deployment, one origin (or two, frontend/backend split) — no wildcard
subdomains or wildcard TLS needed, since there's no per-school routing to
do.

- **Same-origin** (recommended — no CORS needed at all): reverse proxy
  routes `/api/*` and `/sanctum/*` to Laravel, everything else to the
  built SPA. `VITE_API_URL` becomes a relative `/api` (see
  `src/api/client.ts`), resolving same-origin.
- **Separate frontend/API domains** (`app.example.com` frontend,
  `api.example.com` backend) is also fine, it just needs real CORS
  config: `FRONTEND_URLS`/`SANCTUM_STATEFUL_DOMAINS` list the frontend's
  real origin, and `SESSION_DOMAIN` stays unset/exact-host unless you
  deliberately want a shared-parent-domain cookie.

Either shape puts a reverse proxy (nginx, Caddy, a load balancer) in front
of Laravel, which means the app sees the proxy's own connection, not the
real client's — set `TRUSTED_PROXIES` (`backend/.env`) or `Request::ip()`,
HTTPS detection, and the `Strict-Transport-Security` header (see
[architecture.md § Security posture](architecture.md#security-posture))
all silently reflect the proxy, not the client:

```env
# The proxy's own IP if it's a separate host, or '*' if Laravel only ever
# receives traffic from a proxy on the same trusted network (e.g. nginx
# on the same box/container). Never '*' if the app is reachable directly
# from the internet on top of that — that would let any client spoof
# X-Forwarded-* headers.
TRUSTED_PROXIES=*
```

## 5. Queue worker

`QUEUE_CONNECTION=database` locally (already runs alongside `php artisan
serve` in the local `composer dev` script via `queue:listen`). This is
not optional in production — `App\Jobs\GenerateDataExportJob` (data
export generation, `docs/api.md`'s "Data export" section) and
`App\Jobs\ProcessStudentImportJob` (large student-import files,
`docs/api.md`'s `POST /students/import`) are both real queued jobs, and
those requests silently never complete without a worker actually
processing them. Keep the database driver (fine at this scale) or switch
to Redis/SQS if background work grows heavier.

On `sandbox.academia-erp.tech` this runs as a systemd service,
`academia-erp-sandbox-queue-worker.service` (unit file at
`/etc/systemd/system/academia-erp-sandbox-queue-worker.service`, mirroring
the same custom-unit pattern already used for the file-converter backend
on this box):

```ini
ExecStart=/usr/bin/php8.4 artisan queue:work --queue=default --sleep=3 --tries=3 --max-time=3600 --timeout=600
Restart=always
RestartSec=5
```

`--max-time=3600` combined with `Restart=always` is Laravel's recommended
graceful-recycle pattern — the worker exits cleanly every hour and systemd
immediately starts a fresh process, so a long-running worker can't
accumulate memory bloat indefinitely. `--timeout=600` caps a single job at
10 minutes; `ProcessStudentImportJob` itself additionally sets `$timeout =
300` (5 min) and `$tries = 1` — no automatic retry, since retrying a
partially-completed import risks re-creating rows for admissions already
committed before the failure point (same reasoning as
`GenerateDataExportJob`).

**After deploying code that touches a queued job class (or anything it
depends on), restart the worker** — a long-running PHP process can't
redefine an already-loaded class, so it keeps running the version that was
current when it started:

```bash
php artisan queue:restart   # signals the worker to finish its current job, then exit — systemd (Restart=always) brings it back up fresh
```

On a server without a custom systemd unit yet, run a worker process
directly and put it under a process supervisor (systemd, Supervisor, or
your platform's equivalent) — `queue:work` exiting on a deploy or crash
should restart it, not silently stop processing:

```bash
php artisan queue:work --tries=3
```

## 6. Scheduled jobs

Three scheduled commands exist (`routes/console.php`), each running once,
against this one database:

```
* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
```

- `retention:clean-activity-logs` (daily) — prunes the activity log per
  the `retention.activity_log_days` setting.
- `retention:clean-expired-exports` (hourly) — deletes data-export ZIPs
  (and their `DataExport` rows) past `expires_at`.
- `retention:anonymize-stale-accounts` (daily) — off by default
  (`retention.inactive_account_anonymize_days` is null unless explicitly
  opted into via Settings).

## 7. File storage

`FILESYSTEM_DISK=local` by default — fine for a single-server deployment.
For anything horizontally scaled or where uploaded files (student
documents, avatars) need to survive a redeploy/be shared across instances,
switch to S3-compatible storage:

```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=...
AWS_BUCKET=...
```

`spatie/laravel-medialibrary` (used for all student/staff documents and
avatars) respects the configured disk with no code changes — it's already
disk-agnostic.

## 8. Mail

`MAIL_MAILER=log` locally (emails write to the log instead of sending —
used for password resets, portal invites, verification emails). Set a real
transactional provider for production:

```env
MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS="noreply@yourschool.example"
MAIL_FROM_NAME="${APP_NAME}"
```

## 9. Backups

At minimum: automated daily MySQL dumps (`mysqldump` or your host's managed
backup feature) retained for a rolling window, plus backup of the file
storage disk (local or S3) if student documents live there. Enrollment
history and audit logs (see [database.md](database.md),
[architecture.md § Security posture](architecture.md#security-posture))
are the records a school is least able to reconstruct from anywhere else —
prioritize their durability specifically, not just "the database" in general.

## Pre-deploy checklist

- [ ] `APP_ENV=production`, `APP_DEBUG=false`
- [ ] Real `APP_KEY` generated and kept secret (not the dev one)
- [ ] MySQL database configured and migrated (`php artisan migrate --force`)
- [ ] `SESSION_DOMAIN` left unset/exact-host unless deliberately sharing a
      parent domain
- [ ] HTTPS enforced, `SANCTUM_STATEFUL_DOMAINS`/`FRONTEND_URLS` set to
      the real production origin(s)
- [ ] `VITE_API_URL` baked into the frontend build for the real backend
      origin (or left relative, `/api`, if using the same-origin proxy
      shape — see § 4)
- [ ] Queue worker running under a supervisor — see § 5
- [ ] Mail transport configured (not `log`)
- [ ] File storage disk decided (local vs. S3) based on deployment topology
- [ ] Backup schedule in place — see § 9
- [ ] `php artisan test` and `npm run build` both clean on the exact commit being deployed
- [ ] `TRUSTED_PROXIES` set to the reverse proxy's IP (or `*` only if it's
      unreachable directly from the internet) — see § 4
- [ ] `composer audit` and `npm audit` both clean on the exact commit being
      deployed — dependency CVEs surface after code is written, so this is
      a deploy-time check, not a one-time pass
- [ ] If this deploy is the one introducing/changing encrypted PII columns:
      migrate → `php artisan security:encrypt-pii` → deploy code, in that
      exact order — see § 1's "Encryption backfill" note
- [ ] A live browser pass through login → a handful of core pages, on the
      actual production domain — not just `php artisan test`/`npm run
      build` passing.
