#!/usr/bin/env node
// Renders every component preview of the design system to PNG with headless Chrome.
// Usage: node render-previews.mjs <artifact-dir> <out-dir>
//   <artifact-dir> holds project/tokens.json, project/fonts/, project/components/ (saved with `Artifact read`).
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const [, , dir, outDir] = process.argv;
if (!dir || !outDir) {
  console.error('usage: render-previews.mjs <artifact-dir> <out-dir>');
  process.exit(1);
}
const project = resolve(dir, 'project');
const out = resolve(outDir);
mkdirSync(out, { recursive: true });
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const tokensCss = join(out, 'tokens.css');
execFileSync('node', [new URL('./tokens-to-css.mjs', import.meta.url).pathname, join(project, 'tokens.json'), tokensCss, '--fonts', `file://${join(project, 'fonts')}`]);
const head = `<style>${readFileSync(tokensCss, 'utf8')}\n${readFileSync(join(project, 'components', 'bundle.css'), 'utf8')}</style>`;

for (const comp of readdirSync(join(project, 'components'))) {
  const file = join(project, 'components', comp, 'preview.html');
  if (!existsSync(file)) continue;
  const src = readFileSync(file, 'utf8');
  const height = Number(/height=(\d+)/.exec(src.split('\n')[0])?.[1] ?? 400) + 80;
  const html = src.replace(/^<!--[^\n]*-->\n/, '').replace('<head>', `<head>${head}`);
  const page = join(out, `${comp}.html`);
  writeFileSync(page, html);
  execFileSync(chrome, ['--headless', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--window-size=1200,${height}`, `--screenshot=${join(out, `${comp}.png`)}`, `file://${page}`], { stdio: 'ignore' });
  console.log(`${comp}.png`);
}
