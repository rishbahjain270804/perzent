#!/usr/bin/env bash
# Usage: adb shell screenrecord --time-limit 178 /sdcard/demo.mp4 &  then  bash scripts/record-play-demo.sh <phone> <password>
# Prereqs (off-camera): app signed out, location permissions revoked (pm revoke), autofill service disabled, other apps notifications silenced.
# Drives the Perzent background-location demo on the connected phone. Run while `adb shell screenrecord` is active.
export MSYS_NO_PATHCONV=1
S="${TMPDIR:-/tmp}"
P=app.jspcoders.perzent
PHONE="${1:-+919000000003}"; PASS="${2:-demo2026}"
T(){ adb shell input tap "$1" "$2"; }
Z(){ adb shell sleep "$1"; }
ui(){ adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$S/ui.xml" >/dev/null 2>&1; }
# waitfor "<text>" <max seconds>: poll the UI until the text is on screen
waitfor(){ local t="$1" max="${2:-20}" i=0; while [ $i -lt "$max" ]; do ui; if grep -q "text=\"$t" "$S/ui.xml"; then echo "[$(date +%T)] saw: $t"; return 0; fi; Z 1; i=$((i+1)); done; echo "[$(date +%T)] TIMEOUT waiting for: $t"; return 1; }
log(){ echo "[$(date +%T)] $*"; }

Z 2; adb shell monkey -p $P -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
waitfor "Sign in" 20; Z 2
T 540 820; Z 1; adb shell input text "$PHONE"; T 540 1065; Z 1; adb shell input text "$PASS"; adb shell input keyevent KEYCODE_BACK; Z 1; T 540 1252
waitfor "Location sharing while on duty" 25; Z 7                                  # hold the disclosure so it can be read
T 540 1568                                                                          # Continue
waitfor "While using the app" 15; Z 2; T 540 1902
waitfor "Allow all the time" 15; Z 2; T 349 663; Z 2; adb shell input keyevent KEYCODE_BACK
waitfor "Check in" 20; Z 3
T 540 1078                                                                          # Check in
waitfor "Shift started" 30; Z 3; T 893 1337; Z 3
adb shell cmd statusbar expand-notifications; Z 2; T 540 407; Z 5; adb shell cmd statusbar collapse; Z 2
adb shell input keyevent KEYCODE_HOME; Z 3
adb shell am start -a android.intent.action.VIEW -d "https://perzent.jspcoders.app/dashboard/live-map" com.android.chrome >/dev/null 2>&1
Z 10; adb shell input swipe 540 1800 540 700 400; Z 8
adb shell monkey -p $P -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
waitfor "Start break" 15; Z 2; T 540 1076
waitfor "START BREAK" 10; Z 1; T 839 1330
waitfor "Resume shift" 15; Z 5; T 540 1078
waitfor "Start break" 15; Z 3; T 540 1234
waitfor "CHECK OUT" 10; Z 1; T 854 1330
waitfor "Shift completed" 20; Z 4
adb shell cmd statusbar expand-notifications; Z 4; adb shell cmd statusbar collapse; Z 2
log "sequence done"
