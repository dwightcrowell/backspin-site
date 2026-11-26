import { columns, csvUrls } from "../config";
import { buildDirectory } from "../lib/directory";
import { parseRounds, parseSchedule, parseStreamers } from "../lib/parse";
import type { DirectoryPlayer, Round, ScheduledStream } from "../lib/types";

export interface TabBundle {
  rounds: string;
  streamers: string;
  matchups: string;
  streams: string;
}

export interface Assembled {
  rounds: Round[];
  players: DirectoryPlayer[];
  streams: ScheduledStream[];
  warnings: string[];
}

export function urlsRequested(): boolean {
  return Object.values(csvUrls).some((url) => url.trim().length > 0);
}

export function looksLikeCsv(text: string, expectedHeader: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith("<")) return false;
  return trimmed.toLowerCase().includes(expectedHeader.toLowerCase());
}

export function assemble(tabs: TabBundle): Assembled {
  const rounds = parseRounds(tabs.rounds, columns.rounds);
  const streamers = parseStreamers(tabs.streamers, columns.streamers.player, columns.streamers.publicColumns);
  const streams = parseSchedule(tabs.streams, columns.streams, "streams");
  parseSchedule(tabs.matchups, columns.matchups, "matchups");
  const warnings = [...rounds.warnings, ...streamers.warnings, ...streams.warnings].slice(0, 8);
  return {
    rounds: rounds.rows,
    players: buildDirectory(streamers.rows, rounds.rows),
    streams: streams.rows,
    warnings,
  };
}
