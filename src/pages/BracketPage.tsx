import { useMemo } from "react";
import { BracketBoard } from "../components/BracketBoard";
import { useData } from "../data/context";
import { useDocumentTitle, useSeason } from "../hooks";
import { formatMoney, formatMonthDay } from "../lib/dates";
import { PLAYOFF_POOL, PLAYOFF_PRIZES } from "../lib/rules";
import { seasonPhase } from "../lib/seasons";
import { buildSeasonView } from "../lib/view";
import { PlayerLink } from "../components/PlayerLink";

export function BracketPage() {
  const data = useData();
  const { season } = useSeason();
  useDocumentTitle("Bracket");
  const view = useMemo(() => buildSeasonView(data.players, data.rounds, season, data.now), [data, season]);
  const phase = seasonPhase(season, data.now);
  const names = new Map(data.players.map((player) => [player.key, player.name]));

  return (
    <div className="page">
      <header className="page-intro">
        <p className="eyebrow">
          {season.name} · {season.rangeLabel}
        </p>
        <h1>Road to the title.</h1>
        <p className="lede">
          Single elimination. Quarterfinals are 1 vs 8, 4 vs 5, 2 vs 7, and 3 vs 6. Semifinals pair the winner of 1/8
          with the winner of 4/5, and the winner of 2/7 with the winner of 3/6.
        </p>
      </header>

      <p className="banner inset" role="status">
        {view.bracket.blockedByTie
          ? "Seeds stay TBD until a tie-break Fight Night sorts the players who are level on points in the top eight."
          : view.seedsFinal
            ? "Seeds are locked from the final regular-season standings."
            : `Seeds lock on ${formatMonthDay(season.playoffStart)}, when the playoffs begin. Pairings below are a projection if the season ended today.`}
      </p>

      {view.standings.length < 8 && phase !== "upcoming" ? (
        <p className="footnote">Fewer than eight players have a counted round, so open slots stay TBD.</p>
      ) : null}

      <BracketBoard bracket={view.bracket} />

      <section className="prize-grid" aria-labelledby="prizes-title">
        <h2 id="prizes-title">Playoff bonus · {formatMoney(PLAYOFF_POOL)}</h2>
        <ul>
          <li>
            <span>Champion</span>
            <strong>{formatMoney(PLAYOFF_PRIZES.champion)}</strong>
          </li>
          <li>
            <span>Runner-up</span>
            <strong>{formatMoney(PLAYOFF_PRIZES.runnerUp)}</strong>
          </li>
          <li>
            <span>Semifinal exit</span>
            <strong>{formatMoney(PLAYOFF_PRIZES.semifinal)} each</strong>
          </li>
          <li>
            <span>Quarterfinal exit</span>
            <strong>{formatMoney(PLAYOFF_PRIZES.quarterfinal)} each</strong>
          </li>
        </ul>
        <p>Playoff bonus is on top of whatever a player earned on the regular-season leaderboard.</p>
      </section>

      {view.seedsFinal && Object.keys(view.bracket.prizes).length > 0 ? (
        <section aria-labelledby="earned-title">
          <h2 id="earned-title">Playoff bonus so far</h2>
          <ul className="earned">
            {Object.entries(view.bracket.prizes)
              .sort((a, b) => b[1] - a[1])
              .map(([key, amount]) => (
                <li key={key}>
                  <PlayerLink name={names.get(key) ?? key} />
                  <strong>{formatMoney(amount)}</strong>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      {view.bracket.unplaced.length > 0 ? (
        <section aria-labelledby="unplaced-title">
          <h2 id="unplaced-title">Playoff rounds not placed on the bracket</h2>
          <p>These rows did not match a seeded pairing, so they are listed instead of being forced into a slot.</p>
          <ul>
            {view.bracket.unplaced.map((round) => (
              <li key={round.rowIndex}>
                {round.date} · {round.playerARaw} vs {round.playerBRaw}
                {round.winnerRaw ? ` · ${round.winnerRaw}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
