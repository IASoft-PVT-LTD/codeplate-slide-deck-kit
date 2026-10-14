# A new slide layout

Use this when several slides need a look the theme doesn't have: a timeline, a team grid, three columns, a full-bleed photo with a caption, an agenda.

## Steps

1. **Check the existing layouts first** (top of `theme/brand.css`): `columns` plus a picture, or a `stat` slide, often does the job. A layout is worth adding when it repeats.

2. **Write it in `theme/brand.css`** as `section.<name> { … }` plus rules for its children, after the existing layouts. Use only the variables (`var(--brand)`, `var(--accent)`, `var(--muted)`, `var(--heading-font)` …) so a rebrand still applies. Keep body text at 22px or more and leave the bottom 48px free (footer strip).

3. **Structure inside a layout:** Markdown inside HTML needs blank lines: 
   ```
   <div class="cols3">

   ### Plan
   …

   </div>
   ```
   Prefer CSS on plain Markdown (e.g. `section.agenda ol { columns: 2 }`) over extra HTML when you can.

4. **Document it** in the layout list at the top of `theme/brand.css` (name and what it's for), so the next session can find it. The `decks` check accepts any `section.<name>` class it finds in the theme.

5. **Use it** on a slide with `<!-- _class: <name> -->`.

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `decks` knows the new layout, `inspect` finds no overflow, small text or low contrast on slides using it.
- `npm run preview`: open the slides with the new layout at full size, and the contact sheets to see it sits well with the others.
