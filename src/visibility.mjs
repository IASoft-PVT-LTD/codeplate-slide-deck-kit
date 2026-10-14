// Does a logo (or any picture with transparent parts) vanish into the slide behind it?
// The inspect check draws each such picture onto a canvas over the colour behind it and
// hands the pixels to hiddenShare(). It runs in the browser (src/inspect.mjs injects its
// source into the page), so it must stay self-contained: no imports, no outside names.
//
// A pixel "vanishes" when the picture covers it (alpha >= 128) but, drawn over the backdrop,
// it is almost the backdrop's colour (contrast under 1.5:1). A vanished pixel still reads if
// visible parts of the picture surround it on all four sides (a cut-out inside a badge, like
// a leaf drawn in the slide colour inside a coloured circle), so only the others count.
//
//   hiddenShare(rgbaBytes, width, height, { r, g, b }) -> share of the covered pixels (0..1)
//                                                         that vanish; 0 for an opaque picture
export function hiddenShare(data, width, height, backdrop) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const backLum = lum(backdrop.r, backdrop.g, backdrop.b);
  const n = width * height;
  const covered = new Uint8Array(n);
  const visible = new Uint8Array(n);
  let coveredCount = 0;
  let transparent = false;
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3] / 255;
    if (a < 0.98) transparent = true;
    if (a < 0.5) continue;
    covered[i] = 1;
    coveredCount++;
    const mix = (k, bk) => data[i * 4 + k] * a + bk * (1 - a);
    const l = lum(mix(0, backdrop.r), mix(1, backdrop.g), mix(2, backdrop.b));
    const ratio = (Math.max(l, backLum) + 0.05) / (Math.min(l, backLum) + 0.05);
    if (ratio >= 1.5) visible[i] = 1;
  }
  // A picture with no transparency is a photo or a filled badge: its edges show by themselves.
  if (!transparent || !coveredCount) return 0;
  // For each pixel: is there a visible pixel somewhere to its left, right, above and below?
  const left = new Uint8Array(n);
  const right = new Uint8Array(n);
  const up = new Uint8Array(n);
  const down = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    let seen = 0;
    for (let x = 0; x < width; x++) {
      left[y * width + x] = seen;
      if (visible[y * width + x]) seen = 1;
    }
    seen = 0;
    for (let x = width - 1; x >= 0; x--) {
      right[y * width + x] = seen;
      if (visible[y * width + x]) seen = 1;
    }
  }
  for (let x = 0; x < width; x++) {
    let seen = 0;
    for (let y = 0; y < height; y++) {
      up[y * width + x] = seen;
      if (visible[y * width + x]) seen = 1;
    }
    seen = 0;
    for (let y = height - 1; y >= 0; y--) {
      down[y * width + x] = seen;
      if (visible[y * width + x]) seen = 1;
    }
  }
  let hidden = 0;
  for (let i = 0; i < n; i++) {
    if (!covered[i] || visible[i]) continue;
    if (!(left[i] && right[i] && up[i] && down[i])) hidden++;
  }
  return hidden / coveredCount;
}

// The share above which the check fails: more than this much of a picture disappears.
export const HIDDEN_LIMIT = 0.05;
