// Screenshot a page of the running dev server with the local Chrome.
// Usage: node scripts/shot.mjs <path> <width> <out.png> [selector-to-scroll] [waitMs] [fullPage]
import { chromium } from 'playwright-core';

const [path = '/', width = '1440', out = 'shot.png', selector, wait = '2500', full] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: Number(width), height: Number(width) < 800 ? 844 : 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:4321' + path, { waitUntil: 'networkidle' });
if (selector && selector !== '-') {
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), selector);
}
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out, fullPage: full === 'full' });
if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
await browser.close();
