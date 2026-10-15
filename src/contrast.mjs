// Colour contrast for the theme: the WCAG ratio of two colours, the colour pairs the theme's
// variables block makes, and the nearest shade of a brand colour that passes.
//
//   npm run contrast                       every pair in theme/brand.css, with a fix for any that fails
//   npm run contrast -- "#e0a526" "#fbf8f3"   one colour on a background: its ratio, and shades that pass
//
// The inspect check measures the text on every slide; this is the quick look before (or
// after) a rebrand, and the way to pick a darker shade of a brand colour that is too light.

// '#abc', '#aabbcc', 'rgb(1, 2, 3)', 'white', 'black' -> { r, g, b } (0-255), or null.
export function parseColor(text) {
  const s = String(text ?? '').trim().toLowerCase();
  if (s === 'white') return { r: 255, g: 255, b: 255 };
  if (s === 'black') return { r: 0, g: 0, b: 0 };
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16) };
  m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s);
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  return null;
}

export const toHex = ({ r, g, b }) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

const luminance = ({ r, g, b }) => {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

// The WCAG 2 contrast ratio, 1 to 21.
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The shade of `fg` closest to it that reaches `need` against `bg`: mixed towards black on a
// light background, towards white on a dark one (the hue stays). Returns { color, ratio }, or
// null if even black/white doesn't reach it.
export function passingShade(fg, bg, need) {
  if (contrastRatio(fg, bg) >= need) return { color: toHex(fg), ratio: contrastRatio(fg, bg) };
  const to = luminance(bg) > 0.18 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  for (let t = 0.01; t <= 1.0001; t += 0.01) {
    const c = { r: fg.r + (to.r - fg.r) * t, g: fg.g + (to.g - fg.g) * t, b: fg.b + (to.b - fg.b) * t };
    const rounded = parseColor(toHex(c));
    if (contrastRatio(rounded, bg) >= need) return { color: toHex(rounded), ratio: contrastRatio(rounded, bg) };
  }
  return null;
}

// The custom properties of the theme's first `section { … }` block, with var(--x) resolved.
export function themeColors(css) {
  const block = /(^|\n)\s*section\s*\{([\s\S]*?)\n\}/.exec(css)?.[2] ?? '';
  const raw = {};
  for (const m of block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) raw[m[1]] = m[2].trim();
  const resolve = (v, depth = 0) => {
    const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(v);
    return ref && depth < 8 && raw[ref[1]] !== undefined ? resolve(raw[ref[1]], depth + 1) : v;
  };
  return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, resolve(v)]));
}

// The pairs the theme puts on slides: [text colour, background, ratio needed, where it shows].
// Text needs 4.5:1, or 3:1 from 24px; rules and chart bars (graphics) need 3:1.
export const THEME_PAIRS = [
  ['--ink', '--paper', 4.5, 'body text'],
  ['--muted', '--paper', 4.5, 'captions, footer, page numbers, chart labels'],
  ['--brand', '--paper', 3, 'headings (24px and up)'],
  ['--accent-text', '--paper', 3, 'big numbers on stat slides, bullets'],
  ['--accent', '--paper', 3, 'highlighted chart bar, quote bar, table rule (graphics)'],
  ['--on-brand', '--brand', 4.5, 'text on title, section and end slides'],
  ['--on-brand-muted', '--brand', 4.5, 'footer and page numbers on title, section and end slides'],
  ['--accent', '--brand', 3, 'the rule under titles on title and section slides (graphics)'],
];

// One row per pair: { fg, bg, need, where, ratio, ok, fix }. Pairs whose colours can't be read
// (a variable missing or not a plain colour) come back with ratio null.
export function themeReport(css) {
  const colors = themeColors(css);
  return THEME_PAIRS.map(([fgVar, bgVar, need, where]) => {
    const fg = parseColor(colors[fgVar]);
    const bg = parseColor(colors[bgVar]);
    const row = { fg: fgVar, bg: bgVar, fgValue: colors[fgVar] ?? null, bgValue: colors[bgVar] ?? null, need, where, ratio: null, ok: true, fix: null };
    if (!fg || !bg) return row;
    row.ratio = contrastRatio(fg, bg);
    row.ok = row.ratio >= need;
    if (!row.ok) row.fix = passingShade(fg, bg, need)?.color ?? null;
    return row;
  });
}
