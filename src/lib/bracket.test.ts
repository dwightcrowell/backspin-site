import { describe, expect, it } from "vitest";
import { columns } from "../config";
import { buildBracket } from "./bracket";
import { parseRounds } from "./parse";
import { PLAYOFF_PRIZES } from "./rules";
import { buildStandings } from "./scoring";
import type { StandingRow } from "./scoring";

const HEADER =
  "Stream date,Stream type,Round,Game,Format,Player A,Player B,Games won A,Games won B,Winner,Prize money,Notes,Season";

function playoff(body: string) {
  return parseRounds(`${HEADER}\n${body}`, columns.rounds).rows;
}

function field(names: string[]): StandingRow[] {
  return buildStandings(
    names.map((name, index) => ({
      key: name.toLowerCase(),
      name,
      points: 80 - index,
      roundsCounted: 1,
      roundsPlayed: 1,
    })),
  );
}

describe("playoff bracket", () => {
  const seeds = field(["Ann", "Bea", "Cy", "Dee", "Eve", "Fay", "Gia", "Holly"]);

  it("seeds 1v8, 4v5, 2v7, and 3v6, then crosses the winners", () => {
    const rounds = playoff(`
2027-03-16,Bracket,Round 1,Bingo,BO3,Ann,Holly,2,0,Ann,,,BSG 1 - Playoffs
2027-03-16,Bracket,Round 2,Bingo,BO3,Ann,Holly,2,1,Holly,,,BSG 1 - Playoffs
2027-03-16,Bracket,Round 3,Bingo,BO5,Ann,Holly,3,1,Ann,,,BSG 1 - Playoffs
2027-03-16,Bracket,Round 1,Pool,BO3,Dee,Eve,2,1,Eve,,,BSG 1 - Playoffs
2027-03-17,Bracket,Round 1,Pool,BO3,Bea,Gia,2,0,Bea,,,BSG 1 - Playoffs
2027-03-17,Bracket,Round 1,Pool,BO3,Cy,Fay,1,2,Fay,,,BSG 1 - Playoffs
2027-03-20,Bracket,Semi 1,Bingo,BO5,Ann,Eve,3,2,Ann,,,BSG 1 - Playoffs
2027-03-20,Bracket,Semi 2,Bingo,BO5,Bea,Fay,3,1,Fay,,,BSG 1 - Playoffs
2027-03-27,Bracket,Final,Bingo,BO7,Ann,Fay,4,2,Fay,,,BSG 1 - Playoffs
2027-03-27,Bracket,Round 1,Cooking,BO3,Zoe,Ann,2,0,Zoe,,,BSG 1 - Playoffs
`);
    const bracket = buildBracket({
      standings: seeds,
      playoffRounds: rounds,
      seedsFinal: true,
      blockedByTie: false,
      names: new Map(),
    });

    expect(bracket.quarters.map((match) => [match.playerA.name, match.playerB.name, match.winnerKey])).toEqual([
      ["Ann", "Holly", "ann"],
      ["Dee", "Eve", "eve"],
      ["Bea", "Gia", "bea"],
      ["Cy", "Fay", "fay"],
    ]);
    expect(bracket.quarters[0].winsA).toBe(2);
    expect(bracket.quarters[0].winsB).toBe(1);
    expect(bracket.semis.map((match) => match.winnerKey)).toEqual(["ann", "fay"]);
    expect(bracket.championKey).toBe("fay");
    expect(bracket.prizes).toEqual({
      holly: PLAYOFF_PRIZES.quarterfinal,
      dee: PLAYOFF_PRIZES.quarterfinal,
      gia: PLAYOFF_PRIZES.quarterfinal,
      cy: PLAYOFF_PRIZES.quarterfinal,
      eve: PLAYOFF_PRIZES.semifinal,
      bea: PLAYOFF_PRIZES.semifinal,
      ann: PLAYOFF_PRIZES.runnerUp,
      fay: PLAYOFF_PRIZES.champion,
    });
    expect(bracket.unplaced.map((round) => round.playerARaw)).toEqual(["Zoe"]);
  });

  it("leaves a 1-1 series undecided until one player leads", () => {
    const rounds = playoff(`
2027-03-16,Bracket,Round 1,Bingo,BO3,Ann,Holly,2,0,Ann,,,BSG 1 - Playoffs
2027-03-16,Bracket,Round 2,Bingo,BO3,Ann,Holly,0,2,Holly,,,BSG 1 - Playoffs
`);
    const bracket = buildBracket({
      standings: seeds,
      playoffRounds: rounds,
      seedsFinal: true,
      blockedByTie: false,
      names: new Map(),
    });
    expect(bracket.quarters[0].decided).toBe(false);
    expect(bracket.semis[0].playerA.name).toBe("QF1 winner");
    expect(bracket.championKey).toBeNull();
  });

  it("shows the path as TBD until seeding is final", () => {
    const rounds = playoff(`2027-03-16,Bracket,Round 1,Bingo,BO3,Ann,Holly,2,0,Ann,,,BSG 1 - Playoffs`);
    const bracket = buildBracket({
      standings: seeds,
      playoffRounds: rounds,
      seedsFinal: false,
      blockedByTie: false,
      names: new Map(),
    });
    expect(bracket.quarters[0].winnerKey).toBeNull();
    expect(bracket.quarters[0].playerA.name).toBe("Ann");
    expect(bracket.quarters[0].playerB.name).toBe("Holly");
    expect(bracket.semis[0].playerA.name).toBe("QF1 winner");
    expect(bracket.semis[0].playerB.name).toBe("QF2 winner");
    expect(bracket.final.playerA.name).toBe("SF1 winner");
    expect(bracket.championKey).toBeNull();
    expect(bracket.prizes).toEqual({});
    expect(bracket.unplaced).toHaveLength(1);
  });
});
