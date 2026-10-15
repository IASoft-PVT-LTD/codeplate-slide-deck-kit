// Counts the pages in a PDF without a PDF library. Chrome (which Marp prints with) packs
// page objects into compressed object streams, so those streams are inflated and searched
// too. Good enough for the checks; not a general PDF parser.
import { inflateSync } from 'node:zlib';

const PAGE = /\/Type\s*\/Page(?![a-zA-Z])/g;

export function pdfPageCount(buf) {
  const text = buf.toString('latin1');
  let count = (text.match(PAGE) ?? []).length;
  const objStm = /<<((?:(?!>>\s*stream).)*?\/Type\s*\/ObjStm(?:(?!>>\s*stream).)*?)>>\s*stream\r?\n/gs;
  for (let m = objStm.exec(text); m; m = objStm.exec(text)) {
    const start = m.index + m[0].length;
    const end = text.indexOf('endstream', start);
    if (end < 0) continue;
    if (!/\/FlateDecode/.test(m[1])) continue;
    try {
      const body = inflateSync(buf.subarray(start, end));
      count += (body.toString('latin1').match(PAGE) ?? []).length;
    } catch {
      // A stream we can't inflate (trailing whitespace is fine for zlib; anything else is skipped).
    }
  }
  return count;
}
