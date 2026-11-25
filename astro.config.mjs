// @ts-check
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'astro/config';

/**
 * `import Component from './X.dc.html?dc-logic'` → the artboard's
 * `class Component extends DCLogic` as an ES module (runs on server and client).
 * @returns {import('vite').Plugin}
 */
function dcLogic() {
  const SUFFIX = '?dc-logic';
  return {
    name: 'dc-logic',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith(SUFFIX)) return null;
      const file = id.slice(0, -SUFFIX.length);
      this.addWatchFile(file);
      const src = await readFile(file, 'utf8');
      const code = /<script type="text\/x-dc"[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(src)?.[1];
      if (!code) throw new Error(`No data-dc-script in ${file}`);
      return `import { DCLogic } from '/src/lib/dc/runtime.ts';\n${code}\nexport default Component;\n`;
    },
  };
}

export default defineConfig({
  site: 'https://kafka.kz',
  trailingSlash: 'ignore',
  vite: {
    plugins: [dcLogic()],
  },
});
