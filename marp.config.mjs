// Marp CLI settings for every deck: the theme folder, local files (fonts, images) and the
// chart fence. src/cli.mjs runs Marp with this config; keep the two in step.
import { chartPlugin, MARP_OPTIONS } from './src/marp-engine.mjs';

export default {
  themeSet: ['./theme'],
  allowLocalFiles: true,
  html: MARP_OPTIONS.html,
  options: { math: MARP_OPTIONS.math },
  engine: ({ marp }) => marp.use(chartPlugin),
};
