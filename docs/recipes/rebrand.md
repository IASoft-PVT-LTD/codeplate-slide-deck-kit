# Rebrand: logo, colours and fonts

Use this when the user's brand replaces the sample's (Loamly's navy and coral), or their brand changes.

## Steps

1. **Colours.** In `theme/brand.css`, edit only the variables block at the top of `section { … }`:
   - `--brand`: titles, title/section/end slide backgrounds, chart bars. It must be dark enough for white text (`--on-brand`) on it and for titles on `--paper`.
   - `--accent`: the rule under titles, the quote bar, the highlighted chart bar (graphics: 3:1 against what's behind them).
   - `--accent-text`: the accent where it is **text** on `--paper`: big numbers on `stat` slides, bullets. It follows `--accent` until you set it.
   - `--ink`, `--muted` (captions, footer: needs 4.5:1 on `--paper`), `--paper` (slide background), `--on-brand`, `--on-brand-muted` (footer on brand slides).
   Only use the user's colours.

2. **Measure them:** `npm run contrast` lists every pair the theme makes (text on paper, text on the brand colour, the accent on both) with its ratio, and for a pair that fails, the nearest shade that passes. `npm run contrast -- "#e0a526" "#fbf8f3"` measures one colour on one background.

3. **A brand colour that fails** (a light yellow, mustard or orange is the usual case): keep the bright colour where it works and use a darker shade of it only as text:
   - keep `--accent` as the brand colour for rules and bars, if it reaches 3:1 there (on a dark `--brand` it often does);
   - set `--accent-text` to the shade `npm run contrast` suggests (e.g. mustard `#e0a526` on cream → `#b8871f` for big numbers, `#926b19` for small text);
   - if the accent fails as a graphic too, darken `--accent` the same way.
   Tell the user what you changed and why ("your mustard is too pale to read on the cream background, so numbers use a darker mustard; rules and bars keep the bright one"). The `inspect` check measures the text on every slide either way.

4. **Logo.** Put their file in `assets/` (SVG best; PNG at least 600 px wide), list it in `assets.json` (size: an SVG's viewBox, a PNG's pixels; `license: "user-owned"`, `credit`: their organisation) and `CREDITS.md`, and use it on the title slide: `![w:120 <Their name> logo](../assets/<file>)`. Remove `assets/logo.svg` and its entry when nothing uses it (`npm run remove-sample` does it while it is still the Loamly logo).

5. **A logo that disappears on the brand colour** (dark marks on a dark title slide): the `inspect` check fails with "N% of it is the colour behind it". Fix it in one of two ways:
   - **a badge:** set `--logo-backing` in the variables block (usually `var(--paper)`, or `#ffffff`); title, section and end slides then draw a rounded badge behind the logo, without moving it;
   - **a light version:** if the user has a logo made for dark backgrounds (often called "reversed" or "white"), use that file instead.
   Ask which they prefer; the badge works with any logo.

6. **Fonts.** If they have brand fonts, follow `change-fonts.md` (licence first). Otherwise keep Inter and DM Serif Display.

7. **Footer.** Each deck's front matter has `footer:`; set it to their name and the occasion, or remove it.

8. **Record it** in `docs/project.md` (Brand: the colours, which shade is used for text and why, the logo and any badge).

## Verify

- `npm run contrast` ends with "Every pair passes".
- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `inspect` passes contrast on every slide and finds no vanishing logo, `assets` matches the new logo.
- `npm run preview`, then open every deck's `contact.png`: title, section and end slides use the brand colour, the logo is clearly visible on them, the accent shows on rules and numbers, nothing is left in the old colours.
