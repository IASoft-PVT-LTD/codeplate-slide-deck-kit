import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handoutPage, notesHtml, splitSlides } from '../src/handout.mjs';

const THEME = fileURLToPath(new URL('../theme/brand.css', import.meta.url));

test('notes become paragraphs: blank lines split them, line breaks join, text is escaped', () => {
  assert.equal(notesHtml(['Say the 13-minute figure,\nthen move on.\n\nPause <here> & smile.']), '<p>Say the 13-minute figure, then move on.</p><p>Pause &lt;here&gt; &amp; smile.</p>');
  assert.equal(notesHtml(['one', 'two']), '<p>one</p><p>two</p>');
  assert.match(notesHtml([]), /class="none"/);
});

test('slides are split at their own <svg>, not at a chart inside one', () => {
  const html = '<div class="marpit"><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section><svg class="chart"></svg></section></foreignObject></svg><svg data-marpit-svg="" viewBox="0 0 1280 720"><foreignObject><section>2</section></foreignObject></svg></div>';
  const slides = splitSlides(html);
  assert.equal(slides.length, 2);
  assert.match(slides[0], /svg class="chart"/);
  assert.ok(slides[1].endsWith('</svg>'));
});

test('the handout page has one sheet per slide with its notes, on the chosen paper', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slide-deck-kit-handout-'));
  try {
    mkdirSync(join(dir, 'decks'));
    mkdirSync(join(dir, 'theme'));
    cpSync(THEME, join(dir, 'theme/brand.css'));
    writeFileSync(join(dir, 'decks/talk.md'), '---\ntheme: brand\nsize: 4:3\ntitle: Our talk\n---\n\n# One\n\n<!-- Say hello. -->\n\n---\n\n## Two\n\n```chart\nunit: kg\ndata:\nA: 1\n```\n');
    const { file, slides } = handoutPage('decks/talk.md', { root: dir, paper: 'letter' });
    const html = readFileSync(file, 'utf8');
    assert.equal(slides, 2);
    assert.equal((html.match(/<article class="sheet"/g) ?? []).length, 2);
    assert.match(html, /@page \{ size: letter;/);
    assert.match(html, /<span>Our talk<\/span><span>Slide 1 of 2<\/span>/);
    assert.match(html, /<p>Say hello\.<\/p>/);
    assert.match(html, /No speaker notes for this slide/);
    assert.match(html, /viewBox="0 0 960 720"/, 'a 4:3 deck stays 4:3');
    assert.throws(() => handoutPage('decks/talk.md', { root: dir, paper: 'a5' }), /a4 or letter/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
