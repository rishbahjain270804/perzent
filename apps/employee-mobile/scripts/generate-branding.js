/* eslint-disable */
/**
 * Generates the Android launcher icon, splash icon, splash branding image, Play Store icon and the
 * in-app brand images from the source artwork in assets/branding, using Playwright's bundled
 * Chromium (no native image tooling required).
 *
 *   node scripts/generate-branding.js            (run from apps/employee-mobile)
 *   PLAYWRIGHT_MODULE=<path to node_modules/playwright> node scripts/generate-branding.js
 *
 * Inputs:
 *   assets/branding/perzent-icon.png       – the Perzent app icon (green rounded square, white P)
 *   assets/branding/perzent-wordmark.png   – the "Perzent" wordmark
 *   assets/branding/jsp-coders-logo.png    – optional; composited into "Developed by JSP Coders"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const ASSETS = path.join(ROOT, 'assets');
const BRANDING = path.join(ASSETS, 'branding');

const BRAND_GREEN = '#1A9F47'; // sampled from the icon artwork
const SPLASH_BG = '#FFFFFF';

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(ROOT, 'node_modules', 'playwright')].filter(Boolean);
  for (const c of candidates) {
    try { return require(c); } catch {}
  }
  throw new Error('playwright not found — npm i playwright (or set PLAYWRIGHT_MODULE)');
}

const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;
const ICON = dataUrl(path.join(BRANDING, 'perzent-icon.png'));
const WORDMARK = dataUrl(path.join(BRANDING, 'perzent-wordmark.png'));
const JSP_LOGO_FILE = path.join(BRANDING, 'jsp-coders-logo.png');
const JSP_LOGO = fs.existsSync(JSP_LOGO_FILE) ? dataUrl(JSP_LOGO_FILE) : null;

const page = (w, h, body, bg = 'transparent') =>
  `<!doctype html><html><body style="margin:0;background:${bg};width:${w}px;height:${h}px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;white-space:nowrap">${body}</body></html>`;

/** Icon artwork centred on a square canvas; `scale` relative to the canvas (>1 crops the rounded corners). */
const iconHtml = (size, scale, bg = 'transparent', clip = '') =>
  page(size, size, `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;overflow:hidden;${clip}">
    <img src="${ICON}" style="width:${size * scale}px;height:${size * scale}px;flex:0 0 auto;object-fit:cover" /></div>`, bg);

/** Icon + wordmark lockup on a transparent canvas. */
const lockupHtml = (w, h) =>
  page(w, h, `<img src="${ICON}" style="height:${h * 0.92}px;width:auto;object-fit:contain" />
    <img src="${WORDMARK}" style="height:${h * 0.5}px;width:auto;object-fit:contain;margin-left:${h * 0.16}px" />`);

/** "Developed by JSP Coders" strip, w×h px, transparent. */
const brandingHtml = (w, h) => {
  const logo = JSP_LOGO
    ? `<img src="${JSP_LOGO}" style="height:${h * 0.7}px;width:auto;object-fit:contain;flex:0 0 auto" />`
    : `<div style="flex:0 0 auto;font-weight:900;font-size:${h * 0.38}px;line-height:1;letter-spacing:-${h * 0.015}px;background:linear-gradient(180deg,#E11D2E 0%,#8E0E19 100%);-webkit-background-clip:text;color:transparent;font-style:italic;padding-right:${h * 0.04}px">JSP</div>`;
  return page(w, h, `${logo}
    <div style="display:flex;flex-direction:column;line-height:1.15;flex:0 0 auto;margin-left:${h * 0.12}px">
      <span style="font-size:${h * 0.13}px;letter-spacing:${h * 0.025}px;text-transform:uppercase;color:#64748B;font-weight:600">Developed by</span>
      <span style="font-size:${h * 0.26}px;color:#0F172A;font-weight:800">JSP Coders</span>
    </div>`);
};

async function shoot(browser, html, w, h, out, transparent = true) {
  const p = await browser.newPage({ viewport: { width: Math.round(w), height: Math.round(h) }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.waitForTimeout(80);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await p.screenshot({ path: out, omitBackground: transparent, type: 'png' });
  await p.close();
}

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  // 1. Store / Expo icons: full-bleed (the artwork's own rounded corners are cropped; stores apply their own mask)
  await shoot(browser, iconHtml(1024, 1.12, BRAND_GREEN), 1024, 1024, path.join(ASSETS, 'icon.png'), false);
  await shoot(browser, iconHtml(512, 1.12, BRAND_GREEN), 512, 512, path.join(ASSETS, 'play-store-icon-512.png'), false);
  await shoot(browser, iconHtml(1024, 0.9), 1024, 1024, path.join(ASSETS, 'adaptive-icon-foreground.png'));

  // 2. Android launcher icons
  for (const [dpi, scale] of Object.entries(DENSITIES)) {
    const legacy = 48 * scale;
    const fg = 108 * scale;
    // legacy square: the artwork as-is (its rounded corners are the icon shape)
    await shoot(browser, iconHtml(legacy, 1.0), legacy, legacy, path.join(RES, `mipmap-${dpi}`, 'ic_launcher.png'));
    // legacy round: artwork clipped to a circle
    await shoot(browser, iconHtml(legacy, 1.08, 'transparent', 'border-radius:50%'), legacy, legacy, path.join(RES, `mipmap-${dpi}`, 'ic_launcher_round.png'));
    // adaptive foreground: artwork at 90% so the P sits inside the 66/108 safe zone and the corners are outside the mask
    await shoot(browser, iconHtml(fg, 0.9), fg, fg, path.join(RES, `mipmap-${dpi}`, 'ic_launcher_foreground.png'));
    // Android 12+ splash icon (240dp canvas, content within the inner two thirds)
    const splash = 240 * scale;
    await shoot(browser, iconHtml(splash, 0.6), splash, splash, path.join(RES, `drawable-${dpi}`, 'splash_icon.png'));
    // legacy splash (pre-12 layer-list): icon + wordmark lockup, 240×72dp
    await shoot(browser, lockupHtml(240 * scale, 72 * scale), 240 * scale, 72 * scale, path.join(RES, `drawable-${dpi}`, 'splashscreen_logo.png'));
    // branding image: 200×80dp (Android's maximum)
    await shoot(browser, brandingHtml(200 * scale, 80 * scale), 200 * scale, 80 * scale, path.join(RES, `drawable-${dpi}`, 'splash_branding.png'));
  }

  // 3. In-app images (3x)
  await shoot(browser, iconHtml(288, 1.0), 288, 288, path.join(ASSETS, 'logo-mark.png'));
  await shoot(browser, lockupHtml(720, 216), 720, 216, path.join(ASSETS, 'perzent-lockup.png'));
  await shoot(browser, brandingHtml(600, 240), 600, 240, path.join(ASSETS, 'developed-by-jsp-coders.png'));

  for (const dpi of Object.keys(DENSITIES)) {
    for (const name of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
      const f = path.join(RES, `mipmap-${dpi}`, name);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }

  await browser.close();
  console.log(`branding assets generated (JSP Coders logo ${JSP_LOGO ? 'used' : 'NOT found — wordmark fallback; add assets/branding/jsp-coders-logo.png and re-run'})`);
})().catch((e) => { console.error(e); process.exit(1); });
