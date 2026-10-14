import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ChartError, formatValue, niceMax, parseChart, renderChart } from '../src/charts.mjs';

test('a chart block parses: settings, then data', () => {
  const c = parseChart('type: line\nunit: mm\nhighlight: Oct\n# a comment\ndata:\nSep: 66\nOct: 88.5\n');
  assert.equal(c.type, 'line');
  assert.equal(c.unit, 'mm');
  assert.deepEqual(c.data, [{ label: 'Sep', value: 66 }, { label: 'Oct', value: 88.5 }]);
});

test('labels may contain spaces and colons (the value follows the last colon)', () => {
  const c = parseChart('data:\nQ1 2026: 10\nTeam: Design: 4\n');
  assert.deepEqual(c.data.map((d) => d.label), ['Q1 2026', 'Team: Design']);
  assert.throws(() => parseChart('data:\nTeam: Design: x\n'), /not a plain number/);
});

test('bad charts explain themselves', () => {
  assert.throws(() => parseChart('type: pie\ndata:\nA: 1'), /bar, hbar or line/);
  assert.throws(() => parseChart('data:\nA: 1,240'), /no commas/);
  assert.throws(() => parseChart('type: bar\n'), /no data/);
  assert.throws(() => parseChart('colour: red\ndata:\nA: 1'), /unknown setting "colour"/);
  assert.throws(() => parseChart('highlight: Z\ndata:\nA: 1'), /not one of the labels/);
  assert.throws(() => parseChart('data:\nA: -1'), /0 or more/);
  assert.throws(() => parseChart(`data:\n${Array.from({ length: 17 }, (_, i) => `P${i}: 1`).join('\n')}`), /16 or fewer/);
  assert.ok(new ChartError('x') instanceof Error);
});

test('values and axis tops', () => {
  assert.equal(formatValue(1240, 'members'), '1,240 members');
  assert.equal(formatValue(45, '%'), '45%');
  assert.equal(formatValue(400, '£'), '£400');
  assert.equal(formatValue(2.5, ''), '2.5');
  assert.equal(niceMax(260), 300);
  assert.equal(niceMax(1240), 1500);
  assert.equal(niceMax(88), 100);
  assert.equal(niceMax(0), 1);
});

test('rendering: one bar per point, the highlight gets the accent class, text is escaped', () => {
  const svg = renderChart(parseChart('type: bar\nhighlight: B\ndata:\nA: 1\nB: 2\n<C>: 3\n'));
  assert.equal((svg.match(/<rect class="bar/g) ?? []).length, 3);
  assert.equal((svg.match(/class="bar hi"/g) ?? []).length, 1);
  assert.match(svg, /&lt;C&gt;/);
  assert.match(svg, /data-chart-points="3"/);
  assert.match(svg, /aria-label="A: 1, B: 2, &lt;C&gt;: 3"/);
  assert.equal((renderChart(parseChart('type: hbar\ndata:\nA: 1\nB: 2')).match(/<rect class="bar/g) ?? []).length, 2);
  assert.equal((renderChart(parseChart('type: line\ndata:\nA: 1\nB: 2')).match(/<circle/g) ?? []).length, 2);
});

test('unit and caption: "unit: none" counts as said, the caption goes under the chart', () => {
  assert.equal(parseChart('data:\nA: 1').unitGiven, false);
  const kilos = parseChart('type: hbar\nunit: kg\ncaption: Kilos binned, Jan to Sep 2026 (our waste log)\ndata:\nSourdough: 612\nRye: 98');
  assert.equal(kilos.unitGiven, true);
  assert.equal(kilos.unit, 'kg');
  const svg = renderChart(kilos);
  assert.match(svg, />612 kg</);
  assert.match(svg, /aria-label="Sourdough: 612 kg, Rye: 98 kg"/);
  assert.match(svg, /<\/svg>\n<p class="caption chart-caption">Kilos binned, Jan to Sep 2026 \(our waste log\)<\/p>/);
  const none = parseChart('unit: none\ndata:\nA: 3');
  assert.deepEqual([none.unitGiven, none.unit], [true, '']);
  assert.doesNotMatch(renderChart(none), /chart-caption/);
});
