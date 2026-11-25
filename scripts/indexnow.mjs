// Submit every URL from the sitemap to search engines via IndexNow
// (Yandex, Bing, Seznam, Naver… share submissions). Google does not support
// IndexNow — for Google use the sitemap in Search Console.
//
// Usage: node scripts/indexnow.mjs [url …]   (no args → all URLs from dist/sitemap.xml)
// Run after `npm run deploy` once Plesk has pulled the new dist/: the key file
// https://<site>/<KEY>.txt (public/<KEY>.txt) must be reachable.
import { readFile } from 'node:fs/promises';

const KEY = 'e61acb5fbcfcbd5ecaaa3126cd9c9050';
const ENDPOINTS = ['https://yandex.com/indexnow', 'https://api.indexnow.org/indexnow'];

let urls = process.argv.slice(2);
if (!urls.length) {
  const xml = await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
if (!urls.length) throw new Error('No URLs: run npm run build first or pass URLs');
const host = new URL(urls[0]).host;
const keyLocation = `https://${host}/${KEY}.txt`;

const check = await fetch(keyLocation);
if (!check.ok || (await check.text()).trim() !== KEY) {
  throw new Error(`Key file ${keyLocation} is not live yet — deploy first`);
}

const body = JSON.stringify({ host, key: KEY, keyLocation, urlList: urls });
for (const endpoint of ENDPOINTS) {
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
  // 200/202 — accepted; 403 — key not verified; 422 — URLs don't match host.
  console.log(`${endpoint}: ${res.status} ${res.statusText} (${urls.length} URLs)`);
}
