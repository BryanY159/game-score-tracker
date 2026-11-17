// Renders the app icons from one SVG. Run: npm run icons
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Charcoal tile with four score pips in the piece colors (spec §6).
const svg = (pad = 0) => {
  const s = 512, inner = s - pad * 2, r = inner * 0.12, gap = inner * 0.3;
  const c = s / 2, d = gap / 2;
  const dots = [['#C0392B', -d, -d], ['#1D4ED8', d, -d], ['#15803D', -d, d], ['#EAB308', d, d]]
    .map(([fill, dx, dy]) => `<circle cx="${c + dx}" cy="${c + dy}" r="${r}" fill="${fill}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" fill="#1F2430"/>${dots}</svg>`;
};

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(file, size, pad) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(pad)}`);
  await page.screenshot({ path: `public/icons/${file}` });
}
await png('icon-192.png', 192, 0);
await png('icon-512.png', 512, 0);
await png('icon-512-maskable.png', 512, 64);
await png('apple-touch-icon.png', 180, 0);
await browser.close();
await writeFile('public/icons/icon.svg', svg(0).replace('<rect ', '<rect rx="112" '));
console.log('icons written');
