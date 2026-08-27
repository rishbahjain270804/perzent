# Perzent Field Employee - Google Play release checklist

Package: `app.jspcoders.perzent` - Expo SDK 52 / React Native 0.76 - min SDK 24, target/compile SDK 35.

## 0. Before every release

1. `cd apps/employee-mobile && npm run typecheck` must pass.
2. Bump the version in **both** places (they must match):
   - `android/app/build.gradle` -> `versionCode` / `versionName`
   - `app.json` -> `expo.version` / `expo.android.versionCode`
   - Rule: `versionCode` is a monotonically increasing integer and must be bumped on **every**
     upload to Play (even for the internal testing track). `versionName` is the human version
     (`1.2.0`). Keep the backend's `/api/mobile/version` in sync afterwards (`latest_version`,
     `latest_version_code`, `min_required_version_code`, `play_store_url`).
3. Do **not** run `expo prebuild --clean` (see README). The `android/` directory is hand-maintained.

## 1. Signing key

The upload key lives in `android/app/perzent-release.keystore` (git-ignored).

**Back it up now** - if the keystore is lost you cannot update the app on Play unless you enrolled
in Play App Signing (do that, see step 4). Store a copy plus the passwords in the team password
manager; never commit it.

Generate once (only if it does not exist yet):

```bash
cd apps/employee-mobile/android/app
keytool -genkeypair -v -storetype JKS -keystore perzent-release.keystore \
  -alias perzent -keyalg RSA -keysize 2048 -validity 10000
```

Create `android/keystore.properties` (git-ignored, read by `android/app/build.gradle`):

```properties
storeFile=perzent-release.keystore
storePassword=********
keyAlias=perzent
keyPassword=********
```

`storeFile` is relative to `android/app/`. When the file is missing or incomplete Gradle prints a
loud `WARNING` banner and signs release builds with the debug key - such a build is **not**
uploadable to Play.

Signing-key change: if a release is ever signed with a different key than the one users have
installed, Android refuses to update in place. Set `requires_reinstall_below_code` on the backend
to the first versionCode signed with the new key so the in-app update prompt tells users to
uninstall the old app first.

## 2. Build the App Bundle

```bash
cd apps/employee-mobile
npm run build:android:bundle          # -> android/app/build/outputs/bundle/release/app-release.aab
```

(`npm run build:android:release` produces the APK used for the direct-download link; Play requires
the `.aab`.) The build targets `arm64-v8a` and `armeabi-v7a` (`gradle.properties`
`reactNativeArchitectures`, `build.gradle` `abiFilters`).

Sanity-test the release bundle on a real device before uploading, e.g. with
`bundletool build-apks --connected-device` or by installing the release APK.

## 3. Play Console - first-time setup

1. Create the app (Android, Free, category "Business").
2. **App signing**: enrol in Play App Signing when uploading the first bundle. Play holds the
   app-signing key; `perzent-release.keystore` becomes the *upload* key. Keep it backed up anyway.
3. Store listing: name, short/full description, screenshots, feature graphic, app icon.
4. **Privacy policy URL**: `https://perzent.vercel.app/privacy` (must mention background location,
   what is collected, who receives it, retention, and how to request deletion).
5. App content declarations (all under *Policy > App content*):
   - **Data safety** form - see section 5.
   - **Permissions declaration** for `ACCESS_BACKGROUND_LOCATION` - see section 6.
   - Ads: No. Target audience: 18+ / business use. News app: No. COVID: No. Government app: No.
   - Financial features: none. Health: none.
   - App access: provide a **test login** (phone + password of a demo employee on a demo company)
     because the app is not usable without an employer-created account. Note in the instructions
     that the reviewer must tap *Continue* on the location disclosure and choose *Allow all the
     time* to check in.

## 4. Testing tracks

Always go **Internal testing -> Closed/Open testing -> Production**. Never upload straight to
production: the background-location review can take days and a rejection blocks the listing.

1. Upload the `.aab` to *Internal testing*, add tester e-mails, install from the opt-in link.
2. Verify on the device: check-in works, the single "Perzent - On duty" notification is shown,
   tracking survives screen-off and app swipe, break pauses tracking, check-out stops it, the
   update prompt appears when the backend reports a newer `latest_version_code`.
3. Promote the same bundle to production once approved.

## 5. Data safety form (must match what the app really collects)

Answer "Yes, we collect data", data is **encrypted in transit**, users **can request deletion**
(through their employer / the privacy page), data is **not** shared with third parties for
advertising. Collected data types:

| Category | Data | Collected / Shared | Purpose | Required? |
| --- | --- | --- | --- | --- |
| Location | **Precise location** (foreground and **background** while checked in) | Collected, shared with the employer | App functionality (attendance, live route) | Required for the duty features |
| Personal info | Name, phone number, job designation | Collected | App functionality, account management | Required |
| App info & performance | Diagnostics: battery level/charging state, power-save mode, developer-options flag, location-services & permission state, mock-location flag | Collected | App functionality (work-readiness compliance), fraud prevention | Required |
| Device or other IDs | Android ID (device binding), device model, OS version | Collected | Fraud prevention, security | Required |
| App activity | Attendance events (check-in/out, breaks) | Collected | App functionality | Required |

Not collected: contacts, photos/media, files, messages, audio, financial info, health info,
web browsing, crash logs via third-party SDKs, advertising ID.

## 6. Background location permission declaration

Play requires a separate declaration + review for `ACCESS_BACKGROUND_LOCATION`.

- Core feature: "Live location of field employees while they are checked in to a work shift, so
  their employer can verify attendance and see their route."
- Why background is needed: employees put the phone in their pocket; tracking must continue while
  the app is not on screen. Tracking runs **only between check-in and check-out and pauses during
  breaks**, with a persistent foreground-service notification.
- **Prominent disclosure**: the app shows a full-screen in-app disclosure ("Location sharing
  while on duty") **before** requesting any location permission, with *Continue* / *Not now*.
  Only after *Continue* does it request foreground then background ("Allow all the time").
- **Demo video (required)**: record the phone screen showing, in this order:
  1. Fresh install -> sign in.
  2. The in-app disclosure screen (read it in full).
  3. Tap *Continue* -> system prompt -> choose *While using the app* -> second prompt / settings
     -> choose *Allow all the time*.
  4. Check in -> the persistent notification appears in the shade.
  5. Press Home / lock the phone for ~30 s -> return and show the manager view or the admin
     portal receiving live points.
  6. Start break (notification disappears) -> resume -> check out (notification gone).
  Upload the video (YouTube unlisted link is fine) in the declaration form.
- Privacy policy link: `https://perzent.vercel.app/privacy`.

## 7. Target API level

- This build targets **API 35** (Android 15), which satisfies Play's requirement for 2025.
- **From 31 Aug 2026 Play requires target API 36 (Android 16)** for new apps and updates. Expo
  SDK 52 / RN 0.76 does not officially support target 36 - plan an **Expo SDK upgrade (SDK 54+)**
  before that date. Because `android/` is hand-maintained, the upgrade must be done by hand:
  regenerate a scratch project with the new SDK, diff its `android/` against ours, and port the
  custom Kotlin files, the manifest changes, the signing block and the notification icon.

## 8. After publishing

1. Update the backend `/api/mobile/version`: `latest_version`, `latest_version_code`,
   `min_required_version_code` (raise only for security-critical releases - it forces an
   undismissable prompt), `play_store_url` = `https://play.google.com/store/apps/details?id=app.jspcoders.perzent`.
2. Keep the direct-download APK (`download_url`) in sync for devices without Play.
3. Tag the commit with the version (`mobile-v1.2.0`).
