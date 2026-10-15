# Customization map

"I want to change X — which file?"

| I want to change… | Edit | Notes |
|---|---|---|
| Brand colours | `theme/brand.css`, the variables block at the top | `rebrand.md`; `npm run contrast` measures them; the slides' contrast is checked |
| A brand colour too light to read as text | `--accent-text` (big numbers, bullets) in the variables block; `--accent` stays for rules and bars | `rebrand.md`; `npm run contrast` suggests the shade |
| Fonts | `assets/fonts/`, `@font-face` rules and `--heading-font`/`--body-font` in `theme/brand.css`, `assets.json`, `CREDITS.md` | `change-fonts.md`; OFL only |
| The logo | `assets/logo.svg` (or theirs), the title slide of each deck, `assets.json` | `rebrand.md` |
| A logo that vanishes on the title slide | `--logo-backing` in the variables block (a badge behind logos on title, section and end slides) | `rebrand.md`; `inspect` checks it |
| Remove the Loamly and water-cycle samples | `npm run remove-sample -- --yes` (`src/sample.mjs`) | `remove-the-sample.md` |
| Text sizes, spacing, margins | `theme/brand.css` (`section`, `h1`…`h3`) | keep body text ≥ 18px; the footer strip is 48px |
| Footer text, page numbers | each deck's front matter (`footer:`, `paginate:`) | `<!-- _paginate: false -->` per slide |
| A slide's layout | `<!-- _class: title \| section \| stat \| quote \| columns \| end -->` on the slide | `edit-slides.md` |
| A new layout | `theme/brand.css` (a `section.<name>` block) | `new-layout.md` |
| The slides and their order | `decks/<deck>.md` **and** its `outline` in `decks.json` | `edit-slides.md` |
| A new deck | `decks/<name>.md`, an entry in `decks.json` | `new-deck.md` |
| Words allowed per slide, required notes | `decks.json` (`maxWords`, `requireNotes`, `maxTitleWords`) | raise only on purpose |
| What a chart's numbers measure, its source line | the chart block's `unit:` and `caption:` | `charts-and-numbers.md`; `decks` asks for the unit |
| Charts | a ```` ```chart ```` block in the deck; chart colours in `theme/brand.css` (`.chart …`) | `charts-and-numbers.md` |
| How charts are drawn | `src/charts.mjs` (with tests in `tests/charts.test.mjs`) | |
| Pictures | `assets/images/`, `assets.json`, the slide's `![…](…)` | `pictures.md` |
| Slide size (4:3), per deck | the deck's front matter `size: 4:3` **and** `"size": "4:3"` in `decks.json`; other sizes: an `@size` line in `theme/brand.css` | `slide-size.md` |
| A PDF with the speaker notes (handout), its paper | `npm run handout`; `"handoutPaper": "letter"` in `decks.json`; its layout in `src/handout.mjs` | `handout.md` |
| Editable PowerPoint | `"editablePptx": true` in `decks.json` (needs LibreOffice) | `powerpoint.md` |
| Export formats and options | `src/marp.mjs` (`FORMATS`, `exportDeck`), `marp.config.mjs` | `export-and-present.md` |
| What the checks measure | `src/deck.mjs`, `src/inspect.mjs`, `src/visibility.mjs`, `src/handout.mjs`, `checks/run.mjs` | never weaken a check to pass |
