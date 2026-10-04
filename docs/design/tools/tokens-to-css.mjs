#!/usr/bin/env node
// Converts the design system tokens.json (Claude Design format) into CSS custom properties.
// Usage: node tokens-to-css.mjs <tokens.json> <out.css> [--fonts <url-prefix>] [--tailwind]
//   --fonts     emit @font-face rules pointing at <url-prefix>/<file>
//   --tailwind  emit a Tailwind 4 `@theme inline` block instead of .text-* classes
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const [src, out] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--fonts');
const fontPrefix = args.includes('--fonts') ? args[args.indexOf('--fonts') + 1] : null;
const tailwind = args.includes('--tailwind');
if (!src || !out) {
  console.error('usage: tokens-to-css.mjs <tokens.json> <out.css> [--fonts <url-prefix>] [--tailwind]');
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

const vars = [];
for (const tok of t.color.tokens) vars.push(`  --${tok.name}: ${value(tok.value)};`);
for (const tok of t.shadow?.tokens ?? []) vars.push(`  --${tok.name}: ${value(tok.value)};`);
for (const tok of t.spacing?.tokens ?? []) vars.push(`  --${tok.name}: ${tok.value};`);
for (const tok of t.radius?.tokens ?? []) vars.push(`  --${tok.name}: ${tok.value};`);
for (const [key, stack] of Object.entries(t.type.families)) vars.push(`  --font-${key}: ${stack};`);

const faces = fontPrefix
  ? t.type.fonts.map((f) => `@font-face { font-family: "${f.family}"; font-weight: ${f.weight}; font-style: normal; font-display: swap; src: url("${fontPrefix}/${f.file.replace(/^fonts\//, '')}") format("woff2"); }`)
  : [];

const styles = t.type.groups.flatMap((g) => g.styles.map((s) => ({ ...s, family: s.family ?? g.family })));

let rest;
if (tailwind) {
  // Utilities: bg-brand-blue, text-ink, text-body, shadow-focus-ring… Radius and shadow-* tokens
  // already use Tailwind's names (--radius-sm, --shadow-sm), so they need no mapping.
  const theme = [
    ...t.color.tokens.map((c) => `  --color-${c.name}: var(--${c.name});`),
    ...(t.shadow?.tokens ?? []).filter((s) => !s.name.startsWith('shadow-')).map((s) => `  --shadow-${s.name}: var(--${s.name});`),
    ...styles.flatMap((s) => [
      `  --text-${s.name}: ${s.fontSize};`,
      `  --text-${s.name}--line-height: ${s.lineHeight};`,
      `  --text-${s.name}--font-weight: ${s.fontWeight};`,
      ...(s.letterSpacing ? [`  --text-${s.name}--letter-spacing: ${s.letterSpacing};`] : []),
    ]),
  ];
  rest = ['@theme inline {', ...theme, '}'];
} else {
  rest = styles.map((s) => {
    const decl = [`font-family: var(--font-${s.family})`, `font-size: ${s.fontSize}`, `line-height: ${s.lineHeight}`, `font-weight: ${s.fontWeight}`];
    if (s.letterSpacing) decl.push(`letter-spacing: ${s.letterSpacing}`);
    return `.text-${s.name} { ${decl.join('; ')}; }`;
  });
}

const css = [
  `/* Generated from ${src.split('/').pop()} by docs/design/tools/tokens-to-css.mjs. Do not edit. */`,
  ...faces,
  ':root {',
  ...vars,
  '}',
  ...rest,
  '',
].join('\n');
writeFileSync(out, css);
console.log(`wrote ${out}: ${vars.length} variables, ${styles.length} text styles${tailwind ? ' (tailwind)' : ''}`);
