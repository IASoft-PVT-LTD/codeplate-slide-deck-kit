# Export, share and present

Use this when the user asks for a PDF to send, a PowerPoint file, a PDF with their notes, 4:3 slides, or how to present.

## Steps

1. **The exports:** `npm run build` (or `npm run build -- <deck>`) writes, per deck:
   - `out/<deck>.pdf`: the slides, one page each, fonts embedded: the file to send or project;
   - `out/<deck>.pptx`: PowerPoint, one **picture** per slide (exact look, speaker notes included, text not editable);
   - `out/<deck>.html`: the presenter page (press `p` for notes, next slide and a timer);
   - `out/<deck>-handout.pdf`: each slide with its speaker notes underneath, one page per slide;
   - `out/<deck>-editable.pptx`, only for decks with `"editablePptx": true` (or with `--editable-pptx`).

2. **"PDF with my speaker notes"** almost always means the handout: `handout.md`. Marp's `--pdf-notes` (notes as PDF sticky-note annotations, often hidden and never printed) is there if they ask for exactly that: `npx marp --config-file marp.config.mjs decks/<deck>.md --pdf --pdf-notes --pdf-outlines --allow-local-files -o out/<deck>-annotated.pdf` (set `CHROME_PATH` to the path `npm run browser` prints). `--pdf-outlines` adds a bookmark per slide.

3. **PowerPoint:** picture slides by default; editable text is an opt-in that needs LibreOffice and drops the notes. Explain the difference and follow `powerpoint.md`.

4. **4:3 slides:** per deck, in its front matter and `decks.json`: `slide-size.md`.

5. **Presenting:** `npm run present` serves the decks at http://localhost:8080; open a deck, press `p` for the presenter view (notes, next slide, timer) and `f` for full screen. Or present the PDF from any PDF viewer. On another computer, present from the PDF: `out/<deck>.html` loads its fonts and pictures from this project folder.

6. **Sharing:** send the PDF (or the handout). It embeds the fonts, so it looks the same everywhere.

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS` (`export` confirms one PDF page and one PPTX slide per slide; `handout` one page per slide).
- Tell the user which file to use for what, by path.
