# Spec: Game Score Tracker (Phase 1)

- **Source intent:** `intent.md` (accepted 2026-11-16)
- **Date:** 2026-11-16
- **Status:** Approved by owner, 2026-11-16. Amended 2026-11-17 (decisions from `plan.md` §1)

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

- AC-1: Profiles can be created, edited and soft-deleted. A deleted profile's past games stay in history. Names are 1–24 characters, and a name already used by another saved profile is refused (case-insensitive). A deleted profile's name can be reused.
- AC-2: A profile set to hide from stats is left out of leaderboards and comparisons, but its games stay in history.
- AC-3: Guests can be added during game setup. They appear in that game's history and are never included in stats. Each guest is stored as a Player with `isGuest` and `hideFromStats` set, and is hidden from the Players screen and the setup list.

### FR-3 Game setup

1. Pick a game.
2. Pick the players, either saved profiles or guests.
3. Set the turn order by dragging, or randomize it.
4. Pick the first player or dealer.
5. Adjust that game's settings.
6. Start the game.

- AC-1: Each game's player range is enforced: Parcheesi 2–4, Ticket to Ride 2–5, Monopoly 2–8, Dutch Blitz 2–8, Flip 7 2+. An explicit override allows going outside it, but never past the number of colors available: Parcheesi 4, Ticket to Ride 5, all other games 8. In practice the override ("Play anyway") only allows going below the minimum.
- AC-2: Flip 7 and Dutch Blitz targets default to 200 and 75, and can be edited per player.
- AC-3: Flip 7 has no entry-mode choice (changed 2026-11-17, mockups `Flip7Cards` and `Flip7Keypad`). Play always uses the card selector, and any player's score can be typed instead from the keypad (FR-8 AC-7).
- AC-4: Starting a game starts its timer.

### FR-4 Player colors

- AC-1: In Flip 7, Dutch Blitz and Monopoly, a player starts with their profile color. If another player in the game already has that color, the app assigns the next free color in the palette. The color can be changed manually, but only to an unused one.
- AC-2: Ticket to Ride players choose from the train colors (red, blue, green, yellow, black). Parcheesi players choose from the pawn colors (red, blue, green, yellow).
- AC-3: Two players in the same game can never share a color.

### FR-5 Game lifecycle

- AC-1: Pause stops the timer. Saved game length leaves out paused time.
- AC-2: Back pauses the game and returns to Home, where it stays under In Progress.
- AC-3: Cancel asks for confirmation, then discards the game.
- AC-4: Undo reverses the most recent entry. Any past round can be opened and edited.
- AC-5: The dealer or first player is shown, and rotates each round where the game's rules call for it.
- AC-6: Each game has an optional free-text notes field, for things like house rules.

### FR-6 Parcheesi (Placement template)

- AC-1: Each player has a "pawns home" stepper from 0 to 4.
- AC-2: When a player's count reaches 4, the app assigns their finishing place (1st, 2nd, and so on).
- AC-3: Play continues until one player remains. That player is placed last automatically.
- AC-4: The game saves the finishing order, each player's pawns home, and the game length.
- AC-5: The main toolbar button says "See results". It's enabled once the finishing order is complete.
- AC-6: Each player also has a "Triple doublets" stepper (0 or more) next to pawns home, for the penalty for rolling doubles three times in a row. It works before and after the player is placed, Undo reverses it, and the count is saved with the game and shown in game detail and the History editor. Pawns home moves one step at a time; the triple doublets number can also be typed.

### FR-7 Ticket to Ride

- AC-1: The turn screen highlights the current player and offers route buttons for lengths 1–6 (worth 1, 2, 4, 7, 10 and 15 points), plus Draw train cards and Draw destination tickets.
- AC-2: One tap records the action and moves to the next player. A route action adds its points and subtracts its trains.
- AC-3: A scoreboard shows each player's route points and trains left, starting from 45.
- AC-4: A turn log can be viewed during the game, and any logged turn can be edited.
- AC-5: When a player ends a turn with 2 or fewer trains, a Final Round banner appears. Every player, that player included, gets exactly one more turn, then the app moves to end-of-game scoring.
- AC-6: End-of-game scoring lists each player's destination tickets. Each ticket has a value and is marked completed (+value) or failed (−value). The ticket keypad has **Completed** and **Failed** buttons that add the ticket with that status. **Add ticket** stays open for back-to-back entry: after a ticket is added, its value clears for the next one. While it's open, it lists the tickets added so far for that player (value and status) with a running total, and any of them can be removed there. Only **Done**, a tap outside, or Esc (⌘.) closes it. The completed/failed toggle on each ticket row stays, for changing it later.
- AC-7: The player with the longest continuous path is selected and gets +10. If players tie for it, each gets +10.
- AC-8: Finalizing deletes the turn log. The final score breakdown is kept: route points, tickets completed and failed, and the longest-path bonus. The deletion happens in the same save as finalizing.
- AC-9: Phase 1 supports the US map only: route lengths 1–6. Longer routes (the Europe map's 8-length, 21 points) and Stations aren't included (owner decision).
- AC-10: Turns go in seat order from the first player. A route longer than the player's trains left is disabled. Editing a logged turn keeps its player and works the totals and the final round out again; only edits that keep every player at 0 trains or more are offered. When every player has had their last turn, the app opens end-of-game scoring (**Final scoring**). There, tickets are added with the keypad and start as completed, and a "Pick all who tie" control sets the longest path.
- AC-11: Editing a finished game from History changes only the end-of-game breakdown (route points, which can be typed, tickets and the longest path), since the turn log is gone.

### FR-8 Flip 7 (Rounds template)

- AC-1: Keypad: type a round score, or tap Bust to score 0. Flip 7! adds 15 points.
- AC-2: The card selector (mockup `Flip7Cards`), used during play, works like this:
  - Every card is a toggle: tapping a number card (0–12) or a modifier (+2, +4, +6, +8, +10, ×2) selects it, and tapping it again unselects it.
  - Selected cards, number and modifier alike, show the dark ring and the ✓ badge from the mockup (`aria-pressed` set).
  - A bust is recorded only with the **Bust** button. Tapping a selected card never asks about a bust.
  - The score is (number cards, doubled if ×2 is present) + modifiers + 15 if there are 7 unique numbers.
  - A Flip 7 is detected automatically when 7 different number cards are selected, and it goes away if one of them is unselected. Once there are 7, no more number cards can be added (a Flip 7 ends the turn).
  - **Bust** scores 0 and moves to the next player. **Clear** empties the player's cards for this round.
  - The panel shows the player's sum, e.g. "(3+5+8+12) + 4 = 32".
- AC-3: The dealer rotates every round. Confirm Round updates the totals and the round count.
- AC-4: The game ends after a round in which any player reaches their target.
- AC-5: The game saves scores, rounds played, and each player's Flip 7 count and busts. It also tracks the fewest rounds to reach 200 for each player count (saved per player as `roundsTo200`, only for players whose target was 200).
- AC-6: Action cards (Freeze, Flip Three, Second Chance) aren't tracked. The **Bust** button covers every bust.
- AC-7: Each player's pill has an outlined round-score chip. Tapping the chip opens the custom keypad for that player (mockup `Flip7Keypad`): digits, **Bust**, **Flip 7!**, delete and **Next player**. Its **Back to cards** button returns to the card selector. Tapping the rest of a pill selects that player for the card selector. Confirm Round needs an entry for every player (NFR-2: one entry per player plus a confirm).
- AC-8: Editing a past round opens the keypad by default (the score before the bonus, plus Bust and Flip 7!), whichever way the round was entered.
- AC-9: Games and rounds saved before this change (entered in either the old Number or Cards mode) still load, show and edit normally.

### FR-9 Dutch Blitz (Rounds template)

- AC-1: Each round, every player has two steppers: Dutch pile cards (+1 each, 0–40) and Blitz pile cards left (−2 each, 0–10). Tapping a stepper's number opens the number pad. A player with Dutch cards and an empty Blitz pile is marked "Blitz!".
- AC-2: The round score is shown before confirming. Confirm Round updates the totals.
- AC-3: The game ends after a round in which any player reaches their target. Confirming that round opens Results. If editing a past round ends the game, the screen shows a Game over banner instead of leaving.
- AC-4: Undo reopens the last confirmed round for correction. It's available while the new round is still blank.

### FR-10 Monopoly (Placement template)

- AC-1: Each player has a Bankrupt button. Tapping it records their elimination order and the time.
- AC-2: When only one player is left, that player wins and the game moves to Results.
- AC-3: End Game (ending early) asks for each remaining player's net worth, as a single number. The app ranks remaining players by net worth, above the bankrupt players, and the order can be adjusted by dragging before finalizing. Net worth is a whole number shown without a currency sign. If players tie for the top net worth, the tie screen opens (FR-11 AC-3). A shared win puts every tied player in 1st, and the next player takes the place after them (1st, 1st, 3rd). Ties lower down keep the order shown on the ranking screen.
- AC-4: The game saves placements, net worth (if the game ended early), start and end times, and game length without pauses.

### FR-11 Winners and tie-breakers

- AC-1: In target games (Flip 7 and Dutch Blitz), the winner is the player with the largest margin past their own target. If margins tie, the higher total wins.
- AC-2: In Ticket to Ride, a tie on total score goes to the player with the most completed destination tickets, then to the longest-path holder.
- AC-3: If a tie remains or the game has no official tie-breaker, a tie screen offers two choices: declare a shared win, or pick the winner of an outside tie-breaker. With a shared win, Results says "Shared win" with the winners' names on the line below.
- AC-4: In Flip 7, if players are still tied on both margin and total, the tie screen's default option is "Play another round" (per the official FAQ). It continues the game with all players, not just the tied ones. The extra round adds to the running totals, targets don't change, and the dealer keeps rotating. Any player can win it, including one who wasn't tied. After that round, the winner is decided again under AC-1, and the tie screen comes back if the tie remains, as many times as needed. Shared win and the outside tie-breaker stay available each time. Example: Alex and Sam both on 212 to a 200 target (+12), Jordan on 185. In the extra round Alex scores 20, Sam busts and Jordan scores 30: Alex wins on 232 (+32), Jordan is 2nd on 215 (+15), Sam 3rd on 212.

### FR-12 Results and Finalize

- AC-1: The results screen shows an animated podium in player colors, final scores, and margins past target where they apply.
- AC-2: Finalize saves the game to history and marks it finished. A finished game can still be edited from History. The edit changes it in place: changes are a draft until Save, the game stays finished, and its length doesn't change.

### FR-13 History

- AC-1: History lists finished games, newest first, and can be filtered by game and by player. Games are grouped as This week (the last 7 days), Earlier in <month>, then <Month Year>. The player filter lists saved players who appear in history, deleted ones included.
- AC-2: Each game's detail screen shows players, scores, the game's score breakdown, length, handicap targets, and notes.

### FR-14 Stats

- AC-1: Stats are shown per game, plus an overall win comparison across all games.
- AC-2: Stats are rates and averages, never raw totals: win %, average margin, average placement.
  - A shared win among k players counts as 1/k of a win for each of them.
  - The overall win comparison is the mean of a player's per-game win %, using only games where they've reached the minimum.
  - Average margin: past target in Flip 7 and Dutch Blitz, and the winner's score minus the runner-up's in Ticket to Ride. Parcheesi and Monopoly use average placement only.
  - Fewest rounds to 200 (Flip 7) counts only players whose target was 200, grouped by player count.
- AC-3: A player's stats for a game appear only after they've played the minimum number of games of it (default 5, adjustable in Settings).
- AC-4: Head-to-head records only count games where both players took part. Whoever placed higher wins the matchup, and a shared placement counts as a tie.
- AC-5: Game-specific stats:
  - Parcheesi: average pawns home; average triple doublets per game, and the most in one game (owner request, M10)
  - Ticket to Ride: ticket completion rate and longest-path wins
  - Flip 7: Flip 7 count, bust rate, and fewest rounds to 200. Per player, a Flip 7 rate and a bust rate, each as a % of rounds played, shown only for players who've reached the minimum number of games (AC-3)
  - Dutch Blitz: rounds to finish
  - Monopoly: average game length
- AC-6: How Stats shows them:
  - Players in stats are saved profiles that aren't deleted, guests or hidden. Their opponents' games still count.
  - Each game tab has a win-rate board (players under the minimum show "3 of 5 games played"), head to head, the game's records, and a win % over time chart (owner decision). "All games" shows the overall figure.
  - Game-specific stats are shown as rates or averages, each with the leading player (for example "Most Flip 7s per game", "Lowest bust rate", "Best ticket completion rate", "Longest path most often"). Group-level figures (Dutch Blitz rounds to finish, Monopoly game length, triple doublets per player per game) have no player.
  - Fewest rounds to 200 is listed for each player count.
  - Head to head opens on the two players with the most games together. The picker can switch either player.
  - The Players screen shows each player's overall win %, or "stats after N".

### FR-15 Export and restore

- AC-1: Export writes all data, soft-deleted records included, to one JSON file with a schema version. The file can be saved or shared through the iOS share sheet.
- AC-2: Restore replaces all local data with a chosen export file, after the owner confirms.

### FR-16 Merge import

- AC-1: Merge adds records that aren't on this device and skips ones already here (matched by ID). Where the same record was edited on both devices, the newer `updatedAt` wins. Deletions carry over.
- AC-2: A preview shows counts of new games, new players and conflicts before anything changes.
- AC-3: An automatic backup is saved before every merge.
- AC-4: Players with the same name on both devices are flagged with a "Merge these?" prompt. Settings also has a tool to merge players later.
- AC-5: How it works:
  - Records are matched by id across players, games, seats, rounds and turn logs. Settings aren't merged: they're this device's preferences.
  - If both copies have exactly the same `updatedAt`, this device's copy is kept, so merging can't flip-flop. Running the same merge twice changes nothing the second time.
  - The preview lists new games, new players, other new records, edits where the other device's copy is newer (taken), edits where this device's is newer (kept), and records already the same. "Merge" is disabled when there's nothing to merge.
  - The automatic backup is stored on this device (the newest 3 are kept, and they aren't part of exports). Settings offers **Undo last merge**, which restores it after a confirm.
  - "Merge these?" keeps the profile with more games (its name, emoji and color) and moves the other's games into it. Two players who played in the same game can't be merged. A player merge also saves an automatic backup first.

### FR-17 Backup reminder

- AC-1: An optional reminder suggests a backup every N games or every month (configurable). It shows the date of the last backup.

### FR-18 Number entry

- AC-1: Small counts (pawns home, triple doublets, Dutch Blitz pile cards) use +/− steppers. A single tap changes the value by exactly 1. Pressing and holding + or − repeats, starting after about 400 ms and speeding up while held. It stops the moment the finger lifts, slides off, or the value hits its limit. Steppers turn off iOS text selection and the long-press menu.
- AC-2: Open-ended numbers (Flip 7 score, net worth, ticket values) use a custom keypad with game keys: Next player, Bust, and Flip 7!
- AC-3: Tapping a number directly opens the iOS number pad instead.

### FR-19 Feedback and motion

- AC-1: Scores count up, and player pills slide when the rankings change.
- AC-2: Mini celebrations play for a Flip 7, a lead change (the new leader briefly gets a crown), the Ticket to Ride final round, and a Monopoly bankruptcy or all four Parcheesi pawns home.
- AC-3: All animation is turned off when iOS Reduce Motion is on: no CSS transitions or animations at all, and no JavaScript motion.
- AC-4: How it works:
  - Totals count up over about half a second in Flip 7, Dutch Blitz and Ticket to Ride.
  - In Flip 7 and Dutch Blitz, once a round is confirmed, the player rows are shown in standings order (margin past target, then total), so they slide when the ranking changes. Before the first round they're in seat order, and the order never changes while a round is being entered.
  - The leader has a crown, which pops in when the lead changes.
  - A celebration is a short message with a burst (about 1.6 s), with a light vibration where the device supports it (spec C-3).
  - The podium's steps rise from 3rd to 1st, then the crown pops.
  - With Reduce Motion, celebrations still show their message, without any motion.

### FR-20 Keyboard shortcuts

These only apply when a hardware keyboard is used (iPad with a keyboard case). Nothing changes on the iPhone. They're active in Flip 7, Ticket to Ride and Dutch Blitz.

- AC-1: Everywhere: ⌘Z Undo, Space pause or resume, Esc close a sheet or go back, ? show the shortcut list.
- AC-2: Flip 7:
  - 0–9 toggle that number card, and Shift+1/2/3 toggle 10/11/12.
  - + then 2/4/6/8/0 toggles a modifier (+0 means +10). X toggles ×2.
  - B is Bust and C is Clear.
  - K opens the keypad, where digits type and F marks a Flip 7.
  - Enter goes to the next player, and on the last player it's Confirm round.
- AC-3: Ticket to Ride:
  - 1–6 claim a route of that length. T draws train cards, D draws tickets, L opens the turn log.
  - In end-of-game scoring: digits type a ticket value, and C or X adds it as completed or failed. Enter with a value typed adds it as completed (the default for new tickets). Each of these keeps Add ticket open for the next one. Enter with nothing typed closes it. P toggles the longest path for the current player.
- AC-4: Dutch Blitz:
  - Tab or the arrow keys move between players and between the Dutch and Blitz fields.
  - Digits type a value, and + or − change it by 1 (holding repeats).
  - Enter confirms the round.
- AC-5: Shortcuts don't fire while typing in a text field, except Enter and Esc. Keyboard focus rings must be visible.
- AC-6: The ? overlay lists the shortcuts active on the current screen.
- AC-7 (M14 decisions):
  - Safari and ⌘Z or Space: the app takes both keys (it cancels the browser's own action, such as Space scrolling the page), so they aren't lost to Safari outside a text field. In a text field, ⌘Z stays Safari's text undo. Ctrl+Z also works, as a fallback if iPadOS keeps ⌘Z on a device. This was checked in the WebKit engine; the on-device check is on the iPad checklist.
  - Esc: ⌘. also works, because the Magic Keyboard for iPad has no Esc key. Esc in a text field leaves the field first; on a game screen it goes back (and pauses, as the back arrow does); in a sheet or dialog it closes it.
  - Space and Enter press a button that has a visible keyboard focus ring, as usual, instead of running the shortcut.
  - The game-wide keys (⌘Z, Space, Esc and ?) also work in Parcheesi and Monopoly.
  - Flip 7: card keys toggle, like taps, so pressing a selected card's key again unselects it. Only B (the Bust button) records a bust. K switches between the cards and the keypad. In the keypad, Delete removes a digit. After +, any other key cancels the modifier.
  - Ticket to Ride: Enter on the turn screen opens final scoring once play is over. In end-of-game scoring, a digit opens Add ticket starting with that digit, and Enter opens it empty. Inside it, C, X and Enter add tickets as described in AC-3, and Enter with nothing typed or Esc closes it. Outside it, the left and right arrows move between players and Esc goes back to the game.
  - Dutch Blitz: Tab skips the − and + buttons, since + and − (or =) do their job. The first arrow press goes to the first field. Holding + or − repeats through the keyboard's own key repeat.
  - On the iPad, Tab may only move between text fields unless keyboard navigation is on in Settings. Nothing in FR-20 needs Tab to reach a button.

## 4. Non-functional requirements

- **NFR-1 Offline-first:** no feature needs a network connection after install.
- **NFR-2 Speed:** entering a round for 8 players takes no more than one entry per player plus a confirm, and the screen responds instantly. An entry is a single value. Tapping a stepper's value opens the number pad, so a large count doesn't need repeated taps.
- **NFR-3 Layout:** iPhone is the primary target. iPad uses wider multi-column layouts. Tap targets are at least 44 pt. The iPad is used in landscape with a keyboard case: at 1180×820, scoring screens use two panes (players and scoreboard on the left, the entry panel on the right), and History and Stats show the list and the detail side by side. Portrait and iPhone layouts don't change.
- **NFR-4 Theme:** supports light and dark modes and follows the device setting.
- **NFR-5 Sync-ready data:** every record has a UUID `id`, `createdAt`, `updatedAt` and `deletedAt` (for soft deletes).
- **NFR-6 No wrapped labels:** short UI text never wraps onto a second line at 375 px and 390 px widths. This covers buttons, tile and stat labels, chips, pill names and toolbar labels. If a label doesn't fit, fix it in this order: shorten the wording, change the layout (for example, list rows instead of tiles), or as a last resort truncate it to one line with an ellipsis.
- **NFR-7 Visual checks:** Playwright screenshot tests render every screen at iPhone (375×667, 390×844) and iPad (820×1180 portrait, 1180×820 landscape) sizes, in light and dark mode. They're reviewed for wrapping, overflow and clipping before each milestone is merged.

## 5. Data model

| Entity | Key fields | Relationships |
| --- | --- | --- |
| Player | name, emoji, color, hideFromStats, isGuest | has many MatchPlayers |
| GameDefinition | key, name, template, minPlayers, maxPlayers, defaultTarget, pieceColors, tieBreakers | defined in code |
| Match | gameKey, status (inProgress / finished / cancelled), startedAt, endedAt, pausedDurationMs, pausedAt, settings, notes, endedEarly, log | has many MatchPlayers and Rounds |
| MatchPlayer | matchId, playerId, seatOrder, color, target, finalScore, placement, marginPastTarget, isWinner, details (JSON) | belongs to Match and Player |
| Round | matchId, number, dealerPlayerId, entries (per player: score, raw inputs, flags), confirmed | belongs to Match |
| TurnLog | matchId, entries (player, action, routeLength, at) | Ticket to Ride only, deleted when the game is finalized |
| Settings | statsMinGames, backupReminder, lastBackupAt | single record |
| Backup (device only) | createdAt, reason, file (a full export) | automatic backups before a merge; not exported (schema v2) |

`Match.log` is the per-game entry log for placement games (Parcheesi pawn steps and triple doublets; Monopoly bankruptcies and the end-early entry, which holds each remaining player's net worth, the final order and how a tie for first was settled), oldest first. The current state is replayed from it, so Undo (FR-5 AC-4) drops the last entry. Rounds games use the Round table instead: the round being entered is saved as an unconfirmed Round on every change, and Confirm Round marks it confirmed. Their `Match.log` holds only a tie decision (FR-11 AC-3) or, in Flip 7, an "extra round" entry (FR-11 AC-4), which applies while the number of confirmed rounds is unchanged, so editing the rounds asks again if a tie remains. Ticket to Ride uses TurnLog.

What goes in `details` depends on the game:

- Parcheesi: `pawnsHome`, `tripleDoublets`
- Ticket to Ride: `routePoints`, `tickets[]` (value, completed), `longestPath`
- Flip 7: `flip7Count`, `busts`, `roundsTo200`
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

**Neutral tokens:**

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#FFFFFF` | `#0B0B0D` |
| Surface | `#F2F3F5` | `#1C1C1E` |
| Border | `#E4E6EA` | `#2C2C2E` |
| Text | `#1F2430` | `#F2F3F5` |
| Secondary text | `#5F6470` | `#A1A1AA` |
| Charcoal button | `#1F2430` | `#3A3A3C` |
| Link | Text color, underlined | Text color, underlined |

**Piece colors:** game pieces use the palette's red, blue, green and gold (gold stands in for yellow). Ticket to Ride also uses Black `#1C1C1E`, which gets a light outline in dark mode.

**Flip 7 tokens** (copied from the mockup). These are an exception to the "tokens only" rule, allowed **only on Flip 7's entry screens** (the card selector and keypad):

| Element | Value |
| --- | --- |
| Number card | cream `#F6EEDC`, border `#D9C9A3` |
| Number card numerals, with a dark `#1F2430` outline, 0 to 12 | `#E8197D`, `#A39384`, `#C5D928`, `#EE4560`, `#2BB5C9`, `#1FA34A`, `#8E44C2`, `#D27F72`, `#8CD15A`, `#F08A1C`, `#E3262B`, `#6A9BE0`, `#8C7E78` |
| Modifier card | orange `#F5A623`, border `#D98A12`, coral `#E8524A` numerals with the same dark outline |
| Bust button | `#B91C1C` with white text |

The cards keep these colors in dark mode, like real cards. The selected ring and ✓ badge use the Text color: `#1F2430` in light mode, as in the mockup, and light in dark mode so they stay visible on the dark panel.

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
| C-4 | The official Flip 7 and Dutch Blitz tie rules haven't been confirmed | Resolved 2026-11-17: Dutch Blitz's official rule (highest score wins when several reach 75 in the same hand) matches FR-11 AC-1, Flip 7 uses FR-11 AC-1, and per its official FAQ a remaining tie defaults to everyone playing another round (FR-11 AC-4). Any other exact tie goes to the tie screen. |
| C-5 | Flip 7 is officially for 3 or more players | Owner allows 2 players under the standard rules |
| C-6 | Free GitHub Pages hosting needs a public repository on a free GitHub plan | Owner accepted a public repo. User data is never stored in it. |
| C-7 | The Flip 7 ×2 rule is assumed to double number cards only, not modifiers | Resolved 2026-11-17: the publisher's FAQ confirms ×2 doubles number cards only |

## 9. Resolved questions

1. Stats appear after 5 games of a given game (FR-14 AC-3 default), and the number can be changed in Settings.
2. A public GitHub repo is acceptable (C-6).
3. The ×2 card in Flip 7 doubles number cards only, not modifiers (C-7, publisher's FAQ, 2026-11-17).
4. A shared win among k players counts as 1/k of a win for each of them in win % (2026-11-17).
5. "Fewest rounds to 200" (FR-8 AC-5, FR-14 AC-5) counts only players whose target was 200, grouped by player count (2026-11-17).
6. The overall win comparison (FR-14 AC-1) is the average of a player's per-game win %, over games where they've reached the minimum (2026-11-17).
7. NFR-2 means one entry per player plus a confirm. Tapping a stepper's value opens the number pad (2026-11-17).
8. The player-range override (FR-3 AC-1) can't exceed the colors available: Parcheesi 4, Ticket to Ride 5, all others 8 (2026-11-17).
