# Spec: Game Score Tracker (Phase 1)

- **Source intent:** `intent.md` (accepted 2026-11-16)
- **Date:** 2026-11-16
- **Status:** Approved by owner, 2026-11-16

## 1. Summary

Phase 1 is an offline Progressive Web App (PWA) for iPhone and iPad that scores five games, keeps player profiles, and builds a long-term history with stats. It's hosted free on GitHub Pages and installed with Add to Home Screen. All data is stored on the device, with no server or external database. Phase 2 (accounts and cloud sync) and Phase 3 (live multiplayer) are out of scope, but the data model is ready for them.

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| UI | React + TypeScript |
| Build | Vite |
| Offline / install | vite-plugin-pwa (Workbox service worker + web manifest) |
| Local storage | Dexie.js over IndexedDB |
| Styling | Tailwind CSS, with the style guide as design tokens |
| Charts | Recharts |
| Hosting / deploy | GitHub Pages, deployed by GitHub Actions on push to `main` |

## 3. Functional requirements

### FR-1 Install and offline

The app installs from its GitHub Pages URL using Safari's Add to Home Screen, and runs full-screen.

- AC-1: After the first load, the installed app launches and works fully with the device in airplane mode.
- AC-2: When a new version is deployed, the installed app picks it up on its next launch while online.
- AC-3: On first launch, the app asks the browser to make its storage persistent.

### FR-2 Player profiles

Each profile has a name, an emoji, a color from the profile palette, and a hide-from-stats setting. Guests can play without a profile.

- AC-1: Profiles can be created, edited and soft-deleted. A deleted profile's past games stay in history.
- AC-2: A profile set to hide from stats is left out of leaderboards and comparisons, but its games stay in history.
- AC-3: Guests can be added during game setup. They appear in that game's history and are never included in stats.

### FR-3 Game setup

1. Pick a game.
2. Pick the players, either saved profiles or guests.
3. Set the turn order by dragging, or randomize it.
4. Pick the first player or dealer.
5. Adjust that game's settings.
6. Start the game.

- AC-1: Each game's player range is enforced: Parcheesi 2–4, Ticket to Ride 2–5, Monopoly 2–8, Dutch Blitz 2–8, Flip 7 2+. An explicit override allows going outside it.
- AC-2: Flip 7 and Dutch Blitz targets default to 200 and 75, and can be edited per player.
- AC-3: Flip 7 setup includes the entry mode (Number or Cards), which can also be changed mid-game.
- AC-4: Starting a game starts its timer.

### FR-4 Player colors

- AC-1: In Flip 7, Dutch Blitz and Monopoly, a player starts with their profile color. If another player in the game already has that color, the app assigns the next free color in the palette. The color can be changed manually, but only to an unused one.
- AC-2: Ticket to Ride players choose from the train colors (red, blue, green, yellow, black). Parcheesi players choose from the pawn colors (red, blue, green, yellow).
- AC-3: Two players in the same game can never share a color.

### FR-5 Game lifecycle

- AC-1: Pause stops the timer. Saved game length leaves out paused time.
- AC-2: Save and Exit keeps the game under In Progress on the Home screen, ready to resume.
- AC-3: Cancel asks for confirmation, then discards the game.
- AC-4: Undo reverses the most recent entry. Any past round can be opened and edited.
- AC-5: The dealer or first player is shown, and rotates each round where the game's rules call for it.
- AC-6: Each game has an optional free-text notes field, for things like house rules.

### FR-6 Parcheesi (Placement template)

- AC-1: Each player has a "pawns home" stepper from 0 to 4.
- AC-2: When a player's count reaches 4, the app assigns their finishing place (1st, 2nd, and so on).
- AC-3: Play continues until one player remains. That player is placed last automatically.
- AC-4: The game saves the finishing order, each player's pawns home, and the game length.

### FR-7 Ticket to Ride

- AC-1: The turn screen highlights the current player and offers route buttons for lengths 1–6 (worth 1, 2, 4, 7, 10 and 15 points), plus Draw train cards and Draw destination tickets.
- AC-2: One tap records the action and moves to the next player. A route action adds its points and subtracts its trains.
- AC-3: A scoreboard shows each player's route points and trains left, starting from 45.
- AC-4: A turn log can be viewed during the game, and any logged turn can be edited.
- AC-5: When a player ends a turn with 2 or fewer trains, a Final Round banner appears. Every player, that player included, gets exactly one more turn, then the app moves to end-of-game scoring.
- AC-6: End-of-game scoring lists each player's destination tickets. Each ticket has a value and is marked completed (+value) or failed (−value).
- AC-7: The player with the longest continuous path is selected and gets +10. If players tie for it, each gets +10.
- AC-8: Finalizing deletes the turn log. The final score breakdown is kept: route points, tickets completed and failed, and the longest-path bonus.

### FR-8 Flip 7 (Rounds template)

- AC-1: Number mode: enter a round score, or tap Bust to score 0. Checking Flip 7! adds 15 points.
- AC-2: Cards mode works like this:
  - Number cards 0–12 can each be tapped once. Tapping a duplicate asks "Bust?"
  - Modifiers +2, +4, +6, +8, +10 and ×2 can also be tapped.
  - The score is (number cards, doubled if ×2 is present) + modifiers + 15 if there are 7 unique numbers.
  - A Flip 7 is detected automatically.
- AC-3: The dealer rotates every round. Confirm Round updates the totals and the round count.
- AC-4: The game ends after a round in which any player reaches their target.
- AC-5: The game saves scores, rounds played, and each player's Flip 7 count. It also tracks the fewest rounds to reach 200 for each player count.

### FR-9 Dutch Blitz (Rounds template)

- AC-1: Each round, every player has two steppers: Dutch pile cards (+1 each) and Blitz pile cards left (−2 each).
- AC-2: The round score is shown before confirming. Confirm Round updates the totals.
- AC-3: The game ends after a round in which any player reaches their target.

### FR-10 Monopoly (Placement template)

- AC-1: Each player has a Bankrupt button. Tapping it records their elimination order and the time.
- AC-2: When only one player is left, that player wins and the game moves to Results.
- AC-3: End Game (ending early) asks for each remaining player's net worth, as a single number. The app ranks remaining players by net worth, above the bankrupt players, and the order can be adjusted by dragging before finalizing.
- AC-4: The game saves placements, net worth (if the game ended early), start and end times, and game length without pauses.

### FR-11 Winners and tie-breakers

- AC-1: In target games (Flip 7 and Dutch Blitz), the winner is the player with the largest margin past their own target. If margins tie, the higher total wins.
- AC-2: In Ticket to Ride, a tie on total score goes to the player with the most completed destination tickets, then to the longest-path holder.
- AC-3: If a tie remains or the game has no official tie-breaker, a tie screen offers two choices: declare a shared win, or pick the winner of an outside tie-breaker.

### FR-12 Results and Finalize

- AC-1: The results screen shows an animated podium in player colors, final scores, and margins past target where they apply.
- AC-2: Finalize saves the game to history and marks it finished. A finished game can still be edited from History.

### FR-13 History

- AC-1: History lists finished games, newest first, and can be filtered by game and by player.
- AC-2: Each game's detail screen shows players, scores, the game's score breakdown, length, handicap targets, and notes.

### FR-14 Stats

- AC-1: Stats are shown per game, plus an overall win comparison across all games.
- AC-2: Stats are rates and averages, never raw totals: win %, average margin, average placement.
- AC-3: A player's stats for a game appear only after they've played the minimum number of games of it (default 5, adjustable in Settings).
- AC-4: Head-to-head records only count games where both players took part.
- AC-5: Game-specific stats:
  - Parcheesi: average pawns home
  - Ticket to Ride: ticket completion rate and longest-path wins
  - Flip 7: Flip 7 count, bust rate, and fewest rounds to 200
  - Dutch Blitz: rounds to finish
  - Monopoly: average game length

### FR-15 Export and restore

- AC-1: Export writes all data, soft-deleted records included, to one JSON file with a schema version. The file can be saved or shared through the iOS share sheet.
- AC-2: Restore replaces all local data with a chosen export file, after the owner confirms.

### FR-16 Merge import

- AC-1: Merge adds records that aren't on this device and skips ones already here (matched by ID). Where the same record was edited on both devices, the newer `updatedAt` wins. Deletions carry over.
- AC-2: A preview shows counts of new games, new players and conflicts before anything changes.
- AC-3: An automatic backup is saved before every merge.
- AC-4: Players with the same name on both devices are flagged with a "Merge these?" prompt. Settings also has a tool to merge players later.

### FR-17 Backup reminder

- AC-1: An optional reminder suggests a backup every N games or every month (configurable). It shows the date of the last backup.

### FR-18 Number entry

- AC-1: Small counts (pawns home, Dutch Blitz pile cards) use +/− steppers.
- AC-2: Open-ended numbers (Flip 7 score, net worth, ticket values) use a custom keypad with game keys: Next player, Bust, and Flip 7!
- AC-3: Tapping a number directly opens the iOS number pad instead.

### FR-19 Feedback and motion

- AC-1: Scores count up, and player pills slide when the rankings change.
- AC-2: Mini celebrations play for a Flip 7, a lead change (the new leader briefly gets a crown), the Ticket to Ride final round, and a Monopoly bankruptcy or all four Parcheesi pawns home.
- AC-3: All animation is turned off when iOS Reduce Motion is on.

## 4. Non-functional requirements

- **NFR-1 Offline-first:** no feature needs a network connection after install.
- **NFR-2 Speed:** entering a round for 8 players takes no more than one tap per player plus a confirm, and the screen responds instantly.
- **NFR-3 Layout:** iPhone is the primary target. iPad uses wider multi-column layouts. Tap targets are at least 44 pt.
- **NFR-4 Theme:** supports light and dark modes and follows the device setting.
- **NFR-5 Sync-ready data:** every record has a UUID `id`, `createdAt`, `updatedAt` and `deletedAt` (for soft deletes).
- **NFR-6 No wrapped labels:** short UI text never wraps onto a second line at 375 px and 390 px widths. This covers buttons, tile and stat labels, chips, pill names and toolbar labels. If a label doesn't fit, fix it in this order: shorten the wording, change the layout (for example, list rows instead of tiles), or as a last resort truncate it to one line with an ellipsis.
- **NFR-7 Visual checks:** Playwright screenshot tests render every screen at iPhone (375×667, 390×844) and iPad (820×1180) sizes, in light and dark mode. They're reviewed for wrapping, overflow and clipping before each milestone is merged.

## 5. Data model

| Entity | Key fields | Relationships |
| --- | --- | --- |
| Player | name, emoji, color, hideFromStats, isGuest | has many MatchPlayers |
| GameDefinition | key, name, template, minPlayers, maxPlayers, defaultTarget, pieceColors, tieBreakers | defined in code |
| Match | gameKey, status (inProgress / finished / cancelled), startedAt, endedAt, pausedDurationMs, settings, notes, endedEarly | has many MatchPlayers and Rounds |
| MatchPlayer | matchId, playerId, seatOrder, color, target, finalScore, placement, marginPastTarget, isWinner, details (JSON) | belongs to Match and Player |
| Round | matchId, number, dealerPlayerId, entries (per player: score, raw inputs, flags) | belongs to Match |
| TurnLog | matchId, entries (player, action, routeLength) | Ticket to Ride only, deleted when the game is finalized |
| Settings | statsMinGames, backupReminder, lastBackupAt | single record |

What goes in `details` depends on the game:

- Parcheesi: `pawnsHome`
- Ticket to Ride: `routePoints`, `tickets[]` (value, completed), `longestPath`
- Flip 7: `flip7Count`
- Monopoly: `netWorth`, `bankruptAt`

## 6. Style guide

| Element | Decision |
| --- | --- |
| Theme | White background in light mode, near-black in dark mode |
| Font | SF Pro Rounded (`ui-rounded`) with tabular numbers |
| Player rows | Rounded pills in the player's color, at Comfortable density (8 players fit on an iPhone screen) |
| Pill text | White on every color |
| Buttons | Neutral charcoal, with main actions in a fixed bottom toolbar |
| Winner | Animated podium |
| Emoji | Shown with the player everywhere |

**Profile palette:**

| Color | Hex |
| --- | --- |
| Red | `#C0392B` |
| Blue | `#1D4ED8` |
| Green | `#15803D` |
| Gold | `#EAB308` |
| Purple | `#6D28D9` |
| Pink | `#BE185D` |
| Teal | `#0F766E` |
| Orange | `#C2410C` |

**Piece colors:** game pieces use the palette's red, blue, green and gold (gold stands in for yellow). Ticket to Ride also uses Black `#1C1C1E`, which gets a light outline in dark mode.

## 7. Screens

1. Home
2. Game picker
3. Game setup
4. Placement scoring (Parcheesi and Monopoly)
5. Rounds scoring (Flip 7 and Dutch Blitz)
6. Ticket to Ride scoring
7. End-of-game entry
8. Results
9. History, with a game detail view
10. Stats
11. Players
12. Settings and backup

## 8. Flagged concerns

| ID | Concern | Resolution |
| --- | --- | --- |
| C-1 | White text on gold has a contrast of about 1.9:1, below accessibility guidelines | Owner accepted it for consistency. Large score numbers partly offset it. |
| C-2 | iOS can clear website data | Mitigated by installing to the Home Screen, requesting persistent storage, and backups (FR-15 to FR-17) |
| C-3 | Haptics are very limited in iOS web apps | Use light tap feedback where supported. Don't rely on haptics. |
| C-4 | The official Flip 7 and Dutch Blitz tie rules haven't been confirmed | Confirm them before building FR-11. Until then, ties go to the tie screen. |
| C-5 | Flip 7 is officially for 3 or more players | Owner allows 2 players under the standard rules |
| C-6 | Free GitHub Pages hosting needs a public repository on a free GitHub plan | Owner accepted a public repo. User data is never stored in it. |
| C-7 | The Flip 7 ×2 rule is assumed to double number cards only, not modifiers | Confirm against the rulebook before building FR-8 |

## 9. Resolved questions

1. Stats appear after 5 games of a given game (FR-14 AC-3 default), and the number can be changed in Settings.
2. A public GitHub repo is acceptable (C-6).
