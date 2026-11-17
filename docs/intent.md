# Intent: Game Score Tracker

- **Author:** Product owner (you)
- **Date:** 2026-11-16
- **Status:** Accepted by owner, 2026-11-16

## Problem

We play a regular rotation of board and card games: Parcheesi, Ticket to Ride, Flip 7, Dutch Blitz and Monopoly. Each one scores differently, so keeping score is manual and different every time. Results aren't kept anywhere, so there's no way to look back at who wins, by how much, or how that changes over time.

## Users

- **Owner / host (main user):** sets up and scores most games on an iPhone, sometimes an iPad, and will log far more games than anyone else.
- **Regular players:** family and friends, kept as saved profiles so their history builds up over time.
- **Guests:** occasional players who join a game without a saved profile.

## Desired outcome

- Pick a game and its players, then get a scoring screen built for that game's rules.
- Save every finished game and look back at the history for fun: win records against opponents, score margins, and general per-game stats.
- Stats should be fair, weighted by games played, so the main user's game count doesn't dominate them.
- Run on iPhone and iPad like an app, without the App Store.

## Success looks like

- A full game of each of the five games can be scored on an iPhone from start to finish.
- The app works fully offline once it's installed to the Home Screen.
- History is kept long term, can be backed up, and can be merged between the iPhone and iPad.
- Stats give meaningful comparisons between players regardless of how many games each has played.

## Constraints

- No App Store, no paid hosting, and no external database or server in Phase 1. Free static hosting (GitHub Pages) is acceptable.
- iPhone is the primary device, with layouts that make use of the iPad's larger screen.
- Built by the owner with AI help (Claude and GitHub), following the AI-native SDLC.
- New games are added in code, not through an in-app game builder.

## Out of scope (Phase 1)

- Accounts and automatic cloud sync (planned for Phase 2)
- Live multiplayer sessions where players join from their own phones (planned for Phase 3)
- An in-app game builder
- Tracking house rules (a free-text notes field covers them)
- Keeping the Ticket to Ride turn-by-turn log after a game is finished
- Team play in Dutch Blitz
- A native iOS app

## Open questions

1. Should stats appear after a player has played 5 games, or after 3?
2. What do the official Flip 7 and Dutch Blitz rules say about ties?
3. How should the GitHub repo and the Claude–GitHub workflow be set up? This is the next discussion.
