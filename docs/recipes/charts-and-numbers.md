# Charts, big numbers and tables

Use this when a slide shows data: growth, a comparison, a share, one number that matters.

## Steps

1. **Get the numbers from the user**, with where they come from (rule 6). Note them in `docs/project.md` (Numbers and sources).

2. **Pick the form:**
   - **one number** → a `stat` slide: `<!-- _class: stat -->`, `# 1,240`, `## members across our first three streets`, a source line;
   - **change over time** → a line chart (or bars for few points);
   - **compare a few things** → bars; long labels (product names, countries) → horizontal bars;
   - **exact figures to read** → a Markdown table (at most about 5 rows on a slide).

3. **Write the chart** as a fenced block on the slide:

   ````
   ```chart
   type: bar          # bar, hbar or line
   unit: members      # what the numbers measure: a word ("kg", "loaves"), "%", "£", "$", "€", or "none"
   caption: Members at the end of each month, Bristol pilot   # optional: a line under the chart
   highlight: Sep     # optional: the label drawn in the accent colour
   height: 420        # optional: 120 to 560 px
   data:
   Apr: 90
   May: 210
   Sep: 1240
   ```
   ````

   Values are plain numbers (`1240`, not `1,240` or `£1.2k`); labels can contain spaces and colons (the number follows the last colon); at most 16 points. Bars need values of 0 or more; lines can go negative.

4. **Say what the numbers measure.** Every chart needs a `unit:` (the `decks` check asks for it): it is printed with every value ("612 kg", "410 loaves", "45%", "£400") and in the chart's description for screen readers. Read it off the user's data, not the title: a waste file may be in kilos while the talk is about loaves, and the slide must not mix them up. Ask when the file doesn't say. `unit: none` only for numbers that truly have none (a score, an index). Put the source and the period in `caption:` (or a `<p class="caption">` under the chart when it needs a link or emphasis).

5. **Leave room.** A chart is the slide's width; with a title it fits up to `height: 420`. With a caption, or text above or below it, lower the height (300 to 360) until `inspect` passes. On a 4:3 deck the chart is narrower; the theme enlarges its text for 4:3 (`slide-size.md`).

6. **Something the chart can't draw** (stacked bars, pie, two series)? Ask whether a simpler form tells the story (usually it does). If not, extend `src/charts.mjs` with a new `type`, its CSS classes in the theme's `.chart` block, and tests in `tests/charts.test.mjs`.

## Verify

- `npm test` passes (and your new chart tests, if you extended `src/charts.mjs`).
- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `decks` parses every chart and finds its `unit:`, `inspect` counts the drawn charts and checks their labels are at least 18px and inside the slide.
- `npm run preview -- <deck>`: the chart slide is readable at a glance, the highlight is on the right label, the numbers match what the user gave you.
