# CLAUDE.md: Game Score Tracker

An offline PWA for iPhone and iPad that scores board and card games and keeps a history with stats. It's built by following the AI-native SDLC.

## Sources of truth

- `docs/intent.md`: why the app exists and what's in scope (accepted)
- `docs/spec.md`: requirements (FR-1 to FR-19, NFR-1 to NFR-7), data model and style guide (approved). The spec is the source of truth for behavior.
- The UI mockup (Design canvas) is the starting point for layout and look. Where the spec and the mockup disagree, the spec wins.
- `docs/plan.md`: the implementation plan, made in plan mode. Work through its milestones in order.

## Stack

React + TypeScript, Vite, vite-plugin-pwa, Dexie.js (IndexedDB), Tailwind CSS, Recharts. Deployed to GitHub Pages by GitHub Actions. No server and no network calls at runtime.

## Style rules

- Use the tokens from spec §6 only. Don't add colors or fonts outside them.
- Font: `ui-rounded` (SF Pro Rounded), with `font-variant-numeric: tabular-nums` on every score.
- Player pills use white text on the player's color. Buttons are neutral charcoal and must never look like a player pill.
- **Short labels must never wrap** (NFR-6). This covers buttons, tile and stat labels, chips, pill names and toolbar labels. Check them at 375 px and 390 px widths. If a label doesn't fit:
  1. shorten the wording,
  2. otherwise change the layout,
  3. as a last resort, truncate to one line with an ellipsis.
- Tap targets must be at least 44 pt. Respect `prefers-reduced-motion`.

## Testing

- Vitest for scoring logic: every game's scoring, the winner and tie-breaker rules, and merge import.
- Playwright screenshot tests at 375×667, 390×844 and 820×1180, in light and dark mode (NFR-7). After UI changes, look at the screenshots and fix any wrapped labels, overflow or clipping before calling the work done.

## Workflow

- One branch and one pull request per plan milestone. Keep PRs small, and make sure tests pass.
- Never commit user data. The repo is public.
