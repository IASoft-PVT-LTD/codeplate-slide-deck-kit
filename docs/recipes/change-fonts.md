# Change the fonts

Use this when the user has brand fonts, or wants a different look (another serif for headings, a friendlier sans for a classroom).

## Steps

1. **Licence first.** The font files ship in the project and are embedded in every PDF, so the licence must allow both. The SIL Open Font License (OFL) does, as do most Google Fonts (check each font's page). Fonts bought from a foundry often need an embedding licence and forbid sharing the files: ask the user what their licence says; if they can't say, pick an OFL font close to their brand and tell them.

2. **Get static files**: `.ttf` or `.otf`, one per weight and style you use (body: regular, italic, a semibold or bold; headings: one weight is often enough). Put them in `assets/fonts/` with the licence text (`OFL-<Family>.txt`).

3. **Declare them** in `theme/brand.css`: one `@font-face` per file (`font-family` is the name you'll use, `font-weight`, `font-style`, `src: url('../assets/fonts/<file>')`), then set `--heading-font` and/or `--body-font` in the variables block. Remove the `@font-face` rules and files of fonts no longer used.

4. **List them** in `assets.json` (`kind: "font"`, `license: "OFL-1.1"`, `licenseFile`, `credit`, `source`) and `CREDITS.md`.

5. **Check the fit.** Wider fonts wrap titles and can push slides over the edge; `inspect` will say which. Shorten titles before shrinking sizes.

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `assets` checks the font entries and licence files; `inspect` lists the fonts in use and fails if any isn't loaded from `assets/fonts/`.
- `npm run preview`: headings and body show the new fonts on every layout, including chart labels and tables.
