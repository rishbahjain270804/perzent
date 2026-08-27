/* eslint-disable */
/**
 * Generates the Android launcher icon, splash icon, splash branding image and Play Store icon
 * from HTML/CSS, using Playwright's bundled Chromium (no native image tooling required).
 *
 *   node scripts/generate-branding.js            (run from apps/employee-mobile)
 *
 * Inputs (optional): assets/branding/jsp-coders-logo.png — the JSP Coders logo. When present it is
 * composited into the "Developed by JSP Coders" branding image; otherwise a styled wordmark is used.
 * Playwright: uses ../../scratch or a global install; set PLAYWRIGHT_MODULE to its path if needed.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const ASSETS = path.join(ROOT, 'assets');
const LOGO_FILE = path.join(ASSETS, 'branding', 'jsp-coders-logo.png');

const BRAND_GREEN = '#16A34A';
const BRAND_GREEN_DARK = '#15803D';
const SPLASH_BG = '#F8FAFC';

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(ROOT, 'node_modules', 'playwright')].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright not found — npm i playwright (or set PLAYWRIGHT_MODULE)');
}

const logoDataUrl = fs.existsSync(LOGO_FILE)
  ? `data:image/png;base64,${fs.readFileSync(LOGO_FILE).toString('base64')}`
  : null;

/** The Perzent mark: green rounded square, white P, small location dot. `pad` = fraction of canvas kept clear. */
function markHtml(size, { rounded = true, background = true, pad = 0 } = {}) {
  const inner = size * (1 - pad * 2);
  const radius = rounded ? inner * 0.22 : 0;
  return `<!doctype html><html><body style="margin:0;background:transparent;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif">
  <div style="width:${inner}px;height:${inner}px;border-radius:${radius}px;background:${background ? `linear-gradient(160deg, ${BRAND_GREEN} 0%, ${BRAND_GREEN_DARK} 100%)` : 'transparent'};position:relative;display:flex;align-items:center;justify-content:center;">
    <div style="color:#fff;font-weight:800;font-size:${inner * 0.62}px;line-height:1;letter-spacing:-${inner * 0.03}px;margin-top:-${inner * 0.04}px">P</div>
    <div style="position:absolute;right:${inner * 0.2}px;bottom:${inner * 0.2}px;width:${inner * 0.11}px;height:${inner * 0.11}px;border-radius:50%;background:#fff;box-shadow:0 0 0 ${inner * 0.035}px rgba(255,255,255,0.35)"></div>
  </div></body></html>`;
}

/** "Developed by JSP Coders" branding strip (transparent), sized w×h px. */
function brandingHtml(w, h) {
  const logo = logoDataUrl
    ? `<img src="${logoDataUrl}" style="height:${h * 0.7}px;width:auto;object-fit:contain;flex:0 0 auto" />`
    : `<div style="flex:0 0 auto;font-weight:900;font-size:${h * 0.38}px;line-height:1;letter-spacing:-${h * 0.015}px;background:linear-gradient(180deg,#E11D2E 0%,#8E0E19 100%);-webkit-background-clip:text;color:transparent;font-style:italic;padding-right:${h * 0.04}px">JSP</div>`;
  return `<!doctype html><html><body style="margin:0;background:transparent;width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;gap:${h * 0.12}px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;white-space:nowrap">
  ${logo}
  <div style="display:flex;flex-direction:column;line-height:1.15;flex:0 0 auto">
    <span style="font-size:${h * 0.13}px;letter-spacing:${h * 0.025}px;text-transform:uppercase;color:#64748B;font-weight:600">Developed by</span>
    <span style="font-size:${h * 0.26}px;color:#0F172A;font-weight:800;letter-spacing:-${h * 0.005}px">JSP Coders</span>
  </div></body></html>`;
}

async function shoot(browser, html, w, h, out, transparent = true) {
  const page = await browser.newPage({ viewport: { width: Math.round(w), height: Math.round(h) }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.waitForTimeout(50);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: transparent, type: 'png' });
  await page.close();
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // 1. Store / Expo icons
  await shoot(browser, markHtml(1024, { rounded: false }), 1024, 1024, path.join(ASSETS, 'icon.png'), false);
  await shoot(browser, markHtml(512, { rounded: false }), 512, 512, path.join(ASSETS, 'play-store-icon-512.png'), false);
  await shoot(browser, markHtml(1024, { background: false, pad: 0.18 }), 1024, 1024, path.join(ASSETS, 'adaptive-icon-foreground.png'));

  // 2. Android launcher icons (legacy PNG + adaptive foreground per density)
  for (const [dpi, scale] of Object.entries(DENSITIES)) {
    const legacy = 48 * scale;
    const fg = 108 * scale;
    await shoot(browser, markHtml(legacy, { rounded: true }), legacy, legacy, path.join(RES, `mipmap-${dpi}`, 'ic_launcher.png'));
    await shoot(browser, `<!doctype html><body style="margin:0;background:transparent;width:${legacy}px;height:${legacy}px"><div style="width:${legacy}px;height:${legacy}px;border-radius:50%;overflow:hidden;background:linear-gradient(160deg, ${BRAND_GREEN} 0%, ${BRAND_GREEN_DARK} 100%);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',Arial,sans-serif"><div style="color:#fff;font-weight:800;font-size:${legacy * 0.62}px;line-height:1;margin-top:-${legacy * 0.04}px">P</div></div></body>`, legacy, legacy, path.join(RES, `mipmap-${dpi}`, 'ic_launcher_round.png'));
    // Adaptive foreground: content must stay inside the central 66/108 safe zone.
    await shoot(browser, markHtml(fg, { background: false, pad: 0.24 }), fg, fg, path.join(RES, `mipmap-${dpi}`, 'ic_launcher_foreground.png'));
    // Splash (Android 12+ icon: 240dp canvas, content within the inner ~2/3)
    const splash = 240 * scale;
    await shoot(browser, markHtml(splash, { rounded: true, pad: 0.2 }), splash, splash, path.join(RES, `drawable-${dpi}`, 'splash_icon.png'));
    // Legacy splash logo (pre-12 layer-list), 160dp
    const legacySplash = 160 * scale;
    await shoot(browser, markHtml(legacySplash, { rounded: true }), legacySplash, legacySplash, path.join(RES, `drawable-${dpi}`, 'splashscreen_logo.png'));
    // Branding image: 200×80dp (Android's maximum), transparent
    await shoot(browser, brandingHtml(200 * scale, 80 * scale), 200 * scale, 80 * scale, path.join(RES, `drawable-${dpi}`, 'splash_branding.png'));
  }

  // 3. In-app assets (RN Image): logo mark and branding strip at 3x
  await shoot(browser, markHtml(288, { rounded: true }), 288, 288, path.join(ASSETS, 'logo-mark.png'));
  await shoot(browser, brandingHtml(600, 240), 600, 240, path.join(ASSETS, 'developed-by-jsp-coders.png'));

  // Remove the old template webp icons so they do not clash with the PNGs.
  for (const dpi of Object.keys(DENSITIES)) {
    for (const name of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
      const f = path.join(RES, `mipmap-${dpi}`, name);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  await browser.close();
  console.log(`branding assets generated (JSP logo file ${logoDataUrl ? 'used' : 'NOT found — wordmark fallback used; add assets/branding/jsp-coders-logo.png and re-run'})`);
})().catch((e) => { console.error(e); process.exit(1); });
