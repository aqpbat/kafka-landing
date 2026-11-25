// Renders the sharing image public/og.png (1200×630) and the square logo public/logo.png (512×512)
// with the local Chrome and the site fonts from @fontsource. Usage: node scripts/og.mjs
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const font = (pkg, file) => pathToFileURL(resolve('node_modules/@fontsource', pkg, 'files', file)).href;
const faces = `
@font-face{font-family:M;font-weight:600;src:url(${font('montserrat', 'montserrat-cyrillic-600-normal.woff2')})}
@font-face{font-family:M;font-weight:600;src:url(${font('montserrat', 'montserrat-latin-600-normal.woff2')});unicode-range:U+0000-00FF}
@font-face{font-family:M;font-weight:800;src:url(${font('montserrat', 'montserrat-cyrillic-800-normal.woff2')})}
@font-face{font-family:M;font-weight:800;src:url(${font('montserrat', 'montserrat-latin-800-normal.woff2')});unicode-range:U+0000-00FF}
@font-face{font-family:F;font-weight:800;src:url(${font('fraunces', 'fraunces-latin-800-normal.woff2')})}
*{box-sizing:border-box;margin:0}body{font-family:M,sans-serif}`;

const og = `<style>${faces}
body{width:1200px;height:630px;background:#F7F4EF;color:#17130F;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}
.wm{font:800 64px/1 F,serif;letter-spacing:-0.045em}.wm span{color:#D4401F}
h1{font:800 64px/1.05 M;letter-spacing:-0.035em;max-width:900px}
.row{display:flex;gap:12px;flex-wrap:wrap}
.chip{padding:12px 20px;border-radius:999px;background:#fff;border:1px solid #E4DDD2;font:600 22px/1 M}
.blob{position:absolute;right:-120px;top:-120px;width:420px;height:420px;border-radius:50%;background:#D4401F}
</style>
<div class="blob"></div>
<div class="wm">kafka<span>.</span></div>
<h1>Платформа для ресторанов и кафе в Казахстане</h1>
<div class="row"><span class="chip">Приложение и QR-меню</span><span class="chip">WhatsApp-бот</span><span class="chip">Wolt · Glovo · Yandex Eats</span><span class="chip">r_keeper · iiko</span></div>`;

const logo = `<style>${faces}
body{width:512px;height:512px;background:#D4401F;display:grid;place-items:center}
b{font:800 360px/1 F,serif;color:#fff;letter-spacing:-0.04em;padding-bottom:40px}</style><b>k</b>`;

const dir = await mkdtemp(join(tmpdir(), 'kafka-og-'));
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, html, w, h] of [['og', og, 1200, 630], ['logo', logo, 512, 512]]) {
  const file = join(dir, name + '.html');
  await writeFile(file, '<!doctype html><meta charset="utf-8">' + html);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `public/${name}.png` });
  console.log(`public/${name}.png`);
}
await browser.close();
