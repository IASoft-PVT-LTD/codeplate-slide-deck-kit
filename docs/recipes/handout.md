# A handout: the slides with speaker notes

Use this when the user asks for "the PDF with my speaker notes", notes for the organisers, a printout to rehearse from, or a leave-behind with more detail than the slides.

## Steps

1. **Make it:** `npm run handout -- <deck>` writes `out/<deck>-handout.pdf`: one page per slide, the slide at the top (sharp, with the deck's fonts) and its speaker notes underneath in the deck's body font, with the deck title and "Slide 3 of 13" on every page. `npm run build` makes it too, for every deck, next to the PDF and PPTX.

2. **Paper:** A4 by default. For US Letter, add `"handoutPaper": "letter"` to the deck in `decks.json`.

3. **The notes are the content.** Every HTML comment on a slide that isn't a directive is a note (`edit-slides.md`). In the handout, a blank line inside a note starts a new paragraph; single line breaks are joined. A slide without notes says so on its page: if the handout is for other people, give every slide a note (`"requireNotes": true` makes the checks hold you to it).

4. **Too long for one page?** The checks fail when a slide's notes don't fit on its page (about 300 words on A4 under a 16:9 slide, a little less on Letter), and say which slide. Shorten those notes; the handout always has exactly one page per slide.

5. **Which file to send.** Tell the user plainly:
   - `out/<deck>-handout.pdf`: to read or print, with the notes (organisers, rehearsing, a leave-behind);
   - `out/<deck>.pdf`: the slides alone, to project or share;
   - `out/<deck>.html`: to present from this computer with the presenter view (press `p`).
   Marp's own `--pdf-notes` puts the notes into the slide PDF as sticky-note annotations instead: most viewers hide them and they don't print, so it isn't what people mean by a PDF with notes. Use it only if the user asks for annotations (`export-and-present.md`).

6. **Record it** in `docs/project.md` (Decks: who gets the handout, the paper size).

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`: the `handout` step prints `out/<deck>-handout.pdf: N pages, each slide with its speaker notes` with N equal to the slide count, and fails on notes that don't fit or a notes font not loaded from `assets/fonts/`.
- Open `out/<deck>-handout.html` (the page the PDF is printed from) in a browser, or the PDF: the first and last pages show the right slide above the right notes.
