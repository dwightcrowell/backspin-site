import { describe, expect, it } from "vitest";
import { columns } from "../config";
import matchupsCsv from "../sample/matchups.csv?raw";
import roundsCsv from "../sample/rounds.csv?raw";
import streamersCsv from "../sample/streamers.csv?raw";
import streamsCsv from "../sample/streams.csv?raw";
import { easternToUtc } from "./dates";
import { buildDirectory } from "./directory";
import { parseRounds, parseSchedule, parseStreamers } from "./parse";
import { pointsForFormat } from "./rules";
import { nextNight } from "./schedule";
import { isDecisive } from "./parse";
import { scoreRegularSeason } from "./scoring";
import { seasonById } from "./seasons";
import { buildSeasonView } from "./view";

describe("bundled sample season", () => {
  const rounds = parseRounds(roundsCsv, columns.rounds).rows;
  const streamers = parseStreamers(streamersCsv, columns.streamers.player, columns.streamers.publicColumns).rows;
  const streams = parseSchedule(streamsCsv, columns.streams, "streams").rows;
  const matchups = parseSchedule(matchupsCsv, columns.matchups, "matchups").rows;
  const now = easternToUtc(2027, 2, 8, 16, 0);
  const players = buildDirectory(streamers, rounds);
  const view = buildSeasonView(players, rounds, seasonById(1), now);

  it("caps sweetnsour at the first 20 rounds and still records the rest", () => {
    const scores = scoreRegularSeason(rounds, 1);
    const sweet = scores.get("sweetnsour");
    expect(sweet?.roundsCounted).toBe(20);
    expect(sweet?.roundsPlayed).toBeGreaterThan(20);
    const everyWin = rounds
      .filter(
        (round) =>
          round.seasonId === 1 &&
          round.phase === "regular" &&
          isDecisive(round) &&
          round.winnerKey === "sweetnsour",
      )
      .reduce((sum, round) => sum + pointsForFormat(round.format), 0);
    expect(sweet?.points).toBeLessThan(everyWin);
  });

  it("ranks a unique top eight and flags the payout tie underneath", () => {
    expect(view.seedsFinal).toBe(false);
    expect(view.bracket.blockedByTie).toBe(false);
    expect(view.standings.slice(0, 8).every((row) => row.qualifies === "in" && !row.tied)).toBe(true);
    const tied = view.standings.filter((row) => row.needsFightNight);
    expect(tied.map((row) => row.key).sort()).toEqual(["ally10509", "plantmomma"]);
    expect(tied.every((row) => row.placeLabel === "T-9" && row.payout === null && row.band === "blue")).toBe(true);
    expect(view.tieNotes[0]).toMatch(/Fight Night/);
    expect(view.standings[0].key).toBe("sweetnsour");
  });

  it("points the next Fight Night at cyphon vs jeana99 and ignores matchups", () => {
    const next = nextNight(streams, now, 1);
    expect(next?.date).toBe("2027-02-11");
    expect(next?.pairs).toEqual([["cyphon", "jeana99"]]);
    expect(next?.plannedRounds[0]).toMatchObject({ game: "Bingo", format: "BO5" });
    expect(matchups.every((row) => row.included === false)).toBe(true);
    expect(nextNight([...matchups, ...streams], now, 1)?.date).toBe("2027-02-11");
  });
});
