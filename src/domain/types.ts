// Data model: spec §5. Every stored record is sync-ready (NFR-5).

export interface BaseRecord {
  id: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  deletedAt: number | null; // soft delete
}

export type PaletteColor = 'red' | 'blue' | 'green' | 'gold' | 'purple' | 'pink' | 'teal' | 'orange';
export type PieceColor = 'red' | 'blue' | 'green' | 'gold' | 'black';
export type PlayerColor = PaletteColor | 'black';

export interface Player extends BaseRecord {
  name: string;
  emoji: string;
  color: PaletteColor;
  hideFromStats: boolean;
  isGuest: boolean;
}

export interface GameDefinition {
  key: GameKey;
  name: string;
  /** Short tagline for the game picker, e.g. "Finishing order". */
  tagline: string;
  template: GameTemplate;
  minPlayers: number;
  maxPlayers: number | null;
  defaultTarget: number | null;
  /** Colors players may use. Profile palette games use all 8. */
  pieceColors: PlayerColor[];
  /** Official tie-breakers, in order (FR-11). */
  tieBreakers: string[];
  /** Playable in this build. Games arrive milestone by milestone. */
  available: boolean;
}

export type GameKey = 'parcheesi' | 'ticketToRide' | 'flip7' | 'dutchBlitz' | 'monopoly';
export type GameTemplate = 'placement' | 'rounds' | 'ticketToRide';
export type MatchStatus = 'inProgress' | 'finished' | 'cancelled';

export interface Match extends BaseRecord {
  gameKey: GameKey;
  status: MatchStatus;
  startedAt: number;
  endedAt: number | null;
  pausedDurationMs: number;
  pausedAt: number | null;
  settings: Record<string, unknown>;
  notes: string;
  endedEarly: boolean;
  /**
   * Live entries for placement games, oldest first. Replayed to get the
   * current state, so Undo (FR-5 AC-4) just drops the last one.
   */
  log: MatchEvent[];
}

export type MatchEvent =
  | { type: 'pawns'; playerId: string; delta: 1 | -1; at: number }
  /** Parcheesi: rolled doubles three times in a row (FR-6 AC-6). Never below 0. */
  | { type: 'tripleDoublets'; playerId: string; delta: number; at: number }
  | { type: 'bankrupt'; playerId: string; at: number }
  | {
      /** Monopoly ended early (FR-10 AC-3): net worth per remaining player and their final order. */
      type: 'endEarly';
      netWorth: Record<string, number>;
      /** Remaining players, best first, after any drag and tie decision. */
      order: string[];
      /** How a tie for first was settled (FR-11 AC-3); null when there was none. */
      tie: null | { kind: 'shared'; playerIds: string[] } | { kind: 'picked'; winnerId: string };
      at: number;
    }
  | {
      /**
       * How a remaining tie for first was settled in a rounds game (FR-11 AC-3).
       * Valid only while the game still has `rounds` confirmed rounds.
       */
      type: 'tieDecision';
      decision: { kind: 'shared'; playerIds: string[] } | { kind: 'picked'; winnerId: string };
      rounds: number;
      at: number;
    }
  | {
      /** Flip 7 tie: everyone plays another round after this many confirmed rounds (FR-11 AC-4). */
      type: 'extraRound';
      afterRounds: number;
      at: number;
    };

export interface MatchPlayer extends BaseRecord {
  matchId: string;
  playerId: string;
  seatOrder: number;
  color: PlayerColor;
  target: number | null;
  finalScore: number | null;
  placement: number | null;
  marginPastTarget: number | null;
  isWinner: boolean;
  details: Record<string, unknown>;
}

export interface RoundEntry {
  playerId: string;
  score: number;
  raw: Record<string, unknown>;
  flags: string[];
}

export interface Round extends BaseRecord {
  matchId: string;
  number: number;
  dealerPlayerId: string | null;
  entries: RoundEntry[];
  /** False while the round is being entered (saved on every tap, R-7); true once confirmed. */
  confirmed: boolean;
}

export interface TurnLogEntry {
  playerId: string;
  action: 'route' | 'drawTrains' | 'drawTickets';
  routeLength?: number;
  /** When the turn was taken (game length ends at the last turn). */
  at?: number;
}

export interface TurnLog extends BaseRecord {
  matchId: string;
  entries: TurnLogEntry[];
}

export interface BackupReminder {
  enabled: boolean;
  mode: 'games' | 'month';
  everyGames: number;
}

export interface Settings extends BaseRecord {
  statsMinGames: number;
  backupReminder: BackupReminder;
  lastBackupAt: number | null;
}
