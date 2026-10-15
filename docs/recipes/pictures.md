# Pictures: photos, screenshots, diagrams

Use this when a slide needs an image: the user's product screenshot, a team photo, a diagram.

## Steps

1. **Only pictures the user owns or made, or CC0** (rule 5). Ask where each comes from. Never link a picture from the web and never use one found by search without a CC0 licence you can link to.

2. **Prepare the file.** Put it in `assets/images/` with a short lowercase name (`team-photo.jpg`). Keep files reasonable: photos about 1600 px on the long side as JPEG (under 1 MB), screenshots as PNG, diagrams as SVG without text in them (an SVG used as a picture can't use the deck's fonts: put the words on the slide instead).

3. **List it** in `assets.json`: `path`, `kind: "image"`, `width`/`height` for PNG and SVG (pixels, or the SVG's viewBox; the `assets` check compares them), `use` (which slide), `license` and `credit` (files the user gave you: `"license": "user-owned"` with their name or organisation; CC0: `CC0-1.0`, the artist, and `source`, a link; `CodePlate-original` only for the files that came with the kit, credited "CodePlate"). Add a line to `CREDITS.md`.

4. **Place it** with Marp's picture syntax; words after the keywords are the alt text (required):
   - beside the text, on the right 40%: `![bg right:40% Our team at the 2026 launch](../assets/images/team-photo.jpg)` (or `left`, other percentages);
   - filling the slide behind the title: `![bg Our café at opening time](…)`. Text over a photo can't be checked for contrast: look at the PNG, and darken with `![bg brightness:0.5 …](…)` if needed;
   - fitted without cropping: `![bg contain …](…)`;
   - inline at a size: `![w:600 The booking screen](…)`.
   A split background is cropped to fill its area: for `right:40%` on a 16:9 slide that's 512×720, so tall pictures fit best.

5. **Alt text** says what the picture shows and why it's there ("The booking screen: pick a tool, a day and a pick-up time"), not "image".

## Verify

- `npm run check` ends with `CODEPLATE CHECKS: PASS`: `decks` finds the file under `assets/` with alt text, `assets` matches `assets.json`, `inspect` confirms it loaded and nothing overflows.
- `npm run preview -- <deck>`: the crop keeps what matters (faces, the important part of a screenshot), and any text over a picture is readable.
