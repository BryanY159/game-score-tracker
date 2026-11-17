# Game Score Tracker

Offline PWA for iPhone and iPad that scores board and card games (Parcheesi, Ticket to Ride, Flip 7, Dutch Blitz, Monopoly) and keeps history with stats.

- Intent: `docs/intent.md`
- Spec: `docs/spec.md`
- UI mockup: `docs/mockup/` (Design canvas source, one file per screen)
- Plan: `docs/plan.md` (Stage 3, written in plan mode)

## Development

```bash
npm install
npm run dev          # local dev server
npm test             # Vitest (scoring and data logic)
npm run e2e          # Playwright screenshot matrix (NFR-7); set PW_BROWSERS=chromium if WebKit isn't installed
```

Screenshots are written to `screenshots/<project>/` and uploaded by CI as an artifact. Live app: https://bryany159.github.io/game-score-tracker/
