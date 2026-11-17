# Plan: Game Score Tracker (Phase 1)

- **Source:** `docs/spec.md` (approved 2026-11-16), `docs/intent.md`, `docs/mockup/*.dc.html`
- **Date:** 2026-11-17
- **Status:** Draft for owner review

## 0. How to read this plan

- There are 13 milestones (M0 to M12). Each one is a single branch and a single PR, and each leaves the app **installable and usable on an iPhone** before the next one starts.
- Every milestone lists the files it creates or changes, the order of work, the FRs and NFRs it covers, and the tests that prove it.
- Every PR has to pass the **Definition of done** in §4. Items in §1 marked **⚠ Decision needed** must be settled before the milestone that depends on them.

---

## 1. Spec issues to resolve first

Each issue has a proposed default. I'll build to the default unless the owner overrules it, and the spec should be amended to match.

### 1a. Ambiguities

| ID | Issue | Proposed default | Blocks |
| --- | --- | --- | --- |
| A-1 ⚠ | **The neutral and dark-mode tokens are missing from §6.** CLAUDE.md says "tokens from spec §6 only", but §6 only says "white / near-black" and "neutral charcoal". The mockups use `#1F2430` (charcoal text and buttons), `#5F6470` (secondary text), `#E4E6EA` (borders), `#F2F3F5` (surfaces) and `#1E3A8A` (link hover). The mockups are light-only, so no dark values are given. | Add a neutral token table to §6 using the mockup values, plus dark equivalents (bg `#0B0B0D`, surface `#1C1C1E`, border `#2C2C2E`, text `#F2F3F5`, secondary `#A1A1AA`, charcoal button `#3A3A3C`). Get owner approval in the M0 PR. | M0 |
| A-2 ⚠ | **The ×2 card in Flip 7 (C-7)** is still unconfirmed. | Build it as a scoring constant `X2_DOUBLES_MODIFIERS = false` with tests for both readings. Confirm before M8 merges. | M8 |
| A-3 ⚠ | **Official tie rules for Flip 7 and Dutch Blitz (C-4)** are unconfirmed, yet FR-11 AC-1 already defines margin → total. | Use FR-11 AC-1 as written, then send any remaining tie to the tie screen (AC-3). Treat C-4 as resolved by FR-11 unless the rulebook adds something. | M7 |
| A-4 | **"Fewest rounds to reach 200" (FR-8 AC-5, FR-14)** is unclear under handicap targets. Does it mean a total of 200, or the player's own target? | Count it only for players whose target was exactly 200, grouped by player count. Use the round in which their total first reached 200 or more. | M8, M10 |
| A-5 | **"Overall win comparison across all games" (FR-14 AC-1)** has no formula. Pooled win % lets the most-played game dominate, which goes against the intent ("fair, weighted by games played"). | Use the mean of the player's per-game win %, counting only games where they've reached the minimum. Also show a "wins vs expected" figure (actual win rate ÷ the average of 1/N over the games they played) so 2-player and 6-player games compare fairly. | M10 |
| A-6 | **How shared wins count in stats** isn't defined. | A shared win among k players counts as 1/k of a win for each of them in win %. History shows "Shared win". | M2, M10 |
| A-7 | **"Average margin" for the placement games** (Parcheesi, Monopoly) is undefined, since they have no scores. Margin is also undefined for Ticket to Ride. | Placement games: average placement only, no margin. Ticket to Ride: winner's score minus runner-up's. Target games: margin past target. | M10 |
| A-8 | **Head-to-head (FR-14 AC-4)**: it isn't said who "beats" whom in a game with several players. | In any game both played, whoever placed higher gets the H2H win. A shared placement counts as a tie. | M10 |
| A-9 | **FR-18 AC-3** ("Tapping a number directly opens the iOS number pad") reads as if it conflicts with the custom keypad in AC-2. | Use the custom keypad by default. Tapping the displayed value field focuses a hidden `<input inputmode="numeric">`, which brings up the iOS pad. Both routes write to the same value. | M6 |
| A-10 | **The Ticket to Ride final round after an edit.** If someone edits a logged turn so the trigger player's trains go back above 2, should the Final Round banner go away? Route buttons longer than the trains left aren't mentioned either. | Work out the final-round state again from the log after every edit. Disable any route length greater than the trains left. | M9 |
| A-11 | **Editing a finished Ticket to Ride game.** FR-12 AC-2 allows edits from History, but FR-7 AC-8 deletes the turn log. | A finished Ticket to Ride game can only edit the end-game breakdown: route points total, tickets, longest path. | M9 |
| A-12 | **Player range override against colors.** Ticket to Ride has 5 train colors and Parcheesi has 4 pawn colors, so an override past those limits breaks FR-4 AC-3. The palette also has only 8 colors, but Flip 7 is "2+". | The override can't go past the number of colors available: Parcheesi 4, Ticket to Ride 5, the rest 8. Flip 7's practical maximum is therefore 8. | M2 |
| A-13 | **Screens with no mockup:** tie screen, rounds list and round edit, More menu, pause state, notes sheet, cancel confirm, game detail, profile editor, player merge tool, Monopoly bankrupt and net worth, merge preview, and the 8-player Flip 7 layout. | Design these from existing mockup patterns (pills, charcoal bottom toolbar, sheets), then review them in each PR's screenshots. | various |
| A-14 | **Recharts has no chart in the mockups.** The Stats mockup uses only bars built from divs. | Use Recharts only for trend charts that come from FR-14 (for example, win % over time per game). Load it lazily on the Stats route so the main bundle stays small. | M10 |
| A-15 | **Guests' storage.** The model has `Player.isGuest`. | Guests are `Player` rows with `isGuest: true`. They're hidden from the Players screen and pickers, are exported, and are never counted in stats. | M2 |
| A-16 | **Parts of the mockup that aren't in the spec:** the Dutch Blitz "Blitz!" chip (blitz pile reaches 0), Results "Edit scores", and the tab bar (Home, History, Stats, Players) with Settings on Home. | Keep them. They're consistent with the spec and add nothing to the data model. | M3, M7 |

### 1b. Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-1 | **NFR-2 can't be met literally.** Dutch Blitz steppers need one tap per card (for example 12 taps for a Dutch pile of 12), and Flip 7 Number mode needs several digit taps. | Read NFR-2 as "one *entry* per player plus a confirm". Tapping a stepper's value opens the number pad (FR-18 AC-3), so 12 takes 2 taps. ⚠ The owner should confirm this reading. |
| R-2 | **8 players plus a keypad on a 375×667 screen.** Eight 56 px pills is about 500 px, and the Flip 7 keypad takes another ~300 px. | Rounds screen at 8 players: compact pills (still ≥44 pt), a scrolling list, and the keypad as a bottom sheet over the toolbar. The active player auto-scrolls into view. Screenshot it at 375×667 with 8 players. |
| R-3 | **Fonts in screenshot tests.** SF Pro Rounded isn't on Linux runners, so wrapping in CI won't match the iPhone exactly. | (1) Run Playwright in **WebKit** with a fallback font stack that's at least as wide as SF Rounded. (2) Add an automated `[data-nowrap]` check (§3) on top of the visual review. (3) Spot-check on a real iPhone in each milestone's manual check. |
| R-4 | **iOS PWA update behavior (FR-1 AC-2).** iOS standalone apps can keep an old service worker running. | `registerType: 'autoUpdate'`, an update check on `visibilitychange`, and a `skipWaiting` reload only when no game screen is active (game state is in IndexedDB anyway). Show the version in Settings so updates can be verified. |
| R-5 | **iOS data eviction (C-2).** | `navigator.storage.persist()` on first launch (FR-1 AC-3), export early (M4), and the backup reminder. |
| R-6 | **Timer accuracy when iOS suspends the app.** | Never count ticks. Store `startedAt`, `pausedDurationMs` and `pausedAt`, and derive elapsed time from the clock. Persist on `pagehide`. |
| R-7 | **Losing a game in progress** (the app gets killed). | Write every tap to Dexie straight away (the reducer then the repo). The screen reads with `useLiveQuery`, so there's no in-memory-only state. |
| R-8 | **GitHub Pages sub-path and deep links.** | `base: '/game-score-tracker/'`, a matching manifest `scope` and `start_url`, and `HashRouter` so a relaunch on any route never 404s. |
| R-9 | **Merge collisions (FR-16).** Merging two players who both appear in the same match would give one player two seats. | Block or skip merging players who appear in the same match, and show why. Tests cover it. |
| R-10 | **Committing user data by accident** (the repo is public, C-6). | Fixtures are synthetic and live only under `e2e/fixtures/`. `.gitignore` covers `*.backup.json` and `exports/`. A CI step fails if a JSON file with an export `schemaVersion` key appears outside fixtures. |
| R-11 | **Share sheet export on iOS.** | `navigator.share({ files })` where `canShare` allows it, otherwise a download through a Blob link. |

---

## 2. Architecture

```
index.html                  apple-mobile-web-app meta, theme-color (light/dark), viewport-fit=cover
vite.config.ts              base path, vite-plugin-pwa (manifest, Workbox precache)
tailwind.config.ts          tokens only (palette + neutrals from A-1), font stack, tabular-nums utility
src/
  main.tsx, App.tsx         HashRouter, tab layout, SW update hook
  styles/tokens.css         CSS variables for light/dark (prefers-color-scheme), reduced-motion rules
  db/
    schema.ts               Dexie db, versioned stores (players, matches, matchPlayers, rounds, turnLogs, settings)
    record.ts               newRecord()/touch()/softDelete(): uuid, createdAt, updatedAt, deletedAt (NFR-5)
    repos/*.ts              players, matches, rounds, turnLogs, settings
  domain/
    types.ts                Player, Match, MatchPlayer, Round, TurnLog, Settings, GameDefinition
    colors.ts               FR-4 assignment
    timer.ts                elapsed / pause math
    winner.ts               FR-11 ranking + tie detection (pure)
    stats/*.ts              FR-14 (pure, over plain arrays)
    backup/export.ts, restore.ts, merge.ts   FR-15/16 (pure planners + thin Dexie appliers)
  games/
    registry.ts             GameDefinition[] (FR-3 AC-1 ranges, targets, pieceColors, tieBreakers)
    parcheesi/ monopoly/ dutchBlitz/ flip7/ ticketToRide/
      definition.ts, scoring.ts (pure), scoring.test.ts
  components/               PlayerPill, Button, BottomToolbar, TabBar, Stepper, Keypad, Sheet,
                            ConfirmDialog, TimerChip, Podium, TieScreen, EmojiPicker, ColorPicker, NoWrap
  screens/                  Home, GamePicker, GameSetup, PlacementScoring, RoundsScoring, RoundsList,
                            TtrTurns, TtrEndGame, Results, History, MatchDetail, Stats, Players,
                            PlayerEdit, Settings
  dev/seed.ts               synthetic fixture loader, only in test builds (import.meta.env.MODE === 'test')
e2e/
  screens.spec.ts           one test per screen x 3 viewports x 2 themes
  helpers/noWrap.ts         automated wrap/overflow assertions
  fixtures/*.ts             synthetic players and matches
.github/workflows/ci.yml    typecheck, lint, vitest, playwright (webkit) on PRs
.github/workflows/deploy.yml build + deploy to Pages on push to main
```

Principles: scoring and stats are **pure functions** tested in Vitest. Screens are thin. Every write goes through `record.ts`, so the sync-ready fields are never forgotten.

---

## 3. Testing approach (applies to every milestone)

- **Vitest:** colocated `*.test.ts` for everything in `domain/` and `games/*/scoring.ts`, using `fake-indexeddb` for repo tests.
- **Playwright (NFR-7):** projects for `iphone-se` 375×667, `iphone-14` 390×844 and `ipad` 820×1180, each run with `colorScheme: 'light'` and `'dark'`, so 6 renders per screen. The browser is WebKit, with the clock frozen and reduced motion forced on for stable images. Screens are seeded with `dev/seed.ts` and reached through hash routes.
  - `toHaveScreenshot()` baselines are committed. They're generated in CI's Linux container and contain only synthetic data.
  - The `noWrap` helper runs on every screen:
    1. every `[data-nowrap]` element has a single line box (`getClientRects().length === 1` and height ≤ 1.5× line-height),
    2. there's no horizontal page scroll (`scrollWidth ≤ innerWidth`),
    3. no `[data-nowrap]` element is clipped unless it has the `truncate` class,
    4. every `button` and `[role=button]` is at least 44×44 px.
  - Every short label (buttons, chips, pills, tile and stat labels, toolbar items) gets `data-nowrap`, through the shared components.
- **Manual iPhone check:** each PR description includes a short device checklist, run on the deployed preview after merge, before the next milestone starts.

## 4. Definition of done (every PR)

1. Typecheck, lint, Vitest and Playwright pass in CI.
2. I've looked at the screenshots for every new or changed screen and fixed any wrapping, overflow or clipping (NFR-6 order: shorten, re-layout, truncate).
3. Animations respect `prefers-reduced-motion` (FR-19 AC-3).
4. No user data in the diff.
5. Deployed to Pages, and the milestone's iPhone check passes.

---

## 5. Milestones

### M0 · Foundation: installable empty app

**Usable result:** add it to the Home Screen from the Pages URL and launch it full-screen in airplane mode. The tab bar shows empty Home, History, Stats and Players screens.

**Covers:** FR-1 (AC-1, AC-2, AC-3), NFR-1, NFR-3, NFR-4, NFR-5 (schema), NFR-6 and NFR-7 (harness), FR-19 AC-3 (global reduced-motion rule), A-1, R-3, R-4, R-8, R-10.

**Order of work:**
1. Scaffold Vite + React + TS, ESLint, Prettier and `.gitignore`.
2. Tailwind config and `tokens.css`, holding only the §6 palette plus the A-1 neutrals in light and dark. Font stack `ui-rounded, 'SF Pro Rounded', system-ui`, plus the `tabular-nums` utility.
3. Shared primitives: `Button` (charcoal), `BottomToolbar`, `TabBar`, `PlayerPill` (white text on color), `NoWrap`.
4. Dexie `schema.ts` v1 with every table, `record.ts`, and the Settings singleton.
5. vite-plugin-pwa: manifest, icons and the update flow. `storage.persist()` on first launch.
6. HashRouter, the tab layout and empty-state screens.
7. Vitest and Playwright config, the `noWrap` helper, and the seed hook.
8. GitHub Actions `ci.yml` and `deploy.yml`, plus the Pages setup.

**Files:** `package.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig*.json`, `index.html`, `public/icons/*`, `src/main.tsx`, `src/App.tsx`, `src/styles/tokens.css`, `src/db/schema.ts`, `src/db/record.ts`, `src/db/repos/settings.ts`, `src/components/{Button,BottomToolbar,TabBar,PlayerPill,NoWrap}.tsx`, `src/screens/{Home,History,Stats,Players}.tsx` (empty states), `vitest.config.ts`, `playwright.config.ts`, `e2e/helpers/noWrap.ts`, `e2e/screens.spec.ts`, `.github/workflows/{ci,deploy}.yml`, `.gitignore`, `docs/spec.md` (A-1 token table).

**Tests:**
- Vitest: `record.test.ts` (uuid and timestamps set, `touch` bumps `updatedAt`, `softDelete` sets `deletedAt`). `schema.test.ts` (opens with fake-indexeddb, all stores exist).
- Playwright: 4 empty screens × 6 renders, with noWrap passing. A test that the manifest is served with the correct `scope` and `start_url`. An offline test: load, then `context.setOffline(true)`, then reload, and the app still renders.
- Manual: install on iPhone, airplane mode, relaunch. Push a trivial change and confirm the app picks it up on next launch.

### M1 · Player profiles

**Usable result:** create, edit and delete the family's profiles.

**Covers:** FR-2 AC-1, AC-2 (the flag only; stats come in M10), the emoji part of §6.

**Order:** players repo (CRUD + soft delete), then `EmojiPicker` and `ColorPicker` (8-color palette), then the `PlayerEdit` sheet, then the Players list (mockup `Players.dc.html`, with stats columns showing "–" until M10).

**Files:** `src/db/repos/players.ts`, `src/domain/types.ts`, `src/components/{EmojiPicker,ColorPicker,Sheet,ConfirmDialog}.tsx`, `src/screens/{Players,PlayerEdit}.tsx`, `e2e/fixtures/players.ts`.

**Tests:**
- Vitest: repo create, update and soft-delete. The list excludes deleted and guest players. Hide-from-stats is persisted.
- Playwright: Players list (4 and 8 profiles, one hidden), the PlayerEdit sheet, and the delete confirm.
- noWrap on long names (for example, "Christopher") in pills: truncates with an ellipsis.

### M2 · Game setup + Parcheesi end to end

**Usable result:** play and finish a real Parcheesi game. The result is saved.

**Covers:** FR-2 AC-3 (guests), FR-3 (AC-1, AC-4; AC-2 and AC-3 are stored generically and exercised in M7 and M8), FR-4 (AC-1 to AC-3), FR-5 AC-3 (cancel), AC-4 (undo), AC-5 (first player shown), FR-6 (AC-1 to AC-4), FR-11 AC-3 (tie screen component), FR-12 (AC-1 static podium, AC-2 finalize), FR-18 AC-1 (Stepper), A-6, A-12, A-15.

**Order:**
1. `games/registry.ts` with all 5 definitions.
2. `domain/colors.ts` (assign the next free color, palette and piece sets).
3. `GamePicker`.
4. `GameSetup`: select players, add a guest, drag to reorder plus Randomize, first player, range enforcement with override (capped per A-12), and per-game settings.
5. Matches repo (create, inProgress, cancel), with the timer started at Start.
6. `parcheesi/scoring.ts` (stepper → auto-placement → the last player placed automatically).
7. `PlacementScoring` screen with undo and cancel.
8. `domain/winner.ts` (ranking and tie detection), `Results` with a static `Podium` and `TieScreen`, then Finalize.

**Files:** `src/games/registry.ts`, `src/games/parcheesi/*`, `src/domain/{colors,winner,timer}.ts`, `src/db/repos/matches.ts`, `src/components/{Stepper,Podium,TieScreen,TimerChip}.tsx`, `src/screens/{GamePicker,GameSetup,PlacementScoring,Results}.tsx`.

**Tests:**
- Vitest:
  - `colors.test.ts`: a profile color clash gives the next free color, a manual change only to an unused color, Ticket to Ride and Parcheesi piece sets, never a duplicate (property test over random player sets).
  - `registry.test.ts`: every range and default target.
  - `parcheesi/scoring.test.ts`: places assigned in the order players reach 4, the last player placed automatically, undo un-places a player, steps clamped to 0–4.
  - `winner.test.ts`: placement winner, and a shared-win flag.
  - `timer.test.ts`.
- Playwright: GamePicker, GameSetup (4 players with a guest, the color-changed note, and an override warning), Placement mid-game (mockup state), Results and TieScreen.

### M3 · Game lifecycle and Home

**Usable result:** pause, save and exit, and resume Parcheesi from Home. Notes work, and Home lists recent games.

**Covers:** FR-5 (AC-1, AC-2, AC-6), FR-3 AC-4 (paused time excluded), the Home mockup (In progress card, Recent games), A-16 (Settings button on Home), R-6, R-7.

**Order:** pause and resume in the timer and repo, then the pause overlay, then Save and Exit (the More menu), then Home's In progress card and Resume routing, then the notes sheet (in game and on Results), then Recent games.

**Files:** `src/domain/timer.ts`, `src/db/repos/matches.ts`, `src/components/{MoreMenu,NotesSheet}.tsx`, `src/screens/Home.tsx`, scoring screens (toolbar wiring).

**Tests:**
- Vitest: elapsed time excludes paused intervals across several pauses. Resuming after a simulated suspend (clock jump) gives the correct elapsed time. Cancelled matches are excluded from recents.
- Playwright: Home with an In progress card and recents, Home empty, the pause state, the notes sheet. An e2e test: start Parcheesi, save and exit, reload, then resume to the same state.

### M4 · Backup: export, restore, reminder, Settings

Pulled early because real data now exists (C-2, R-5).

**Usable result:** back up to Files or AirDrop and restore on another device.

**Covers:** FR-15 (AC-1, AC-2), FR-17 AC-1, the Settings mockup (the statsMinGames stepper is stored now and used in M10), R-10, R-11.

**Order:** `backup/export.ts` (all tables including soft-deleted rows, plus `schemaVersion`), then `restore.ts` (validate, confirm, replace in a transaction), then share-sheet export, then `lastBackupAt` and the reminder logic, then the Settings screen and the Home reminder banner.

**Files:** `src/domain/backup/{export,restore,format}.ts`, `src/db/repos/settings.ts`, `src/screens/Settings.tsx`, `src/components/BackupBanner.tsx`, `.github/workflows/ci.yml` (the R-10 guard).

**Tests:**
- Vitest: export then restore round-trips identically (soft-deleted rows included). Restore rejects a bad or future `schemaVersion`. Reminder fires after N games or 1 month, and not before.
- Playwright: Settings, the restore confirm, the Home reminder banner.

### M5 · History and game detail

**Usable result:** browse past Parcheesi games, filter them, open one and edit it.

**Covers:** FR-13 (AC-1, AC-2), FR-12 AC-2 (edit a finished game), FR-2 AC-1 (deleted players still show in history).

**Order:** history query (finished games, newest first, filters by game and player), then `History` (grouped by week and month, as in the mockup), then `MatchDetail` with a per-game breakdown renderer registry, then editing through the game's scoring screen in "edit finished" mode, which works out the winner again.

**Files:** `src/db/repos/matches.ts` (queries), `src/screens/{History,MatchDetail}.tsx`, `src/games/*/Breakdown.tsx` (Parcheesi now, the rest added in each game's milestone).

**Tests:**
- Vitest: filter and sort query, and soft-deleted players still resolve in history.
- Playwright: History (all, filtered, empty), MatchDetail for Parcheesi (with notes and with a deleted player).

### M6 · Monopoly + custom keypad

**Usable result:** play Monopoly to the last player standing, or end it early by net worth.

**Covers:** FR-10 (AC-1 to AC-4), FR-18 (AC-2 base keypad, AC-3 native pad), A-9.

**Order:** `Keypad` component (digits, delete, slots for game keys) with a hidden numeric input, then `monopoly/scoring.ts` (bankrupt order with timestamps, last one standing, early-end ranking), then the Monopoly variant of `PlacementScoring` (Bankrupt button), then the early-end net worth entry and drag ranking, then the Monopoly breakdown.

**Files:** `src/components/Keypad.tsx`, `src/games/monopoly/*`, `src/screens/{PlacementScoring,MonopolyEndEarly}.tsx`.

**Tests:**
- Vitest: bankruptcy order sets placements from the bottom up. The last remaining player wins. Early end ranks remaining players by net worth above bankrupt players, and a manual reorder is kept. Undo of a bankruptcy. Length excludes pauses.
- Playwright: Monopoly mid-game at 8 players at 375×667 (R-2), net worth entry with the keypad, the drag ranking screen, and the breakdown.

### M7 · Dutch Blitz + the Rounds template

**Usable result:** play Dutch Blitz with handicap targets to a winner.

**Covers:** FR-9 (AC-1 to AC-3), FR-3 AC-2 (per-player targets), FR-5 AC-4 (open and edit any past round), FR-11 AC-1 (margin then total, then the tie screen), A-3, A-16 ("Blitz!" chip), R-1, R-2.

**Order:**
1. Generic rounds engine: `Round` repo, confirm, undo the last round, edit round N, recompute totals.
2. `dutchBlitz/scoring.ts`.
3. `winner.ts` target-game rules.
4. `RoundsScoring` screen with Dutch and Blitz steppers (value tap opens the number pad) and a live round score.
5. `RoundsList` and the edit sheet.
6. Per-player target editing in setup.
7. Results showing margins.

**Files:** `src/db/repos/rounds.ts`, `src/domain/rounds.ts`, `src/games/dutchBlitz/*`, `src/screens/{RoundsScoring,RoundsList}.tsx`, `src/screens/GameSetup.tsx`, `src/domain/winner.ts`.

**Tests:**
- Vitest:
  - Round score is Dutch ×1 − Blitz ×2.
  - The game ends after the round in which anyone reaches their target, not mid-round.
  - Winner: largest margin past own target. A margin tie goes to the higher total. A full tie goes to the tie screen.
  - Editing a past round recomputes totals and can change the winner or the end state.
- Playwright: Dutch Blitz at 4 players (mockup) and at 8 players at 375×667, RoundsList, the round edit sheet, setup with handicap targets, Results with margins and the 250 handicap note.

### M8 · Flip 7

**Gate:** A-2 (×2 rule) is confirmed before merge.

**Usable result:** play a full Flip 7 game in either entry mode.

**Covers:** FR-8 (AC-1 to AC-5), FR-3 AC-3 (entry mode, changeable mid-game), FR-5 AC-5 (dealer rotation), FR-18 AC-2 (Next player, Bust and Flip 7! keys), A-4, R-2.

**Order:** `flip7/scoring.ts` (number mode, cards mode, duplicate means bust, auto Flip 7 detection), then keypad game keys, then the Number/Cards toggle and the card grid, then dealer rotation, then the "fewest rounds to 200" record, then the breakdown.

**Files:** `src/games/flip7/*`, `src/components/{Keypad,CardGrid}.tsx`, `src/screens/RoundsScoring.tsx`.

**Tests:**
- Vitest:
  - Number mode: score, Bust gives 0, the Flip 7! box adds +15.
  - Cards mode: sum of numbers, ×2 (both readings behind the constant), modifiers, 7 unique numbers gives +15 and auto-detection, a duplicate tap asks to bust.
  - Switching mode mid-game keeps earlier rounds.
  - Dealer rotates every round.
  - flip7Count. Fewest rounds to 200, grouped by player count (A-4).
- Playwright: Main mockup state (Number mode with the keypad), Cards mode, the bust prompt, 8 players at 375×667 with the keypad sheet, and Results.

### M9 · Ticket to Ride

**Usable result:** track a whole Ticket to Ride game turn by turn, then score it at the end.

**Covers:** FR-7 (AC-1 to AC-8), FR-11 AC-2 (tickets, then longest path, then the tie screen), FR-4 AC-2 (train colors, black outline in dark mode), A-10, A-11.

**Order:**
1. `ticketToRide/scoring.ts` (route table, trains, final-round state machine derived from the log).
2. TurnLog repo.
3. `TtrTurns` screen (current player, route buttons disabled above trains left, draws, scoreboard, last turns).
4. Turn log sheet with editing.
5. Final Round banner.
6. `TtrEndGame` (tickets per player, longest path with multiple picks allowed, running total).
7. Tie-breakers, then finalize, which deletes the turn log and keeps the breakdown.

**Files:** `src/games/ticketToRide/*`, `src/db/repos/turnLogs.ts`, `src/screens/{TtrTurns,TtrEndGame}.tsx`, `src/components/TurnLogSheet.tsx`, `src/domain/winner.ts`.

**Tests:**
- Vitest:
  - Route points are 1, 2, 4, 7, 10, 15, and each route subtracts its trains.
  - A player ending a turn at ≤2 trains triggers the final round. Every player, the trigger player included, gets exactly one more turn.
  - Editing the log recomputes the final round (A-10).
  - Ticket ±value. Longest path gives +10 to each tied player.
  - Tie-breaks: total, then completed tickets, then longest path, then the tie screen.
  - Finalize removes the TurnLog and keeps `details`.
- Playwright: turn tracker (mockup state), the Final Round banner, the turn log sheet, end-game entry (mockup), 5 players at 375×667, and dark mode with a black player pill outlined.

### M10 · Stats

**Usable result:** per-game and overall stats, head-to-head, and game-specific records.

**Covers:** FR-14 (AC-1 to AC-5), FR-2 AC-2 and AC-3 (hidden players and guests excluded), the Players-screen stat columns, A-5 to A-8, A-14.

**Order:** pure `stats/` modules (win %, average margin, average placement, eligibility by minimum games, H2H, the game-specific stats), then the `Stats` screen (game chips, win rate bars, "3 of 5 games played", H2H picker, records), then the Players-screen columns, then a lazy-loaded Recharts trend chart.

**Files:** `src/domain/stats/{core,eligibility,headToHead,perGame}.ts`, `src/screens/{Stats,Players}.tsx`, `src/components/charts/WinTrend.tsx`.

**Tests:**
- Vitest, over a synthetic history:
  - Rates, not totals. Shared wins count 1/k.
  - Eligibility at the minimum and at the minimum − 1. Changing the setting changes who's shown.
  - Hidden players and guests are excluded. Deleted players are kept in history but not in leaderboards.
  - H2H counts only games both played.
  - Each game-specific stat: Parcheesi pawns, Ticket to Ride completion rate and longest-path wins, Flip 7 count, bust rate and fewest rounds, Dutch Blitz rounds, Monopoly length.
  - The overall formula (A-5).
- Playwright: Stats for every game, Stats empty or under the minimum, H2H, Players with stats.

### M11 · Merge import and player merge

**Usable result:** combine the iPhone and iPad histories safely.

**Covers:** FR-16 (AC-1 to AC-4), R-9.

**Order:** pure `merge.ts` planner (new, skip, conflict with newer `updatedAt` winning, deletions carried over) for each table, then the preview counts, then an automatic backup (an export kept in an IndexedDB `backups` store, keeping the last 3), then apply in one transaction, then detect same-name players and show "Merge these?", then the Settings player-merge tool (reassign MatchPlayers, soft-delete the duplicate, block same-match collisions).

**Files:** `src/domain/backup/{merge,playerMerge}.ts`, `src/db/schema.ts` (v2: `backups` store, plus a migration test), `src/screens/{MergePreview,PlayerMerge,Settings}.tsx`.

**Tests:**
- Vitest:
  - Disjoint merge. Identical-ID skip. A conflict where the newer one wins, both ways. Deletions on either side carry over.
  - Preview counts match what's applied. A backup is created before apply. Merging is idempotent (merging twice changes nothing).
  - Same-name detection. Player merge rewrites references. Collision blocked.
  - Dexie v1 → v2 migration keeps all data.
- Playwright: merge preview, the "Merge these?" prompt, the player-merge tool.

### M12 · Motion, celebrations, final audit

**Usable result:** the finished feel. Phase 1 is complete.

**Covers:** FR-19 (AC-1 to AC-3), FR-12 AC-1 (animated podium), C-3 (light tap feedback where supported), plus a full NFR audit.

**Order:** a `useReducedMotion` hook and a motion utility, then score count-up and pill reordering (FLIP technique), then the lead-change crown, then the celebrations (Flip 7, Ticket to Ride final round, Monopoly bankruptcy, all 4 Parcheesi pawns home), then the podium animation. Last, a full screenshot pass of all 13 mockup screens plus the extras in A-13, checked against NFR-6, and a 44 pt audit.

**Files:** `src/hooks/useReducedMotion.ts`, `src/components/{CountUp,Celebration,Crown}.tsx`, `src/components/{PlayerPill,Podium}.tsx`, scoring screens.

**Tests:**
- Vitest: lead-change detection (which player gets the crown), and the event → celebration mapping.
- Playwright: with reduced motion set, there are no running animations (`document.getAnimations().length === 0` after interactions). Final-frame screenshots of the podium and celebrations. The complete NFR-7 matrix for every screen.
- Manual: a full game of each of the five on an iPhone (the intent's success criteria) and an iPad layout check.

---

## 6. Traceability

| Requirement | Milestone(s) |
| --- | --- |
| FR-1 | M0 |
| FR-2 | M1, M2 (guests), M10 (hide from stats) |
| FR-3 | M2, M7 (targets), M8 (entry mode) |
| FR-4 | M2, M9 (train colors) |
| FR-5 | M2, M3, M7 (edit rounds), M8 (dealer) |
| FR-6 | M2 |
| FR-7 | M9 |
| FR-8 | M8 |
| FR-9 | M7 |
| FR-10 | M6 |
| FR-11 | M2 (tie screen), M7 (targets), M9 (Ticket to Ride) |
| FR-12 | M2, M5 (edit), M12 (animation) |
| FR-13 | M5, with breakdowns added in M6 to M9 |
| FR-14 | M10 |
| FR-15 | M4 |
| FR-16 | M11 |
| FR-17 | M4 |
| FR-18 | M2 (stepper), M6 (keypad, native pad), M8 (game keys) |
| FR-19 | M0 (reduced-motion base), M12 |
| NFR-1 | M0, checked offline in each milestone |
| NFR-2 | M7, M8 (R-1) |
| NFR-3 | M0, plus a 44 pt check in every milestone |
| NFR-4 | M0, plus a dark render in every milestone |
| NFR-5 | M0 (`record.ts`), M11 (relies on it) |
| NFR-6, NFR-7 | M0 harness, enforced in every milestone, full audit in M12 |
