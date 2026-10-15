// The handout: a PDF with one page per slide, the slide at the top and its speaker notes
// under it, on A4 or US Letter (decks.json "handoutPaper"). It's what "a PDF with my speaker
// notes" usually means: something people can read and print. (Marp's own --pdf-notes only
// adds the notes as sticky-note annotations to the slide PDF; see export-and-present.md.)
//
//   npm run handout [-- pitch …]   -> out/<deck>-handout.pdf (and the page it prints, -handout.html)
//
// The slides are Marp's own HTML and CSS for the deck (the same engine as the exports and the
// checks), so they are sharp vector slides with the deck's fonts, not screenshots. The notes use
// the deck's body font and the brand colour, read from the theme. The page is measured before
// printing: a slide whose notes don't fit on its page is reported (shorten the notes), so the
// handout always has exactly one page per slide.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { createMarp } from './marp-engine.mjs';
import { themeCss } from './inspect.mjs';
import { readDeck } from './deck.mjs';

// Paper sizes and the margins used, in mm.
export const PAPER = { a4: { width: 210, height: 297, css: 'A4' }, letter: { width: 215.9, height: 279.4, css: 'letter' } };
const MARGIN = { x: 16, y: 14 };
const SLIDE_MAX_HEIGHT = 115; // mm: a 4:3 slide is narrower so the notes keep their room

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A speaker note (an HTML comment's text) -> paragraphs: blank lines separate them, single line
// breaks are joined, as in Markdown.
export function notesHtml(notes) {
  const paras = notes.flatMap((n) => n.trim().split(/\r?\n\s*\r?\n/)).map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim()).filter(Boolean);
  return paras.length ? paras.map((p) => `<p>${esc(p)}</p>`).join('') : '<p class="none">No speaker notes for this slide.</p>';
}

// Marp's HTML for a deck is one <div class="marpit"> with an <svg data-marpit-svg> per slide;
// charts are <svg>s inside a slide, so the slides are found by their opening tag.
export function splitSlides(html) {
  const inner = html.trim().replace(/^<div class="marpit">/, '').replace(/<\/div>\s*$/, '');
  return inner.split(/(?=<svg data-marpit-svg)/).filter((s) => s.startsWith('<svg data-marpit-svg'));
}

// Writes out/<deck>-handout.html and returns { file, slides, paper }.
export function handoutPage(deckFile, { root = '.', paper = 'a4' } = {}) {
  const sheet = PAPER[paper];
  if (!sheet) throw new Error(`handout paper "${paper}" must be ${Object.keys(PAPER).join(' or ')}`);
  const marp = createMarp();
  for (const css of themeCss(root)) marp.themeSet.add(css);
  const md = readFileSync(join(root, deckFile), 'utf8');
  const { html, css, comments } = marp.render(md);
  const slides = splitSlides(html);
  const name = basename(deckFile, '.md');
  const title = readDeck(deckFile, { root }).frontMatter.title || name;
  const contentWidth = sheet.width - 2 * MARGIN.x;
  const pageHeight = sheet.height - 2 * MARGIN.y;
  const sheets = slides.map((svg, i) => {
    const [, w, h] = /viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/.exec(svg) ?? [null, 1280, 720];
    const width = Math.min(contentWidth, (SLIDE_MAX_HEIGHT * Number(w)) / Number(h));
    return `<article class="sheet" data-slide="${i + 1}">
<header><span>${esc(title)}</span><span>Slide ${i + 1} of ${slides.length}</span></header>
<div class="marpit" style="width: ${width.toFixed(1)}mm">${svg}</div>
<div class="notes">${notesHtml((comments[i] ?? []).filter((c) => c.trim()))}</div>
</article>`;
  });
  mkdirSync(join(root, 'out'), { recursive: true });
  const file = join(root, 'out', `${name}-handout.html`);
  // out/ and decks/ sit side by side, so the deck's ../assets/ paths work from here too.
  writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}: handout</title>
<style>${css}</style>
<style>
@page { size: ${sheet.css}; margin: ${MARGIN.y}mm ${MARGIN.x}mm; }
html, body { margin: 0; background: #fff; }
body { font-family: var(--handout-font, sans-serif); color: var(--handout-ink, #1b1f24); }
.sheet { width: ${contentWidth}mm; box-sizing: border-box; break-after: page; overflow: hidden; }
.sheet:last-child { break-after: auto; }
.sheet header { display: flex; justify-content: space-between; gap: 8mm; font-size: 9.5pt; color: var(--handout-muted, #5b6470); padding-bottom: 3mm; margin-bottom: 5mm; border-bottom: 0.4mm solid var(--handout-accent, #888); }
.sheet div.marpit { margin: 0 auto; }
.sheet div.marpit > svg { display: block; width: 100%; height: auto; outline: 0.3mm solid #c9cfd6; }
.notes { margin-top: 7mm; font-size: 12pt; line-height: 1.5; }
.notes p { margin: 0 0 3mm; }
.notes p.none { color: var(--handout-muted, #5b6470); font-style: italic; }
</style></head><body data-page-height-mm="${pageHeight}">
${sheets.join('\n')}
<script>
// The notes use the deck's own body font and colours (the theme's variables on a slide).
(() => {
  const s = document.querySelector('div.marpit section');
  if (!s) return;
  const cs = getComputedStyle(s);
  const root = document.documentElement.style;
  root.setProperty('--handout-font', cs.fontFamily);
  for (const [k, v] of [['--handout-ink', '--ink'], ['--handout-muted', '--muted'], ['--handout-accent', '--brand']]) {
    const value = cs.getPropertyValue(v).trim();
    if (value) root.setProperty(k, value);
  }
})();
</script>
</body></html>`);
  return { file, slides: slides.length, paper };
}

// Runs in the page: sheets taller than a printed page, and whether the notes' font loaded.
function measureHandout() {
  const mm = 96 / 25.4;
  const limit = Number(document.body.dataset.pageHeightMm) * mm;
  const problems = [];
  for (const sheet of document.querySelectorAll('.sheet')) {
    const h = sheet.scrollHeight;
    if (h > limit + 1) {
      const words = (sheet.querySelector('.notes')?.textContent.match(/\S+/g) ?? []).length;
      problems.push(`slide ${sheet.dataset.slide}: its speaker notes (${words} words) don't fit on one handout page (${Math.round(h / mm)} of ${Math.round(limit / mm)} mm); shorten them`);
    }
  }
  const notes = document.querySelector('.notes');
  const family = notes ? getComputedStyle(notes).fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '') : null;
  const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, ''));
  if (family && !loaded.includes(family)) problems.push(`the notes' font "${family}" isn't loaded from assets/fonts/ (the theme's --body-font)`);
  return { sheets: document.querySelectorAll('.sheet').length, problems };
}

// Prints the handouts of the given decks ([{ file, handoutPaper }]) in one browser session.
// Returns [{ deck, file, slides, sheets, problems }]; file is out/<deck>-handout.pdf.
export async function makeHandouts(decks, { browserPath, root = '.' }) {
  if (!decks.length) return [];
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-gpu'] });
  const results = [];
  try {
    const page = await browser.newPage();
    for (const d of decks) {
      const { file: html, slides } = handoutPage(d.file, { root, paper: d.handoutPaper ?? 'a4' });
      await page.goto(pathToFileURL(resolve(html)).href, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((ok) => { i.onload = ok; i.onerror = ok; }))));
      });
      await page.emulateMediaType('print');
      const { sheets, problems } = await page.evaluate(measureHandout);
      const out = `out/${basename(d.file, '.md')}-handout.pdf`;
      await page.pdf({ path: resolve(root, out), preferCSSPageSize: true, printBackground: true });
      results.push({ deck: d.file, file: out, slides, sheets, problems });
    }
  } finally {
    await browser.close();
  }
  return results;
}
