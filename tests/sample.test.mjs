import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { removeSample, SAMPLE } from '../src/sample.mjs';

// A project shaped like a fresh copy of the template, plus one deck and picture of the user's own.
function project() {
  const dir = mkdtempSync(join(tmpdir(), 'slide-deck-kit-sample-'));
  const put = (rel, text) => {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  };
  for (const s of [...SAMPLE.decks, ...SAMPLE.assets]) put(s.file, `<!-- ${s.marker} -->\n`);
  for (const f of SAMPLE.media) put(f, 'png');
  put('decks/talk.md', '# Our own talk\n');
  put('assets/images/bakery.jpg', 'jpg');
  put('decks.json', JSON.stringify({ decks: [{ file: 'decks/pitch.md' }, { file: 'decks/lesson.md' }, { file: 'decks/talk.md', size: '4:3' }] }));
  put('assets.json', JSON.stringify({ assets: [{ path: 'assets/fonts/Inter-Regular.ttf' }, ...SAMPLE.assets.map((s) => ({ path: s.file })), { path: 'assets/images/bakery.jpg' }] }));
  put('codeplate.json', JSON.stringify({ id: 'slide-deck-kit', media: SAMPLE.media }));
  put('README.md', `# Decks\n\n![x](${SAMPLE.media[1]})\n\nIntro.\n\n| | |\n|---|---|\n| ![a](${SAMPLE.media[0]}) | ![b](${SAMPLE.media[2]}) |\n\n## Use it\n\nBuilt with CodePlate (codeplate.io).\n`);
  put('CREDITS.md', '# Credits\n\n- **Inter** fonts.\n- **Pictures** (`assets/images/street.svg`, `tool-shelf.svg`, `water-cycle.svg`) and the sample logo.\n- **Marp**.\n\nThe sample company Loamly, its people, numbers and quote, and the school in the lesson deck are made up.\n\nThe OFL lets you use them.\n');
  put('out/pitch.pdf', 'x');
  put('out/pitch-handout.pdf', 'x');
  put('out/talk.pdf', 'x');
  put('shots/lesson/slide.001.png', 'x');
  return dir;
}

test('remove-sample: lists first, then takes out only the sample, in one go', () => {
  const dir = project();
  try {
    const dry = removeSample(dir, { dryRun: true });
    assert.ok(dry.length >= 10);
    assert.ok(existsSync(join(dir, 'decks/pitch.md')), 'a dry run changes nothing');

    const done = removeSample(dir);
    assert.deepEqual(done, dry, 'it does what the dry run listed');
    for (const s of [...SAMPLE.decks, ...SAMPLE.assets]) assert.ok(!existsSync(join(dir, s.file)), s.file);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'decks.json'), 'utf8')).decks, [{ file: 'decks/talk.md', size: '4:3' }]);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8')).assets.map((a) => a.path), ['assets/fonts/Inter-Regular.ttf', 'assets/images/bakery.jpg']);
    assert.equal(JSON.parse(readFileSync(join(dir, 'codeplate.json'), 'utf8')).media, undefined);
    assert.equal(readFileSync(join(dir, 'README.md'), 'utf8'), '# Decks\n\nIntro.\n\n## Use it\n\nBuilt with CodePlate (codeplate.io).\n');
    assert.equal(readFileSync(join(dir, 'CREDITS.md'), 'utf8'), '# Credits\n\n- **Inter** fonts.\n- **Marp**.\n\nThe OFL lets you use them.\n');
    assert.ok(!existsSync(join(dir, 'out/pitch.pdf')) && !existsSync(join(dir, 'out/pitch-handout.pdf')) && !existsSync(join(dir, 'shots/lesson')));
    assert.ok(existsSync(join(dir, 'decks/talk.md')) && existsSync(join(dir, 'out/talk.pdf')) && existsSync(join(dir, 'assets/images/bakery.jpg')), "the user's files stay");
    assert.deepEqual(removeSample(dir), [], 'a second run has nothing to do');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a sample file the user has changed is kept (their logo saved over assets/logo.svg)', () => {
  const dir = project();
  try {
    writeFileSync(join(dir, 'assets/logo.svg'), '<svg><!-- Second Loaf --></svg>');
    const done = removeSample(dir);
    assert.ok(done.some((s) => s.startsWith('keep assets/logo.svg')));
    assert.ok(existsSync(join(dir, 'assets/logo.svg')));
    assert.ok(JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8')).assets.some((a) => a.path === 'assets/logo.svg'), 'its assets.json entry stays');
    assert.match(readFileSync(join(dir, 'CREDITS.md'), 'utf8'), /\*\*Pictures\*\*/, 'the credit line naming it stays');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
