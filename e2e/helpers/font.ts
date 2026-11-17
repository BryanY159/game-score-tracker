import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/**
 * SF Pro Rounded isn't available on Linux runners (plan R-3). Tests swap in
 * Inter, whose widths are close to SF Pro, so wrapping checks are the same on
 * every machine. Test-only: the app itself uses the spec §6 font stack.
 */
const require = createRequire(import.meta.url);
const file = require.resolve('@fontsource-variable/inter/files/inter-latin-wght-normal.woff2');
const data = readFileSync(file).toString('base64');

export const TEST_FONT_CSS = `
@font-face { font-family: 'Test Rounded Proxy'; font-weight: 100 900;
  src: url(data:font/woff2;base64,${data}) format('woff2'); }
html:root { --font-sans: 'Test Rounded Proxy', 'Noto Color Emoji', sans-serif; }
`;
