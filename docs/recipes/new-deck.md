# A new deck

Use this when the user wants a new presentation, from a topic, their notes, or a document.

## Steps

1. **Agree the outline.** From what they gave you, propose one title per slide (about one slide per minute of talk; a 10-minute pitch is 10 to 12 slides). Titles say the point ("Members are growing every month"), not the topic ("Growth"). Show the list and get a yes before writing slides.

2. **Register the deck** in `decks.json`: `file` (`decks/<short-name>.md`, lowercase and dashes), `about` (one line), `outline` (the agreed titles, in order), `maxWords` (40 for a pitch or talk, 30 for teaching or a big room, more only for a handout deck), `requireNotes` (true when someone presents it). Add `"size": "4:3"` only if the user chose 4:3 (`slide-size.md`), `"handoutPaper": "letter"` for US Letter handouts, `"editablePptx": true` only if they need editable PowerPoint (`powerpoint.md`).

3. **Write the deck.** Start from this front matter (`size: 4:3` only for a 4:3 deck; `title` also heads every handout page):

   ```
   ---
   theme: brand
   paginate: true
   footer: Their name · The occasion
   title: The talk's title
   ---
   ```

   Then one slide per outline title, separated by a blank line, `---`, a blank line:
   - first slide `<!-- _class: title -->` with `# Title`, a subtitle line and a presenter line; last slide `<!-- _class: end -->`;
   - a divider between parts: `<!-- _class: section -->`;
   - one number that matters: `<!-- _class: stat -->` (`# 1,240` then `## what it means`);
   - a quotation: `<!-- _class: quote -->` with `> "…"` and a source line;
   - two lists side by side: `<!-- _class: columns -->` (see `decks/pitch.md` slide 7);
   - a chart (with its `unit:`): `charts-and-numbers.md`; a picture: `pictures.md`.
   Put everything the presenter will *say* in a speaker note (`<!-- … -->`), and only what the audience must *see* on the slide.

4. **Look, then check:** `npm run lint`, `npm run preview -- <deck>`, open `shots/<deck>/contact.png` and every slide, then `npm run check`.

5. **Record it** in `docs/project.md` (Decks, Outlines).

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`; `decks` shows the new deck with its slide count and the most words on a slide.
- The contact sheet shows a varied rhythm (not ten bullet slides in a row) and the titles tell the story on their own.
- `out/<deck>.pdf` opens with one page per slide.
