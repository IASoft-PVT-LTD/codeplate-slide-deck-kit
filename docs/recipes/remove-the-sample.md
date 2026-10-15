# Remove the sample

Use this once, when the user's own decks replace the Loamly pitch and the water-cycle lesson: usually right after the interview, before or after the rebrand.

## Steps

1. **See what it would do:**

   ```
   npm run remove-sample
   ```

   It lists everything, without changing anything:
   - the sample decks `decks/pitch.md` and `decks/lesson.md`, and their entries in `decks.json`;
   - the sample logo `assets/logo.svg` and the pictures `assets/images/street.svg`, `tool-shelf.svg`, `water-cycle.svg`, with their entries in `assets.json` and their lines in `CREDITS.md` (and the line saying Loamly is made up);
   - the screenshots in `docs/media/`, the manifest's `media` list in `codeplate.json`, and the screenshot lines in `README.md`;
   - the sample decks' built files in `out/` and `shots/`.

   A sample file that has changed since the template shipped is **kept** and listed as `keep …`: a deck rewritten into the user's own, or their logo saved over `assets/logo.svg`. Delete it yourself only if it is still the sample. Decks, pictures and lines the user added are never touched.

2. **Do it:**

   ```
   npm run remove-sample -- --yes
   ```

   Running it again says "The sample is already gone."

3. **What it leaves for you:**
   - `theme/brand.css` still has the sample's navy and coral: `rebrand.md`.
   - The fonts (Inter, DM Serif Display) stay; they're the theme's, not the sample's (`change-fonts.md` to replace them).
   - `README.md` still describes the template: rewrite it for the user once their decks exist, keeping the credit line (AGENTS.md).
   - With no decks yet, `npm run check` passes and says "No decks yet"; add the first one with `new-deck.md`.

4. **Record it** in `docs/project.md` (Log: "removed the sample").

## Verify

- `npm run remove-sample` says "The sample is already gone."
- `npm run check` ends with `CODEPLATE CHECKS: PASS` (`assets` matches the smaller `assets.json`; `decks` lists only the user's decks).
- `grep -ri loamly decks decks.json assets.json CREDITS.md README.md` finds nothing.
