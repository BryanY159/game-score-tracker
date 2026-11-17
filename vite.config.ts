import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
// Shown in Settings so an update can be confirmed on the phone (plan R-4).
const VERSION = `${pkg.version} (${process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'})`;

// GitHub Pages serves the app from /<repo>/ (plan R-8).
const BASE = '/game-score-tracker/';

export default defineConfig({
  base: BASE,
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // We decide when to apply an update (plan R-4), see src/pwa/register.ts.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/icon.svg'],
      manifest: {
        name: 'Game Score Tracker',
        short_name: 'Scores',
        description: 'Score board and card games and keep a history with stats.',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#FFFFFF',
        theme_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
