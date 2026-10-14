import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { countWords, lintDeck, plainText, readDeck, themeLayouts, themeSizes } from '../src/deck.mjs';

const THEME = fileURLToPath(new URL('../theme/brand.css', import.meta.url));

// Lints a deck written to a temp project (with one picture in assets/images/).
function lint(md, config = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'slide-deck-kit-'));
  try {
    mkdirSync(join(dir, 'decks'));
    mkdirSync(join(dir, 'assets/images'), { recursive: true });
    mkdirSync(join(dir, 'theme'));
    cpSync(THEME, join(dir, 'theme/brand.css'));
    writeFileSync(join(dir, 'assets/images/pic.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>');
    writeFileSync(join(dir, 'decks/test.md'), md);
    const deck = readDeck('decks/test.md', { root: dir });
    const layouts = themeLayouts(readFileSync(THEME, 'utf8'));
    const sizes = themeSizes(readFileSync(THEME, 'utf8'));
    return { deck, problems: lintDeck(deck, config, { root: dir, layouts, sizes }) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const FRONT = '---\ntheme: brand\n---\n\n';
const has = (r, re) => r.problems.some((p) => re.test(p));

test('slides, titles, layouts, notes and words are read the way Marp reads them', () => {
  const { deck, problems } = lint(`${FRONT}<!-- _class: title -->\n# Hello\n\nSub line\n\n<!-- a note -->\n\n---\n\n## Second slide\n\n- one two three\n- [a link](https://x.example) **bold**\n`);
  assert.deepEqual(problems, []);
  assert.equal(deck.slides.length, 2);
  assert.equal(deck.slides[0].title, 'Hello');
  assert.equal(deck.slides[0].class, 'title');
  assert.deepEqual(deck.slides[0].notes, ['a note']);
  assert.equal(deck.slides[1].title, 'Second slide');
  assert.equal(deck.slides[1].words, 6);
});

test('the outline must match the slide titles, in order', () => {
  const md = `${FRONT}# One\n\n---\n\n# Two\n`;
  assert.deepEqual(lint(md, { outline: ['One', 'two'] }).problems, [], 'case and spacing are ignored');
  assert.ok(has(lint(md, { outline: ['One', 'Three'] }), /slide 2 .*"Two" doesn't match the outline .*"Three"/));
  assert.ok(has(lint(md, { outline: ['One'] }), /has 2 slides but its outline in decks\.json has 1/));
});

test('too many words, missing titles, unknown layouts, missing notes', () => {
  const words = Array.from({ length: 41 }, (_, i) => `w${i}`).join(' ');
  assert.ok(has(lint(`${FRONT}# T\n\n${words}\n`), /41 words on the slide \(max 40\)/));
  assert.ok(has(lint(`${FRONT}Just text\n`), /has no title/));
  assert.ok(has(lint(`${FRONT}<!-- _class: fancy -->\n# T\n`), /layout "fancy" is not in theme\/brand\.css/));
  assert.ok(has(lint(`${FRONT}# T\n`, { requireNotes: true }), /no speaker notes/));
  assert.ok(has(lint('---\ntheme: default\n---\n\n# T\n'), /must say "theme: brand"/));
});

test('a --- right under text makes a heading, not a slide', () => {
  assert.ok(has(lint(`${FRONT}# T\n\nSome text\n---\n\n# Next\n`), /blank line before ---/));
});

test('pictures: must exist under assets/, have alt text, and not be web addresses', () => {
  assert.deepEqual(lint(`${FRONT}# T\n\n![bg right:40% A picture](../assets/images/pic.svg)\n`).problems, []);
  assert.ok(has(lint(`${FRONT}# T\n\n![bg right:40%](../assets/images/pic.svg)\n`), /no alt text/));
  assert.ok(has(lint(`${FRONT}# T\n\n![A picture](../assets/images/nope.svg)\n`), /doesn't exist/));
  assert.ok(has(lint(`${FRONT}# T\n\n![A picture](https://example.com/x.png)\n`), /web address/));
});

test('charts that do not parse are reported with their line', () => {
  const r = lint(`${FRONT}# T\n\n\`\`\`chart\ntype: pie\ndata:\nA: 1\n\`\`\`\n`);
  assert.ok(has(r, /chart at line \d+: chart type "pie"/));
});

test('a chart must say what it measures', () => {
  assert.ok(has(lint(`${FRONT}# T\n\n\`\`\`chart\ndata:\nA: 1\n\`\`\`\n`), /has no "unit:" line/));
  assert.deepEqual(lint(`${FRONT}# T\n\n\`\`\`chart\nunit: none\ndata:\nA: 1\n\`\`\`\n`).problems, []);
  assert.deepEqual(lint(`${FRONT}# T\n\n\`\`\`chart\nunit: kg\ndata:\nA: 1\n\`\`\`\n`).problems, []);
});

test('the size is per deck: the front matter and decks.json agree, and the theme defines it', () => {
  const sizes = themeSizes(readFileSync(THEME, 'utf8'));
  assert.deepEqual(sizes['4:3'], { width: 960, height: 720 });
  assert.deepEqual(sizes['16:9'], { width: 1280, height: 720 });
  const four = '---\ntheme: brand\nsize: 4:3\n---\n\n# T\n';
  assert.equal(lint(four).deck.size, '4:3');
  assert.equal(lint(`${FRONT}# T\n`).deck.size, '16:9');
  assert.deepEqual(lint(four, { size: '4:3' }).problems, []);
  assert.ok(has(lint(four), /add "size": "4:3" to this deck in decks\.json/));
  assert.ok(has(lint(`${FRONT}# T\n`, { size: '4:3' }), /put "size: 4:3" in the front matter/));
  assert.ok(has(lint('---\ntheme: brand\nsize: 21:9\n---\n\n# T\n', { size: '21:9' }), /not a size theme\/brand\.css defines/));
});

test('decks.json settings: misspelt names and bad values are reported', () => {
  assert.ok(has(lint(`${FRONT}# T\n`, { requireNote: true }), /unknown setting "requireNote"/));
  assert.ok(has(lint(`${FRONT}# T\n`, { handoutPaper: 'A5' }), /"handoutPaper" must be "a4" or "letter"/));
  assert.ok(has(lint(`${FRONT}# T\n`, { editablePptx: 'yes' }), /"editablePptx" must be true or false/));
  assert.deepEqual(lint(`${FRONT}# T\n`, { handoutPaper: 'letter', editablePptx: true }).problems, []);
});

test('plain text and word counts', () => {
  assert.equal(plainText('**Bold** [link](u) ![img](p) `code`'), 'Bold link');
  assert.equal(countWords('£400k seed, 1,240 members'), 4);
});
