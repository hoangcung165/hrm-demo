#!/usr/bin/env node
// Converts the design system tokens.json (Claude Design format) into CSS custom properties.
// Usage: node tokens-to-css.mjs <tokens.json> <out.css> [--fonts <url-prefix>]
import { readFileSync, writeFileSync } from 'node:fs';

const [, , src, out, flag, fontPrefix] = process.argv;
if (!src || !out) {
  console.error('usage: tokens-to-css.mjs <tokens.json> <out.css> [--fonts <url-prefix>]');
  process.exit(1);
}
const t = JSON.parse(readFileSync(src, 'utf8'));
const theme = t.color.themes[0].id;

// Aliases "{name}" become var(--name); per-theme values use the first theme.
const value = (v) => {
  const raw = typeof v === 'string' ? v : v[theme];
  const alias = /^\{(.+)\}$/.exec(raw);
  return alias ? `var(--${alias[1]})` : raw;
};

const lines = [];
for (const tok of t.color.tokens) lines.push(`  --${tok.name}: ${value(tok.value)};`);
for (const tok of t.shadow?.tokens ?? []) lines.push(`  --${tok.name}: ${value(tok.value)};`);
for (const tok of t.spacing?.tokens ?? []) lines.push(`  --${tok.name}: ${tok.value};`);
for (const tok of t.radius?.tokens ?? []) lines.push(`  --${tok.name}: ${tok.value};`);
for (const [key, stack] of Object.entries(t.type.families)) lines.push(`  --font-${key}: ${stack};`);

const faces = flag === '--fonts'
  ? t.type.fonts.map((f) => `@font-face { font-family: "${f.family}"; font-weight: ${f.weight}; font-style: normal; font-display: swap; src: url("${fontPrefix}/${f.file.replace(/^fonts\//, '')}") format("woff2"); }`)
  : [];

const styles = t.type.groups.flatMap((g) => g.styles.map((s) => {
  const decl = [`font-family: var(--font-${s.family ?? g.family})`, `font-size: ${s.fontSize}`, `line-height: ${s.lineHeight}`, `font-weight: ${s.fontWeight}`];
  if (s.letterSpacing) decl.push(`letter-spacing: ${s.letterSpacing}`);
  return `.text-${s.name} { ${decl.join('; ')}; }`;
}));

const css = [
  `/* Generated from ${src.split('/').pop()} by docs/design/tools/tokens-to-css.mjs. Do not edit. */`,
  ...faces,
  ':root {',
  ...lines,
  '}',
  ...styles,
  '',
].join('\n');
writeFileSync(out, css);
console.log(`wrote ${out}: ${lines.length} variables, ${styles.length} text styles`);
