// Screenshot page sections with timers stopped; reports JS errors and failed requests.
// Usage: node scripts/sections.mjs <outDir> <path>|<width>|<selector>|<name> ...
import { chromium } from 'playwright-core';

const [out = '.', ...jobs] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
for (const job of jobs) {
  const [path, width, selector, name] = job.split('|');
  const w = Number(width);
  const page = await browser.newPage({ viewport: { width: w, height: w > 800 ? 1000 : 844 }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
  await page.goto('http://localhost:4321' + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelectorAll('[data-dc-root]').forEach((r) => r.__dc?.componentWillUnmount?.()));
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await el.screenshot({ path: `${out}/${name}.png` });
  await page.close();
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close();
