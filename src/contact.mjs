// A contact sheet: every slide of a deck as a numbered thumbnail on one image,
// shots/<deck>/contact.png, so the whole deck can be reviewed at a glance (order, rhythm,
// a slide that looks different from the rest). Built from the slide PNGs Marp wrote.
import { readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const THUMB = 360; // px wide; the height follows the slide (16:9 or 4:3)

export async function contactSheets(dirs, { browserPath, root = '.' }) {
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--allow-file-access-from-files', '--no-sandbox', '--disable-gpu'] });
  const written = [];
  try {
    const page = await browser.newPage();
    for (const dir of dirs) {
      const full = resolve(root, dir);
      const slides = readdirSync(full).filter((f) => /^slide\.\d+\.png$/.test(f)).sort();
      const cols = Math.min(4, slides.length);
      const html = `<!doctype html><meta charset="utf-8"><style>
body { margin: 0; padding: 16px; background: #2b2f36; font: 14px sans-serif; color: #e8e8e8; display: inline-block; }
.grid { display: grid; grid-template-columns: repeat(${cols}, ${THUMB}px); gap: 16px; }
figure { margin: 0; } img { width: ${THUMB}px; height: auto; display: block; outline: 1px solid #555; }
figcaption { padding-top: 4px; }</style>
<div class="grid">${slides.map((f, i) => `<figure><img src="${f}"><figcaption>${i + 1}</figcaption></figure>`).join('')}</div>`;
      const file = join(full, 'contact.html');
      writeFileSync(file, html);
      await page.setViewport({ width: cols * (THUMB + 16) + 16, height: 400 });
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      const out = join(dir, 'contact.png');
      await page.screenshot({ path: join(root, out), fullPage: true });
      written.push(out);
    }
  } finally {
    await browser.close();
  }
  return written;
}
