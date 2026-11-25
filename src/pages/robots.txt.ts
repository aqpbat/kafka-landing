import type { APIRoute } from 'astro';

// Clean-param: Yandex treats URLs that differ only in ad/UTM tags as one page.
const ROBOTS = (site: URL) => `User-agent: *
Allow: /
Disallow: /404.html

User-agent: Yandex
Allow: /
Disallow: /404.html
Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid&fbclid&_openstat

Sitemap: ${new URL('/sitemap.xml', site).href}
`;

export const GET: APIRoute = ({ site }) =>
  new Response(ROBOTS(site!), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
