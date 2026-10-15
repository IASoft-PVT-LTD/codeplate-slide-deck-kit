# Slide size: 16:9 or 4:3, per deck

Use this when a deck must be 4:3 (an older, square projector; some conference rooms) or back to 16:9. The size belongs to one deck: a 4:3 talk and a 16:9 web version can share the theme.

## Steps

1. **Set it in both places** for that deck only:
   - the deck's front matter: `size: 4:3` (Marp reads it; no line means 16:9);
   - the deck's entry in `decks.json`: `"size": "4:3"` (the agreed decision; the `decks` check fails when the two differ, so a later edit can't lose it).
   Never change the size in the theme: `theme/brand.css` defines both sizes (`@size 16:9 1280px 720px`, `@size 4:3 960px 720px`) for every deck.

2. **Check every slide.** A 4:3 slide is 960×720: the same height, a quarter narrower. Text wraps more, two columns get tight, split pictures (`bg right:40%`) get narrower. Charts scale to the width; the theme already sets larger chart text for 4:3 slides (`section[data-size="4:3"] .chart …`) so labels stay at 18px or more. Run `node checks/run.mjs --only=decks,inspect` and fix what it names by cutting words or splitting slides, never by shrinking text.

3. **Other sizes** (16:10, a square for social media): add an `@size <name> <w>px <h>px` line at the top of `theme/brand.css`, then use it as above. Keep the height 720px so the type sizes and the 18px minimum still mean the same.

4. **Record it** in `docs/project.md` (Rules: the size of each deck, and why).

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `decks` prints each deck's size (`decks/talk.md: 13 slides, 4:3, …`), `preview` checks every PNG is that size (960×720 for 4:3), `handout` keeps the slide shape.
- `npm run preview -- <deck>`: open `contact.png` and every slide with columns, a picture or a chart at full size.
