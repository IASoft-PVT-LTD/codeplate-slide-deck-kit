// Lints a list of decks from decks.json against their rules and the theme's layouts and sizes.
import { readFileSync } from 'node:fs';
import { DEFAULTS, lintDeck, readDeck, themeLayouts, themeSizes } from './deck.mjs';

export function lintAll(decks, root = '.') {
  const css = readFileSync(`${root}/theme/brand.css`, 'utf8');
  const layouts = themeLayouts(css);
  const sizes = themeSizes(css);
  const problems = [];
  const summary = [];
  if (!decks.length) summary.push('No decks yet: add one with docs/recipes/new-deck.md.');
  for (const d of decks) {
    const deck = readDeck(d.file, { root });
    problems.push(...lintDeck(deck, d, { root, layouts, sizes }));
    summary.push(`${d.file}: ${deck.slides.length} slides, ${deck.size}, most words on a slide ${Math.max(0, ...deck.slides.map((s) => s.words))} (max ${d.maxWords ?? DEFAULTS.maxWords})`);
  }
  return { problems, summary };
}
