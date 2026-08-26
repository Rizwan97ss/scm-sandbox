# School Management System — Documentation

A single-school, white-label-ready School Management System: Laravel 13
(PHP 8.4) REST API + React 19/TypeScript SPA, MySQL in production (SQLite
for local dev/tests). Each deployment serves exactly one school — see
[architecture.md](architecture.md) for why, and what that simplifies.

## Start here

| Doc | Read this for |
|---|---|
| [architecture.md](architecture.md) | System design: RBAC, layering, how the pieces fit together |
| [school-setup-guide.md](school-setup-guide.md) | For a School Admin, not a developer — the complete setup flow, in dependency order |
| [setup.md](setup.md) | Getting a local dev environment running from a clean checkout |
| [database.md](database.md) | Schema, ERD, and the reasoning behind key modeling decisions |
| [rbac.md](rbac.md) | The permission model, default roles, and how to add a new role or permission |
| [api.md](api.md) | Every endpoint currently exposed, grouped by module |
| [configuration.md](configuration.md) | Environment variables, DB-driven settings, theming/branding, feature flags |
| [testing.md](testing.md) | How to run and extend the backend and frontend test suites |
| [deployment.md](deployment.md) | Production build & deploy: MySQL cutover, queues, storage, mail, backups |
| [roadmap.md](roadmap.md) | What's done, what's next, and the conventions new modules must follow |

## Quick facts

- **Repo layout:** `backend/` (Laravel API), `frontend/` (React SPA), `docs/` (this folder) — sibling folders, no shared package manager.
- **Auth:** Laravel Sanctum, cookie-based SPA session (not token-based) — see [architecture.md § Authentication](architecture.md#authentication).
- **Single-tenant:** one database per deployment, no `school_id`/tenant-scoping machinery anywhere — see [architecture.md](architecture.md).
- **RBAC:** `spatie/laravel-permission`, 12 default roles, School Admin is the top role (no cross-school "Super Admin" layer) — see [rbac.md](rbac.md).
- **Demo login:** `admin@riverside-demo.test` / `password` (School Admin, seeded "Riverside Demo School").
- **White-labeling:** this school's identity (name, contact info, address) and branding (logo, colors) are DB-driven settings, editable from Settings — no rebuild needed per customer, see [configuration.md § Theming & branding](configuration.md#theming--branding).
