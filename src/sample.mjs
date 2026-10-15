// `npm run remove-sample`: takes the Loamly pitch and the water-cycle lesson out, once, when
// the user's own decks are about to replace them. Without --yes it only lists what it would do.
// docs/recipes/remove-the-sample.md
//
// It removes only what the template shipped: the two sample decks and their decks.json
// entries, their pictures and the Loamly logo (with their assets.json entries and CREDITS.md
// lines), the screenshots in docs/media/ (and where codeplate.json and README.md show them),
// and the sample's built files in out/ and shots/. A sample file the user has since changed
// (a deck no longer about Loamly, their own logo saved over assets/logo.svg) is kept and named,
// so nothing of theirs is lost. The theme, fonts and decks the user added stay.
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Each sample file with text that shows it is still the sample.
export const SAMPLE = {
  decks: [
    { file: 'decks/pitch.md', marker: 'Loamly' },
    { file: 'decks/lesson.md', marker: 'The water cycle' },
  ],
  assets: [
    { file: 'assets/logo.svg', marker: 'Loamly' },
    { file: 'assets/images/street.svg', marker: 'A street of houses at dusk. Drawn for CodePlate.' },
    { file: 'assets/images/tool-shelf.svg', marker: 'A neighbourhood tool shelf: drill, saw, ladder, watering can. Drawn for CodePlate.' },
    { file: 'assets/images/water-cycle.svg', marker: 'The water cycle: sun, sea, rising vapour, a cloud and rain on a hill.' },
  ],
  media: ['docs/media/pitch-title.png', 'docs/media/pitch-chart.png', 'docs/media/lesson-columns.png'],
  // CREDITS.md lines about the sample: each goes when every file it names is gone.
  credits: [
    { starts: '- **Pictures** (`assets/images/street.svg`', files: ['assets/images/street.svg', 'assets/images/tool-shelf.svg', 'assets/images/water-cycle.svg', 'assets/logo.svg'] },
    { starts: 'The sample company Loamly', files: ['decks/pitch.md', 'decks/lesson.md'] },
  ],
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

// Returns the list of things done (or, with dryRun, that would be done). Kept sample files
// are listed as "keep …" lines.
export function removeSample(root = '.', { dryRun = false } = {}) {
  const done = [];
  const say = (s) => done.push(s);
  const gone = new Set(); // sample files removed (or, in a dry run, that would be)
  const take = ({ file, marker }) => {
    const path = join(root, file);
    if (!existsSync(path)) {
      gone.add(file);
      return;
    }
    if (!readFileSync(path, 'utf8').includes(marker)) {
      say(`keep ${file}: it has changed since the template shipped (delete it yourself if it is still the sample)`);
      return;
    }
    if (!dryRun) rmSync(path, { force: true });
    gone.add(file);
    say(`delete ${file}`);
  };
  for (const s of [...SAMPLE.decks, ...SAMPLE.assets]) take(s);

  // decks.json and assets.json entries of the files that went.
  const decksPath = join(root, 'decks.json');
  if (existsSync(decksPath)) {
    const cfg = readJson(decksPath);
    const keep = (cfg.decks ?? []).filter((d) => !(SAMPLE.decks.some((s) => s.file === d.file) && gone.has(d.file)));
    if (keep.length !== (cfg.decks ?? []).length) {
      if (!dryRun) writeJson(decksPath, { ...cfg, decks: keep });
      say(`decks.json: remove ${(cfg.decks ?? []).length - keep.length} sample deck(s)`);
    }
  }
  const assetsPath = join(root, 'assets.json');
  if (existsSync(assetsPath)) {
    const manifest = readJson(assetsPath);
    const keep = (manifest.assets ?? []).filter((a) => !(SAMPLE.assets.some((s) => s.file === a.path) && gone.has(a.path)));
    if (keep.length !== (manifest.assets ?? []).length) {
      if (!dryRun) writeJson(assetsPath, { ...manifest, assets: keep });
      say(`assets.json: remove ${(manifest.assets ?? []).length - keep.length} sample picture(s)`);
    }
  }
  const creditsPath = join(root, 'CREDITS.md');
  if (existsSync(creditsPath)) {
    const text = readFileSync(creditsPath, 'utf8');
    const lines = text.split('\n');
    const drop = new Set();
    lines.forEach((l, i) => {
      const c = SAMPLE.credits.find((x) => l.startsWith(x.starts));
      if (!c || !c.files.every((f) => gone.has(f))) return;
      drop.add(i);
      // A paragraph line takes one blank line around it with it.
      if (!l.startsWith('- ') && lines[i + 1]?.trim() === '') drop.add(i + 1);
    });
    if (drop.size) {
      if (!dryRun) writeFileSync(creditsPath, lines.filter((_, i) => !drop.has(i)).join('\n'));
      say('CREDITS.md: remove the lines about the sample pictures and company');
    }
  }

  // Screenshots: the files, the manifest's "media" and the README lines that show them.
  for (const f of SAMPLE.media) {
    if (!existsSync(join(root, f))) continue;
    if (!dryRun) rmSync(join(root, f), { force: true });
    say(`delete ${f}`);
  }
  const manifestPath = join(root, 'codeplate.json');
  if (existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    const media = (manifest.media ?? []).filter((m) => !SAMPLE.media.includes(m));
    if (media.length !== (manifest.media ?? []).length) {
      if (media.length) manifest.media = media;
      else delete manifest.media;
      if (!dryRun) writeJson(manifestPath, manifest);
      say('codeplate.json: remove the sample screenshots from "media"');
    }
  }
  const readmePath = join(root, 'README.md');
  if (existsSync(readmePath)) {
    // Picture lines that show a sample screenshot, and any table they sit in (with its blank line).
    const readme = readFileSync(readmePath, 'utf8');
    const shows = (l) => SAMPLE.media.some((f) => l.includes(`](${f})`));
    const lines = readme.split('\n');
    const drop = new Set();
    lines.forEach((l, i) => {
      if (!shows(l)) return;
      let a = i;
      let b = i;
      if (l.trimStart().startsWith('|')) {
        while (a > 0 && lines[a - 1].trimStart().startsWith('|')) a -= 1;
        while (b < lines.length - 1 && lines[b + 1].trimStart().startsWith('|')) b += 1;
      }
      for (let k = a; k <= b; k++) drop.add(k);
      if (lines[b + 1]?.trim() === '') drop.add(b + 1);
    });
    const without = lines.filter((_, i) => !drop.has(i)).join('\n');
    if (without !== readme) {
      if (!dryRun) writeFileSync(readmePath, without);
      say('README.md: remove the sample screenshots');
    }
  }

  // Built files of the decks that went: out/<deck>.*, out/<deck>-*.*, shots/<deck>/.
  const names = SAMPLE.decks.filter((d) => gone.has(d.file)).map((d) => d.file.replace(/^decks\/|\.md$/g, ''));
  let built = 0;
  if (existsSync(join(root, 'out'))) {
    for (const f of readdirSync(join(root, 'out'))) {
      if (!names.some((n) => f.startsWith(`${n}.`) || f.startsWith(`${n}-`))) continue;
      if (!dryRun) rmSync(join(root, 'out', f), { recursive: true, force: true });
      built += 1;
    }
  }
  for (const n of names) {
    if (!existsSync(join(root, 'shots', n))) continue;
    if (!dryRun) rmSync(join(root, 'shots', n), { recursive: true, force: true });
    built += 1;
  }
  if (built) say(`out/, shots/: delete ${built} built file(s) and folder(s) of the sample decks`);
  return done;
}
