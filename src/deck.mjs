// Reads decks the way Marp does (same engine, src/marp-engine.mjs) and checks them
// against decks.json: the agreed outline, a title on every slide, words per slide,
// pictures with alt text that exist under assets/, charts that parse, speaker notes,
// known layouts and the brand theme, the agreed slide size, and charts that say what they
// measure.
//
//   readDeck('decks/pitch.md') -> { file, theme, directives, slides: [{ index, line, title, …}] }
//   lintDeck(deck, config, { root }) -> ['decks/pitch.md slide 3 (line 41): …', …]
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { createMarp } from './marp-engine.mjs';
import { ChartError, parseChart } from './charts.mjs';

export const DEFAULTS = { maxWords: 40, maxTitleWords: 12, requireNotes: false, theme: 'brand', minFontPx: 18, size: '16:9', handoutPaper: 'a4', editablePptx: false };

// Every setting a deck may have in decks.json (a misspelt one would otherwise be ignored).
export const DECK_KEYS = ['file', 'about', 'outline', 'maxWords', 'maxTitleWords', 'requireNotes', 'theme', 'size', 'handoutPaper', 'editablePptx'];
export const PAPERS = ['a4', 'letter'];

// Markdown in a line of text -> plain words (links keep their text, images and code go).
export function plainText(md) {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[*_~#>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export const countWords = (text) => (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%:/-]*/gu) ?? []).length;

const lineOf = (tokens, from) => {
  for (let i = from; i < tokens.length; i++) if (tokens[i].map && tokens[i].type !== 'front_matter') return tokens[i].map[0] + 1;
  return null;
};

export function readDeck(file, { root = '.' } = {}) {
  const full = resolve(root, file);
  const md = readFileSync(full, 'utf8');
  const marp = createMarp();
  const tokens = marp.markdown.parse(md, {});
  const { comments } = marp.render(md);
  const slides = [];
  let slide = null;
  let inHeading = null;
  let pendingBackgrounds = [];
  let frontMatter = {};
  tokens.forEach((t, i) => {
    if (t.type === 'front_matter') {
      // Marp keeps the raw block in `markup` (with its --- lines) once it has read the directives.
      for (const line of (t.content || t.markup || '').split(/\r?\n/)) {
        const m = /^(\w+)\s*:\s*(.*)$/.exec(line.trim());
        if (m) frontMatter[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
      }
    }
    // Background pictures (![bg …]) are lifted out of the slide; Marp lists them on the
    // container just before the slide opens.
    if (t.type === 'marpit_inline_svg_content_open' && t.meta?.marpitBackground) {
      pendingBackgrounds = (t.meta.marpitBackground.images ?? []).map((b) => ({ url: b.url, alt: (b.alt ?? '').trim(), background: true, line: null }));
      return;
    }
    if (t.type === 'marpit_slide_open') {
      slide = {
        index: slides.length,
        line: lineOf(tokens, i + 1),
        class: t.meta?.marpitDirectives?.class ?? '',
        title: null,
        titleLevel: null,
        setextHeading: false,
        words: 0,
        text: '',
        images: pendingBackgrounds,
        charts: [],
        code: 0,
        notes: (comments[slides.length] ?? []).filter((c) => c.trim()),
      };
      slides.push(slide);
      pendingBackgrounds = [];
      return;
    }
    if (!slide) return;
    if (t.type === 'marpit_slide_close') {
      slide = null;
      return;
    }
    if (t.type === 'heading_open') {
      inHeading = t;
      if (t.markup === '-' || t.markup === '=') slide.setextHeading = { line: lineOf(tokens, i) };
      return;
    }
    if (t.type === 'heading_close') {
      inHeading = null;
      return;
    }
    if (t.type === 'fence') {
      if (t.info.trim() === 'chart') {
        try {
          const chart = parseChart(t.content);
          slide.charts.push({ points: chart.data.length, unitGiven: chart.unitGiven, line: t.map ? t.map[0] + 1 : null });
        } catch (e) {
          if (!(e instanceof ChartError)) throw e;
          slide.charts.push({ error: e.message, line: t.map ? t.map[0] + 1 : null });
        }
      } else slide.code++;
      return;
    }
    if (t.type === 'html_block') {
      const text = plainText(t.content);
      slide.text += ` ${text}`;
      slide.words += countWords(text);
      return;
    }
    if (t.type !== 'inline') return;
    for (const c of t.children ?? []) {
      if (c.type !== 'image') continue;
      const img = c.meta?.marpitImage ?? {};
      const alt = (img.options ?? []).filter((o) => !o.consumed).map((o) => o.content).join(' ').trim();
      const url = img.url ?? c.attrGet('src');
      const known = slide.images.find((x) => x.url === url && x.background && img.background);
      if (known) known.line = t.map ? t.map[0] + 1 : null;
      else slide.images.push({ url, alt, background: Boolean(img.background), line: t.map ? t.map[0] + 1 : null });
    }
    const text = plainText(t.content);
    if (inHeading) {
      const level = Number(inHeading.tag.slice(1));
      if (!slide.title && level <= 2) {
        slide.title = text;
        slide.titleLevel = level;
      } else {
        slide.text += ` ${text}`;
        slide.words += countWords(text);
      }
    } else {
      slide.text += ` ${text}`;
      slide.words += countWords(text);
    }
  });
  return { file, md, frontMatter, theme: frontMatter.theme ?? null, size: frontMatter.size ?? DEFAULTS.size, slides };
}

// Layout class names the theme defines (section.title, section.stat …).
export function themeLayouts(css) {
  return new Set([...css.matchAll(/section\.([a-z][\w-]*)/g)].map((m) => m[1]));
}

// Slide sizes the theme defines: /* @size 4:3 960px 720px */ -> { '4:3': { width: 960, height: 720 } }.
// Marp's own 16:9 (1280 x 720) is there even when the theme doesn't name it.
export function themeSizes(css) {
  const sizes = { '16:9': { width: 1280, height: 720 } };
  for (const m of css.matchAll(/@size\s+(\S+)\s+(\d+)px\s+(\d+)px/g)) sizes[m[1]] = { width: Number(m[2]), height: Number(m[3]) };
  return sizes;
}

const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

export function lintDeck(deck, config, { root = '.', layouts = new Set(), sizes = null } = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const out = [];
  const at = (s, msg) => out.push(`${deck.file} slide ${s.index + 1}${s.line ? ` (line ${s.line})` : ''}: ${msg}`);
  if (deck.theme !== cfg.theme) out.push(`${deck.file}: front matter must say "theme: ${cfg.theme}" (it says ${deck.theme ? `"${deck.theme}"` : 'nothing'})`);

  // decks.json settings: known names, valid values, and the size the deck was agreed at.
  for (const k of Object.keys(config)) if (!DECK_KEYS.includes(k)) out.push(`decks.json: ${deck.file} has an unknown setting "${k}" (known: ${DECK_KEYS.join(', ')})`);
  if (!PAPERS.includes(cfg.handoutPaper)) out.push(`decks.json: ${deck.file} "handoutPaper" must be ${PAPERS.map((p) => `"${p}"`).join(' or ')}`);
  if (typeof cfg.editablePptx !== 'boolean') out.push(`decks.json: ${deck.file} "editablePptx" must be true or false`);
  if (sizes && !sizes[deck.size]) out.push(`${deck.file}: "size: ${deck.size}" is not a size theme/brand.css defines (${Object.keys(sizes).join(', ')})`);
  else if (sizes && !sizes[cfg.size]) out.push(`decks.json: ${deck.file} "size" must be one of ${Object.keys(sizes).map((x) => `"${x}"`).join(', ')}`);
  else if (deck.size !== cfg.size) {
    out.push(config.size === undefined
      ? `${deck.file}: the front matter says "size: ${deck.size}" but decks.json doesn't: add "size": "${deck.size}" to this deck in decks.json (the size is part of what the user agreed)`
      : `${deck.file}: decks.json says "size": "${cfg.size}" but the front matter ${deck.frontMatter.size ? `says "size: ${deck.size}"` : 'has no size line'}: put "size: ${cfg.size}" in the front matter`);
  }

  const outline = cfg.outline ?? [];
  if (outline.length && outline.length !== deck.slides.length) {
    out.push(`${deck.file}: has ${deck.slides.length} slides but its outline in decks.json has ${outline.length}; update one to match the other`);
  }
  for (const s of deck.slides) {
    if (s.setextHeading) at(s, 'a line of --- right under text turns that text into a heading instead of starting a new slide: put a blank line before ---');
    if (!s.title) at(s, 'has no title (start the slide with "# " or "## ")');
    else {
      const want = outline[s.index];
      if (want !== undefined && norm(want) !== norm(s.title)) at(s, `title "${s.title}" doesn't match the outline in decks.json ("${want}")`);
      if (countWords(s.title) > cfg.maxTitleWords) at(s, `title has ${countWords(s.title)} words (max ${cfg.maxTitleWords})`);
    }
    if (s.words > cfg.maxWords) at(s, `${s.words} words on the slide (max ${cfg.maxWords}); move detail into the speaker notes or split the slide`);
    if (s.class) for (const c of s.class.split(/\s+/)) if (layouts.size && !layouts.has(c)) at(s, `layout "${c}" is not in theme/brand.css (${[...layouts].join(', ')})`);
    if (cfg.requireNotes && !s.notes.length) at(s, 'has no speaker notes (an HTML comment <!-- … --> on the slide)');
    for (const img of s.images) {
      const label = img.url;
      if (/^[a-z]+:/i.test(img.url)) {
        at(s, `picture ${label} is a web address: download it into assets/images/ and list it in assets.json, so the deck works offline and its licence is known`);
        continue;
      }
      const target = resolve(root, dirname(deck.file), decodeURI(img.url));
      const rel = relative(resolve(root), target).replace(/\\/g, '/');
      if (!existsSync(target)) at(s, `picture ${label} doesn't exist`);
      else if (!rel.startsWith('assets/')) at(s, `picture ${label} must live under assets/ (and be listed in assets.json)`);
      if (!img.alt) at(s, `picture ${label} has no alt text: write a few words after any keywords, like ![bg right:40% A tool shelf](…)`);
    }
    for (const c of s.charts) {
      const where = `chart${c.line ? ` at line ${c.line}` : ''}`;
      if (c.error) at(s, `${where}: ${c.error}`);
      else if (!c.unitGiven) at(s, `${where} has no "unit:" line: say what the numbers measure (unit: kg, unit: loaves, unit: %, unit: £), or "unit: none" for plain numbers`);
    }
  }
  return out;
}

export function loadDecksConfig(root = '.') {
  const file = join(root, 'decks.json');
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  // An empty list is allowed: a project whose sample was removed before its first deck.
  if (!Array.isArray(cfg.decks)) throw new Error('decks.json: "decks" must be a list of decks');
  for (const d of cfg.decks) {
    if (!d.file || !existsSync(join(root, d.file))) throw new Error(`decks.json: deck file ${d.file} doesn't exist`);
    if (!/^decks\/[a-z0-9-]+\.md$/.test(d.file)) throw new Error(`decks.json: ${d.file} must be decks/<name>.md (lowercase, dashes)`);
  }
  return cfg;
}
