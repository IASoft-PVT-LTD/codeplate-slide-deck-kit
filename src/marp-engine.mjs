// The Marp engine the deck builds with: Marp Core plus the ```chart fence (src/charts.mjs).
// marp.config.mjs hands it to Marp CLI; src/deck.mjs uses the same engine to read decks,
// so what the checks see is exactly what Marp renders.
import { Marp } from '@marp-team/marp-core';
import { ChartError, parseChart, renderChart } from './charts.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function chartPlugin(md) {
  const fallback = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    if (token.info.trim() !== 'chart') return fallback(tokens, idx, options, env, self);
    try {
      return renderChart(parseChart(token.content));
    } catch (e) {
      if (!(e instanceof ChartError)) throw e;
      return `<p class="chart-error">Chart error: ${esc(e.message)}</p>`;
    }
  };
}

// The options every Marp run uses (Marp CLI reads the same from marp.config.mjs).
export const MARP_OPTIONS = { html: true, math: false };

export function createMarp() {
  return new Marp(MARP_OPTIONS).use(chartPlugin);
}
