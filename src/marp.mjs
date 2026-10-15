// Runs the pinned Marp CLI (node_modules) with marp.config.mjs and the browser that
// checks/shared/find-tool.mjs finds (CHROME_PATH, then installed Chrome/Edge/Chromium, then
// Playwright's Chromium), so exports work the same on every computer.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join } from 'node:path';
import { requireTool } from '../checks/shared/find-tool.mjs';

const require = createRequire(import.meta.url);
export const MARP_CLI = require.resolve('@marp-team/marp-cli/marp-cli.js');
export const marpVersion = () => JSON.parse(readFileSync(require.resolve('@marp-team/marp-cli/package.json'), 'utf8')).version;

let browser = null;
export function browserPath(root = '.') {
  browser ??= requireTool('browser', { root });
  return browser.path;
}

export function runMarp(args, { root = '.', quiet = false } = {}) {
  const r = spawnSync(process.execPath, [MARP_CLI, '--config-file', 'marp.config.mjs', '--no-stdin', ...args], {
    cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CHROME_PATH: browserPath(root), NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (!quiet && out.trim()) process.stdout.write(out);
  return { ok: r.status === 0 && !/\[\s*ERROR\s*\]/.test(out), out };
}

export const deckName = (file) => basename(file, '.md');

// What each export format writes and the Marp flags for it.
//   pdf            out/<deck>.pdf             the slides, one page each (fonts embedded)
//   pptx           out/<deck>.pptx            PowerPoint, one picture per slide, with speaker notes
//   pptx-editable  out/<deck>-editable.pptx   PowerPoint with real text boxes (Marp's experimental
//                                             --pptx-editable; needs LibreOffice; no speaker notes)
//   html           out/<deck>.html            the presenter page (press p for the notes view)
export const FORMATS = {
  pdf: { suffix: '.pdf', flags: ['--pdf'] },
  pptx: { suffix: '.pptx', flags: ['--pptx'] },
  'pptx-editable': { suffix: '-editable.pptx', flags: ['--pptx', '--pptx-editable'] },
  html: { suffix: '.html', flags: [] },
};

export const LIBREOFFICE_HELP = 'The editable PowerPoint needs LibreOffice (free). Install it: Windows `winget install TheDocumentFoundation.LibreOffice`, macOS `brew install --cask libreoffice`, Linux `sudo apt install libreoffice-impress`. Marp finds it in the usual install folders or on PATH; if it is elsewhere, set SOFFICE_PATH to its soffice program. Or drop "editablePptx" from decks.json (docs/recipes/powerpoint.md).';

// Exports into out/ (PDF, PPTX and the presenter HTML by default).
export function exportDeck(file, formats = ['pdf', 'pptx', 'html'], root = '.') {
  mkdirSync(join(root, 'out'), { recursive: true });
  const results = [];
  for (const f of formats) {
    const { suffix, flags } = FORMATS[f];
    const target = `out/${deckName(file)}${suffix}`;
    const r = runMarp([file, ...flags, '--allow-local-files', '-o', target], { root });
    if (!r.ok && f === 'pptx-editable' && /soffice|LibreOffice/i.test(r.out)) console.log(LIBREOFFICE_HELP);
    results.push({ format: f, file: target, ...r });
  }
  return results;
}

// One PNG per slide: shots/<deck>/slide.001.png …
export function slideImages(file, root = '.') {
  const dir = `shots/${deckName(file)}`;
  mkdirSync(join(root, dir), { recursive: true });
  return { dir, ...runMarp([file, '--images', 'png', '--allow-local-files', '-o', `${dir}/slide.png`], { root }) };
}
