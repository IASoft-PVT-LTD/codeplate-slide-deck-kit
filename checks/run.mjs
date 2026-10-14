// The checks: one command that says whether every deck still builds and reads well.
//   npm ci && npm run check
// Needs Node and a Chromium-based browser (Chrome, Edge, Chromium; found by itself). Runs:
//   tools    the browser, and the pinned Marp CLI from package.json
//   assets   assets.json matches the files in assets/ (fonts and their licences, pictures)
//   decks    every deck in decks.json follows its rules: the agreed outline (slide titles in
//            order), a title on every slide, words per slide, pictures under assets/ with alt
//            text, charts that parse, speaker notes where required, known layouts, the brand
//            theme, the size agreed in decks.json, charts that name their unit, known settings;
//            and every deck in decks/ is listed
//   unit     node --test tests/
//   inspect  each deck opened in the browser: nothing runs off a slide or into the footer,
//            no text under 18px, enough contrast (WCAG AA), the theme's fonts loaded from
//            assets/fonts/, pictures loaded, charts drawn, no logo vanishing into its slide
//   export   Marp CLI writes out/<deck>.pdf and .pptx with one page/slide per slide (and
//            out/<deck>-editable.pptx for decks with "editablePptx": true; needs LibreOffice)
//   handout  out/<deck>-handout.pdf: one page per slide, the slide and its speaker notes,
//            every slide's notes fitting on its page
//   preview  a PNG per slide at the deck's size and a contact sheet in shots/<deck>/
//   credit   README.md still carries the credit the CodePlate Free License asks for
// A failing step doesn't stop the later ones. The last line is CODEPLATE CHECKS: PASS or FAIL.
//   --skip=export,preview   skip steps for a quick loop; always finish with a full run
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createRunner } from './shared/runner.mjs';
import { checkAssets } from './shared/assets.mjs';
import { DEFAULTS, loadDecksConfig, readDeck, themeSizes } from '../src/deck.mjs';
import { makeHandouts } from '../src/handout.mjs';
import { lintAll } from '../src/lint-all.mjs';
import { browserPath, deckName, exportDeck, marpVersion, slideImages } from '../src/marp.mjs';
import { inspectDecks } from '../src/inspect.mjs';
import { contactSheets } from '../src/contact.mjs';
import { pngSize } from './shared/assets.mjs';
import { pdfPageCount } from '../src/pdf.mjs';

const run = createRunner();
let cfg = null;
let browser = null;
const slideCounts = new Map();
const slideSizes = new Map();

await run.step('tools', () => {
  browser = browserPath();
  console.log(`browser: ${browser}`);
  const pin = JSON.parse(readFileSync('codeplate.json', 'utf8')).stack.find((s) => s.name === 'marp-cli')?.version;
  const have = marpVersion();
  console.log(`Marp CLI ${have} (codeplate.json pins ${pin})`);
  if (have !== pin) {
    console.log('The installed Marp CLI is not the pinned version: run `npm ci`.');
    return false;
  }
  return true;
});

await run.step('assets', () => {
  const problems = checkAssets('.');
  for (const p of problems) console.log(p);
  if (!problems.length) console.log('assets.json matches the files in assets/');
  return problems.length === 0;
});

await run.step('decks', () => {
  cfg = loadDecksConfig('.');
  const { problems, summary } = lintAll(cfg.decks);
  const listed = new Set(cfg.decks.map((d) => d.file));
  for (const f of (existsSync('decks') ? readdirSync('decks') : []).filter((x) => x.endsWith('.md'))) {
    if (!listed.has(`decks/${f}`)) problems.push(`decks/${f} is not in decks.json: add it with its outline (or move it out of decks/)`);
  }
  for (const p of problems) console.log(p);
  for (const s of summary) console.log(s);
  return problems.length === 0;
});

await run.step('unit', () => run.sh(process.execPath, ['--test', '--test-reporter=dot', ...readdirSync('tests').filter((f) => f.endsWith('.test.mjs')).map((f) => `tests/${f}`)]).ok);

// The browser and decks.json, loaded here when an earlier step was skipped (--only=inspect).
const ready = () => {
  try {
    browser ??= browserPath();
    cfg ??= loadDecksConfig('.');
    const sizes = themeSizes(readFileSync('theme/brand.css', 'utf8'));
    for (const d of cfg.decks) {
      if (slideCounts.has(d.file)) continue;
      const deck = readDeck(d.file);
      slideCounts.set(d.file, deck.slides.length);
      slideSizes.set(d.file, sizes[deck.size] ?? sizes['16:9']);
    }
  } catch (e) {
    console.log(e.message);
  }
  if (!browser) console.log('No browser: see the tools step.');
  if (!cfg) console.log('decks.json could not be read: see the decks step.');
  return Boolean(browser && cfg);
};

await run.step('inspect', async () => {
  if (!ready()) return false;
  if (!cfg.decks.length) return noDecks();
  const results = await inspectDecks(cfg.decks.map((d) => d.file), { browserPath: browser, minFontPx: DEFAULTS.minFontPx });
  let ok = true;
  for (const d of cfg.decks) {
    const r = results[d.file];
    const deck = readDeck(d.file);
    r.slides.forEach((s, i) => {
      for (const p of s.problems) {
        console.log(`${d.file} slide ${i + 1}: ${p}`);
        ok = false;
      }
      const want = deck.slides[i]?.charts.filter((c) => !c.error).length ?? 0;
      if (s.charts !== want) {
        console.log(`${d.file} slide ${i + 1}: ${want} chart(s) in the Markdown but ${s.charts} drawn`);
        ok = false;
      }
    });
    const missing = [...new Set(r.slides.flatMap((s) => s.fonts))].filter((f) => !r.loadedFonts.includes(f));
    for (const f of missing) {
      console.log(`${d.file}: the font "${f}" is used but not loaded: add its files to assets/fonts/ with an @font-face in theme/brand.css`);
      ok = false;
    }
    if (r.slides.length !== slideCounts.get(d.file)) {
      console.log(`${d.file}: the browser drew ${r.slides.length} slides, the deck has ${slideCounts.get(d.file)}`);
      ok = false;
    }
    console.log(`${d.file}: ${r.slides.length} slides measured; fonts ${[...new Set(r.slides.flatMap((s) => s.fonts))].join(', ')}`);
  }
  return ok;
}, { render: true });

// After the sample is removed and before the first deck, there is nothing to render.
function noDecks() {
  console.log('No decks yet (decks.json lists none): nothing to render.');
  return true;
}

// Slides in a PPTX: a zip with one ppt/slides/slideN.xml entry per slide.
const pptxSlides = (buf) => new Set(buf.toString('latin1').match(/ppt\/slides\/slide\d+\.xml/g) ?? []).size;

await run.step('export', () => {
  if (!ready()) return false;
  if (!cfg.decks.length) return noDecks();
  let ok = true;
  for (const d of cfg.decks) {
    const want = slideCounts.get(d.file);
    for (const r of exportDeck(d.file, d.editablePptx ? ['pdf', 'pptx', 'pptx-editable'] : ['pdf', 'pptx'])) {
      if (!r.ok || !existsSync(r.file)) {
        console.log(`${r.file}: Marp failed`);
        ok = false;
        continue;
      }
      const buf = readFileSync(r.file);
      const got = r.format === 'pdf' ? pdfPageCount(buf) : pptxSlides(buf);
      if (got !== want) {
        console.log(`${r.file}: ${got} ${r.format === 'pdf' ? 'pages' : 'slides'}, expected ${want}`);
        ok = false;
      } else console.log(`${r.file}: ${got} ${r.format === 'pdf' ? 'pages' : 'slides'}, ${Math.round(buf.length / 1024)} KB`);
    }
  }
  return ok;
}, { render: true });

await run.step('handout', async () => {
  if (!ready()) return false;
  if (!cfg.decks.length) return noDecks();
  let ok = true;
  for (const r of await makeHandouts(cfg.decks, { browserPath: browser })) {
    for (const p of r.problems) {
      console.log(`${r.deck} handout: ${p}`);
      ok = false;
    }
    const pages = existsSync(r.file) ? pdfPageCount(readFileSync(r.file)) : 0;
    const want = slideCounts.get(r.deck);
    if (pages !== want) {
      console.log(`${r.file}: ${pages} pages, expected ${want} (one per slide)`);
      ok = false;
    } else console.log(`${r.file}: ${pages} pages, each slide with its speaker notes`);
  }
  return ok;
}, { render: true });

await run.step('preview', async () => {
  if (!ready()) return false;
  if (!cfg.decks.length) return noDecks();
  let ok = true;
  const dirs = [];
  for (const d of cfg.decks) {
    rmSync(`shots/${deckName(d.file)}`, { recursive: true, force: true });
    const r = slideImages(d.file);
    const files = existsSync(r.dir) ? readdirSync(r.dir).filter((f) => /^slide\.\d+\.png$/.test(f)) : [];
    const sizes = files.map((f) => pngSize(readFileSync(`${r.dir}/${f}`)));
    const want = slideSizes.get(d.file);
    const wrong = sizes.find((s) => !s || s.width !== want.width || s.height !== want.height);
    if (!r.ok || files.length !== slideCounts.get(d.file) || wrong !== undefined) {
      console.log(`${r.dir}: expected ${slideCounts.get(d.file)} slide PNGs of ${want.width}x${want.height}, found ${files.length}${wrong ? ` (one is ${wrong.width}x${wrong.height})` : ''}`);
      ok = false;
    } else dirs.push(r.dir);
  }
  for (const sheet of await contactSheets(dirs, { browserPath: browser })) console.log(`${sheet} (and one PNG per slide next to it)`);
  return ok;
}, { render: true });

await run.step('credit', () => {
  const credit = 'Built with CodePlate (codeplate.io)';
  const ok = readFileSync('README.md', 'utf8').includes(credit);
  console.log(ok ? `README.md carries the credit "${credit}"` : `README.md must keep the credit "${credit}" (CodePlate Free License; see AGENTS.md)`);
  return ok;
});

run.finish();
