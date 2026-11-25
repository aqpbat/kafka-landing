import type { APIRoute } from 'astro';
import { HOME, PAGES, abs } from '../lib/seo';

const lastmod = new Date().toISOString().slice(0, 10);

export const GET: APIRoute = ({ site }) => {
  const urls = [HOME, ...PAGES]
    .map((p) => `  <url><loc>${abs(p.path, site!)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
