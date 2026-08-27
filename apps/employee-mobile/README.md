# Perzent Field Employee (Android)

Expo SDK 52 / React Native 0.76 app for field employees: attendance check-in/out, breaks, and
live GPS tracking while on duty. Managers additionally get a team view.

## Important: the `android/` directory is hand-maintained

The native Android project contains custom Kotlin code (a sticky foreground location service,
the `PerzentBackgroundTracking` and `DeviceIntegrity` native modules, a custom notification
icon, release-signing configuration and manifest tweaks).

**Never run `expo prebuild --clean`** - it would delete and regenerate `android/` and wipe all
of that. Plain `expo prebuild` is also discouraged; make native changes by editing the files in
`android/` directly. `app.json` is kept in sync by hand (version, versionCode, permissions).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run start` | Metro dev server |
| `npm run android` | Build + install a debug build on a connected device |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build:android:release` | `gradlew.bat assembleRelease` (APK for direct download) |
| `npm run build:android:bundle` | `gradlew.bat bundleRelease` (AAB for Google Play) |

## Configuration

- `.env` - `EXPO_PUBLIC_API_URL` (defaults to `https://perzent.vercel.app` when unset).
- `android/keystore.properties` - release signing (git-ignored). See `RELEASE.md`.

## Release

See [`RELEASE.md`](./RELEASE.md) for the Play Store checklist.

## Adding React Native libraries with native code

Expo's `react-native-config` autolinking does **not** detect some community libraries in this pnpm
workspace (observed with `react-native-safe-area-context`: the build succeeded but the app crashed
with `No ViewManager found for class RNCSafeAreaProvider`). Link such libraries manually:

1. `android/settings.gradle` — `include ':<lib>'` + `project(':<lib>').projectDir = .../node_modules/<lib>/android`
2. `android/app/build.gradle` — `implementation project(':<lib>')`
3. `MainApplication.kt` — `packages.add(<LibPackage>())`, guarded with `packages.none { it is <LibPackage> }`

Verify with `adb logcat | grep -E "FATAL|ViewManager"` on first launch. Also delete
`android/build/generated/autolinking/` after changing dependencies — its cache key ignores the
repo-root `pnpm-lock.yaml`.
