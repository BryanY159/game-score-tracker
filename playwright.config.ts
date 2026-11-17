import { defineConfig, type Project } from '@playwright/test';

/**
 * NFR-7 matrix: iPhone SE (375×667), iPhone 14 (390×844), iPad (820×1180),
 * light and dark. CI runs WebKit (closest to iOS Safari) and Chromium.
 * Locally, set PW_BROWSERS=chromium if WebKit isn't installed.
 */
const BROWSERS = (process.env.PW_BROWSERS ?? 'webkit,chromium').split(',') as ('webkit' | 'chromium')[];
const VIEWPORTS = {
  'iphone-375': { width: 375, height: 667 },
  'iphone-390': { width: 390, height: 844 },
  'ipad-820': { width: 820, height: 1180 },
} as const;
const SCHEMES = ['light', 'dark'] as const;

const screenProjects: Project[] = BROWSERS.flatMap((browserName) =>
  Object.entries(VIEWPORTS).flatMap(([vp, viewport]) =>
    SCHEMES.map((colorScheme) => ({
      name: `${browserName}-${vp}-${colorScheme}`,
      testMatch: /screens\.spec\.ts/,
      use: { browserName, viewport, colorScheme, hasTouch: true, serviceWorkers: 'block' as const },
    })),
  ),
);

export const BASE_URL = 'http://localhost:4173/game-score-tracker/';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    trace: 'off',
  },
  projects: [
    ...screenProjects,
    {
      name: 'flows',
      testMatch: /(pwa|helpers|players|parcheesi|lifecycle|backup|history|monopoly|dutchBlitz|quick|flip7|ticketToRide|stats|merge|motion)\.spec\.ts/,
      use: { browserName: 'chromium', viewport: VIEWPORTS['iphone-390'] },
    },
  ],
  webServer: {
    command: 'npm run build:test && npx vite preview --outDir dist-test --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
