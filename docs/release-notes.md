# Game Night 1.0.0

Released 2026-11-18. This completes Phase 1: an offline web app for iPhone and iPad that scores board and card games and keeps a history with stats. It's installed from Safari to the Home Screen and hosted on GitHub Pages.

## What's included

- **Five games**
  - **Flip 7:** a card selector (every card toggles), a typed keypad from each player's score chip, the Bust button, automatic Flip 7 detection, and per-player targets.
  - **Ticket to Ride:** one-tap turns, routes 1–6, the final round, and end-of-game tickets entered back to back. The longest path can be shared on a tie.
  - **Dutch Blitz:** Dutch and Blitz steppers with hold to repeat, and per-player targets.
  - **Parcheesi:** pawns home and triple doublets, with automatic places.
  - **Monopoly:** bankruptcies, or ending early by net worth (shown in dollars), with drag to reorder.
- **Every game:** pause, back to resume later, cancel, undo, editing past rounds, and the official tie-breakers. When a tie remains, the tie screen offers a shared win or an outside tie-breaker.
- **Results:** an animated podium. Finalize saves the game to History.
- **Players:** profiles, guests, hide from stats, and player colors with no duplicates in a game.
- **History:** filter by game and player, a detail screen, and editing a finished game in place.
- **Stats:** rates and averages, never raw totals, with a minimum number of games before a player's stats show. A shared win counts as a fraction. Also head to head, game-specific records, Flip 7 and bust rates, and a win % chart.
- **Backup:** export, restore and merge between devices. Merge shows a preview first, makes an automatic backup, and can be undone; running it twice changes nothing. A backup reminder is optional.
- **Offline:** works fully offline once installed, and picks up new versions on the next launch.
- **iPad in landscape with a keyboard:** two-pane layouts, History and Stats side by side, and keyboard shortcuts. Press ? to see them.
- **Look and feel:** light and dark mode, and animations that respect Reduce Motion.

## Known limits

- **Ticket to Ride:** US map only (routes 1–6). The Europe map's 8-length routes and Stations aren't included.
- **Flip 7:** action cards (Freeze, Flip Three, Second Chance) aren't tracked. The Bust button covers every bust.
- **Dependencies:** `npm audit` reports open items in build and test tools only, none in the shipped app. Some have no fix released yet; others need a major upgrade. See [`dependencies.md`](dependencies.md).
- **No cloud sync yet:** devices share data by exporting a backup file on one and merging it on the other.
