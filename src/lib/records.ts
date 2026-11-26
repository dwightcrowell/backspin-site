import { compareRounds, isDecisive } from "./parse";
import { FORMATS, type Format } from "./rules";
import type { Round } from "./types";

export interface Tally {
  wins: number;
  losses: number;
}

export interface GameTally {
  game: string;
  format?: Format;
  tally: Tally;
}

export interface HeadToHead {
  opponentKey: string;
  overall: Tally;
  byFormat: Record<Format, Tally>;
  byGame: GameTally[];
  byGameFormat: GameTally[];
}

export interface PlayerRecord {
  overall: Tally;
  byFormat: Record<Format, Tally>;
  byGame: GameTally[];
  byGameFormat: GameTally[];
  headToHead: HeadToHead[];
  recent: Round[];
}

function emptyTally(): Tally {
  return { wins: 0, losses: 0 };
}

function emptyFormats(): Record<Format, Tally> {
  return { BO3: emptyTally(), BO5: emptyTally(), BO7: emptyTally() };
}

function addResult(tally: Tally, won: boolean) {
  if (won) tally.wins += 1;
  else tally.losses += 1;
}

function gamesOf(map: Map<string, Tally>): GameTally[] {
  return [...map.entries()]
    .map(([game, tally]) => ({ game, tally }))
    .sort((a, b) => b.tally.wins + b.tally.losses - (a.tally.wins + a.tally.losses) || a.game.localeCompare(b.game));
}

export function recordFor(rounds: Round[], playerKey: string): PlayerRecord {
  const overall = emptyTally();
  const byFormat = emptyFormats();
  const gameMap = new Map<string, Tally>();
  const gameFormatMap = new Map<string, Tally>();
  const opponents = new Map<
    string,
    { overall: Tally; byFormat: Record<Format, Tally>; games: Map<string, Tally>; gameFormats: Map<string, Tally> }
  >();

  const involved = rounds
    .filter((round) => round.playerAKey === playerKey || round.playerBKey === playerKey)
    .sort((a, b) => compareRounds(b, a));

  for (const round of involved) {
    if (!isDecisive(round)) continue;
    const won = round.winnerKey === playerKey;
    const opponent = round.playerAKey === playerKey ? round.playerBKey : round.playerAKey;
    addResult(overall, won);
    if (round.format) addResult(byFormat[round.format], won);
    if (round.game) {
      const game = gameMap.get(round.game) ?? emptyTally();
      addResult(game, won);
      gameMap.set(round.game, game);
      if (round.format) {
        const id = `${round.game}|${round.format}`;
        const combo = gameFormatMap.get(id) ?? emptyTally();
        addResult(combo, won);
        gameFormatMap.set(id, combo);
      }
    }
    if (!opponent) continue;
    const bucket = opponents.get(opponent) ?? {
      overall: emptyTally(),
      byFormat: emptyFormats(),
      games: new Map<string, Tally>(),
      gameFormats: new Map<string, Tally>(),
    };
    addResult(bucket.overall, won);
    if (round.format) addResult(bucket.byFormat[round.format], won);
    if (round.game) {
      const game = bucket.games.get(round.game) ?? emptyTally();
      addResult(game, won);
      bucket.games.set(round.game, game);
      if (round.format) {
        const id = `${round.game}|${round.format}`;
        const combo = bucket.gameFormats.get(id) ?? emptyTally();
        addResult(combo, won);
        bucket.gameFormats.set(id, combo);
      }
    }
    opponents.set(opponent, bucket);
  }

  const headToHead: HeadToHead[] = [...opponents.entries()]
    .map(([opponentKey, bucket]) => ({
      opponentKey,
      overall: bucket.overall,
      byFormat: bucket.byFormat,
      byGame: gamesOf(bucket.games),
      byGameFormat: [...bucket.gameFormats.entries()].map(([id, tally]) => {
        const [game, format] = id.split("|");
        return { game, format: format as Format, tally };
      }),
    }))
    .sort(
      (a, b) =>
        b.overall.wins + b.overall.losses - (a.overall.wins + a.overall.losses) ||
        a.opponentKey.localeCompare(b.opponentKey),
    );

  return {
    overall,
    byFormat,
    byGame: gamesOf(gameMap),
    byGameFormat: [...gameFormatMap.entries()]
      .map(([id, tally]) => {
        const [game, format] = id.split("|");
        return { game, format: format as Format, tally };
      })
      .sort((a, b) => a.game.localeCompare(b.game) || FORMATS.indexOf(a.format!) - FORMATS.indexOf(b.format!)),
    headToHead,
    recent: involved,
  };
}
