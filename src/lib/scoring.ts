import { formatList } from "./dates";
import { compareRounds, isDecisive } from "./parse";
import { payoutForPlace, PLAYOFF_SPOTS, pointsForFormat, ROUND_CAP } from "./rules";
import type { Round } from "./types";

export interface SeasonScore {
  key: string;
  points: number;
  roundsCounted: number;
  roundsPlayed: number;
  /** Sheet row numbers, in the order they counted toward the cap. */
  countedRows: number[];
  uncountedRows: number[];
}

export function scoreRegularSeason(rounds: Round[], seasonId: number, cap = ROUND_CAP): Map<string, SeasonScore> {
  const relevant = rounds
    .filter((round) => round.seasonId === seasonId && round.phase === "regular" && isDecisive(round))
    .sort(compareRounds);

  const scores = new Map<string, SeasonScore>();
  const used = new Map<string, number>();

  const ensure = (key: string): SeasonScore => {
    const existing = scores.get(key);
    if (existing) return existing;
    const created: SeasonScore = {
      key,
      points: 0,
      roundsCounted: 0,
      roundsPlayed: 0,
      countedRows: [],
      uncountedRows: [],
    };
    scores.set(key, created);
    return created;
  };

  for (const round of relevant) {
    for (const key of [round.playerAKey, round.playerBKey]) {
      if (!key) continue;
      const score = ensure(key);
      score.roundsPlayed += 1;
      const soFar = used.get(key) ?? 0;
      if (soFar < cap) {
        used.set(key, soFar + 1);
        score.roundsCounted += 1;
        score.countedRows.push(round.rowIndex);
        if (round.winnerKey === key) score.points += pointsForFormat(round.format);
      } else {
        score.uncountedRows.push(round.rowIndex);
      }
    }
  }

  return scores;
}

export type Qualification = "in" | "out" | "pending";
export type Band = "gold" | "blue" | "gray";

export interface StandingInput {
  key: string;
  name: string;
  points: number;
  roundsCounted: number;
  roundsPlayed: number;
}

export interface StandingRow extends StandingInput {
  rank: number;
  placeLabel: string;
  tied: boolean;
  needsFightNight: boolean;
  tieNames: string[];
  positionStart: number;
  positionEnd: number;
  qualifies: Qualification;
  /** Null when a tie-break Fight Night has to decide the dollar amount. */
  payout: number | null;
  band: Band;
}

export function buildStandings(players: StandingInput[]): StandingRow[] {
  const ranked = players
    .filter((player) => player.roundsPlayed > 0)
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name) || a.key.localeCompare(b.key));

  const rows: StandingRow[] = [];
  let index = 0;
  while (index < ranked.length) {
    let end = index + 1;
    while (end < ranked.length && ranked[end].points === ranked[index].points) end += 1;
    const group = ranked.slice(index, end);
    const positionStart = index + 1;
    const positionEnd = end;
    const tied = group.length > 1;
    const payouts = [];
    for (let place = positionStart; place <= positionEnd; place += 1) payouts.push(payoutForPlace(place));
    const distinctPayouts = new Set(payouts);
    const crossesCut = positionStart <= PLAYOFF_SPOTS && positionEnd > PLAYOFF_SPOTS;
    const needsFightNight = tied && (distinctPayouts.size > 1 || crossesCut || positionStart <= PLAYOFF_SPOTS);
    let qualifies: Qualification;
    if (!tied && positionStart <= PLAYOFF_SPOTS) qualifies = "in";
    else if (!tied) qualifies = "out";
    else if (positionEnd <= PLAYOFF_SPOTS) qualifies = "in";
    else if (positionStart > PLAYOFF_SPOTS) qualifies = "out";
    else qualifies = "pending";

    const payout = needsFightNight && distinctPayouts.size > 1 ? null : payouts[0];
    const band: Band =
      qualifies === "in" || qualifies === "pending" ? "gold" : positionStart <= 12 ? "blue" : "gray";
    const tieNames = group.map((player) => player.name);

    for (const player of group) {
      rows.push({
        ...player,
        rank: positionStart,
        placeLabel: tied ? `T-${positionStart}` : String(positionStart),
        tied,
        needsFightNight,
        tieNames,
        positionStart,
        positionEnd,
        qualifies,
        payout,
        band,
      });
    }
    index = end;
  }
  return rows;
}

export function seedingBlocked(rows: StandingRow[]): boolean {
  return rows.some((row) => row.tied && row.positionStart <= PLAYOFF_SPOTS);
}

export function tieNotes(rows: StandingRow[]): string[] {
  const notes: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.needsFightNight) continue;
    const id = `${row.positionStart}:${row.points}`;
    if (seen.has(id)) continue;
    seen.add(id);
    notes.push(
      `${formatList(row.tieNames)} are tied on ${row.points} points. A tie-break Fight Night decides who finishes higher.`,
    );
  }
  return notes;
}

export interface UnrankedPlayer {
  key: string;
  name: string;
  status: string;
}

/** Players on the active roster who have not recorded a decisive regular-season round. */
export function unrankedRoster(
  roster: { key: string; name: string; status: string }[],
  rankedKeys: Set<string>,
): UnrankedPlayer[] {
  return roster
    .filter((player) => !rankedKeys.has(player.key) && isActiveStatus(player.status))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((player) => ({ key: player.key, name: player.name, status: player.status }));
}

export function isActiveStatus(status: string): boolean {
  const value = status.trim().toLowerCase();
  return value === "active" || value === "on hold";
}
