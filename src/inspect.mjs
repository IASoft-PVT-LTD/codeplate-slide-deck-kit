// Opens each deck in a real browser (the one find-tool finds, via puppeteer-core) and
// measures every slide the way an audience would see it:
//   overflow   nothing runs off the slide or into the footer strip at the bottom
//   tiny text  no text smaller than minFontPx (18px on a 1280 x 720 slide)
//   contrast   text against its background meets WCAG AA (4.5:1, or 3:1 from 24px)
//   fonts      every font family the slides use is loaded from assets/fonts/
//   pictures   every <img> loaded; every chart drew; no logo vanishes into the slide behind it
//              (src/visibility.mjs: a logo with marks in the slide's colour)
// The page is Marp's own HTML and CSS for the deck (src/marp-engine.mjs + theme/), written
// to out/<deck>.inspect.html, so it matches what Marp CLI exports.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createMarp } from './marp-engine.mjs';
import { HIDDEN_LIMIT, hiddenShare } from './visibility.mjs';

export const FOOTER_STRIP = 48; // px at the bottom of a slide kept for the footer and page number

export function themeCss(root = '.') {
  return readdirSync(join(root, 'theme')).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(root, 'theme', f), 'utf8'));
}

export function inspectionPage(deckFile, root = '.') {
  const marp = createMarp();
  for (const css of themeCss(root)) marp.themeSet.add(css);
  const { html, css } = marp.render(readFileSync(join(root, deckFile), 'utf8'));
  const name = basename(deckFile, '.md');
  mkdirSync(join(root, 'out'), { recursive: true });
  const file = join(root, 'out', `${name}.inspect.html`);
  // out/ and decks/ sit side by side, so the deck's ../assets/ paths work from here too.
  writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { margin: 0; background: #888; } div.marpit > svg { display: block; width: 1280px; height: 720px; margin: 0 0 20px; }</style></head><body>${html}</body></html>`);
  return file;
}

// Runs in the page.
function measure({ minFontPx, footerStrip, hiddenLimit }) {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const results = [];
  const svgs = [...document.querySelectorAll('div.marpit > svg')];
  for (const svg of svgs) {
    // A slide with a split background (![bg right]) has its text in the "content" section.
    const section = svg.querySelector('section[data-marpit-advanced-background="content"]')
      ?? svg.querySelector('section:not([data-marpit-advanced-background])');
    if (!section) continue;
    const bgSection = svg.querySelector('section[data-marpit-advanced-background="background"]');
    const hasBgImage = Boolean(bgSection?.querySelector('figure'));
    const S = section.getBoundingClientRect();
    const problems = [];
    const fontsUsed = new Set();
    const seen = new Set();
    const backgroundOf = (el) => {
      for (let e = el; e && e !== svg; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0.5) return { color: c, image: false };
        if (e === section) break;
      }
      if (bgSection) {
        const c = parse(getComputedStyle(bgSection).backgroundColor);
        return { color: c && c.a > 0.5 ? c : { r: 255, g: 255, b: 255 }, image: hasBgImage };
      }
      return { color: { r: 255, g: 255, b: 255 }, image: false };
    };
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim();
      if (!text) continue;
      const el = n.parentElement;
      if (seen.has(el)) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const inFooter = Boolean(el.closest('footer, header'));
      const range = document.createRange();
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      const snippet = text.slice(0, 40);
      // In a chart (SVG), the rendered size depends on how the chart is scaled.
      let px = parseFloat(cs.fontSize);
      const svgText = el.closest('svg.chart');
      if (svgText) {
        const vb = svgText.viewBox.baseVal;
        px *= svgText.getBoundingClientRect().width / vb.width;
      }
      fontsUsed.add(cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, ''));
      if (px < minFontPx - 0.01) problems.push(`text "${snippet}" is ${px.toFixed(1)}px, below the ${minFontPx}px minimum`);
      if (!inFooter && r.width > 0) {
        if (r.bottom > S.bottom - footerStrip + 1) problems.push(`text "${snippet}" runs ${Math.round(r.bottom - (S.bottom - footerStrip))}px into the footer strip or off the slide`);
        if (r.right > S.right + 1 || r.left < S.left - 1) problems.push(`text "${snippet}" runs off the side of the slide`);
      }
      const bg = backgroundOf(el);
      const fg = parse(cs.color);
      if (fg && !bg.image) {
        const need = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700) ? 3 : 4.5;
        const fill = svgText ? parse(cs.fill) ?? fg : fg;
        const c = ratio(fill, bg.color);
        if (c < need) problems.push(`text "${snippet}" has contrast ${c.toFixed(2)}:1 against its background (needs ${need}:1)`);
      }
    }
    for (const el of section.querySelectorAll('img, svg.chart, table, pre, blockquote, .cols')) {
      const r = el.getBoundingClientRect();
      if (r.height && r.bottom > S.bottom - footerStrip + 1) problems.push(`a ${el.tagName.toLowerCase()} runs ${Math.round(r.bottom - (S.bottom - footerStrip))}px into the footer strip or off the slide`);
      if (r.width && r.right > S.right + 1) problems.push(`a ${el.tagName.toLowerCase()} runs off the right side of the slide`);
    }
    for (const img of section.querySelectorAll('img')) if (!img.complete || !img.naturalWidth) problems.push(`picture ${img.getAttribute('src')} didn't load`);
    // Pictures with transparent parts (logos) drawn over what is behind them: a mark in the
    // slide's own colour disappears (src/visibility.mjs).
    for (const img of section.querySelectorAll('img')) {
      if (!img.complete || !img.naturalWidth) continue;
      const box = img.getBoundingClientRect();
      const behind = backgroundOf(img);
      if (behind.image || box.width < 4 || box.height < 4) continue;
      const scale = Math.min(1, 320 / Math.max(box.width, box.height));
      const w = Math.max(1, Math.round(box.width * scale));
      const h = Math.max(1, Math.round(box.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let pixels;
      try {
        pixels = ctx.getImageData(0, 0, w, h).data;
      } catch {
        continue;
      }
      const share = window.hiddenShare(pixels, w, h, behind.color);
      if (share > hiddenLimit) {
        const hex = '#' + [behind.color.r, behind.color.g, behind.color.b].map((v) => v.toString(16).padStart(2, '0')).join('');
        problems.push(`picture ${img.getAttribute('src')}: ${Math.round(share * 100)}% of it is the colour behind it (${hex}) and disappears; set --logo-backing in theme/brand.css (a badge behind logos on title, section and end slides) or use a version of the picture made for this background`);
      }
    }
    for (const e of section.querySelectorAll('.chart-error')) problems.push(e.textContent);
    results.push({ problems: [...new Set(problems)], fonts: [...fontsUsed], charts: section.querySelectorAll('svg.chart').length });
  }
  const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, ''));
  return { slides: results, loadedFonts: [...new Set(loaded)] };
}

// Inspects the given decks in one browser session. Returns { [file]: { slides, loadedFonts } }.
export async function inspectDecks(files, { browserPath, minFontPx = 18, root = '.' }) {
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-gpu'] });
  const out = {};
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    for (const file of files) {
      const html = inspectionPage(file, root);
      await page.goto(pathToFileURL(resolve(html)).href, { waitUntil: 'load' });
      await page.addScriptTag({ content: `window.hiddenShare = ${hiddenShare.toString()};` });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = ok; i.onerror = ok; }))));
      });
      out[file] = await page.evaluate(measure, { minFontPx, footerStrip: FOOTER_STRIP, hiddenLimit: HIDDEN_LIMIT });
    }
  } finally {
    await browser.close();
  }
  return out;
}
