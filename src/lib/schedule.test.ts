import { describe, expect, it } from "vitest";
import { columns } from "../config";
import { easternToUtc } from "./dates";
import { parseSchedule } from "./parse";
import { nextNight, upcomingNights } from "./schedule";

describe("public schedule", () => {
  const streams = parseSchedule(
    `Date,Day,Start time (ET),Stream type,Player 1,Player 2,Player 3,Player 4,Round 1,Round 2,Round 3,Notes,Status
2027-02-11,Thursday,1:00 PM,Fight Night,cyphon,jeana99,,,Bingo BO5,Brickbreaker BO3,CannonBlast BO3,,
2027-02-18,Thursday,1:00 PM,Fight Night,sweetnsour,va311299,,,Pool BO3,,,,
2027-02-10,Wednesday,1:00 PM,Fight Night,noob,Doku,,,Bingo BO3,,,,Suggested
2027-01-07,Thursday,1:00 PM,Fight Night,sweetnsour,cyphon,,,Brickbreaker BO3,,,,Finalized
`,
    { ...columns.streams, status: "Status" },
    "streams",
  ).rows;

  const now = easternToUtc(2027, 2, 8, 16, 0);

  it("keeps finalized and blank-status Streams rows and hides the rest", () => {
    const upcoming = upcomingNights(streams, now, 1);
    expect(upcoming.map((night) => night.date)).toEqual(["2027-02-11", "2027-02-18"]);
    expect(upcoming[0].pairs).toEqual([["cyphon", "jeana99"]]);
    expect(upcoming[0].plannedRounds[0]).toMatchObject({ game: "Bingo", format: "BO5" });
    expect(nextNight(streams, now, 1)?.streamType).toBe("Fight Night");
  });

  it("does not treat the Matchups tab as the public schedule", () => {
    const matchups = parseSchedule(
      `Stream type,Player 1,Player 2,Player 3,Player 4,Status,Date,Time (ET),Round 1,Round 2,Round 3,Feedback
Fight Night,cyphon,jeana99,,,Finalized,2027-02-09,1:00 PM,Bingo BO3,Bingo BO5,Brickbreaker BO3,Ready
`,
      columns.matchups,
      "matchups",
    ).rows;
    expect(matchups[0].included).toBe(false);
    expect(upcomingNights(matchups, now, 1)).toEqual([]);
    expect(nextNight([...matchups, ...streams], now, 1)?.date).toBe("2027-02-11");
  });
});
