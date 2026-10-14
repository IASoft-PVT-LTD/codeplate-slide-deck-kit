# Add, remove, reorder or split slides

Use this for changes to an existing deck: "add a slide about pricing after the demo", "this slide is too busy", "swap slides 4 and 5", "add speaker notes".

## Steps

1. **Change the outline with the deck.** In `decks.json`, edit that deck's `outline` the same way (insert, delete, move or rename the title). The `decks` check compares them slide by slide, so a mismatch tells you exactly which slide drifted.

2. **Add a slide:** a blank line, `---`, a blank line, then the slide (title first). Pick a layout if it isn't a plain title-and-content slide (`<!-- _class: … -->`, see the top of `theme/brand.css`).

3. **Remove a slide:** delete from its `---` to the next `---`, keeping exactly one `---` between the slides around it. Remove pictures nobody uses any more from `assets/images/` and `assets.json`.

4. **Too busy?** If a slide is over `maxWords` or fails overflow: cut words first (a title that says the point needs fewer bullets), then move detail to the speaker notes, then split it into two slides (and two outline entries). Don't shrink text or raise `maxWords` to make it fit (rules 2 and 4).

5. **Speaker notes:** an HTML comment anywhere on the slide, `<!-- what to say -->`. Several comments are joined. Notes show in the presenter view (`out/<deck>.html`, press `p`), in the picture PPTX, and under each slide in the handout PDF (`handout.md`); a blank line inside a note starts a new paragraph there.

6. **Page numbers and footer:** hide them on one slide with `<!-- _paginate: false -->` and `<!-- _footer: "" -->`.

## Verify

- `npm run lint` passes (outline, words, titles), then `npm run check` ends with `CODEPLATE CHECKS: PASS`.
- `npm run preview -- <deck>`: in `contact.png` the slides are in the new order; open each changed slide.
