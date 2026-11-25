// Builds site logos from the raw brand files in assets/ (via Chrome canvas).
//   public/logos/<id>.webp       — 128×128 square tile (app-icon style)
//   public/logos/<id>-mark.webp  — trimmed wordmark, transparent, 96px high
// Usage: node scripts/logos.mjs   (re-run after replacing a file in assets/)
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

/**
 * tile: 'pad' = logo centred on its own background with padding; 'fill' = the file already is an icon;
 *       'iconLeft' = square icon at the left of a horizontal lockup.
 * only: build just the 'tile' or just the 'mark' from this file (when a brand has separate icon and wordmark files).
 * noTrim: use the whole file for a 'fill' tile (icon with a full-bleed background).
 * cutLight / cutDark: also treat pixels lighter / darker than this (0–255) as background when trimming.
 * inset: ignore this share of each edge when trimming (rounded-corner artefacts).
 * tileBg: background colour for a 'pad' tile (default: the file's own background, or white).
 */
const LOGOS = [
  { id: 'wolt', file: 'wolt_logo.jpeg', tile: 'pad', pad: 0.12 },
  { id: 'glovo', file: 'Glovo_logo.png', only: 'mark' },
  { id: 'glovo', file: 'glovo_new_logo.png', tile: 'fill', noTrim: true, only: 'tile' },
  { id: 'choco', file: 'choco-logo.png', whiteBg: true, only: 'mark' },
  { id: 'choco', file: 'chocofood_new_logo.png', tile: 'fill', only: 'tile' },
  { id: 'yandex-eats', file: 'Yandex_Eats_icon.svg.webp', tile: 'fill' },
  { id: 'telegram', file: 'Telegram_logo.svg.webp', tile: 'fill' },
  { id: 'webkassa', file: 'webkassa_logo.png', tile: 'fill' },
  { id: 'iiko', file: 'logo_iiko.jpg', tile: 'pad', pad: 0.12 },
  { id: 'rkeeper', file: 'rkeeper_logo.svg.webp', only: 'mark' },
  { id: 'rkeeper', file: 'rkeeper_new_logo.png', tile: 'fill', only: 'tile' },
  { id: '1c', file: '1C_Company_logo.svg.webp', tile: 'pad', pad: 0.14 },
  { id: 'poster', file: 'poster_kz_logo.webp', tile: 'iconLeft' },
  { id: 'tiptoppay', file: 'tiptoppay_kz_logo.jpg', tile: 'fill', noTrim: true, only: 'tile' },
  { id: 'apple-pay', file: 'apple_pay_logo.wine.svg', tile: 'pad', pad: 0.16, tileBg: '#222', only: 'tile' },
  { id: 'google-pay', file: 'google_pay_logo.png', tile: 'pad', pad: 0.14, tileBg: '#fff', cutLight: 180, inset: 0.06, only: 'tile' },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
await mkdir('public/logos', { recursive: true });

for (const logo of LOGOS) {
  const buf = await readFile(`assets/${logo.file}`);
  const mime = logo.file.endsWith('.png') ? 'image/png' : logo.file.match(/\.jpe?g$/) ? 'image/jpeg' : logo.file.endsWith('.svg') ? 'image/svg+xml' : 'image/webp';
  const src = `data:${mime};base64,${buf.toString('base64')}`;
  const out = await page.evaluate(async ({ src, logo }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = new OffscreenCanvas(W, H);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, W, H).data;
    const px = (i, j) => { const k = (j * W + i) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
    // Background = corner pixel (transparent or a solid colour).
    const bg = px(1, 1);
    const near = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) < 40 && p[3] > 200;
    const isBg = (p) =>
      (logo.whiteBg && (p[3] < 200 || Math.min(p[0], p[1], p[2]) > 225)) ||
      (logo.cutLight && (p[3] < 200 || Math.min(p[0], p[1], p[2]) > logo.cutLight)) ||
      (logo.cutDark && (p[3] < 200 || Math.max(p[0], p[1], p[2]) < logo.cutDark)) || (bg[3] < 20 ? p[3] < 20 : near(p, bg));
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    const ix = Math.round(W * (logo.inset || 0)), iy = Math.round(H * (logo.inset || 0));
    for (let j = iy; j < H - iy; j++) for (let i = ix; i < W - ix; i++) if (!isBg(px(i, j))) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    let bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const solid = bg[3] >= 20 ? `rgb(${bg[0]},${bg[1]},${bg[2]})` : '#fff';
    const isWhite = logo.whiteBg || (bg[3] >= 20 && bg[0] > 235 && bg[1] > 235 && bg[2] > 235);
    const enc = async (cv) => {
      const blob = await cv.convertToBlob({ type: 'image/webp', quality: 0.92 });
      return [...new Uint8Array(await blob.arrayBuffer())];
    };

    // Tile 128×128.
    const T = 128;
    const t = new OffscreenCanvas(T, T);
    const tx = t.getContext('2d');
    tx.imageSmoothingQuality = 'high';
    if (logo.tile === 'fill' && logo.noTrim) {
      const s = Math.min(W, H);
      tx.drawImage(img, (W - s) / 2, (H - s) / 2, s, s, 0, 0, T, T);
    } else if (logo.tile === 'fill') {
      const s = Math.max(bw, bh);
      tx.drawImage(img, x0 - (s - bw) / 2, y0 - (s - bh) / 2, s, s, 0, 0, T, T);
    } else if (logo.tile === 'iconLeft') {
      // Square icon at the left edge of a horizontal lockup.
      tx.drawImage(img, x0, y0, bh, bh, 0, 0, T, T);
    } else {
      tx.fillStyle = logo.tileBg || solid;
      tx.fillRect(0, 0, T, T);
      const box = T * (1 - 2 * logo.pad);
      const k = Math.min(box / bw, box / bh);
      tx.drawImage(img, x0, y0, bw, bh, (T - bw * k) / 2, (T - bh * k) / 2, bw * k, bh * k);
    }

    // Wordmark, 96px high, background removed (or kept as a badge).
    const MH = 96;
    let mx0 = x0, my0 = y0, mw = bw, mh = bh, keep = logo.markKeepsBg;
    if (keep) { const p = Math.round(bh * 0.35); mx0 -= p; my0 -= p; mw += 2 * p; mh += 2 * p; }
    const k = MH / mh;
    const m = new OffscreenCanvas(Math.round(mw * k), MH);
    const mx = m.getContext('2d');
    mx.imageSmoothingQuality = 'high';
    if (keep) { mx.fillStyle = solid; mx.fillRect(0, 0, m.width, m.height); }
    mx.drawImage(img, mx0, my0, mw, mh, 0, 0, m.width, m.height);
    if (isWhite && !keep) {
      const id = mx.getImageData(0, 0, m.width, m.height);
      const a = id.data;
      for (let i = 0; i < a.length; i += 4) {
        const light = Math.min(a[i], a[i + 1], a[i + 2]);
        if (light > 200) a[i + 3] = Math.round(a[i + 3] * Math.max(0, (255 - light) / 55));
      }
      mx.putImageData(id, 0, 0);
    }
    return { tile: await enc(t), mark: await enc(m), markW: m.width };
  }, { src, logo });
  if (logo.only !== 'mark') await writeFile(`public/logos/${logo.id}.webp`, Buffer.from(out.tile));
  if (logo.only !== 'tile') await writeFile(`public/logos/${logo.id}-mark.webp`, Buffer.from(out.mark));
  console.log(logo.id, logo.only ?? 'tile+mark', logo.file);
}
await browser.close();
