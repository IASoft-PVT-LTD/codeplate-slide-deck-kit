import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, parseColor, passingShade, themeColors, themeReport } from '../src/contrast.mjs';

// The template's variables block as shipped (a copy, so the tests don't change with a rebrand).
const THEME = `/* @theme brand */
section {
  /* ---- Brand: change these ---- */
  --brand: #1d3557;        /* main colour */
  --accent: #d95f3f;       /* highlights */
  --accent-text: var(--accent); /* the accent as text */
  --ink: #1b1f24;
  --muted: #5b6470;
  --paper: #fbf8f3;
  --on-brand: #ffffff;
  --on-brand-muted: #c9d3e0;
  --logo-backing: transparent;
  --heading-font: 'DM Serif Display', serif;
  /* ----------------------------- */
  width: 1280px;
}
`;

test('colours and ratios', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepEqual(parseColor('#2d4a3e'), { r: 45, g: 74, b: 62 });
  assert.deepEqual(parseColor('rgb(1, 2, 3)'), { r: 1, g: 2, b: 3 });
  assert.equal(parseColor('var(--x)'), null);
  assert.equal(contrastRatio(parseColor('#000'), parseColor('#fff')).toFixed(1), '21.0');
  assert.equal(contrastRatio(parseColor('#e0a526'), parseColor('#fbf8f3')).toFixed(2), '2.07');
});

test('a light brand colour gets the nearest darker shade that passes', () => {
  const mustard = parseColor('#e0a526');
  const paper = parseColor('#fbf8f3');
  const big = passingShade(mustard, paper, 3);
  const small = passingShade(mustard, paper, 4.5);
  assert.ok(big.ratio >= 3 && big.ratio < 3.2, 'the closest shade, not black');
  assert.ok(small.ratio >= 4.5);
  assert.ok(contrastRatio(parseColor(small.color), paper) > contrastRatio(parseColor(big.color), paper));
  // On a dark background it lightens instead.
  assert.ok(passingShade(parseColor('#3a5a4e'), parseColor('#2d4a3e'), 4.5).ratio >= 4.5);
  assert.equal(passingShade(parseColor('#2d4a3e'), parseColor('#fbf8f3'), 3).color, '#2d4a3e', 'a passing colour stays');
});

test('the shipped colours pass every pair; --accent-text follows --accent unless set', () => {
  const colors = themeColors(THEME);
  assert.equal(colors['--accent-text'], colors['--accent']);
  assert.equal(colors['--logo-backing'], 'transparent');
  const rows = themeReport(THEME);
  assert.ok(rows.length >= 8);
  assert.deepEqual(rows.filter((r) => !r.ok), []);
  // A pale accent fails as text on the paper, with a fix; a darker --accent-text mends it.
  const pale = THEME.replace('--accent: #d95f3f;', '--accent: #e0a526;');
  const failing = themeReport(pale).filter((r) => !r.ok).map((r) => r.fg);
  assert.ok(failing.includes('--accent-text'));
  assert.ok(themeReport(pale).find((r) => r.fg === '--accent-text').fix);
  const mended = pale.replace('--accent-text: var(--accent);', '--accent-text: #8a5f00;');
  assert.equal(themeReport(mended).find((r) => r.fg === '--accent-text').ok, true);
});
