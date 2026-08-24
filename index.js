// Expo 52 starts Metro at the pnpm workspace root for native release builds.
// Keep this bridge so its rewritten `./index.js` entry reaches the mobile app.
require('./apps/employee-mobile/index');
