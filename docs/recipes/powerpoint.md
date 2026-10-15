# PowerPoint: picture slides or editable text

Use this when the user wants a `.pptx`: to present from PowerPoint or Keynote, to send to someone who uses PowerPoint, or to edit the wording there.

## What each one gives

| | `out/<deck>.pptx` (default) | `out/<deck>-editable.pptx` (opt-in) |
|---|---|---|
| Looks | exactly like the slides (each slide is one picture) | close, but the layout can shift: PowerPoint re-flows the text |
| Text | **not editable**: it's part of the picture | real text boxes you can edit |
| Speaker notes | yes, in PowerPoint's notes | **no** |
| Fonts | built into the picture | PowerPoint needs Inter and DM Serif Display (or the deck's fonts) installed on that computer, or it substitutes others |
| Needs | nothing extra | **LibreOffice** installed (free); Marp's editable PPTX is marked experimental |

Say this to the user in plain words before choosing. Most people who say "PowerPoint" want to present or send it: the default is right. If they want to change wording, the reliable way is to change it here (in the Markdown) and rebuild; the editable file is for when someone else must edit it in PowerPoint.

## Steps

1. **The default** is always built: `npm run build -- <deck>` → `out/<deck>.pptx`, with the speaker notes.

2. **Editable text, once:** `npm run build -- <deck> --editable-pptx` also writes `out/<deck>-editable.pptx`.

3. **Editable text, always** (the user decided they need it): add `"editablePptx": true` to the deck in `decks.json`. `npm run build` then makes it every time, and the `export` check builds it and counts its slides, so it needs LibreOffice on every computer that runs the checks, and adds about 13 seconds per deck to them.

4. **LibreOffice.** If it is missing, the build says so. Install it: Windows `winget install TheDocumentFoundation.LibreOffice`; macOS `brew install --cask libreoffice`; Linux `sudo apt install libreoffice-impress`. Marp finds it in the usual install folders and on PATH; elsewhere, set `SOFFICE_PATH` to its `soffice` program. A harmless `[soffice] Could not find platform independent libraries` warning may show.

5. **Look before sending.** You can't open PowerPoint, so say what the checks can't see: open the editable file in PowerPoint (or LibreOffice Impress) and check line breaks, the chart (drawn as shapes) and the fonts; the slide PNGs in `shots/` show how it should look.

6. **Record it** in `docs/project.md` (Decks: which PPTX the user uses, and why).

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `export` lists `out/<deck>.pptx: N slides` (and `out/<deck>-editable.pptx: N slides` for decks with `"editablePptx": true`), N being the slide count.
- You told the user which file is which: picture slides with notes, or editable text without notes.
