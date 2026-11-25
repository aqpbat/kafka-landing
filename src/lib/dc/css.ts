import { parseArtboard } from './render';

/** Runtime elements produced by render.ts never affect layout. */
const RUNTIME_CSS = `dc-if,dc-for,dc-t{display:contents}dc-if[hidden]{display:none!important}`;

type Rule = { sel: string; body: string };

function topLevelRules(css: string): Rule[] {
  const out: Rule[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const sel = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0, j++;
    out.push({ sel, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

/**
 * Site stylesheet = the base artboard's <helmet> CSS. Extra artboards (e.g. the
 * mobile tree) add their missing rules; rules they define differently are
 * scoped under `scope` so each tree keeps its own look.
 */
export function siteCss(baseSrc: string, extras: { src: string; scope: string }[] = []): string {
  const base = parseArtboard(baseSrc).css;
  const known = new Map(topLevelRules(base).map((r) => [r.sel, r.body.trim()]));
  let css = RUNTIME_CSS + '\n' + base;
  for (const { src, scope } of extras) {
    for (const r of topLevelRules(parseArtboard(src).css)) {
      const have = known.get(r.sel);
      if (have === r.body.trim()) continue;
      if (have === undefined && (r.sel.startsWith('@keyframes') || r.sel.startsWith('@media'))) {
        css += `\n${r.sel}{${r.body}}`;
      } else if (!r.sel.startsWith('@')) {
        const scoped = r.sel
          .split(',')
          .map((s) => (s.trim() === 'body' ? s : `${scope} ${s.trim()}`))
          .join(',');
        css += `\n${scoped}{${r.body}}`;
      }
    }
  }
  return css;
}
