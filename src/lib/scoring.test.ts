import { describe, expect, it } from "vitest";
import { columns } from "../config";
import { parseRounds } from "./parse";
import { payoutForPlace, POINTS_PER_ROUND } from "./rules";
import { buildStandings, scoreRegularSeason, seedingBlocked, tieNotes } from "./scoring";

const HEADER =
  "Stream date,Stream type,Round,Game,Format,Player A,Player B,Games won A,Games won B,Winner,Prize money,Notes,Season";

function load(body: string) {
  return parseRounds(`${HEADER}\n${body}`, columns.rounds).rows;
}

describe("points per round won", () => {
  it("awards 1, 2, and 3 points for winning a BO3, BO5, and BO7", () => {
    expect(POINTS_PER_ROUND).toEqual({ BO3: 1, BO5: 2, BO7: 3 });
    const rounds = load(`
2027-01-07,Fight Night,Round 1,Bingo,BO3,Alpha,Beta,2,0,Alpha,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 2,Bingo,BO5,Alpha,Beta,3,1,Alpha,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 3,Bingo,BO7,Alpha,Beta,4,2,Beta,,,BSG 1 - Regular
2027-01-14,Fight Night,Round 1,Pool,BO3,Alpha,Beta,2,1,Beta,,,BSG 1 - Playoffs
2027-01-14,Fight Night,Round 1,Pool,BO5,Alpha,Beta,3,0,Alpha,,,Non-BSG
`);
    const scores = scoreRegularSeason(rounds, 1);
    expect(scores.get("alpha")?.points).toBe(3);
    expect(scores.get("beta")?.points).toBe(3);
    expect(scores.get("alpha")?.roundsCounted).toBe(3);
    expect(scores.get("beta")?.roundsPlayed).toBe(3);
  });

  it("ignores blank winners and ties, and does not let them use up the cap", () => {
    const rounds = load(`
2027-01-07,Fight Night,Round 1,Bingo,BO7,Alpha,Beta,1,1,,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 2,Bingo,BO3,Alpha,Beta,0,0,,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 3,Bingo,BO5,Alpha,Beta,3,2,Alpha,,,BSG 1 - Regular
`);
    const scores = scoreRegularSeason(rounds, 1, 1);
    expect(scores.get("alpha")?.points).toBe(2);
    expect(scores.get("alpha")?.roundsCounted).toBe(1);
    expect(scores.get("beta")?.roundsPlayed).toBe(1);
  });
});

describe("the 20-round cap", () => {
  it("counts rounds by stream date, then round number, not by sheet order", () => {
    const rounds = load(`
2027-01-08,Fight Night,Round 1,Bingo,BO5,Alpha,Beta,3,0,Alpha,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 2,Bingo,BO3,Alpha,Beta,2,0,Alpha,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 1,Bingo,BO7,Alpha,Beta,4,1,Alpha,,,BSG 1 - Regular
`);
    const scores = scoreRegularSeason(rounds, 1, 2);
    expect(scores.get("alpha")?.points).toBe(4);
    expect(scores.get("alpha")?.countedRows).toEqual([4, 3]);
    expect(scores.get("alpha")?.uncountedRows).toEqual([2]);
    expect(scores.get("alpha")?.roundsPlayed).toBe(3);
    expect(scores.get("alpha")?.roundsCounted).toBe(2);
  });

  it("drops points from round 21 onward", () => {
    const lines = Array.from({ length: 21 }, (_, index) => {
      const day = String((index % 28) + 1).padStart(2, "0");
      return `2027-02-${day},Fight Night,Round ${index + 1},Bingo,BO7,Alpha,Beta,4,0,Alpha,,,BSG 1 - Regular`;
    });
    const scores = scoreRegularSeason(load(lines.join("\n")), 1);
    expect(scores.get("alpha")?.roundsCounted).toBe(20);
    expect(scores.get("alpha")?.roundsPlayed).toBe(21);
    expect(scores.get("alpha")?.points).toBe(60);
  });
});

describe("ranking and payouts", () => {
  it("pays the published bonus table and leaves 13th unpaid", () => {
    expect(payoutForPlace(1)).toBe(350);
    expect(payoutForPlace(8)).toBe(70);
    expect(payoutForPlace(12)).toBe(25);
    expect(payoutForPlace(13)).toBe(0);
    const names = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"];
    const rows = buildStandings(
      names.map((name, index) => ({
        key: name.toLowerCase(),
        name,
        points: 100 - index,
        roundsCounted: 1,
        roundsPlayed: 1,
      })),
    );
    expect(rows.map((row) => row.payout)).toEqual([350, 250, 200, 150, 125, 100, 80, 70, 60, 50, 40, 25, 0]);
    expect(rows[0].band).toBe("gold");
    expect(rows[8].band).toBe("blue");
    expect(rows[12].band).toBe("gray");
    expect(rows[7].qualifies).toBe("in");
    expect(rows[8].qualifies).toBe("out");
  });

  it("shows a tie and withholds payout when a Fight Night has to split two places", () => {
    const rows = buildStandings([
      { key: "ada", name: "Ada", points: 10, roundsCounted: 4, roundsPlayed: 4 },
      { key: "bea", name: "Bea", points: 10, roundsCounted: 4, roundsPlayed: 4 },
      { key: "cy", name: "Cy", points: 4, roundsCounted: 2, roundsPlayed: 2 },
    ]);
    expect(rows.map((row) => row.placeLabel)).toEqual(["T-1", "T-1", "3"]);
    expect(rows[0].needsFightNight).toBe(true);
    expect(rows[0].payout).toBeNull();
    expect(rows[2].rank).toBe(3);
    expect(rows[2].payout).toBe(200);
    expect(seedingBlocked(rows)).toBe(true);
    expect(tieNotes(rows)[0]).toMatch(/Ada and Bea are tied on 10 points/);
  });

  it("does not ask for a Fight Night when a tie is entirely outside the paid places", () => {
    const rows = buildStandings(
      Array.from({ length: 14 }, (_, index) => ({
        key: `p${index}`,
        name: `P${index}`,
        points: index < 12 ? 20 - index : 0,
        roundsCounted: 1,
        roundsPlayed: 1,
      })),
    );
    const bottom = rows.filter((row) => row.points === 0);
    expect(bottom.every((row) => row.placeLabel === "T-13")).toBe(true);
    expect(bottom.every((row) => row.needsFightNight === false)).toBe(true);
    expect(bottom.every((row) => row.payout === 0)).toBe(true);
    expect(seedingBlocked(rows)).toBe(false);
  });

  it("blocks seeding when a tie crosses the playoff cut and still flags the payout tie below it", () => {
    const rows = buildStandings([
      ...Array.from({ length: 7 }, (_, index) => ({
        key: `s${index}`,
        name: `Seed${index}`,
        points: 30 - index,
        roundsCounted: 1,
        roundsPlayed: 1,
      })),
      { key: "jay", name: "Jay", points: 12, roundsCounted: 4, roundsPlayed: 4 },
      { key: "pat", name: "Pat", points: 12, roundsCounted: 4, roundsPlayed: 4 },
      { key: "quinn", name: "Quinn", points: 9, roundsCounted: 3, roundsPlayed: 3 },
    ]);
    expect(rows.find((row) => row.key === "jay")?.qualifies).toBe("pending");
    expect(rows.find((row) => row.key === "jay")?.band).toBe("gold");
    expect(seedingBlocked(rows)).toBe(true);

    const paidTie = buildStandings([
      ...Array.from({ length: 8 }, (_, index) => ({
        key: `s${index}`,
        name: `Seed${index}`,
        points: 40 - index,
        roundsCounted: 1,
        roundsPlayed: 1,
      })),
      { key: "jay", name: "Jay", points: 10, roundsCounted: 4, roundsPlayed: 4 },
      { key: "pat", name: "Pat", points: 10, roundsCounted: 4, roundsPlayed: 4 },
    ]);
    expect(seedingBlocked(paidTie)).toBe(false);
    expect(paidTie.find((row) => row.key === "jay")).toMatchObject({
      placeLabel: "T-9",
      band: "blue",
      needsFightNight: true,
      payout: null,
      qualifies: "out",
    });
  });
});
