import { isDecisive } from "./parse";
import { PLAYOFF_PRIZES } from "./rules";
import type { StandingRow } from "./scoring";
import type { Round } from "./types";

export interface BracketPlayer {
  key: string | null;
  name: string;
  seed: number | null;
}

export interface BracketMatch {
  id: string;
  code: string;
  roundLabel: string;
  playerA: BracketPlayer;
  playerB: BracketPlayer;
  winsA: number;
  winsB: number;
  winnerKey: string | null;
  loserKey: string | null;
  decided: boolean;
  rounds: Round[];
}

export interface BracketModel {
  seedsFinal: boolean;
  blockedByTie: boolean;
  quarters: BracketMatch[];
  semis: BracketMatch[];
  final: BracketMatch;
  championKey: string | null;
  prizes: Record<string, number>;
  unplaced: Round[];
}

const QUARTER_SLOTS: { id: string; code: string; seeds: [number, number] }[] = [
  { id: "qf1", code: "QF1", seeds: [1, 8] },
  { id: "qf2", code: "QF2", seeds: [4, 5] },
  { id: "qf3", code: "QF3", seeds: [2, 7] },
  { id: "qf4", code: "QF4", seeds: [3, 6] },
];

export function projectedSeeds(standings: StandingRow[]): (StandingRow | null)[] {
  const seeds: (StandingRow | null)[] = [];
  for (let index = 0; index < 8; index += 1) seeds.push(standings[index] ?? null);
  return seeds;
}

function emptyPlayer(): BracketPlayer {
  return { key: null, name: "", seed: null };
}

function playerFromSeed(seed: StandingRow | null, seedNumber: number): BracketPlayer {
  if (!seed) return { key: null, name: "", seed: seedNumber };
  return { key: seed.key, name: seed.name, seed: seedNumber };
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function seriesBetween(rounds: Round[], a: string, b: string): { winsA: number; winsB: number; used: Round[]; open: boolean } {
  const key = pairKey(a, b);
  const related = rounds.filter(
    (round) => round.playerAKey && round.playerBKey && pairKey(round.playerAKey, round.playerBKey) === key,
  );
  let winsA = 0;
  let winsB = 0;
  let open = false;
  const used: Round[] = [];
  for (const round of related) {
    used.push(round);
    if (!isDecisive(round)) {
      open = true;
      continue;
    }
    if (round.winnerKey === a) winsA += 1;
    else if (round.winnerKey === b) winsB += 1;
  }
  return { winsA, winsB, used, open };
}

function decideMatch(
  id: string,
  code: string,
  roundLabel: string,
  playerA: BracketPlayer,
  playerB: BracketPlayer,
  rounds: Round[],
  seedsFinal: boolean,
): { match: BracketMatch; used: Round[] } {
  if (!seedsFinal || !playerA.key || !playerB.key) {
    return {
      match: {
        id,
        code,
        roundLabel,
        playerA,
        playerB,
        winsA: 0,
        winsB: 0,
        winnerKey: null,
        loserKey: null,
        decided: false,
        rounds: [],
      },
      used: [],
    };
  }

  const series = seriesBetween(rounds, playerA.key, playerB.key);
  const decided = !series.open && series.winsA !== series.winsB && series.winsA + series.winsB > 0;
  const winnerKey = !decided ? null : series.winsA > series.winsB ? playerA.key : playerB.key;
  const loserKey = !decided ? null : winnerKey === playerA.key ? playerB.key : playerA.key;
  return {
    match: {
      id,
      code,
      roundLabel,
      playerA,
      playerB,
      winsA: series.winsA,
      winsB: series.winsB,
      winnerKey,
      loserKey,
      decided,
      rounds: series.used,
    },
    used: series.used,
  };
}

function winnerPlayer(match: BracketMatch, seeds: BracketPlayer[]): BracketPlayer {
  if (!match.winnerKey) return { key: null, name: `${match.code} winner`, seed: null };
  return seeds.find((player) => player.key === match.winnerKey) ?? { key: match.winnerKey, name: match.winnerKey, seed: null };
}

export function buildBracket(options: {
  standings: StandingRow[];
  playoffRounds: Round[];
  seedsFinal: boolean;
  blockedByTie: boolean;
  names: Map<string, string>;
}): BracketModel {
  const seeds = projectedSeeds(options.standings).map((row, index) => playerFromSeed(row, index + 1));
  const quarters: BracketMatch[] = [];
  const usedRows = new Set<number>();

  QUARTER_SLOTS.forEach((slot, index) => {
    const result = decideMatch(
      slot.id,
      slot.code,
      "Quarterfinal",
      seeds[slot.seeds[0] - 1] ?? emptyPlayer(),
      seeds[slot.seeds[1] - 1] ?? emptyPlayer(),
      options.playoffRounds,
      options.seedsFinal,
    );
    quarters[index] = result.match;
    for (const round of result.used) usedRows.add(round.rowIndex);
  });

  const semiSeeds: BracketPlayer[] = [
    winnerPlayer(quarters[0], seeds),
    winnerPlayer(quarters[1], seeds),
    winnerPlayer(quarters[2], seeds),
    winnerPlayer(quarters[3], seeds),
  ];

  const semiResults = [
    decideMatch("sf1", "SF1", "Semifinal", semiSeeds[0], semiSeeds[1], options.playoffRounds, options.seedsFinal),
    decideMatch("sf2", "SF2", "Semifinal", semiSeeds[2], semiSeeds[3], options.playoffRounds, options.seedsFinal),
  ];
  const semis = semiResults.map((result) => result.match);
  for (const result of semiResults) {
    for (const round of result.used) usedRows.add(round.rowIndex);
  }

  const finalResult = decideMatch(
    "final",
    "Final",
    "Final",
    winnerPlayer(semis[0], seeds),
    winnerPlayer(semis[1], seeds),
    options.playoffRounds,
    options.seedsFinal,
  );
  for (const round of finalResult.used) usedRows.add(round.rowIndex);

  const prizes: Record<string, number> = {};
  if (options.seedsFinal) {
    for (const match of quarters) {
      if (match.loserKey) prizes[match.loserKey] = PLAYOFF_PRIZES.quarterfinal;
    }
    for (const match of semis) {
      if (match.loserKey) prizes[match.loserKey] = PLAYOFF_PRIZES.semifinal;
    }
    if (finalResult.match.loserKey) prizes[finalResult.match.loserKey] = PLAYOFF_PRIZES.runnerUp;
    if (finalResult.match.winnerKey) prizes[finalResult.match.winnerKey] = PLAYOFF_PRIZES.champion;
  }

  const unplaced = options.seedsFinal
    ? options.playoffRounds.filter((round) => !usedRows.has(round.rowIndex))
    : options.playoffRounds;

  return {
    seedsFinal: options.seedsFinal,
    blockedByTie: options.blockedByTie,
    quarters,
    semis,
    final: finalResult.match,
    championKey: options.seedsFinal ? finalResult.match.winnerKey : null,
    prizes,
    unplaced,
  };
}

export function displayName(key: string | null, names: Map<string, string>, fallback = ""): string {
  if (!key) return fallback;
  return names.get(key) ?? fallback ?? key;
}
