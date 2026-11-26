import { buildBracket, type BracketModel } from "./bracket";
import { seasonPhase, type SeasonWindow } from "./seasons";
import { buildStandings, scoreRegularSeason, seedingBlocked, tieNotes, unrankedRoster, type StandingRow } from "./scoring";
import type { DirectoryPlayer, Round } from "./types";

export interface SeasonView {
  standings: StandingRow[];
  unranked: { key: string; name: string; status: string }[];
  tieNotes: string[];
  bracket: BracketModel;
  seedsFinal: boolean;
}

export function buildSeasonView(players: DirectoryPlayer[], rounds: Round[], season: SeasonWindow, now: Date): SeasonView {
  const scores = scoreRegularSeason(rounds, season.id);
  const inputs = players
    .filter((player) => scores.has(player.key))
    .map((player) => {
      const score = scores.get(player.key)!;
      return {
        key: player.key,
        name: player.name,
        points: score.points,
        roundsCounted: score.roundsCounted,
        roundsPlayed: score.roundsPlayed,
      };
    });

  const standings = buildStandings(inputs);
  const rankedKeys = new Set(standings.map((row) => row.key));
  const unranked = unrankedRoster(players, rankedKeys);
  const playoffRounds = rounds.filter((round) => round.seasonId === season.id && round.phase === "playoffs");
  const blockedByTie = seedingBlocked(standings);
  const phase = seasonPhase(season, now);
  const calendarFinal = phase === "playoffs" || phase === "break" || phase === "complete";
  const seedsFinal = (calendarFinal || playoffRounds.length > 0) && !blockedByTie;
  const names = new Map(players.map((player) => [player.key, player.name]));
  const bracket = buildBracket({ standings, playoffRounds, seedsFinal, blockedByTie, names });

  return { standings, unranked, tieNotes: tieNotes(standings), bracket, seedsFinal };
}
