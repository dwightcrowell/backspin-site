import { describe, expect, it } from "vitest";
import { columns } from "../config";
import { formatWinPct } from "./dates";
import { parseRounds } from "./parse";
import { recordFor } from "./records";

const HEADER =
  "Stream date,Stream type,Round,Game,Format,Player A,Player B,Games won A,Games won B,Winner,Prize money,Notes,Season";

describe("player records", () => {
  const rounds = parseRounds(
    `${HEADER}
2027-01-07,Fight Night,Round 1,Bingo,BO3,Alpha,Beta,2,1,Alpha,,,BSG 1 - Regular
2027-01-07,Fight Night,Round 2,Pool,BO5,Beta,Alpha,3,2,Beta,,,BSG 1 - Regular
2027-01-14,Fight Night,Round 1,Bingo,BO7,Alpha,Cy,4,1,Alpha,,,BSG 1 - Playoffs
2027-01-14,Fight Night,Round 2,Bingo,BO3,Alpha,Beta,1,1,,,,BSG 1 - Regular
2026-12-18,Fight Night,Round 1,Solitaire,BO3,Alpha,Beta,2,0,Alpha,,,Non-BSG
`,
    columns.rounds,
  ).rows;

  it("skips ties and blank winners and folds both player orders into one head-to-head", () => {
    const record = recordFor(rounds, "alpha");
    expect(record.overall).toEqual({ wins: 3, losses: 1 });
    expect(record.byFormat.BO3).toEqual({ wins: 2, losses: 0 });
    expect(record.byFormat.BO5).toEqual({ wins: 0, losses: 1 });
    expect(record.byFormat.BO7).toEqual({ wins: 1, losses: 0 });
    expect(record.byGame.map((row) => row.game)).toEqual(["Bingo", "Pool", "Solitaire"]);
    expect(formatWinPct(3, 1)).toBe("75%");
    expect(formatWinPct(0, 0)).toBe("—");

    const beta = record.headToHead.find((row) => row.opponentKey === "beta");
    expect(beta?.overall).toEqual({ wins: 2, losses: 1 });
    expect(beta?.byGameFormat).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ game: "Bingo", format: "BO3", tally: { wins: 1, losses: 0 } }),
        expect.objectContaining({ game: "Pool", format: "BO5", tally: { wins: 0, losses: 1 } }),
      ]),
    );
  });
});
