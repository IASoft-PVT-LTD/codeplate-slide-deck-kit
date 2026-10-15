// The project's commands (see package.json):
//   npm run build   [-- pitch …]   PDF, PPTX, presenter HTML and the handout into out/ (every deck,
//                                  or the ones named); plus out/<deck>-editable.pptx for decks with
//                                  "editablePptx": true in decks.json (or with --editable-pptx)
//   npm run handout [-- pitch …]   just the handout: out/<deck>-handout.pdf, slide + speaker notes per page
//   npm run preview [-- pitch …]   a PNG per slide into shots/<deck>/, to look at
//   npm run lint    [-- pitch …]   the deck rules from decks.json, without a browser (fast)
//   npm run watch   -- pitch       rebuild out/pitch.html whenever the deck or theme changes
//   npm run present -- pitch       serve the decks for presenting in a browser (http://localhost:8080)
//   npm run contrast [-- fg bg]    the theme's colour pairs (or one pair), with shades that pass
//   npm run remove-sample [-- --yes]  take the Loamly and water-cycle samples out (src/sample.mjs)
//   npm run browser                which browser the exports use
import { readFileSync, rmSync } from 'node:fs';
import { contactSheets } from './contact.mjs';
import { contrastRatio, parseColor, passingShade, themeReport } from './contrast.mjs';
import { loadDecksConfig } from './deck.mjs';
import { makeHandouts } from './handout.mjs';
import { lintAll } from './lint-all.mjs';
import { browserPath, deckName, exportDeck, runMarp, slideImages } from './marp.mjs';
import { removeSample } from './sample.mjs';

const [cmd, ...argv] = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const args = argv.filter((a) => !a.startsWith('--'));

function pick(cfg) {
  if (!args.length) return cfg.decks;
  return args.map((name) => {
    const d = cfg.decks.find((x) => deckName(x.file) === name || x.file === name);
    if (!d) {
      console.error(`No deck "${name}" in decks.json. Decks: ${cfg.decks.map((x) => deckName(x.file)).join(', ') || '(none yet)'}`);
      process.exit(1);
    }
    return d;
  });
}

async function handouts(decks) {
  let ok = true;
  for (const r of await makeHandouts(decks, { browserPath: browserPath() })) {
    for (const p of r.problems) console.log(`${r.deck} handout: ${p}`);
    ok = ok && !r.problems.length;
    console.log(`${r.file}  (${r.sheets} pages: each slide with its speaker notes)`);
  }
  return ok;
}

async function main() {
  switch (cmd) {
    case 'lint': {
      const { problems, summary } = lintAll(pick(loadDecksConfig()));
      for (const p of problems) console.log(p);
      for (const s of summary) console.log(s);
      return problems.length ? 1 : 0;
    }
    case 'build': {
      let ok = true;
      const decks = pick(loadDecksConfig());
      for (const d of decks) {
        const formats = ['pdf', 'pptx', 'html'];
        if (d.editablePptx || flags.has('--editable-pptx')) formats.push('pptx-editable');
        for (const r of exportDeck(d.file, formats)) ok = ok && r.ok;
      }
      return (await handouts(decks)) && ok ? 0 : 1;
    }
    case 'handout':
      return (await handouts(pick(loadDecksConfig()))) ? 0 : 1;
    case 'preview': {
      let ok = true;
      const dirs = [];
      for (const d of pick(loadDecksConfig())) {
        rmSync(`shots/${deckName(d.file)}`, { recursive: true, force: true });
        const r = slideImages(d.file);
        ok = ok && r.ok;
        if (r.ok) dirs.push(r.dir);
      }
      for (const sheet of await contactSheets(dirs, { browserPath: browserPath() })) console.log(`${sheet}  (and slide.001.png … next to it)`);
      if (ok) console.log('Open contact.png for the whole deck, then the slide PNGs you changed.');
      return ok ? 0 : 1;
    }
    case 'watch': {
      const [d] = pick(loadDecksConfig());
      if (args.length !== 1) {
        console.error('usage: npm run watch -- <deck>');
        return 2;
      }
      return runMarp([d.file, '--watch', '--allow-local-files', '-o', `out/${deckName(d.file)}.html`]).ok ? 0 : 1;
    }
    case 'present':
      return runMarp(['--server', '--allow-local-files', 'decks']).ok ? 0 : 1;
    case 'contrast': {
      if (args.length === 2) {
        const [fg, bg] = args.map(parseColor);
        if (!fg || !bg) {
          console.error('usage: npm run contrast -- "#e0a526" "#fbf8f3"   (text colour, then background; #rgb or #rrggbb)');
          return 2;
        }
        console.log(`${args[0]} on ${args[1]}: ${contrastRatio(fg, bg).toFixed(2)}:1`);
        for (const [need, what] of [[4.5, 'text under 24px'], [3, 'text from 24px (titles, big numbers), rules and chart bars']]) {
          const shade = passingShade(fg, bg, need);
          console.log(`  ${need}:1 for ${what}: ${contrastRatio(fg, bg) >= need ? 'passes' : shade ? `use ${shade.color} (${shade.ratio.toFixed(2)}:1), the nearest shade that passes` : 'no shade of it passes on this background'}`);
        }
        return 0;
      }
      if (args.length) {
        console.error('usage: npm run contrast  |  npm run contrast -- <text colour> <background>');
        return 2;
      }
      let ok = true;
      for (const r of themeReport(readFileSync('theme/brand.css', 'utf8'))) {
        const pair = `${r.fg} on ${r.bg}`.padEnd(30);
        if (r.ratio === null) {
          console.log(`${pair} not measured (${r.fgValue ?? 'not set'} on ${r.bgValue ?? 'not set'}: not a plain colour)   ${r.where}`);
          continue;
        }
        ok = ok && r.ok;
        console.log(`${pair} ${r.ratio.toFixed(2)}:1 ${r.ok ? 'ok  ' : 'FAIL'} (needs ${r.need}:1)   ${r.where}${r.fix ? `\n${''.padEnd(31)}→ set ${r.fg} to ${r.fix}, the nearest shade of ${r.fgValue} that passes` : ''}`);
      }
      console.log(ok ? 'Every pair passes. The inspect check still measures each slide.' : 'Fix the pairs marked FAIL in the variables block of theme/brand.css (docs/recipes/rebrand.md).');
      return ok ? 0 : 1;
    }
    case 'remove-sample': {
      const yes = flags.has('--yes');
      const done = removeSample('.', { dryRun: !yes });
      const todo = done.filter((s) => !s.startsWith('keep '));
      for (const s of done) console.log(s.startsWith('keep ') || yes ? s : `would ${s}`);
      if (!todo.length) {
        console.log('The sample is already gone.');
        return 0;
      }
      if (!yes) console.log('Run `npm run remove-sample -- --yes` to do it.');
      else console.log('Done. Next: rebrand.md (their logo, colours, fonts), then their first deck (new-deck.md).');
      return 0;
    }
    case 'browser':
      console.log(browserPath());
      return 0;
    default:
      console.error('usage: node src/cli.mjs <build|handout|preview|lint|watch|present|contrast|remove-sample|browser> [deck …]');
      return 2;
  }
}

try {
  process.exitCode = await main();
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
}

