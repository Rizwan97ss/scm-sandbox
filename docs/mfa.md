# Two-Factor Authentication

Every account — staff, students, and parents alike — requires TOTP-based
two-factor authentication. There is no opt-out; this is a deliberate
product decision, not a default that can be turned off.

## How it works

- **Method**: TOTP (Time-based One-Time Password) via an authenticator app
  (Google Authenticator, Authy, 1Password, etc.) — `pragmarx/google2fa`.
  No SMS/email OTP option; TOTP has no per-message cost and works offline.
- **Setup**: `POST /auth/mfa/setup` generates an unconfirmed secret and
  returns a QR code (`otpauth://` URI rendered via the existing
  `App\Support\QrCodeGenerator`) plus a manual-entry key. `POST
  /auth/mfa/confirm` verifies the first code and returns 8 recovery codes
  — shown once, plaintext, never retrievable again (the same "we don't
  re-show secrets" precedent as password reset).
- **Login**: a confirmed account's login (`POST /auth/login`) no longer
  establishes a session directly — it returns
  `{mfa_required: true, challenge_token}` instead. The second request,
  `POST /auth/mfa/verify-challenge`, completes the actual login once the
  code (or a recovery code) checks out. The challenge token is
  cache-backed with a 5-minute TTL, not session-based — see
  `App\Services\Mfa\MfaChallengeService`.
- **Recovery codes**: single-use, bcrypt-hashed at rest, consumed on use.
  `POST /auth/mfa/recovery-codes/regenerate` (password-confirmed)
  invalidates the old set and issues a new one.

## Enforcement and the grace period

`App\Http\Middleware\EnsureMfaEnrolled` (appended to the `api` middleware
group) blocks every non-exempt route with a 403 (`mfa_setup_required:
true`) once an account's grace period has ended and MFA still isn't
confirmed. Exempt routes: `/auth/me`, `/auth/logout`, and the
setup/confirm endpoints themselves — so a locked account can always see
why, and fix it.

- **Brand-new accounts get zero grace** (`mfa_grace_period_ends_at` is set
  to `now()` in `User`'s `creating` hook) — a fresh account is expected to
  set up MFA immediately, as part of onboarding, not get a free pass.
- **Pre-existing accounts** (anything created before mandatory MFA
  shipped) get a real grace period via a one-off rollout command, run
  once at deploy time:

  ```bash
  php artisan security:grant-mfa-grace-period --days=14
  ```

  Idempotent — only touches accounts with no confirmed MFA and no grace
  period already set, so re-running it is always safe.
- **During the grace window**, `MfaSetupBanner` (shown in `AppShell`)
  nudges without blocking. Once it ends, `RequireMfaSetup` (a frontend
  route wrapper) hard-redirects to the setup page — mirroring the
  backend's own enforcement so the UI never shows a dead end.

## Lost device / recovery

- **Recovery codes** are the first line of defense — 8 single-use codes
  issued at confirmation time, meant to be saved somewhere safe (a
  password manager, printed, etc.).
- **Admin-triggered reset**: `POST /users/{user}/mfa/reset`, gated on the
  `users.manage-mfa` permission (School Admin by default — see
  [rbac.md](rbac.md)), clears a user's enrollment entirely and grants a
  new 3-day grace period. Reachable from the Users list's row menu
  ("Reset two-factor authentication").

## Rollout note: young students without a personal device

Mandatory MFA applies to every login, including student accounts — some
of which belong to children who don't have their own smartphone to run an
authenticator app on. Nothing technically prevents a parent scanning
their child's setup QR code into their own authenticator app (the app
just needs *a* device, not necessarily the account holder's own), or a
school provisioning one shared tablet under staff supervision for this
purpose. Recovery codes and the admin-reset endpoint are the actual
technical safety net for "no working device," not an exemption from
enforcement — the mitigation lives entirely in the grace period and
recovery path, deliberately not in a softened rule.

## What's NOT encrypted vs. what is

`two_factor_secret` and `two_factor_recovery_codes` both carry Laravel's
`encrypted`/`encrypted:array` cast (see [deployment.md](deployment.md)'s
encryption note) — greenfield columns, no backfill needed since MFA
itself is new.
