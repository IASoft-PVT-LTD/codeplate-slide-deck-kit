# Slide Deck Kit: agent brief

You are making the user's presentations, starting from this template. This brief tells you how the project works, what to ask before changing anything, the rules that keep the decks readable, and how to check every change. Read it all once. Then follow **Interview** before your first edit.

## Start here

This folder turns Markdown into branded slide decks with **Marp** (Marp CLI 4.5, pinned in `package.json`). It ships two sample decks that share one theme:

- **`decks/pitch.md`**: a 10-slide seed pitch for **Loamly** (a made-up tool-library startup): title, problem, solution with a picture, how it works, a big number, a growth chart, two-column business model, a quote, the ask as a table, thank-you.
- **`decks/lesson.md`**: an 8-slide Year 4 science lesson on the water cycle: learning goals, a section divider, a picture slide, a line chart, a two-column quiz.
- **One theme** (`theme/brand.css`): brand colours and fonts in one variables block, and layouts you pick per slide (`title`, `section`, `stat`, `quote`, `columns`, `end`). Fonts ship in `assets/fonts/` (Inter and DM Serif Display, OFL).
- **Charts from text**: a ```` ```chart ```` block with a `unit:` and `label: number` lines draws a bar, horizontal-bar or line chart in the theme's colours (`src/charts.mjs`).
- **`decks.json`** lists every deck with its rules: the **outline** agreed with the user (the slide titles in order), the most words allowed on a slide, whether every slide needs speaker notes, and its size (16:9 or 4:3, per deck).
- **Exports**: PDF, PowerPoint (picture slides with notes; editable text as an opt-in), the presenter page, and a **handout** (each slide with its speaker notes, A4 or Letter).

```
npm run preview                  a PNG per slide + a contact sheet → shots/<deck>/
npm run preview -- pitch         just one deck
npm run build                    PDF, PPTX, presenter HTML and handout → out/<deck>.pdf …
npm run handout -- pitch         just the handout: out/pitch-handout.pdf (slide + notes per page)
npm run lint                     the deck rules, without a browser (instant)
npm run contrast                 the theme's colour pairs, with a passing shade for any that fail
npm run remove-sample            list what removing the Loamly and water-cycle samples does (-- --yes to do it)
npm run present                  serve the decks to present from a browser (localhost:8080)
npm run watch -- pitch           rebuild out/pitch.html on every save
```

**Verify any change** with one command from this folder. It must end with `CODEPLATE CHECKS: PASS`:

```
npm ci && npm run check
```

(`npm ci` only the first time and after `package.json` changes.) It needs **Node 22 or newer** and a **Chromium-based browser**: Chrome, Edge or Chromium. Marp prints the slides with it, and the checks measure every slide in it. Find it before anything else:

1. **`npm run browser`** prints the browser the project will use, or how to get one. It looks at the `CHROME_PATH` environment variable, then PATH, then the usual install folders (Chrome and Edge on Windows and macOS, `/opt/google/chrome`, Snap's Chromium), then Playwright's Chromium.
2. **None found?** Windows has Edge already (if it was removed, install Chrome). macOS: install Google Chrome. Linux: `sudo apt install chromium-browser` (or Chrome). Any OS: `npx playwright install chromium` downloads one the project finds by itself.
3. **On Linux, "No usable sandbox"** when exporting: set `CHROME_NO_SANDBOX=1` for the command (some distributions block Chrome's sandbox for normal users).

Write the browser path in `docs/project.md` once it works.

**Marp's Markdown has a few rules of its own** (slides split on `---` lines, directives in HTML comments, picture keywords like `bg right:40%`). The Marp documentation for the pinned version is at https://marpit.marp.app/ (slides, directives, image syntax) and https://github.com/marp-team/marp-cli (export options). **Common pitfalls** lists the usual mistakes.

## Interview

Before you change anything, read `docs/project.md`.

- **If it still contains `<!-- codeplate:project-stub -->`, interview the user first.** Ask only what you need, in one short message, and suggest defaults so they can say "yes":
  1. **The talk.** What is it for (a pitch, a lesson, a conference talk, a sales deck, a report), who is in the audience, and how long do they have? Will they present it live, send it as a PDF, or both?
  2. **The story.** The main points in order, or the document/notes to build it from. Suggest an outline (one title per slide, about one slide per minute for a talk) and get a yes before writing slides.
  3. **The brand.** Their name and logo (SVG best), colours (one main, one accent) and fonts if they have brand fonts (they must be OFL or similar to ship: see `change-fonts.md`). If they have none, keep the theme and change the colours. A light accent (yellow, mustard) is too pale for text on the light slides, and a logo with marks in the brand colour vanishes on the brand-coloured title slide: both have a fix in `rebrand.md`, so mention it rather than ask.
  4. **Pictures and numbers.** Photos, screenshots or diagrams they own, and any numbers to chart (with where they come from).
  5. **Format.** 16:9 (default) or 4:3, for each deck? Speaker notes on every slide? How will it be delivered: presenting from the browser or a PDF, a PDF to send, a **handout** with the notes (A4 or US Letter), PowerPoint? For PowerPoint, say what each file gives: picture slides (exact look, notes included, text not editable) or editable text (needs LibreOffice, can shift, no notes) (`powerpoint.md`).

  Then replace the stub in `docs/project.md` with their answers as short decisions, and remove the marker.
- **Otherwise, the project has started.** `docs/project.md` holds the decisions made so far. Follow them, and add new decisions as the user makes them.

Work in small steps: agree the outline, put it in `decks.json`, write the slides, `npm run check`, open the contact sheet and the slides you changed (**Seeing your work**), then the next change. Usual first steps: `npm run remove-sample -- --yes` (`remove-the-sample.md`), the brand (`rebrand.md`), then a new deck from the outline (`new-deck.md`).

`README.md` and `codeplate.json` describe the template. Once the user's own decks exist, rewrite `README.md` for them (how to build and present their decks), and leave `codeplate.json` and `LICENSE.md` in place. `LICENSE.md` (the CodePlate Free License) asks for the credit "Built with CodePlate (codeplate.io)" in the documentation of the project if they share or publish it: **keep that line in `README.md`**; the `credit` check looks for it. The decks they present or send are their own work and don't need it.

## Architecture

Every deck goes through the same engine: `decks/<name>.md` → Marp Core with the chart fence (`src/marp-engine.mjs`) and `theme/brand.css` → HTML slides → Chrome → PDF, PPTX, PNG. The checks read decks with the same engine, so what they measure is what Marp exports. See `docs/architecture.md`.

| Path | What lives there |
|---|---|
| `decks/*.md` | **The decks.** Front matter (`theme: brand`, `paginate`, `footer`, `title`), then slides separated by `---` lines. Every `.md` here must be listed in `decks.json`. |
| `decks.json` | Each deck's `file`, `about`, **`outline`** (slide titles in order), `maxWords` (body words per slide), `requireNotes`. Optional: `size` (`"4:3"`; must match the front matter), `handoutPaper` (`"a4"` or `"letter"`), `editablePptx` (`true` builds `out/<deck>-editable.pptx`), `maxTitleWords`, `theme`. Misspelt settings fail the checks. |
| `theme/brand.css` | The Marp theme `brand`: the **brand variables** at the top (colours, including `--accent-text` and `--logo-backing`; fonts), the two sizes (`@size 16:9`, `@size 4:3`), base type sizes, the layouts. Fonts are `@font-face` rules pointing at `../assets/fonts/`. |
| `assets/` | `fonts/` (OFL fonts with their licence files), `logo.svg`, `images/` (pictures used by slides). Every file is listed in `assets.json`. |
| `src/charts.mjs` | The ```` ```chart ```` format: parsing and the SVG it draws. |
| `src/marp-engine.mjs`, `marp.config.mjs` | Marp with the chart fence; the CLI's settings (theme folder, local files, HTML allowed). |
| `src/deck.mjs`, `src/lint-all.mjs` | Reading a deck the way Marp does (slides, titles, words, pictures, charts, notes) and the deck rules. |
| `src/inspect.mjs`, `src/visibility.mjs` | Measures every slide in the browser: overflow, text size, contrast, fonts, pictures, charts, logos that vanish into the slide. |
| `src/handout.mjs` | The handout PDF: one page per slide with its speaker notes. |
| `src/contrast.mjs`, `src/sample.mjs` | `npm run contrast` (colour pairs, passing shades); `npm run remove-sample`. |
| `src/marp.mjs`, `src/contact.mjs`, `src/cli.mjs`, `src/pdf.mjs` | Running Marp CLI with the found browser and the export formats; contact sheets; the npm commands; counting PDF pages. |
| `checks/run.mjs`, `checks/shared/` | The checks; `shared/` is CodePlate's tool finder, check runner and `assets.json` check (don't edit it). |
| `tests/` | `node --test` unit tests for charts, the deck rules, contrast, logo visibility, the handout page and removing the sample. They build small projects in a temp folder, so they keep passing once the samples are gone. |

## Rules

1. **Agree the outline first, and keep `decks.json` in step.** A deck's `outline` is the list of slide titles the user agreed to, in order. Adding, removing, renaming or moving a slide means changing the outline too; the checks fail when they differ. This is how the user's structure survives your edits.
2. **One idea per slide, few words.** Stay under the deck's `maxWords` (40 for a pitch, 30 for a lesson). Detail goes in speaker notes (an HTML comment on the slide), a second slide, or a handout, never in smaller text. Every slide has a title (`#` or `##`).
3. **Look and feel live in the theme.** Colours, fonts and sizes are changed in `theme/brand.css` (the variables block first), never with inline `style="…"` in a deck, so every slide and every deck stays consistent. A one-off look that repeats is a new layout class in the theme.
4. **Nothing runs off a slide, nothing is too small, everything is readable.** The checks fail on text or pictures past the slide edge or in the footer strip, text under 18px, and contrast below WCAG AA (4.5:1, or 3:1 from 24px). When something doesn't fit, cut words or split the slide; don't shrink the type or use Marp's `<!-- fit -->` to squeeze it.
5. **Pictures are files in `assets/images/`, with alt text.** Never link pictures from the web (the deck must work offline, and the licence must be known). Every picture is listed in `assets.json`; only use pictures the user owns or made, or CC0 ones. Write alt text after Marp's keywords: `![bg right:40% A shelf of shared tools](../assets/images/tool-shelf.svg)`.
6. **Numbers come from the user, with their unit.** Charts and big numbers use figures the user gave you, with a source line (`caption:`) when they're not the user's own. Every chart says what it measures (`unit: kg`, `unit: loaves`): read it from the data, and ask when the file doesn't say. Never invent data to fill a chart.
7. **Fonts are files in `assets/fonts/` with their licence.** The checks fail if a slide uses a font that isn't loaded from there (a system font would look different on another computer, and in the PDF). OFL fonts only, listed in `assets.json` and `CREDITS.md`.
8. **Use what ships.** Marp CLI and puppeteer-core are pinned exactly in `package.json` with `package-lock.json`; add packages only with a clear need, pinned (`npm install --save-exact`), with permissive licences. No Marp plugins from the web at build time.
9. **Never weaken a check to make it pass.** Raising `maxWords` because the slide is crowded, or deleting a check, isn't a fix. If the user deliberately wants a dense slide (a reference table for a handout), raise the limit for that deck in `decks.json` and say so.

## Verify

After every change:

1. **Run the full `npm run check`, every time.** The last line must be `CODEPLATE CHECKS: PASS`. It runs these steps (about 20 seconds, plus about 13 per deck with `"editablePptx": true`) and lists each one's result and time:
   - `tools`: the browser, and the pinned Marp CLI installed
   - `assets`: `assets.json` matches `assets/` (fonts and licence files, pictures)
   - `decks`: every deck against `decks.json`: outline, titles, words per slide, pictures (exist, under `assets/`, alt text), charts parse and have a `unit:`, notes, layouts, theme, the size in the front matter matches `decks.json`, no unknown settings; every deck in `decks/` is listed
   - `unit`: `node --test tests/`
   - `inspect`: every slide in the browser: overflow, text ≥ 18px, contrast, fonts loaded from `assets/fonts/`, pictures loaded, charts drawn, no logo vanishing into the colour behind it
   - `export`: `out/<deck>.pdf` and `.pptx` (and `-editable.pptx` when opted in) with one page per slide
   - `handout`: `out/<deck>-handout.pdf` with one page per slide, every slide's notes fitting on its page
   - `preview`: a PNG per slide at the deck's size and `contact.png` per deck in `shots/<deck>/`
   - `credit`, then `budget` (under the 90 seconds in `codeplate.json`)

   While you work, `npm run lint` (instant) and `node checks/run.mjs --only=decks,inspect` (a few seconds) are fine. Then the full check before you report. A failing step repeats the end of its output above the summary.
2. **Look at the slides.** Open `shots/<deck>/contact.png` to see the whole deck, then the slide PNGs you changed (**Seeing your work**).
3. **Tell the user** what changed, show the contact sheet or the slides, and give the file paths with what each is for (`out/<deck>.pdf` to send or project, `out/<deck>-handout.pdf` with the notes, `out/<deck>.pptx` picture slides). Say what the checks can't see: whether the story works for their audience, how it looks on their projector, and how an editable PPTX looks in PowerPoint (see **Common pitfalls**).

## Recipes

Step-by-step guides for common requests. Follow the matching recipe when one fits; each ends with its own verification.

- `docs/recipes/rebrand.md`: their logo, colours and fonts in the theme; checking contrast.
- `docs/recipes/new-deck.md`: a new deck from an agreed outline (or from their notes or a document).
- `docs/recipes/edit-slides.md`: add, remove, reorder or split slides; layouts; speaker notes.
- `docs/recipes/charts-and-numbers.md`: bar, horizontal-bar and line charts; big numbers; tables; sources.
- `docs/recipes/pictures.md`: their photos and screenshots, background and split layouts, alt text, sizes.
- `docs/recipes/new-layout.md`: a new slide layout in the theme (timeline, team, three columns…).
- `docs/recipes/change-fonts.md`: their brand fonts (licence first), or another OFL pair.
- `docs/recipes/export-and-present.md`: which file is which, presenting, sharing.
- `docs/recipes/handout.md`: "a PDF with my speaker notes": the handout, its paper, notes that fit.
- `docs/recipes/powerpoint.md`: picture PPTX or editable text (LibreOffice), and what to tell the user.
- `docs/recipes/slide-size.md`: 4:3 (or another size) for one deck.
- `docs/recipes/remove-the-sample.md`: take the Loamly and water-cycle samples out in one command.

`docs/customization-map.md` answers "I want to change X — which file?" for everything else.

## Seeing your work

You can't watch the talk, but you can look at every slide:

```
npm run preview                  → shots/<deck>/contact.png (all slides) and slide.001.png …
npm run preview -- lesson        just that deck
```

- **Open `contact.png` first**: the whole deck in a grid, numbered. Check the order and rhythm (not three text slides in a row), that layouts are consistent, and that no slide looks unlike the rest.
- **Then open each slide you changed** at full size (1280×720): words, wrapping, alignment, picture crops, chart labels, footer and page number.
- `npm run check` leaves the same images in `shots/`. The PDF and PPTX are in `out/`; they're made from the same HTML, so they match the PNGs.
- `out/<deck>.inspect.html` is the page the checks measure; `out/<deck>.html` is the presenter version (press `p` in a browser for the presenter view with speaker notes); `out/<deck>-handout.html` is the page the handout PDF is printed from.

## Common pitfalls

- **`---` under a line of text** makes that line a heading (Markdown's setext heading) instead of a new slide. Always leave a blank line before `---`. The `decks` check catches it.
- **Directives:** `<!-- _class: stat -->` (with the underscore) applies to this slide only; `<!-- class: stat -->` applies to this slide and every slide after it. Use the underscore form. `<!-- _paginate: false -->` hides one slide's page number.
- **Speaker notes** are any HTML comment that isn't a directive: `<!-- Say the 13-minute figure, then move on. -->`.
- **Markdown inside HTML** (the `columns` layout): leave a blank line after `<div>` and before `</div>`, or the Markdown inside isn't read.
- **Picture paths** are relative to the deck file: `../assets/images/x.svg` from `decks/`. Spaces in file names need `%20`; avoid them.
- **Background keywords:** `![bg](…)` fills the slide (put text on it only with enough contrast; the check can't measure text over a photo, so look at the PNG), `![bg right:40%](…)` splits it, `![bg contain](…)` fits without cropping, `![w:300](…)` sizes an inline picture.
- **PPTX is pictures of slides** by default: it opens in PowerPoint and Keynote, with the notes, but the text isn't editable. Editable text is an opt-in (`"editablePptx": true`) that needs LibreOffice and has no notes (`powerpoint.md`). Say which one the user has.
- **"PDF with my notes"** means the handout (`npm run handout`), not Marp's `--pdf-notes`, which only adds sticky-note annotations most viewers hide.
- **4:3 is per deck**: `size: 4:3` in that deck's front matter and `"size": "4:3"` in its `decks.json` entry, never in the theme.
- **Fonts in SVG pictures:** an SVG used as a picture can't see the deck's fonts; text inside it falls back to a system font. Keep text on the slide (or in a ```` ```chart ````), and pictures wordless, or convert the SVG's text to outlines.
- **"No usable sandbox"** on Linux: run with `CHROME_NO_SANDBOX=1`.
- **Windows paths in Git Bash:** keep the quotes in `npm test`'s glob, as the npm script does.
