# Perzent — Field attendance & live location

Monorepo for the Perzent workforce product:

| Path | What it is |
|---|---|
| `apps/admin-portal` | Next.js 15 web portal (owner dashboard, kiosk, APK download page) **and** the JSON API under `src/app/api` |
| `apps/employee-mobile` | Expo 52 / React Native 0.76 Android app for employees & managers, with a native Kotlin foreground location service |
| `packages/database` | Prisma schema, migrations and the shared Prisma client (Supabase Postgres) |
| `packages/shared-types` | Zod schemas and TypeScript types shared by API, portal and app |
| `packages/location-engine` | Pure functions: haversine, trail distance, stop/dwell detection, smoothing, anti-spoof |

The launch plan is **free**: unlimited seats, all features. Cashfree payment code remains for a future paid tier but is not used by the UI.

## Core flow

1. Owner registers a company at `/register` and signs in at `/login` (owners only on the web).
2. Owner adds employees/managers on **Employees** (free, no payment) and shares the app + phone/password.
3. Employee installs the Android app, signs in (the account binds to that phone), checks in with GPS.
4. While checked in, a native foreground service uploads GPS points every few seconds; it pauses on breaks and stops at check-out.
5. Owner watches **Live Map**, reviews **Routes** (trail + dwell stops), **Attendance**, **Timesheets** (CSV) and **Reports**.
6. Policies (auto check-out time, max break, retention, timezone) are enforced server-side on every read and by a daily cron.

## Local development

```bash
pnpm install                       # also runs prisma generate
cp apps/admin-portal/.env.example apps/admin-portal/.env.local   # fill DATABASE_URL / DIRECT_URL / CRON_SECRET
cp apps/admin-portal/.env.local packages/database/.env           # Prisma CLI reads this one
pnpm db:migrate                    # prisma migrate deploy
pnpm --filter @perzent/admin-portal dev   # http://localhost:3000
```

Mobile app (Android device or emulator, JDK 17+, Android SDK 35):

```bash
cd apps/employee-mobile
npx expo run:android               # debug build against EXPO_PUBLIC_API_URL (see .env)
```

> The `android/` directory is hand-maintained (custom Kotlin service + modules). **Never run `expo prebuild --clean`** — it would delete the native code.

## Quality gates

```bash
pnpm typecheck                                  # shared packages + web portal
pnpm --filter @perzent/employee-mobile typecheck
pnpm --filter @perzent/admin-portal build       # what Vercel runs
```

CI (`.github/workflows/ci.yml`) runs the same three steps on every push/PR.

## Database changes

Edit `packages/database/prisma/schema.prisma`, then:

```bash
cd packages/database
npx prisma migrate dev --name <change>   # creates prisma/migrations/<timestamp>_<change>/migration.sql (needs DIRECT_URL)
```

Production applies migrations with `pnpm db:migrate` (`prisma migrate deploy`). Do not use `db push` against production any more — the migration history is authoritative.

## Deployment (web + API)

Vercel project → root of this repo (`next` is kept as a root devDependency only so Vercel detects the framework from the monorepo root — do not remove it). Required environment variables:

- `DATABASE_URL` (pooled, `pgbouncer=true&connection_limit=1`), `DIRECT_URL`
- `CRON_SECRET` — protects `/api/cron/policies` (Vercel Cron, daily at 18:45 UTC / 00:15 IST, see `vercel.json`)
- Optional: `NEXT_PUBLIC_PLAY_STORE_URL`, `EMPLOYEE_APK_URL`, `MIN_APP_VERSION_CODE`, `NEXT_PUBLIC_EMPLOYEE_APP_URL`, `NEXT_PUBLIC_OWNER_ADMIN_URL`

Health: `GET /api` (checks the database). Sideload APK: `GET /api/download/apk` → `public/downloads/perzent-employee-latest.apk`.

## Mobile release

See `apps/employee-mobile/RELEASE.md` (keystore, `keystore.properties`, `bundleRelease`, Play Console data-safety and background-location declaration, version bump rules). The app version advertised to phones lives in `apps/admin-portal/src/lib/app-version.ts` and must be bumped with `app.json` / `build.gradle`.

## Remote status (maintenance, announcements, version) — no release needed

Table `AppConfig`, single row `id = global` (edit in Supabase → Table Editor). Read by `GET /api/status`
(public, cached 30 s), `GET /api/mobile/version`, the app (on launch, resume, every 5 min and on any
`503 MAINTENANCE`) and the portal (every 60 s).

| Column | Effect |
|---|---|
| `maintenance_enabled` + `maintenance_scope` (`ALL` / `MOBILE` / `WEB`) | Sign-in and shift actions return `503 { code: "MAINTENANCE" }`; the app shows the maintenance screen (background tracking keeps queueing); the portal shows a maintenance page (`/`, `/privacy`, `/download` stay reachable). |
| `maintenance_title`, `maintenance_message`, `maintenance_until` | Text shown on those screens; `until` is informational. |
| `announcement`, `announcement_level` (`INFO` / `WARNING` / `CRITICAL`) | Banner at the top of the app and the portal. Clear the text to hide it. |
| `latest_app_version`, `latest_app_version_code`, `min_app_version_code`, `play_store_url` | Override the deployed defaults in `src/lib/app-version.ts` (null = default). Raising `min_app_version_code` forces older builds to update. |
| `support_email`, `support_phone` | Shown on the maintenance / error screens. |

Other app states handled on-device: no internet (NetInfo), server unreachable (status call fails while online), session expired (401), crash (error boundary with reload).

## API overview

All JSON; errors are `{ error, code? }`. Sessions: HttpOnly cookie for the web, `Authorization: Bearer <token>` for the app.

| Endpoint | Who | Purpose |
|---|---|---|
| `POST/GET/DELETE /api/auth` | public / any | login, register (`action:'register'`), change password (`action:'change_password'`), session, logout |
| `GET/POST/PATCH /api/employees` | owner, manager | list, create (free), reset device / suspend / reactivate / reset password / update |
| `GET/POST/DELETE /api/departments` | owner (GET also manager) | departments |
| `GET/POST /api/attendance` | owner, manager | records by date range; force check-out / manual check-in (company timezone) |
| `GET /api/live-team` | owner, manager | live status, last position, freshness, dwell, tamper flags |
| `GET /api/routes?user_id&date` | owner, manager | day trail, distance, dwell stops, breaks |
| `GET /api/timesheets` / `?format=csv` | owner, manager | payroll roll-up |
| `GET /api/reports/analytics?days=7\|30\|90` | owner, manager | punctuality & hours |
| `GET/PATCH /api/settings` | owner | policies, timezone, retention |
| `GET/POST/DELETE /api/sites` | owner, manager | geofence sites |
| `GET/POST/PATCH /api/leave` | employee/manager request; owner/manager review | leave |
| `POST /api/kiosk/punch` | owner/manager session on the terminal | employee punch by phone + password |
| `GET/POST/PATCH /api/mobile/attendance` | employee, manager | shift state, check-in / break / resume / check-out, telemetry |
| `POST/GET /api/mobile/waypoints` | employee, manager | batched GPS ingestion (validated, de-duplicated) |
| `GET /api/mobile/version` | public | latest app version / update policy |
| `GET /api/cron/policies` | Vercel Cron | auto check-out, break caps, retention, session purge |
| `GET /api` | public | health |
