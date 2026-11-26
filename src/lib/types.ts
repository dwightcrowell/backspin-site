import type { Format } from "./rules";

export type Phase = "regular" | "playoffs" | "non-bsg" | "other";

export interface Round {
  rowIndex: number;
  date: string | null;
  streamType: string;
  round: string;
  roundOrdinal: number;
  game: string;
  format: Format | null;
  playerAKey: string;
  playerBKey: string;
  playerARaw: string;
  playerBRaw: string;
  gamesWonA: number | null;
  gamesWonB: number | null;
  winnerKey: string;
  winnerRaw: string;
  prizeMoney: number | null;
  notes: string;
  seasonRaw: string;
  seasonId: number | null;
  phase: Phase;
}

export interface Streamer {
  key: string;
  name: string;
  status: string;
  language: string;
  games: string[];
  wildcards: string[];
}

export interface DirectoryPlayer {
  key: string;
  name: string;
  slug: string;
  status: string;
  language: string;
  games: string[];
  wildcards: string[];
  onRoster: boolean;
}

export interface ScheduledRound {
  label: string;
  game: string;
  format: Format | null;
}

export interface ScheduledStream {
  rowIndex: number;
  date: string | null;
  start: Date | null;
  day: string;
  timeLabel: string;
  streamType: string;
  players: string[];
  pairs: [string, string][];
  extras: string[];
  rounds: ScheduledRound[];
  notes: string;
  status: string;
  seasonId: number | null;
  included: boolean;
}
