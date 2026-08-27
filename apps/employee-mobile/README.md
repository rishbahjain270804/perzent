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

- `.env` - `EXPO_PUBLIC_API_URL` (defaults to `https://perzent.jspcoders.app` when unset).
- `android/keystore.properties` - release signing (git-ignored). See `RELEASE.md`.

## Release

See [`RELEASE.md`](./RELEASE.md) for the Play Store checklist.

## Adding React Native libraries with native code

Autolinking (Expo `react-native-config`) only sees libraries that are listed in **this** package.json.
A failed `pnpm add` (e.g. aborted postinstall) can leave the package in node_modules and the lockfile
but not in package.json — the build then compiles fine and the app crashes on launch with
`No ViewManager found for class ...`. After adding a native library:

1. Confirm it is in `apps/employee-mobile/package.json` and `pnpm install --frozen-lockfile --offline` passes.
2. Delete `android/build/generated/autolinking/` (its cache key ignores the repo-root `pnpm-lock.yaml`).
3. Check `node --eval "require(require.resolve('expo-modules-autolinking',{paths:[require.resolve('expo/package.json')]}))(process.argv.slice(1))" react-native-config --json --platform android` lists it.
4. Rebuild and watch `adb logcat | grep -E "FATAL|ViewManager"` on first launch.

`MainApplication.kt` registers `SafeAreaContextPackage` behind a `packages.none { ... }` guard so it works whether or not autolinking includes it.
