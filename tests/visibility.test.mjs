import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HIDDEN_LIMIT, hiddenShare } from '../src/visibility.mjs';

const GREEN = { r: 45, g: 74, b: 62 };
const MUSTARD = [224, 165, 38, 255];
const SAME = [45, 74, 62, 255];
const CLEAR = [0, 0, 0, 0];

// A w x h picture from a function (x, y) -> [r, g, b, a].
function picture(w, h, at) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(at(x, y), (y * w + x) * 4);
  return data;
}

test('a logo whose marks are the slide colour vanishes; one in other colours does not', () => {
  // Left half: a mustard loaf. Right half: an arrow drawn in the slide's own green.
  const logo = picture(40, 20, (x, y) => (y < 4 || y > 15 ? CLEAR : x < 20 ? MUSTARD : x < 34 ? SAME : CLEAR));
  assert.ok(hiddenShare(logo, 40, 20, GREEN) > HIDDEN_LIMIT);
  // On a paper-coloured badge the same logo shows.
  assert.equal(hiddenShare(logo, 40, 20, { r: 251, g: 248, b: 243 }), 0);
  const allMustard = picture(40, 20, (x, y) => (y < 4 || y > 15 ? CLEAR : MUSTARD));
  assert.equal(hiddenShare(allMustard, 40, 20, GREEN), 0);
});

test('a cut-out in the slide colour inside a visible badge still reads', () => {
  // A mustard disc-like square with a green leaf in the middle (the sample Loamly logo's idea).
  const badge = picture(30, 30, (x, y) => {
    if (x < 2 || x > 27 || y < 2 || y > 27) return CLEAR;
    return x > 10 && x < 20 && y > 10 && y < 20 ? SAME : MUSTARD;
  });
  assert.equal(hiddenShare(badge, 30, 30, GREEN), 0);
});

test('opaque pictures (photos) are never flagged', () => {
  const photo = picture(10, 10, () => SAME);
  assert.equal(hiddenShare(photo, 10, 10, GREEN), 0);
});
