/* eslint-disable */
/**
 * Renders the Google Play phone screenshots ("store cards") and the feature graphic.
 *
 *   PLAYWRIGHT_MODULE=<path to playwright> node scripts/generate-store-cards.js
 *
 * Inputs:  play-store/graphics/raw/*.png       – real 1080×2340 captures (see play-store/LISTING.md)
 *          assets/branding/*.png               – icon, wordmark, JSP Coders logo
 * Outputs: play-store/graphics/screenshots/NN-*.png   (1080×1920, 9:16)
 *          play-store/graphics/feature-graphic-1024x500.png
 *
 * Style: soft pastel ground, pill label, bold two-line headline, the real capture inside a phone
 * frame, dotted arcs and blurred blobs for depth. Pure HTML/CSS rendered headless.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const RAW = path.join(ROOT, 'play-store/graphics/raw');
const OUT = path.join(ROOT, 'play-store/graphics/screenshots');
const BRANDING = path.join(ROOT, 'assets/branding');
const dataUrl = (file) => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

const ICON = dataUrl(path.join(BRANDING, 'perzent-icon.png'));
const WORDMARK = dataUrl(path.join(BRANDING, 'perzent-wordmark.png'));
const JSP = fs.existsSync(path.join(BRANDING, 'jsp-coders-logo.png')) ? dataUrl(path.join(BRANDING, 'jsp-coders-logo.png')) : null;

/** One entry per store card, in upload order. */
const CARDS = [
  {
    file: '01-check-in.png', raw: '02-on-duty.png', tilt: -5,
    pill: 'One-tap check-in', pillBg: '#DCFCE7', pillFg: '#166534',
    title: 'Start your shift\nin one tap',
    bg: ['#F0FDF4', '#DCFCE7'], accent: '#22C55E',
  },
  {
    file: '02-live-location.png', raw: '05-live-map.png', tilt: 5,
    pill: 'Live location', pillBg: '#DBEAFE', pillFg: '#1E40AF',
    title: 'Your team on the map,\nonly while on duty',
    bg: ['#EFF6FF', '#DBEAFE'], accent: '#3B82F6',
  },
  {
    file: '03-auto-checkout.png', raw: '03-shift-completed.png', tilt: -4,
    pill: 'Breaks & auto check-out', pillBg: '#EDE9FE', pillFg: '#5B21B6',
    title: 'Never lose a\nforgotten check-out',
    bg: ['#F5F3FF', '#EDE9FE'], accent: '#8B5CF6',
  },
  {
    file: '04-sign-in.png', raw: '01-login.png', tilt: 4,
    pill: 'Made for field staff', pillBg: '#FFEDD5', pillFg: '#9A3412',
    title: 'Sign in with your\nphone number',
    bg: ['#FFF7ED', '#FFEDD5'], accent: '#F97316',
  },
  {
    file: '05-help.png', raw: '04-help.png', tilt: -4,
    pill: 'Help built in', pillBg: '#CCFBF1', pillFg: '#115E59',
    title: 'FAQ and support\none tap away',
    bg: ['#F0FDFA', '#CCFBF1'], accent: '#14B8A6',
  },
];

const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">`;

const dots = (color, size, x, y, rot) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;transform:rotate(${rot}deg);
     background:radial-gradient(circle,${color} 3.5px,transparent 4px) 0 0/26px 26px;
     -webkit-mask-image:radial-gradient(circle at 50% 50%,transparent 46%,#000 50%,#000 70%,transparent 74%);mask-image:radial-gradient(circle at 50% 50%,transparent 46%,#000 50%,#000 70%,transparent 74%);"></div>`;

const blob = (color, size, x, y) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};filter:blur(70px);opacity:.75"></div>`;

const phone = (src, tilt) => `
  <div style="position:absolute;left:50%;top:640px;width:660px;height:1430px;margin-left:-330px;transform:rotate(${tilt}deg);transform-origin:50% 40%;
       background:#0F172A;border-radius:88px;padding:16px;box-shadow:0 60px 120px -30px rgba(15,23,42,.45),0 0 0 4px #334155 inset">
    <div style="position:relative;width:100%;height:100%;border-radius:72px;overflow:hidden;background:#fff">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block">
    </div>
  </div>`;

function cardHtml(c) {
  const [g1, g2] = c.bg;
  const title = c.title.split('\n').join('<br>');
  return `<html><head>${FONT}<style>
    body{margin:0}
    .card{width:1080px;height:1920px;position:relative;overflow:hidden;font-family:Poppins,'Segoe UI',Roboto,sans-serif;background:linear-gradient(180deg,${g1} 0%,${g2} 100%);color:#0F172A}
    .pill{position:absolute;left:50%;top:120px;transform:translateX(-50%);padding:18px 44px;border-radius:999px;background:${c.pillBg};color:${c.pillFg};font-weight:700;font-size:40px;letter-spacing:.2px;box-shadow:0 10px 30px -14px rgba(15,23,42,.35)}
    .title{position:absolute;left:80px;right:80px;top:232px;text-align:center;font-weight:800;font-size:70px;line-height:1.18;letter-spacing:-1px}
    .brand{position:absolute;left:50%;bottom:0;transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:14px 26px 40px;color:#475569;font-size:22px;font-weight:600}
    .brand img{height:52px;border-radius:12px}
  </style></head><body><div class="card">
    ${blob(c.accent + '55', 620, -200, 1300)}
    ${blob('#ffffff', 700, 520, 300)}
    ${dots(c.accent + '99', 520, -180, 1080, 20)}
    ${dots(c.accent + '80', 420, 760, 420, -30)}
    <div class="pill">${c.pill}</div>
    <div class="title">${title}</div>
    ${phone(dataUrl(path.join(RAW, c.raw)), c.tilt)}
  </div></body></html>`;
}

function featureHtml() {
  return `<html><head>${FONT}<style>body{margin:0}
    .fg{width:1024px;height:500px;position:relative;overflow:hidden;font-family:Poppins,'Segoe UI',Roboto,sans-serif;background:linear-gradient(120deg,#F0FDF4 0%,#DBEAFE 55%,#EDE9FE 100%);color:#0F172A}
    .pill{position:absolute;left:64px;top:64px;padding:8px 20px;border-radius:999px;background:#DCFCE7;color:#166534;font-weight:700;font-size:18px}
    .title{position:absolute;left:64px;top:122px;font-weight:800;font-size:46px;line-height:1.12;letter-spacing:-1px;width:540px}
    .sub{position:absolute;left:64px;top:246px;font-size:20px;color:#475569;width:470px;line-height:1.4;font-weight:500}
    .dev{position:absolute;left:64px;bottom:44px;display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:8px 16px 8px 10px;box-shadow:0 10px 30px -14px rgba(15,23,42,.35)}
    .dev img{height:34px}.dev b{font-size:15px}.dev small{display:block;font-size:10px;letter-spacing:2px;color:#64748B}
    .phone{position:absolute;right:70px;top:60px;width:300px;height:650px;background:#0F172A;border-radius:44px;padding:9px;transform:rotate(-8deg);box-shadow:0 40px 80px -30px rgba(15,23,42,.5)}
    .phone div{width:100%;height:100%;border-radius:36px;overflow:hidden;background:#fff}.phone img{width:100%;display:block}
    .icon{position:absolute;right:330px;top:372px;width:104px;height:104px;border-radius:26px;box-shadow:0 30px 60px -20px rgba(15,23,42,.5);transform:rotate(8deg)}
  </style></head><body><div class="fg">
    ${dots('#22C55E80', 360, 560, 250, 15)}
    ${blob('#93C5FD88', 420, 700, -120)}
    <div class="pill">Free for teams of any size</div>
    <div class="title">Attendance &amp; live location for field teams</div>
    <div class="sub">Check in, tracked only while on duty, breaks, auto check-out and an owner live map.</div>
    <div class="dev">${JSP ? `<img src="${JSP}">` : ''}<div><small>DEVELOPED BY</small><b>JSP Coders</b></div></div>
    <div class="phone"><div><img src="${dataUrl(path.join(RAW, '02-on-duty.png'))}"></div></div>
    <img class="icon" src="${ICON}">
  </div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const c of CARDS) {
    if (!fs.existsSync(path.join(RAW, c.raw))) { console.warn(`skip ${c.file}: missing raw/${c.raw}`); continue; }
    await page.setContent(cardHtml(c), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, c.file), clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    console.log('wrote', c.file);
  }
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(featureHtml(), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, 'play-store/graphics/feature-graphic-1024x500.png'), clip: { x: 0, y: 0, width: 1024, height: 500 } });
  console.log('wrote feature-graphic-1024x500.png');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
