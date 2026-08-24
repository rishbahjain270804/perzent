# Perzent Product and Technical Audit

Date: 2026-08-24  
Scope: owner/manager portal, employee mobile app, API, authentication, payments, PostgreSQL model, deployment readiness

## Executive verdict

Perzent was a visually convincing prototype, not a functioning workforce product. Before this audit, all records lived in process memory, every tenant API was public, passwords were stored in plaintext, browser sessions were fabricated, mobile login accepted any input, attendance actions only changed screen state, payments could be marked paid without payment, and the APK endpoint returned JSON disguised as an Android package.

This pass replaces that foundation with Supabase PostgreSQL, Prisma persistence, database-backed sessions, tenant and role authorization, hashed passwords, real employee login/device binding, persisted mobile attendance actions, persisted owner settings, authenticated Cashfree verification, webhook signature checks, and a real migration baseline. It also removes or labels several false production claims.

The system is now a credible backend foundation, but it is **not production-ready**. The missing core is continuous route collection and the operational automation the UI promises.

## Readiness scorecard

| Area | Current state | Readiness |
|---|---|---:|
| Owner registration/login | Persistent, hashed credentials, secure cookie session | 3/5 |
| Tenant/role isolation | Added to owner and manager APIs | 3/5 |
| Employee login | Real API login, bearer session, secure local storage, device binding | 3/5 |
| Attendance | Check-in, break, resume, check-out persist with foreground GPS | 3/5 |
| Route tracking | Schema and playback exist; no mobile waypoint ingestion/background task | 1/5 |
| Live map | Latest-point API exists; screen is not a geographic map | 1/5 |
| Device telemetry | UI values are simulated and not native readings | 1/5 |
| Payments | Order, hosted checkout, server verification, signed webhook, ledger | 3/5 |
| Billing/invoices | Ledger summary only; invoice download is not implemented | 1/5 |
| Automation | Policy values persist; no scheduler executes them | 1/5 |
| Database | Supabase connected, schema pushed, baseline migration recorded | 4/5 |
| Testing/operations | Type checks/build only; no automated tests, monitoring, or jobs | 1/5 |

## What was corrected in this pass

- Replaced runtime use of the global in-memory store with Prisma Client and Supabase PostgreSQL.
- Added a complete initial migration and marked it as the database baseline.
- Added pooled runtime and migration connection separation for Supabase.
- Added tenant-scoped authorization to employee, attendance, route, live-team, settings, and billing endpoints.
- Added database session records, opaque bearer tokens, HttpOnly browser cookies, expiry, logout, and server-side dashboard session validation.
- Replaced plaintext password comparison with bcrypt hashing.
- Removed demo credentials and unconditional owner/mobile access.
- Replaced the hardcoded mobile device identity with an Android application ID or per-install iOS identifier and SecureStore session persistence.
- Added persistent employee check-in, break, resume, check-out, and device telemetry API paths.
- Made policy settings actually persist.
- Replaced hardcoded employee selectors in attendance/routes with company-scoped employee data.
- Removed the payment bypass that accepted any client payment ID/order prefix as paid.
- Added Cashfree hosted checkout, order-status confirmation, webhook HMAC verification, idempotent employee provisioning, and a persistent ledger.
- Replaced wildcard credentialed CORS with an origin allowlist.
- Removed the fake APK response and disabled download until a signed artifact URL is configured.
- Removed background-location permissions while background collection is not implemented.
- Changed unsupported marketing claims and labeled device diagnostics as simulated.

## Owner and manager audit

### Registration and access

What works now:

- A company, default department, owner, password hash, and session are created transactionally.
- The dashboard validates the server session instead of trusting local storage.
- Managers can only see their subordinates; owners see company staff.
- Owner-only billing and policy endpoints reject managers.

Still wrong or incomplete:

- There is no email/phone verification, password reset, forced first-password change, MFA, login throttling, or lockout policy.
- Registration is publicly open. Decide whether this is self-serve SaaS, sales-assisted onboarding, or invite-only.
- The system does not normalize all phone/email inputs consistently before uniqueness checks.
- The manager UI does not expose a complete permission model; permissions are hardcoded to three roles.

### Overview and live map

What works now:

- Live-team data is company-scoped and derives status from stored attendance/device/location records.

Still wrong or incomplete:

- The “live map” is a styled grid, not Leaflet or another geographic map.
- No employee route pings are uploaded, so new accounts will not produce live coordinates or route history.
- There is no stale-location threshold. An old point can appear current without a clear offline/stale state.
- Polling every 6–10 seconds does not make the data real-time; Supabase Realtime or a controlled polling/SSE design is still needed.
- Address labels require reverse geocoding; currently only stored labels can be shown.

### Attendance and corrections

What works now:

- Manual check-in and forced checkout are tenant-scoped, validate ownership, require a reason, and persist.
- Work and break minutes are recomputed when a manager closes a shift.

Still wrong or incomplete:

- Manual changes need an immutable audit log recording actor, old values, new values, reason, IP/device, and timestamp.
- Company timezone is stored but attendance date calculation and one override conversion still assume UTC/India time. This will fail for companies outside India and around midnight.
- One unique attendance record per user/day prevents split shifts or re-entry. Confirm the business rule.
- The UI does not reliably surface API errors for every attendance mutation.
- There is no approval workflow for employee correction requests.
- Export, payroll periods, holidays, leave, weekends, late/absent rules, and CSV/PDF reports are absent.

### Employees and device management

What works now:

- Employee rows are tenant-scoped and do not return password hashes.
- Device reset is authorized and persists.
- Paid provisioning is idempotent and attached to the company/order.

Still wrong or incomplete:

- Department and manager CRUD/selection are absent; new employees fall into the first department unless valid IDs are supplied.
- Employee suspend/terminate/reactivate, edit profile, resend invite, and reset password flows are absent.
- A temporary password is owner-entered. Replace this with an expiring invite or one-time activation link/PIN and mandatory password change.
- Device reset also needs an audit event and optional employee notification.
- Android ID is an installation/device signal, not strong hardware attestation. Rooted devices, cloned apps, reinstall behavior, and iOS identity require a deliberate policy.

### Payments, seats, and invoices

What works now:

- The browser opens Cashfree hosted checkout.
- Only Cashfree `PAID` status or a valid signed webhook can provision a seat.
- Transaction amounts and status are stored in PostgreSQL.

Still wrong or incomplete:

- Run a complete sandbox and production payment test after whitelisting the deployed domain in Cashfree.
- The product calls this a per-seat fee, but the model behaves as a one-time payment. Define recurring billing, renewal, proration, seat cancellation, refunds, and failed-payment behavior.
- Invoice “download” is only an alert. A legally usable tax invoice needs seller identity/GSTIN, customer billing details/GSTIN, place of supply, tax breakup, sequence rules, PDF generation, and immutable storage.
- Webhook replay protection should store Cashfree idempotency/event IDs. Signature verification alone does not prevent replay.
- Refunds and disputes are modeled only partially and have no workflow.

### Policies and automation

What works now:

- Policy values save to the company row.

Still wrong or incomplete:

- There is no scheduler for nightly auto-checkout.
- There is no server job to enforce maximum break duration when the app is closed.
- Retention settings do not delete/anonymize route or attendance data.
- Policy changes do not have effective dates, versions, or an audit trail.
- The UI should not describe a policy as automated until a server-side job exists and is monitored.

## Employee app audit

### Login and device binding

What works now:

- Login calls the backend, verifies a hashed password, restricts field-app login to employees, binds an active device, and stores the token in SecureStore.
- Logout revokes the server session and clears the device session.

Still wrong or incomplete:

- A saved expired token initially opens the dashboard before the status request fails. Clear the session automatically on 401.
- There is no forgot-password/activation flow or support contact action.
- Device mismatch messaging exists, but there is no employee-visible reset-request workflow.
- Add token rotation and a “sign out all devices” action.

### Attendance experience

What works now:

- Check-in/out request foreground location permission and write GPS coordinates to PostgreSQL.
- Break/resume state is server-backed while the app is running.

Still wrong or incomplete:

- The app has no offline queue. Poor connectivity can lose attendance actions or leave the screen inconsistent.
- Buttons need disabled/loading states to prevent repeated taps and clearer retry/reconciliation behavior.
- The 30-minute break auto-resume is a client timer; it stops when the app is killed. Enforcement must be server-side.
- The employee cannot view today’s server timestamps, attendance history, total breaks, or correction status.
- Location accuracy is captured but is not yet enforced for check-in/out quality.
- There is no geofence/site policy, optional photo/selfie, or supervisor approval if those are product requirements.

### Route tracking and privacy

This is the largest product gap.

- There is no foreground/background `watchPosition` or background task.
- There is no waypoint batch endpoint usage, offline storage, retry, deduplication, or battery-aware sampling.
- The Kalman filter, dwell detector, and spoof checker are library code only; they are not connected to mobile ingestion.
- No route points means the owner map, dwell stops, route playback, distance, and tamper alerts have no production data source.
- Background permissions were removed in this pass because requesting them without a working feature is an employee privacy and app-store review risk.
- Before enabling background location, add explicit in-app disclosure/consent, a persistent Android foreground-service notification, a clear on-duty indicator, retention disclosure, pause rules, and auditable stop conditions.

### Device telemetry

- Battery, sound, brightness, storage, temperature, and RAM values are simulated.
- Buttons that “plug in charger,” “optimize RAM,” or change system state only mutate JavaScript memory.
- This screen is now labeled as a demo, but it should be removed from production until real, permission-appropriate native collection exists.
- Collect only telemetry that has a necessary workforce purpose. Sound/brightness/RAM monitoring is intrusive and may create employee trust and compliance issues without a strong, disclosed purpose.

## Database and Supabase audit

What is good now:

- Foreign keys, tenant identifiers, unique phone/email constraints, attendance uniqueness, payment uniqueness, and high-use indexes are present.
- Runtime uses Supavisor transaction pooling; migration tooling uses session pooling because the direct host is IPv6-only in this environment.
- A migration baseline exists and is registered in Supabase.

Remaining issues:

- Runtime currently authenticates with the powerful `postgres` database account. Create a least-privileged application role and reserve `postgres` for migrations.
- Prisma’s server connection bypasses Supabase Auth/RLS. Tenant isolation is therefore application-enforced; every new query must be reviewed for `company_id` scope.
- Add database tests that attempt cross-tenant access for every repository/API operation.
- `LocationWaypoint` will grow quickly. Define sampling volume, partitioning/archival, retention jobs, and cost limits before rollout.
- Consider PostGIS for bounding boxes, distance, geofences, and spatial indexing rather than loading entire routes into Node.
- `LocationStop.end_time` cannot represent an active stop; the ingestion design must account for that.
- Expired sessions are checked but never purged.
- Backups, point-in-time recovery, restoration drills, and production/staging separation are not documented.

## Security and privacy audit

Resolved high-risk findings:

- Public cross-tenant APIs
- Plaintext passwords
- Fabricated sessions
- Client-only dashboard protection
- Payment verification bypass
- Unsigned payment webhooks
- Wildcard credentialed CORS
- Fake APK distribution

Open findings:

- Rotate the Supabase password supplied during this session and update local/Vercel secrets.
- Add a restricted runtime database role.
- Add rate limiting for registration, login, payment creation/verification, and mobile writes.
- Add structured security/audit logs without storing passwords, tokens, or precise location in general logs.
- Add Content Security Policy and review all browser security headers.
- Define data-subject access/deletion, retention, consent, incident response, and employer/employee privacy documentation with qualified legal review.
- Encrypt backups and limit which support/admin personnel can view precise routes.
- Add webhook replay protection and alerting for invalid signatures/repeated failures.
- Add dependency/security scanning and secret scanning in CI.

## Engineering and operations audit

- There are no unit, API, integration, end-to-end, mobile device, or payment tests.
- The root build does not build the Expo application; mobile type checking was run manually.
- The health endpoint reports healthy without checking PostgreSQL or Cashfree.
- There is no error tracking, metrics, tracing, job monitoring, or alerting.
- Several dashboard fetches silently swallow failures and render zero/empty data, which owners can mistake for valid results.
- There is no staging database/environment or documented deploy/rollback process.
- Schema deployment should use `prisma migrate deploy`, not `db push`, after this baseline.
- Cashfree, Supabase, mobile permission, timezone, concurrency, and offline edge cases need automated coverage.

## Prioritized delivery plan

### P0 — before any pilot

1. Rotate the exposed Supabase password, create a least-privileged runtime role, and set pooled/runtime plus direct/migration URLs in deployment secrets.
2. Implement route ingestion end to end: native background task, explicit privacy disclosure, foreground notification, offline encrypted queue, authenticated batch endpoint, validation, deduplication, and retention.
3. Connect anti-spoof, filtering, and dwell detection to ingestion; stop claiming road snapping unless an actual road-matching service is added.
4. Implement monitored server jobs for auto-checkout, break caps, session cleanup, and retention—or remove those controls entirely.
5. Run Cashfree sandbox and production end-to-end tests, domain whitelisting, webhook replay/idempotency, refund behavior, and real invoice generation.
6. Replace the fake map canvas with a real map and explicit live/stale/offline states.
7. Publish a real signed APK through EAS/Play internal testing and configure the artifact URL.

### P1 — pilot quality

1. Add invite/activation, password reset, forced first-password change, MFA for owners, and login throttling.
2. Add department/manager CRUD, employee lifecycle controls, audit logs, and notifications.
3. Fix all timezone handling using company timezone boundaries and add overnight/split-shift tests.
4. Add employee history, offline action reconciliation, correction requests, and transparent location/privacy controls.
5. Add API/UI error states, pagination, filters, exports, and payroll-ready reporting.
6. Add automated tests and a staging deployment with observability.

### P2 — scale and product depth

1. PostGIS/partitioned route storage, archival, data-quality dashboards, and cost controls.
2. Realtime update strategy, geofences, route analytics, anomaly review, and manager workflows.
3. Recurring seat subscriptions, proration, refunds, GST-compliant invoice lifecycle, and accounting exports.
4. Formal security review, privacy review, app-store review, recovery drill, and operational runbooks.

## Minimum pilot acceptance criteria

- Two test companies cannot read or mutate each other’s users, attendance, routes, devices, settings, or payments.
- Owner and manager permissions behave differently and are covered by API tests.
- Employee login fails on a second device until an authorized reset.
- Check-in/out works online and after an offline/retry scenario without duplicates.
- Background route capture survives screen lock/app background and stops reliably at break/checkout.
- Owner map clearly shows fresh, stale, offline, on-break, and off-duty states.
- Auto-checkout and break enforcement work when the employee app is killed.
- A Cashfree test payment provisions exactly one employee; forged/replayed callbacks do not.
- A real signed APK installs, upgrades, authenticates, and handles all required permissions on supported Android versions.
- Build, type checks, migrations, tests, restore checks, and secret scanning pass in CI.
