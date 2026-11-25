// Screenshot each hero phone slide (timers stopped, slide set directly).
// Usage: node scripts/phones.mjs <outDir> [chrome|webkit] [width]
import { chromium, webkit } from 'playwright-core';

const [out = '.', engine = 'chrome', width = '1440'] = process.argv.slice(2);
const browser = engine === 'webkit' ? await webkit.launch() : await chromium.launch({ channel: 'chrome' });
const w = Number(width);
const page = await browser.newPage({ viewport: { width: w, height: w > 800 ? 1000 : 844 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const root = w > 760 ? 'desk' : 'mob';
await page.evaluate((r) => document.querySelector(`[data-dc-root=${r}]`).__dc.componentWillUnmount(), root);
const phone = page.locator(`[data-dc-root=${root}] .scr`).first().locator('xpath=../../..');
await phone.scrollIntoViewIfNeeded();
for (let i = 0; i < 5; i++) {
  await page.evaluate(([r, s]) => document.querySelector(`[data-dc-root=${r}]`).__dc.setState({ slide: s }), [root, i]);
  await page.waitForTimeout(3500);
  await phone.screenshot({ path: `${out}/${engine}-${root}-${i}.png` });
}
await browser.close();
