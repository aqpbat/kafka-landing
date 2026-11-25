/**
 * Build-time renderer for Design-canvas artboards (`design/project/*.dc.html`).
 *
 * The artboard markup is kept as-is. Template syntax is turned into static HTML
 * of the initial state plus `data-*` hooks that the client runtime
 * (`runtime.ts`) uses to keep the page live:
 *   {{path}} in text        -> <dc-t data-t="path">value</dc-t>
 *   attr="..{{path}}.."     -> attr="value" data-b-attr="..{{path}}.." (+ data-dcb)
 *   onClick="{{path}}"      -> data-on-click="path"
 *   <sc-if value="{{p}}">   -> <dc-if data-if="p" [hidden]>
 *   <sc-for list="{{p}}" as="a"> -> <dc-for data-for="p"> with items expanded,
 *                              holes `a.x` rewritten to `p.<i>.x`
 */

export type Vals = Record<string, unknown>;

export interface Artboard {
  /** Markup inside <x-dc>, without <helmet>. */
  body: string;
  /** Contents of the <helmet><style> block. */
  css: string;
  /** The `class Component extends DCLogic` source. */
  code: string;
}

export interface RenderOptions {
  /** Prefix for every id / #anchor / for= in this tree (avoid clashes when two trees share a page). */
  idPrefix?: string;
  /** Map of design file names to site URLs. */
  links?: Record<string, string>;
}

export const PAGE_LINKS: Record<string, string> = {
  'Main.dc.html': '/',
  'Mobile.dc.html': '/',
  'Products.dc.html': '/products',
  'Integrations.dc.html': '/integrations',
  'IntegrationRkeeper.dc.html': '/integrations/rkeeper',
  'Cases.dc.html': '/cases',
  'Pricing.dc.html': '/pricing',
  'Partners.dc.html': '/partners',
};

export function parseArtboard(src: string): Artboard {
  const xdc = /<x-dc>([\s\S]*)<\/x-dc>/.exec(src);
  if (!xdc) throw new Error('No <x-dc> block in artboard');
  let body = xdc[1];
  const helmet = /<helmet>([\s\S]*?)<\/helmet>/.exec(body);
  body = body.replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const css = helmet ? (/<style>([\s\S]*?)<\/style>/.exec(helmet[1])?.[1] ?? '') : '';
  const code = /<script type="text\/x-dc"[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(src)?.[1] ?? '';
  return { body, css, code };
}

/** Evaluate the artboard's Component class at build time to get the initial render values. */
export function initialVals(code: string, DCLogic: unknown): Vals {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const Component = new Function('DCLogic', `${code}\n;return Component;`)(DCLogic) as new (p: object) => {
    renderVals(): Vals;
  };
  return new Component({}).renderVals();
}

export function getPath(vals: unknown, path: string): unknown {
  const p = path.trim();
  if (p === 'true') return true;
  if (p === 'false') return false;
  if (p === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(p)) return Number(p);
  let cur: unknown = vals;
  for (const key of p.split('.')) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

export function fillTemplate(tpl: string, vals: unknown): string {
  return tpl.replace(HOLE, (_, p: string) => {
    const v = getPath(vals, p);
    return v == null || typeof v === 'function' ? '' : String(v);
  });
}

/** Find the end index (exclusive) of the element opened at `start`, honouring nesting of the same tag. */
function matchClose(src: string, tag: string, start: number): { innerStart: number; innerEnd: number; end: number } {
  const openRe = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  const innerStart = src.indexOf('>', start) + 1;
  openRe.lastIndex = innerStart;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(src))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { innerStart, innerEnd: m.index, end: m.index + m[0].length };
  }
  throw new Error(`Unclosed <${tag}>`);
}

function expandLoops(src: string, vals: Vals): string {
  let out = '';
  let pos = 0;
  const re = /<sc-for\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const attrs = m[1];
    const listPath = /list="\{\{\s*([^}]+?)\s*\}\}"/.exec(attrs)?.[1];
    const alias = /\sas="([^"]+)"/.exec(attrs)?.[1];
    if (!listPath || !alias) throw new Error(`Bad <sc-for${attrs}>`);
    const { innerStart, innerEnd, end } = matchClose(src, 'sc-for', m.index);
    const inner = src.slice(innerStart, innerEnd);
    const list = getPath(vals, listPath);
    const items = Array.isArray(list) ? list : [];
    const aliasRe = new RegExp(`\\{\\{\\s*${alias}(?=[.\\s}])`, 'g');
    const expanded = items
      .map((_, i) => expandLoops(inner.replace(aliasRe, `{{${listPath}.${i}`), vals))
      .join('');
    out += src.slice(pos, m.index) + `<dc-for data-for="${esc(listPath)}">${expanded}</dc-for>`;
    pos = end;
    re.lastIndex = end;
  }
  return out + src.slice(pos);
}

/** Keep numbers, currency and multipliers on one line: "5 800 ₸", "× 2", "до 10%". */
export function typography(text: string): string {
  return text
    .replace(/(\d) (?=\d{3}(?!\d))/g, '$1 ')
    .replace(/(\d) (?=[₸%])/g, '$1 ')
    .replace(/(×|№|до|от) (?=\d)/g, '$1 ');
}

export function renderBody(body: string, vals: Vals, opts: RenderOptions = {}): string {
  const prefix = opts.idPrefix ?? '';
  const links = opts.links ?? PAGE_LINKS;
  let html = expandLoops(body, vals);

  // Conditionals.
  html = html
    .replace(/<sc-if\b[^>]*?value="\{\{\s*([^}]+?)\s*\}\}"[^>]*>/g, (_, p: string) =>
      `<dc-if data-if="${esc(p)}"${getPath(vals, p) ? '' : ' hidden'}>`,
    )
    .replace(/<\/sc-if>/g, '</dc-if>');

  // Attributes (holes, events, links, ids).
  html = html.replace(/<([a-zA-Z][\w:-]*)(\s[^<>]*?)?(\/?)>/g, (tag, name: string, rawAttrs = '', selfClose: string) => {
    if (!rawAttrs.trim()) return tag;
    let bound = false;
    const attrs = rawAttrs.replace(/\s([^\s=]+)="([^"]*)"/g, (whole: string, attr: string, value: string) => {
      if (attr === 'hint-placeholder-val' || attr === 'hint-placeholder-count') return '';
      if (/^on[A-Z]/.test(attr)) {
        const p = /^\{\{\s*([^}]+?)\s*\}\}$/.exec(value)?.[1];
        return p ? ` data-on-${attr.slice(2).toLowerCase()}="${esc(p)}"` : '';
      }
      if (value.includes('{{')) {
        bound = true;
        return ` ${attr}="${esc(fillTemplate(value, vals))}" data-b-${attr}="${value}"`;
      }
      if (attr === 'href') {
        if (links[value] !== undefined) return ` href="${links[value]}"`;
        const hash = /^([\w.-]+\.dc\.html)?#(.+)$/.exec(value);
        if (hash && prefix && !hash[1]) return ` href="#${prefix}${hash[2]}"`;
      }
      if (prefix && (attr === 'id' || attr === 'for')) return ` ${attr}="${prefix}${value}"`;
      return whole;
    });
    return `<${name}${attrs}${bound ? ' data-dcb' : ''}${selfClose}>`;
  });

  // Text holes (only outside tags — bound attributes keep their raw templates).
  return html
    .split(/(<[^>]*>)/)
    .map((part) =>
      part.startsWith('<')
        ? part
        : typography(part).replace(HOLE, (_, p: string) => {
            const v = getPath(vals, p);
            return `<dc-t data-t="${esc(p)}">${v == null ? '' : esc(String(v))}</dc-t>`;
          }),
    )
    .join('');
}
