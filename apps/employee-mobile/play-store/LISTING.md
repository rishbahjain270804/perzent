# Perzent — Google Play listing kit (v1.2.0, versionCode 12)

Everything in this folder is ready to paste/upload into Play Console. The technical checklist
(signing, build, tracks, API level) is in [`../RELEASE.md`](../RELEASE.md); this file is the
*content*: what to type into each form.

Files:

| File | Console field | Spec |
| --- | --- | --- |
| `perzent-1.2.0-12.aab` (git-ignored, copy from `android/app/build/outputs/bundle/release/`) | Release → App bundle | signed with the upload key `perzent` |
| `graphics/app-icon-512.png` | Store listing → App icon | 512×512 PNG |
| `graphics/feature-graphic-1024x500.png` | Store listing → Feature graphic | 1024×500 PNG |
| `graphics/screenshots/01-check-in.png … 05-help.png` | Store listing → Phone screenshots | 1080×1920 PNG, 9:16 (2–8 required) — styled cards rendered by `scripts/generate-store-cards.js` from the raw captures in `graphics/raw/` |

---

## 1. App details

| Field | Value |
| --- | --- |
| App name (30) | `Perzent – Field Attendance` |
| Default language | English (United Kingdom) — or English (India) |
| App or game | App |
| Free or paid | Free |
| Category | Business |
| Tags | Attendance, Workforce management, GPS tracking |
| Email (public) | `jspcoders@gmail.com` |
| Website | `https://perzent.jspcoders.app` |
| Privacy policy URL | `https://perzent.jspcoders.app/privacy` |
| Account deletion URL (Data safety → "Provide a link") | `https://perzent.jspcoders.app/account-deletion` |
| Developer name shown on Play | JSP Coders |

### Short description (max 80 chars — this one is 79)

```
Shift check-in with live location for field staff. Tracked only while on duty.
```

### Full description (max 4000)

```
Perzent is the employee app for companies that use Perzent to manage field staff — riders, sales reps, technicians and site workers. Your employer creates your account; you sign in with your phone number and check in when your shift starts.

WHAT THE APP DOES
• One-tap check-in and check-out for your work shift
• Breaks: pause tracking during a break and resume when you are back
• Live location while on duty so your manager can see attendance and routes
• Auto check-out at the time set by your company, so you are never charged for a forgotten check-out
• Works offline: location points are stored on the phone and sent when the connection returns
• Survives phone restarts: if a shift is open, tracking resumes automatically after you unlock the phone
• Readiness check before check-in: location permission, GPS, battery saver and mock-location apps
• Managers: see the live map, add employees and reset devices from the app

YOUR PRIVACY
• Location is recorded ONLY between check-in and check-out and pauses during breaks. Nothing is recorded when you are off duty.
• A persistent notification is shown whenever location sharing is active.
• Your data is processed on behalf of your employer; it is never sold or used for advertising.
• Route history is deleted after the retention period your company sets (15 days by default).
• Read the full policy at https://perzent.jspcoders.app/privacy

PERMISSIONS
• Location "Allow all the time" — required so tracking continues while the phone is in your pocket or the screen is off during a shift.
• Notifications — the on-duty notification and update prompts.

FOR COMPANY OWNERS
Register your company free at https://perzent.jspcoders.app, add employees and share their credentials. The launch plan includes unlimited employees, live map, route playback, attendance corrections, timesheets and reports.

SUPPORT
FAQ: https://perzent.jspcoders.app/faq
Support: https://perzent.jspcoders.app/support · jspcoders@gmail.com
Developed by JSP Coders.
```

### Release notes (What's new, max 500)

```
First public release.
• Shift check-in / check-out, breaks and auto check-out
• Live location while on duty, with offline queueing and automatic resume after a restart
• Readiness check for location, GPS, battery saver and mock-location apps
• Manager tools: live map, add employees, reset devices
• FAQ, support and privacy links inside the app
```

---

## 2. Store listing → Graphics

- App icon: `graphics/app-icon-512.png`
- Feature graphic: `graphics/feature-graphic-1024x500.png`
- Phone screenshots (upload in this order): `graphics/screenshots/01-check-in.png`,
  `02-live-location.png`, `03-auto-checkout.png`, `04-sign-in.png`, `05-help.png`.
  To re-render after UI changes: drop new 1080×2340 captures into `graphics/raw/` (same file
  names) and run `PLAYWRIGHT_MODULE=<playwright> node scripts/generate-store-cards.js`
- 7-inch / 10-inch tablet screenshots: not required (the app is phone-only; leave empty or reuse
  the phone shots).
- Promo video: optional. The **background-location demo video is separate** (section 6).

---

## 3. App content (Policy → App content) — answers

| Declaration | Answer |
| --- | --- |
| Privacy policy | `https://perzent.jspcoders.app/privacy` |
| Ads | No, the app does not contain ads |
| App access | **Some or all functionality is restricted** → add instructions (section 5) |
| Content rating | Complete the IARC questionnaire: Utility/Productivity; no violence, sexual content, language, controlled substances, gambling; **does share location** — answer "Yes, users' location is shared with other users" (the employer). Result: Everyone / PEGI 3 |
| Target audience | 18 and over (it is a work tool; do not tick any under-18 group) |
| News app | No |
| COVID-19 contact tracing / status | No |
| Data safety | Section 4 |
| Government app | No |
| Financial features | No financial features |
| Health | No health features |
| Advertising ID | **No**, the app does not use the advertising ID |
| Sensitive permissions — Location | Section 6 (background location declaration) |
| Foreground service permissions | `FOREGROUND_SERVICE_LOCATION` → use case **Location**: "Continuous location updates while the user is checked in to a work shift; started by the user tapping Check in; stops at Check out." Add the demo video link from section 6. |

---

## 4. Data safety form

Overview questions:

- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes** (HTTPS only)
- Do you provide a way for users to request that their data is deleted? **Yes** →
  `https://perzent.jspcoders.app/account-deletion`
- Does your app allow users to create an account? **No** (accounts are created by the employer —
  choose "No" so the "account creation" branch is not required; deletion is still offered via the URL above)

Data types (tick **Collected**; tick **Shared** only where marked; all are **Required**, none are
Optional; nothing is **processed ephemerally**):

| Category | Type | Collected | Shared | Purposes |
| --- | --- | --- | --- | --- |
| Location | Approximate location | Yes | Yes (with the employer) | App functionality |
| Location | Precise location | Yes | Yes (with the employer) | App functionality, Fraud prevention/security |
| Personal info | Name | Yes | Yes | App functionality, Account management |
| Personal info | Phone number | Yes | No | Account management |
| Personal info | Email address (owners/managers only) | Yes | No | Account management |
| App activity | Other user-generated content (attendance events: check-in/out, breaks) | Yes | Yes | App functionality |
| App info & performance | Diagnostics (battery level, power-save state, location-services state, mock-location flag) | Yes | Yes | App functionality, Fraud prevention |
| Device or other IDs | Device or other IDs (Android ID for one-phone binding, device model, OS version) | Yes | No | Fraud prevention/security |

"Shared" here means visible to the user's own employer inside Perzent — Play counts that as
sharing with a third party. Not collected: contacts, photos/videos, files, audio, health,
financial info, messages, browsing history, crash logs, installed apps, advertising ID.

Data handling: data is **not** used for advertising or marketing, **not** sold, and collected data
is **not** transferred to any other third party.

---

## 5. App access — reviewer instructions

Choose **All or some functionality is restricted** → *Add new instructions*:

```
Name: Reviewer employee login
Username / phone: +919000000001
Password: review2026

Perzent is a workforce app; accounts are created by an employer, so please use the test account above (company "Smoke Test 27762"). Steps:
1. Open the app and sign in with the phone number and password above.
2. The app shows a full-screen disclosure "Location sharing while on duty". Tap Continue, then choose "While using the app" and, on the second prompt (or in Settings), "Allow all the time". Allow notifications.
3. Tap "Check in". A persistent "Perzent – On duty" notification appears and location is shared with the test employer only until you tap "Check out".
4. Optional: tap "Start break" (tracking pauses, notification disappears) and "Resume shift".
5. Tap "Check out" to stop all location collection.

Owner web portal (to see the live map for the same test company): https://perzent.jspcoders.app/login — smoke27762@example.com / smoketest123.
```

Note: the account is bound to the first phone that signs in. If the reviewer needs to switch
phones, reset the device from the portal (Employees → Play Reviewer → *Reset device*) or send a
fresh account.

---

## 6. Background location declaration (Sensitive permissions → Location)

- Which features use location in the background? **Live location of field employees while they
  are checked in to a work shift, so their employer can verify attendance and see the route.**
- Why is background access needed? Employees keep the phone in a pocket or bag; the app is not
  on screen for most of the shift. Tracking runs **only between Check in and Check out, pauses
  during breaks**, and is shown with a persistent foreground-service notification. Foreground-only
  access would silently stop tracking within seconds of the screen turning off.
- Is location the core functionality? **Yes** — attendance verification and route recording is the
  reason the app exists; the employer relies on it for payroll and dispatch.
- Prominent disclosure: shown **before** any permission request, inside the app
  (title "Location sharing while on duty", explains what is collected, when, who sees it, with
  *Continue* / *Not now*). Only after *Continue* is the system prompt shown.
- Privacy policy: `https://perzent.jspcoders.app/privacy` (sections "Location while on duty",
  "Retention", "Your rights").
- **Video (required)** — record the phone screen (Android screen recorder is fine), 1–3 minutes,
  and upload to YouTube as *Unlisted*; paste the link. Show in this order:
  1. Cold start → sign in with the reviewer account.
  2. The in-app disclosure screen, held long enough to read.
  3. Tap *Continue* → system prompt → *While using the app* → *Allow all the time*.
  4. Tap *Check in* → pull down the shade to show the "Perzent – On duty" notification.
  5. Press Home, open another app for ~30 s, lock/unlock the phone.
  6. Open the portal live map on a laptop (or the manager tab) showing the position updating.
  7. *Start break* → notification disappears → *Resume shift* → *Check out* → notification gone.

---

## 7. Play App Signing — decide before the first upload

Play asks how to manage the app-signing key on the first bundle upload.

- **Recommended for Perzent: "Use a different key — export and upload a key from a Java keystore"**
  and upload `android/app/perzent-release.keystore` via the PEPK tool the console offers. Then the
  key Play signs with is the *same* key as the direct-download APK on
  `https://perzent.jspcoders.app/download`, so a phone that side-loaded the APK can update from
  Play in place. (The keystore still stays the upload key too.)
- If you accept the default ("Let Google generate the key"), Play re-signs with a new key: every
  side-loaded install (including the test S24) must **uninstall** before installing from Play, and
  `requires_reinstall_below_code` on the backend must be raised to the first Play versionCode.

Either way: back up `perzent-release.keystore` + `keystore.properties` to a password manager
today. Without them you cannot upload updates.

---

## 8. Console walkthrough (first time)

1. **Developer account** — <https://play.google.com/console>, one-time US$25. Register as an
   *Organisation* (JSP Coders) if you have a D-U-N-S number; a *Personal* account works but
   **must run a closed test with at least 12 testers opted in for 14 continuous days before
   production access is granted** — plan for that delay.
2. *Create app* → name `Perzent – Field Attendance`, English, App, Free → accept declarations.
3. *Set up your app* (dashboard task list): Privacy policy, App access (section 5), Ads, Content
   rating, Target audience, News, COVID, Data safety (section 4), Government, Financial, Health,
   App category & contact details (section 1), Store listing (sections 1–2).
4. *Release → Testing → Internal testing → Create release*: choose the Play App Signing option
   (section 7), upload `perzent-1.2.0-12.aab`, paste the release notes, *Save → Review → Roll out*.
   Add tester emails (yourself + team), open the opt-in link on a phone, install and run through
   the flow in RELEASE.md §4.
5. *Policy → App content → Sensitive permissions* appears once a bundle with
   `ACCESS_BACKGROUND_LOCATION` is uploaded — fill section 6 and attach the video.
6. *Release → Testing → Closed testing* (personal accounts: 12 testers, 14 days) → then
   *Production → Create release → promote the same bundle*. First review typically takes 1–7 days;
   background-location reviews can take longer. Watch the *Inbox* for policy questions.
7. After approval: set the Vercel env var `NEXT_PUBLIC_PLAY_STORE_URL` =
   `https://play.google.com/store/apps/details?id=app.jspcoders.perzent` (read by
   `apps/admin-portal/src/lib/app-version.ts`, served as `play_store_url` to the app so the
   in-app update prompt opens Play) and redeploy; tag the commit `mobile-v1.2.0`.

### Deadline note

This bundle targets **API 35**. Google requires **API 36** for new apps and app updates from
**31 August 2026**. Creating the app and uploading this bundle to a testing track before that
date is fine; a later *update* will need the Expo SDK 54 upgrade (RELEASE.md §7) or a deadline
extension requested in the console (*Policy → App content → Target API level*).
