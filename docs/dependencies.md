# Dependency audit

Checked 2026-11-17, after M14. `npm audit` reports 19 warnings (17 high, 2 moderate). All of them are in build and test tools (Vite, Vitest, typescript-eslint and the PWA plugin's Workbox build step). None of this code ships in the app or runs on a phone.

A plain `npm audit fix` (no `--force`) can't clear any of them:

- The npm 10.9.9 used here stops with an internal error (`Cannot read properties of null (reading 'edgesOut')`) while resolving peer dependencies. It changes nothing.
- Checked by hand, every affected package is already at the newest version its parent allows, and those parents are at their latest releases.

| Advisory | Affected | Why it stays | What it would take |
| --- | --- | --- | --- |
| picomatch ReDoS through repeated extglobs ([GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf)), covers ≤ 4.0.7 | picomatch 4.0.7, through vite, vitest, tinyglobby, fdir, typescript-eslint and @rollup/pluginutils (15 of the 17 highs) | 4.0.7 is the latest picomatch. No patched version exists yet. | Nothing yet. Updating within the current ranges should clear it once picomatch ships a fix. |
| glob AbortSignal cancellation bypass ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)), 9.0.0 to 14.0.1 | glob 11.1.0, through workbox-build 7.4.1 (vite-plugin-pwa 2.0.0) | workbox-build asks for `glob ^11`, and 7.4.1 is its latest release. | A major upgrade: glob 14 forced with an npm `overrides` entry, or a Workbox release that moves to glob 14. |
| minimatch globparts amplification ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)), 7.0.0 to 11.0.0 | minimatch 10.2.6, through glob 11 | glob 11 asks for `minimatch ^10`. | A major upgrade: minimatch 11 (comes with glob 14 above). |

npm's own suggested fixes are major downgrades (vite 6.2.7, vitest 3.1.4, vite-plugin-pwa 1.1.0, typescript-eslint 8.47.0). We're not taking those.

**Decision:** no change for now (owner to decide on the major-upgrade options). Re-run `npm audit` before each release.
