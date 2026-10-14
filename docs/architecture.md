# Architecture

## The flow

```
decks/<deck>.md ─┐                         ┌─> out/<deck>.pdf, .pptx, .html     (Marp CLI + Chrome)
theme/brand.css ─┤                         ├─> out/<deck>-editable.pptx         (opt-in; Marp + LibreOffice)
assets/          ┼─> Marp Core + chart ────┼─> out/<deck>-handout.pdf           (src/handout.mjs + Chrome)
                 ┘   fence (one engine)    ├─> shots/<deck>/slide.NNN.png, contact.png
                                           └─> out/<deck>.inspect.html → measured in Chrome (checks)
decks.json ──────────> the deck rules (src/deck.mjs)
```

- **One engine.** `src/marp-engine.mjs` is Marp Core with one addition: a markdown-it rule that turns a ```` ```chart ```` fence into inline SVG (`src/charts.mjs`). `marp.config.mjs` gives Marp CLI the same engine, the theme folder and permission to read local files (fonts, pictures). The checks render with the same engine, so they measure what Marp exports.
- **The browser** is found by `checks/shared/find-tool.mjs` (`CHROME_PATH`, PATH, the usual install folders, Playwright's Chromium) and handed to Marp CLI as `CHROME_PATH` and to puppeteer-core as its executable. Nothing is downloaded.
- **Paths.** Decks live in `decks/`, inspection pages in `out/`; both are one folder below the project, so `../assets/…` in a deck and in the theme's `@font-face` rules works from either.

## A deck

Marp splits a deck into slides at lines of `---` (after the front matter). Each slide's layout is a class from the theme, set with `<!-- _class: name -->`. HTML comments that aren't directives are speaker notes. Pictures use Marp's syntax: `![bg right:40% alt text](path)` puts a picture on the right 40% of the slide; words after the keywords are the alt text.

`src/deck.mjs` reads a deck through Marp's own token stream and records, per slide: the title (first `#`/`##`), the layout, the number of body words, pictures (URL, alt, background or not; background pictures come from the slide's container token, because Marp lifts them out of the slide), charts (parsed, or the error), code blocks and speaker notes. `lintDeck` applies the rules from `decks.json`: the outline, words, notes, layouts, the settings it knows (a misspelt one is reported), the `size` agreed for the deck against its front matter (sizes come from the theme's `@size` lines), and a `unit:` on every chart.

**Size is per deck.** Marp reads `size:` from a deck's front matter and marks each slide `data-size="4:3"`; the theme uses that to enlarge chart text on the narrower slide. The checks expect each deck's PNGs at its own size.

## The checks in the browser

`src/inspect.mjs` writes `out/<deck>.inspect.html` (Marp's HTML and CSS for the deck) and opens it in Chrome at 1280×720. For each slide (an `svg > foreignObject > section`; with a split background, the `content` section) it walks every text node and measures:

- **overflow**: the text's box against the slide, minus a 48px footer strip at the bottom (footer and page numbers excepted);
- **size**: the computed font size (scaled for text inside a chart SVG) against 18px;
- **contrast**: the text colour against the nearest solid background (the slide's own, or the split background's), WCAG ratio 4.5:1, or 3:1 for text from 24px (or 18.66px bold); text over a background picture is skipped (look at the PNG);
- **fonts**: the first family of every text element must be among the fonts the page loaded from `@font-face` (`document.fonts`), so no system font slips in;
- pictures loaded (`<img>` complete), and the number of drawn charts equals the chart fences;
- **logos that vanish**: each picture with transparent parts is drawn onto a canvas over the colour behind it (the slide, or the `--logo-backing` badge) and `src/visibility.mjs` counts the covered pixels that are almost that colour (under 1.5:1) and not surrounded by visible parts of the picture; over 5% fails, naming `--logo-backing`.

## Exports

`npm run build` runs Marp CLI once per format (`FORMATS` in `src/marp.mjs`): PDF (`--pdf`), PPTX (`--pptx`, one picture per slide, with notes), the bespoke presenter HTML and, for decks with `"editablePptx": true`, `--pptx --pptx-editable` (Marp converts through LibreOffice, which it finds itself or via `SOFFICE_PATH`; text boxes, no notes). It then prints the handout: `src/handout.mjs` writes `out/<deck>-handout.html` from Marp's HTML and CSS (one sheet per slide: the slide's own `<svg>`, scaled, with its notes as paragraphs below, in the theme's body font), measures every sheet against the printed page height, and prints it with puppeteer-core on A4 or Letter. Vector slides, real text, one browser launch for all decks. `npm run preview` runs `--images png` into `shots/<deck>/` and builds `contact.png` from those PNGs with puppeteer-core (`src/contact.mjs`). The checks count PDF pages (inflating Chrome's compressed object streams, `src/pdf.mjs`) and PPTX slides (zip entries `ppt/slides/slideN.xml`), for the handout as well.

## Commands that change the project

- `npm run contrast` (`src/contrast.mjs`) reads the variables block of `theme/brand.css`, resolves `var(--x)`, and measures the pairs the layouts use; for a failing pair it mixes the colour towards black (or white on a dark background) until it passes, which keeps its hue.
- `npm run remove-sample` (`src/sample.mjs`) lists, then with `--yes` removes, the files the template shipped as the sample, only while they still contain their marker text ("Loamly", the pictures' own comments), plus their `decks.json`, `assets.json`, `CREDITS.md`, `codeplate.json` and `README.md` entries and built files.
