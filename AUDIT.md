# Perzent Launch Audit

Date: 2026-08-28 · Scope: web portal, API, Android app + native service, database, release/DevOps.
Full narrative version (scorecard, checklists, API table) is published as the "Perzent Launch Audit" artifact; this file is the in-repo summary.

## Verdict

Before this pass the product loop did not hold: the last commit broke the Vercel build, adding staff required a Cashfree payment, "resume shift" billed off-duty time as worked, every date assumed India time, no scheduler ever ran the auto-check-out / break-limit policies the UI advertised, the kiosk endpoint was a public password oracle, and release APKs were signed with the debug key.

After this pass the **free** core flow — register → add staff → employee checks in on Android → live map / trail / attendance / timesheets — is implemented honestly and verified by a green production build, type-checks across all five packages, a release-signed Android build, and an in-sync migration ledger. What remains is Play Console work (needs your account) and engineering maturity (tests, monitoring, least-privilege DB role).

## Scorecard

| Area | Before | Now |
|---|---|---|
| Web build & deploy | broken (`closeTooltip` type error) | passing, CI added |
| Adding staff | paid only | free (`POST /api/employees`, role/manager/department, suspend, reset password, edit) |
| Shift logic | resume over-counted hours; UTC dates | one state machine (`lib/attendance.ts`), company timezone, gap recorded as break |
| Auto check-out / break cap | never executed | enforced on every read + daily cron (`/api/cron/policies`, `CRON_SECRET`) |
| GPS ingestion | unvalidated, duplicates | validated, de-duplicated, 409 stops trackers |
| Live map | fit/redraw/leak bugs, no staleness | stable; live / stale / lost states; camera lock; deep links |
| Route playback | no map, stops always empty | Leaflet playback; stops computed server-side |
| Mobile tracking | tracked through breaks; retry storms | stops on break; single worker; backoff; 401/409 handling |
| Mobile privacy | unclosable permission overlay | prominent disclosure, "Not now", single notification, trimmed permissions |
| Release signing | debug keystore | release keystore (git-ignored), targetSdk 35, 2 ABIs, v1.2.0 (12) |
| Kiosk | public, tenant-blind | owner session on terminal, company-scoped |
| DB migrations | 2 tables / 14 columns behind | drift migration recorded; `prisma migrate deploy` only |
| Error handling | silent empty states | `apiFetch` + 401 redirect; typed API errors |
| Automated tests | none | none (CI = typecheck + build) |
| Monitoring | none | DB health check only |

## Real-device test (28 Aug 2026, Galaxy S24 / Android 16, production)

Passed: install + device binding, readiness gate, prominent disclosure → "Allow all the time", check-in → live map, background with another app, GPS off/on from settings (owner feed flags after 2 min), airplane mode (offline queue flush), swipe-away from recents (service self-restarts), permission revoked mid-shift (clean stop + alert, resumes on re-grant), break/resume, 5-minute break cap, auto check-out at cut-off (tracker stops on 409), reboot mid-shift (after fix: boot receiver resumes tracking without opening the app), check-out → timesheet/route (278 waypoints, 1 dwell stop, 3 break intervals). Owner portal: 17 Playwright steps pass.

Fixed as a result: Vercel functions pinned to `bom1` + DB pool limit 5 (calls 7–15 s → 0.2–0.5 s), Android safe-area insets, BOOT_COMPLETED receiver + live-instance tracking state, 60 s server re-sync while on shift, 25 s request timeout + one retry, `/download` hydration.

Still untested: Xiaomi/Vivo/Oppo task killers, a moving route, overnight shifts.

## Still missing

**P0 – Play Store submission**
- Build `.aab` (`npm run build:android:bundle`), enrol Play App Signing, Data safety form, background-location declaration + disclosure video (see `apps/employee-mobile/RELEASE.md`).
- Back up `android/app/perzent-release.keystore` + `android/keystore.properties`.
- Google requires target API 36 from 31 Aug 2026; the app targets 35 (Expo 52 ceiling). Submit before / request extension, or upgrade to Expo SDK 54.
- Sideloaded builds older than 1.2.0 must be uninstalled first (signing key changed).
- Real-device test including an aggressive OEM (Xiaomi/Vivo/Oppo).

**P1 – first weeks**
- Automated tests (shift state machine, policies, timezone helpers, cross-tenant isolation).
- Error tracking (Sentry) and alerting on `/api` health.
- Least-privilege runtime DB role; rotate the previously exposed password.
- Edge rate limiting (current limiter is per serverless instance).
- Password reset / invite links; email verification on open registration.
- Server-side GPS plausibility checks (client integrity object is spoofable with a token).

**P2 – depth**
- Leave has no mobile UI; kiosk secondary; payments dormant; iOS unsupported.
- Waypoint volume (~12k points/employee/day at 3 s); partitioning/PostGIS beyond a few hundred staff.
- Geofence sites not enforced at check-in; no reverse geocoding.

## Go-live

Web: push `master` (Vercel), smoke-test register → add employee → app check-in → live map → check-out → timesheets CSV. Android: build bundle → Play Console internal testing → declarations → production.
