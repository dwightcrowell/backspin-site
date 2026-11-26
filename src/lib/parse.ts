import type { MatchupColumns, RoundColumns, StreamColumns } from "../config";
import { scheduleStatus } from "../config";
import { headerIndex, parseCsv, readCell } from "./csv";
import { easternDateTime, parseClock, parseFlexibleDate, weekdayName } from "./dates";
import { playerKey } from "./names";
import type { Format } from "./rules";
import { seasonIdForDate } from "./seasons";
import type { Phase, Round, ScheduledStream, Streamer } from "./types";

export interface ParseResult<T> {
  rows: T[];
  warnings: string[];
}

export function roundOrdinal(round: string): number {
  const value = round.trim().toLowerCase();
  if (!value) return 90;
  const named: Record<string, number> = {
    "round 1": 1,
    "round 2": 2,
    "round 3": 3,
    qf: 10,
    qf1: 10,
    qf2: 11,
    qf3: 12,
    qf4: 13,
    quarterfinal: 10,
    "semi 1": 20,
    "semifinal 1": 20,
    sf1: 20,
    "semi 2": 21,
    "semifinal 2": 21,
    sf2: 21,
    final: 30,
  };
  if (value in named) return named[value];
  const number = value.match(/(\d+)/);
  if (value.startsWith("round") && number) return Number(number[1]);
  if (value.startsWith("semi") && number) return 19 + Number(number[1]);
  if (value.includes("quarter")) return 10;
  if (value.includes("final")) return 30;
  return 80;
}

export function parseFormat(value: string): Format | null {
  const compact = value.trim().toLowerCase().replace(/[\s._-]+/g, "");
  if (compact === "bo3" || compact === "bestof3") return "BO3";
  if (compact === "bo5" || compact === "bestof5") return "BO5";
  if (compact === "bo7" || compact === "bestof7") return "BO7";
  return null;
}

export function parseSeason(value: string): { seasonId: number | null; phase: Phase } {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (text === "non-bsg" || text === "non bsg") return { seasonId: null, phase: "non-bsg" };
  const match = text.match(/^bsg\s*(\d+)\s*-\s*(regular|playoffs)$/);
  if (!match) return { seasonId: null, phase: "other" };
  return {
    seasonId: Number(match[1]),
    phase: match[2] === "playoffs" ? "playoffs" : "regular",
  };
}

function parseGames(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(number)) return null;
  return number;
}

function parseMoney(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(number)) return null;
  return number;
}

export function splitGameFormat(value: string): { game: string; format: Format | null } {
  const text = value.trim();
  if (!text) return { game: "", format: null };
  const match = text.match(/^(.*?)(?:\s+|[-/])*(BO3|BO5|BO7|best of\s*[357])$/i);
  if (!match) return { game: text, format: null };
  return { game: match[1].trim(), format: parseFormat(match[2]) };
}

export function isDecisive(round: Round): boolean {
  if (!round.playerAKey || !round.playerBKey || !round.winnerKey) return false;
  return round.winnerKey === round.playerAKey || round.winnerKey === round.playerBKey;
}

export function compareRounds(a: Round, b: Round): number {
  const dateA = a.date ?? "9999-99-99";
  const dateB = b.date ?? "9999-99-99";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  if (a.roundOrdinal !== b.roundOrdinal) return a.roundOrdinal - b.roundOrdinal;
  return a.rowIndex - b.rowIndex;
}

export function parseRounds(csv: string, columns: RoundColumns): ParseResult<Round> {
  const table = parseCsv(csv);
  const warnings: string[] = [];
  if (table.length === 0) return { rows: [], warnings: ["The Rounds tab is empty."] };
  const headers = headerIndex(table[0]);
  for (const required of [columns.date, columns.playerA, columns.playerB, columns.winner, columns.format, columns.season]) {
    if (!headers.has(required.toLowerCase())) {
      warnings.push(`Rounds is missing a “${required}” column.`);
    }
  }

  const rows: Round[] = [];
  table.slice(1).forEach((cells, index) => {
    const rowIndex = index + 2;
    const playerARaw = readCell(cells, headers, columns.playerA);
    const playerBRaw = readCell(cells, headers, columns.playerB);
    const winnerRaw = readCell(cells, headers, columns.winner);
    const seasonRaw = readCell(cells, headers, columns.season);
    if (!playerARaw && !playerBRaw && !winnerRaw && !seasonRaw) return;

    const dateRaw = readCell(cells, headers, columns.date);
    const date = parseFlexibleDate(dateRaw);
    if (dateRaw && !date) warnings.push(`Rounds row ${rowIndex} has a date I couldn’t read (“${dateRaw}”).`);

    const formatRaw = readCell(cells, headers, columns.format);
    const format = parseFormat(formatRaw);
    if (formatRaw && !format) warnings.push(`Rounds row ${rowIndex} has an unknown format “${formatRaw}”.`);

    const season = parseSeason(seasonRaw);
    if (seasonRaw && season.phase === "other") {
      warnings.push(`Rounds row ${rowIndex} has an unknown season “${seasonRaw}”.`);
    }

    const round: Round = {
      rowIndex,
      date,
      streamType: readCell(cells, headers, columns.streamType),
      round: readCell(cells, headers, columns.round),
      roundOrdinal: roundOrdinal(readCell(cells, headers, columns.round)),
      game: readCell(cells, headers, columns.game),
      format,
      playerARaw,
      playerBRaw,
      playerAKey: playerKey(playerARaw),
      playerBKey: playerKey(playerBRaw),
      gamesWonA: parseGames(readCell(cells, headers, columns.gamesWonA)),
      gamesWonB: parseGames(readCell(cells, headers, columns.gamesWonB)),
      winnerRaw,
      winnerKey: playerKey(winnerRaw),
      prizeMoney: parseMoney(readCell(cells, headers, columns.prizeMoney)),
      notes: readCell(cells, headers, columns.notes),
      seasonRaw,
      seasonId: season.seasonId,
      phase: season.phase,
    };

    if (round.winnerKey && round.winnerKey !== round.playerAKey && round.winnerKey !== round.playerBKey) {
      warnings.push(`Rounds row ${rowIndex}: winner “${winnerRaw}” is neither player.`);
    }
    rows.push(round);
  });

  return { rows, warnings };
}

export function parseStreamers(csv: string, playerColumn: string, publicColumns: string[]): ParseResult<Streamer> {
  const table = parseCsv(csv);
  const warnings: string[] = [];
  if (table.length === 0) return { rows: [], warnings: ["The Streamers tab is empty."] };
  const headers = headerIndex(table[0]);
  if (!headers.has(playerColumn.toLowerCase())) {
    warnings.push(`Streamers is missing a “${playerColumn}” column.`);
  }

  const rows: Streamer[] = [];
  const seen = new Set<string>();
  table.slice(1).forEach((cells) => {
    const name = readCell(cells, headers, playerColumn);
    const key = playerKey(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const values = new Map<string, string>();
    for (const column of publicColumns) values.set(column.toLowerCase(), readCell(cells, headers, column));
    const games = ["game 1", "game 2", "game 3"]
      .map((column) => values.get(column) ?? "")
      .filter(Boolean);
    const wildcards = ["wildcard 1", "wildcard 2"]
      .map((column) => values.get(column) ?? "")
      .filter(Boolean);
    rows.push({
      key,
      name,
      status: values.get("status") ?? "",
      language: values.get("language") ?? "",
      games,
      wildcards,
    });
  });
  return { rows, warnings };
}

function statusIsPublic(status: string, headerPresent: boolean): boolean {
  if (!headerPresent) return true;
  if (!status.trim()) return true;
  return scheduleStatus.allow.some((allowed) => allowed.toLowerCase() === status.trim().toLowerCase());
}

export function parseSchedule(
  csv: string,
  columns: StreamColumns | MatchupColumns,
  source: "streams" | "matchups",
): ParseResult<ScheduledStream> {
  const table = parseCsv(csv);
  const warnings: string[] = [];
  if (table.length === 0) return { rows: [], warnings: [`The ${source} tab is empty.`] };
  const headers = headerIndex(table[0]);
  const statusHeader = "status" in columns ? columns.status : "Status";
  const statusPresent = headers.has(statusHeader.toLowerCase());

  const rows: ScheduledStream[] = [];
  table.slice(1).forEach((cells, index) => {
    const players = columns.players.map((column) => readCell(cells, headers, column)).filter(Boolean);
    const dateRaw = readCell(cells, headers, columns.date);
    const roundCells = columns.rounds.map((column) => readCell(cells, headers, column)).filter(Boolean);
    if (players.length === 0 && !dateRaw && roundCells.length === 0) return;

    const date = parseFlexibleDate(dateRaw);
    if (dateRaw && !date) warnings.push(`${source} row ${index + 2} has a date I couldn’t read (“${dateRaw}”).`);
    const timeRaw = readCell(cells, headers, columns.time);
    const clock = parseClock(timeRaw);
    const start = date ? easternDateTime(date, clock?.hour ?? 12, clock?.minute ?? 0) : null;
    const pairs: [string, string][] = [];
    if (players.length >= 2) pairs.push([players[0], players[1]]);
    if (players.length >= 4) pairs.push([players[2], players[3]]);
    const extras = players.length === 3 ? [players[2]] : [];
    const status = statusPresent ? readCell(cells, headers, statusHeader) : "";

    rows.push({
      rowIndex: index + 2,
      date,
      start,
      day: "day" in columns ? readCell(cells, headers, columns.day) || (date ? weekdayName(date) : "") : date ? weekdayName(date) : "",
      timeLabel: timeRaw,
      streamType: readCell(cells, headers, columns.streamType),
      players,
      pairs,
      extras,
      rounds: roundCells.map((cell) => {
        const split = splitGameFormat(cell);
        return { label: cell, game: split.game, format: split.format };
      }),
      notes: readCell(cells, headers, columns.notes),
      status,
      seasonId: seasonIdForDate(date),
      included: source === "streams" && statusIsPublic(status, statusPresent),
    });
  });

  return { rows, warnings };
}
