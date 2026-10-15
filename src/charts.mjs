// Charts for slides, written as a fenced block in the deck:
//
//   ```chart
//   type: bar            bar (columns), hbar (horizontal bars) or line
//   unit: members        what the numbers measure, shown with each value ("1,240 members", "612 kg");
//                        "%" goes after the number, "£", "$", "€", "¥" before it; "none" for plain
//                        numbers. The decks check asks for it, so a chart always says what it counts
//   caption: Kilos binned, Jan to Sep 2026 (our waste log)
//                        optional: a line under the chart, for the source and what is measured
//   highlight: Sep       optional: the label drawn in the accent colour
//   height: 420          optional: chart height in px (the width is the slide's content width)
//   data:
//   Jan: 120
//   Feb: 180
//   ```
//
// The Marp engine (src/marp-engine.mjs) turns the block into an inline SVG at build time,
// so the chart uses the theme's fonts and colours (classes in theme/brand.css) and the
// checks can measure it like any other slide content. Numbers are plain decimals.

const WIDTH = 1120;
const MAX_POINTS = 16;

export class ChartError extends Error {}

export function parseChart(text) {
  const opts = { type: 'bar', unit: '', unitGiven: false, caption: '', highlight: null, height: 420 };
  const data = [];
  let inData = false;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const m = /^(.+?):\s*(.*)$/.exec(line);
    if (!m) throw new ChartError(`chart line ${i + 1}: "${line}" should be "key: value" or "label: number"`);
    const [, key, value] = m;
    if (!inData) {
      const k = key.trim().toLowerCase();
      if (k === 'data') {
        inData = true;
        return;
      }
      if (k === 'type') {
        if (!['bar', 'hbar', 'line'].includes(value)) throw new ChartError(`chart type "${value}" must be bar, hbar or line`);
        opts.type = value;
      } else if (k === 'unit') {
        opts.unitGiven = true;
        opts.unit = value.trim().toLowerCase() === 'none' ? '' : value.trim();
      } else if (k === 'caption') opts.caption = value.trim();
      else if (k === 'highlight') opts.highlight = value;
      else if (k === 'height') {
        const h = Number(value);
        if (!Number.isFinite(h) || h < 120 || h > 560) throw new ChartError('chart height must be between 120 and 560');
        opts.height = h;
      } else throw new ChartError(`chart line ${i + 1}: unknown setting "${key}" (type, unit, caption, highlight, height, then data:)`);
      return;
    }
    // A data label may contain colons ("Team: Design: 4"): the number follows the last one.
    const cut = line.lastIndexOf(':');
    const n = line.slice(cut + 1).trim();
    if (!/^-?\d+(\.\d+)?$/.test(n)) throw new ChartError(`chart line ${i + 1}: "${n}" is not a plain number (no commas or units: write 1240, not 1,240)`);
    data.push({ label: line.slice(0, cut).trim(), value: Number(n) });
  });
  if (!data.length) throw new ChartError('chart has no data (add "data:" and then "label: number" lines)');
  if (data.length > MAX_POINTS) throw new ChartError(`chart has ${data.length} points; keep it to ${MAX_POINTS} or fewer so labels stay readable`);
  if (opts.highlight && !data.some((d) => d.label === opts.highlight)) throw new ChartError(`highlight "${opts.highlight}" is not one of the labels`);
  if (opts.type !== 'line' && data.some((d) => d.value < 0)) throw new ChartError('bar charts need values of 0 or more');
  return { ...opts, data };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function formatValue(v, unit) {
  const n = new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(v);
  if (!unit) return n;
  if (unit === '%') return `${n}%`;
  if (/^[£$€¥]$/.test(unit)) return `${unit}${n}`;
  return `${n} ${unit}`;
}

// A round top for the axis (1, 1.2, 1.5, 2 … 8 or 10 times a power of ten), at or above the maximum.
export function niceMax(max) {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= max) return m * p;
  return 10 * p;
}

export function renderChart(chart) {
  const { type, data, unit, highlight, height, caption = '' } = chart;
  const hi = (d) => (d.label === highlight ? ' hi' : '');
  const parts = [];
  if (type === 'hbar') {
    const labelW = 260;
    const valueW = 200;
    const rowH = height / data.length;
    const barH = Math.min(48, rowH * 0.62);
    const top = niceMax(Math.max(...data.map((d) => d.value)));
    data.forEach((d, i) => {
      const y = i * rowH + (rowH - barH) / 2;
      const w = ((WIDTH - labelW - valueW) * d.value) / top;
      parts.push(`<text class="label" x="${labelW - 16}" y="${y + barH / 2 + 7}" text-anchor="end">${esc(d.label)}</text>`);
      parts.push(`<rect class="bar${hi(d)}" x="${labelW}" y="${y}" width="${w.toFixed(1)}" height="${barH.toFixed(1)}" rx="4"/>`);
      parts.push(`<text class="value" x="${(labelW + w + 12).toFixed(1)}" y="${y + barH / 2 + 8}">${esc(formatValue(d.value, unit))}</text>`);
    });
  } else {
    const bottom = height - 44;
    const plotTop = 40;
    const min = type === 'line' ? Math.min(0, ...data.map((d) => d.value)) : 0;
    const top = niceMax(Math.max(...data.map((d) => d.value)));
    const y = (v) => bottom - ((bottom - plotTop) * (v - min)) / (top - min || 1);
    const step = WIDTH / data.length;
    for (const f of [0.25, 0.5, 0.75, 1]) parts.push(`<line class="grid" x1="0" x2="${WIDTH}" y1="${y(min + (top - min) * f).toFixed(1)}" y2="${y(min + (top - min) * f).toFixed(1)}"/>`);
    parts.push(`<line class="axis" x1="0" x2="${WIDTH}" y1="${bottom}" y2="${bottom}"/>`);
    if (type === 'bar') {
      const barW = Math.min(110, step * 0.6);
      data.forEach((d, i) => {
        const cx = step * i + step / 2;
        parts.push(`<rect class="bar${hi(d)}" x="${(cx - barW / 2).toFixed(1)}" y="${y(d.value).toFixed(1)}" width="${barW.toFixed(1)}" height="${(bottom - y(d.value)).toFixed(1)}" rx="4"/>`);
        parts.push(`<text class="value" x="${cx.toFixed(1)}" y="${(y(d.value) - 10).toFixed(1)}" text-anchor="middle">${esc(formatValue(d.value, unit))}</text>`);
        parts.push(`<text class="label" x="${cx.toFixed(1)}" y="${bottom + 32}" text-anchor="middle">${esc(d.label)}</text>`);
      });
    } else {
      const pts = data.map((d, i) => [step * i + step / 2, y(d.value)]);
      parts.push(`<polyline class="line" points="${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')}"/>`);
      data.forEach((d, i) => {
        const [cx, cy] = pts[i];
        parts.push(`<circle class="line-dot${hi(d)}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="8"/>`);
        if (i === data.length - 1 || d.label === highlight || data.length <= 8) {
          parts.push(`<text class="value" x="${cx.toFixed(1)}" y="${(cy - 18).toFixed(1)}" text-anchor="middle">${esc(formatValue(d.value, unit))}</text>`);
        }
        parts.push(`<text class="label" x="${cx.toFixed(1)}" y="${bottom + 32}" text-anchor="middle">${esc(d.label)}</text>`);
      });
    }
  }
  const title = data.map((d) => `${d.label}: ${formatValue(d.value, unit)}`).join(', ');
  const svg = `<svg class="chart chart-${type}" data-chart-points="${data.length}" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
  return caption ? `${svg}\n<p class="caption chart-caption">${esc(caption)}</p>\n` : svg;
}
