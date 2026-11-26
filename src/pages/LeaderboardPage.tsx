import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { kickUrl } from "../config";
import { useData } from "../data/context";
import { useDocumentTitle, useSeason, withSeason } from "../hooks";
import { formatMoney } from "../lib/dates";
import { formatName, PLAYOFF_POOL, POINTS_PER_ROUND, REGULAR_POOL, ROUND_CAP } from "../lib/rules";
import { nightHeading, nextNight } from "../lib/schedule";
import { regularSeasonWeek, seasonPhase } from "../lib/seasons";
import type { StandingRow } from "../lib/scoring";
import { buildSeasonView } from "../lib/view";
import { PlayerLink } from "../components/PlayerLink";

export function LeaderboardPage() {
  const data = useData();
  const { season, seasonId } = useSeason();
  useDocumentTitle("Leaderboard");
  const view = useMemo(() => buildSeasonView(data.players, data.rounds, season, data.now), [data, season]);
  const next = nextNight(data.streams, data.now, seasonId);
  const week = regularSeasonWeek(season, data.now);
  const phase = seasonPhase(season, data.now);
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? view.standings.filter((row) => row.name.toLowerCase().includes(query.trim().toLowerCase()))
    : view.standings;
  const overCap = view.standings.some((row) => row.roundsPlayed > row.roundsCounted);

  return (
    <div className="page">
      <section className="hero">
        <div>
          {data.usingSample ? <p className="pill">Sample data</p> : null}
          <p className="eyebrow">
            {season.shortLabel} · {season.rangeLabel}
          </p>
          <h1>The season. The standings.</h1>
          <p className="lede">Fight Nights. Brackets. Every round counts.</p>
          <p className="week">{phaseLine(phase, week)}</p>
        </div>
        <ul className="chips">
          <li>
            <ChipIcon kind="calendar" />
            <span>
              <strong>10-week</strong> regular season
            </span>
          </li>
          <li>
            <ChipIcon kind="cash" />
            <span>
              <strong>{formatMoney(REGULAR_POOL)}</strong> leaderboard bonus cash
            </span>
          </li>
          <li>
            <ChipIcon kind="trophy" />
            <span>
              <strong>{formatMoney(PLAYOFF_POOL)}</strong> playoff bonus cash
            </span>
          </li>
        </ul>
      </section>

      <div className="board">
        <div className="side">
          <NextCard night={next} seasonId={seasonId} />
          <RoadCard seasonId={seasonId} />
        </div>
        <section className="panel standings" aria-labelledby="standings-title">
          <div className="panel-head">
            <h2 id="standings-title">Season leaderboard</h2>
            <label className="finder">
              <span className="sr-only">Find a player</span>
              <input
                type="search"
                value={query}
                placeholder="Find a player"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          <ul className="legend">
            <li>
              <i className="dot gold" aria-hidden="true" /> Ranks 1–8 · Playoff qualification
            </li>
            <li>
              <i className="dot blue" aria-hidden="true" /> Ranks 9–12 · Leaderboard payout
            </li>
            <li>
              <i className="dot gray" aria-hidden="true" /> Ranks 13+ · No payout
            </li>
          </ul>
          {filtered.length === 0 ? (
            <p className="empty">
              {view.standings.length === 0
                ? `No regular-season rounds are in yet for ${season.name}.`
                : "No player matches that search."}
            </p>
          ) : (
            <div className="table-wrap">
              <table className="standings-table">
                <caption className="sr-only">{season.name} regular-season standings</caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Player</th>
                    <th scope="col">Points</th>
                    <th scope="col">Rounds</th>
                    <th scope="col">Bonus cash</th>
                  </tr>
                </thead>
                <tbody>{query.trim() ? filtered.map((row) => <StandingLine key={row.key} row={row} />) : withDividers(filtered)}</tbody>
              </table>
            </div>
          )}
          {view.tieNotes.length > 0 ? (
            <div className="footnote">
              {view.tieNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : null}
          {overCap ? (
            <p className="footnote">A star next to 20/20 means more rounds were played. Only the first {ROUND_CAP} count.</p>
          ) : null}
          {query.trim() === "" && view.unranked.length > 0 ? (
            <details className="unranked">
              <summary>
                {view.unranked.length} {view.unranked.length === 1 ? "player has" : "players have"} no counted rounds yet
              </summary>
              <ul>
                {view.unranked.map((player) => (
                  <li key={player.key}>
                    <PlayerLink name={player.name} />
                    {player.status ? <span className="tag">{player.status}</span> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function StandingLine({ row }: { row: StandingRow }) {
  const payout = row.needsFightNight && row.payout === null ? "Tied" : row.payout ? formatMoney(row.payout) : "—";
  return (
    <tr className={`band-${row.band}`}>
      <th scope="row">{row.rank <= 3 && !row.tied ? <span className={`medal m${row.rank}`}>{row.rank}</span> : row.placeLabel}</th>
      <td>
        <PlayerLink name={row.name} />
      </td>
      <td className="points">{row.points}</td>
      <td>
        {row.roundsCounted}/{ROUND_CAP}
        {row.roundsPlayed > row.roundsCounted ? <span title="Rounds after the first 20 do not add points">*</span> : null}
      </td>
      <td className={payout === "Tied" ? "tied-cash" : ""}>{payout}</td>
    </tr>
  );
}

function withDividers(rows: StandingRow[]) {
  const nodes: ReactNode[] = [];
  rows.forEach((row, index) => {
    const next = rows[index + 1];
    nodes.push(<StandingLine key={row.key} row={row} />);
    if (row.band === "gold" && next?.band !== "gold") {
      nodes.push(
        <tr key="playoff-line" className="divider gold">
          <td colSpan={5}>
            <span>Playoff qualification</span>
          </td>
        </tr>,
      );
    }
    if ((row.band === "gold" || row.band === "blue") && (!next || next.band === "gray")) {
      nodes.push(
        <tr key="payout-line" className="divider blue">
          <td colSpan={5}>
            <span>Payout cutoff</span>
          </td>
        </tr>,
      );
    }
  });
  return nodes;
}

function NextCard({ night, seasonId }: { night: ReturnType<typeof nextNight>; seasonId: number }) {
  const headline = night?.plannedRounds[0];
  return (
    <section className="fight-card" aria-labelledby="next-title">
      <h2 id="next-title">{night?.streamType ? `Next ${night.streamType}` : "Next stream"}</h2>
      {night && night.pairs.length > 0 ? (
        night.pairs.map((pair) => (
          <div className="versus" key={pair.join("-")}>
            <PlayerLink name={pair[0]} />
            <span className="vs">VS</span>
            <PlayerLink name={pair[1]} />
          </div>
        ))
      ) : (
        <p className="empty">No upcoming stream is on the schedule for this season.</p>
      )}
      {night ? <p className="fight-when">{nightHeading(night)}</p> : null}
      {headline ? (
        <p className="fight-game">
          {headline.game || "Game TBA"} · {formatName(headline.format)}
        </p>
      ) : null}
      {night && night.plannedRounds.length > 1 ? (
        <ul className="card-rounds">
          {night.plannedRounds.map((round) => (
            <li key={round.label}>
              {round.game || round.label}
              {round.format ? ` · ${formatName(round.format)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <a className="btn-gold" href={kickUrl} target="_blank" rel="noreferrer">
        Watch Live
        <span className="sr-only"> on Kick, opens in a new tab</span>
      </a>
      <Link className="text-link" to={withSeason("/schedule", seasonId)}>
        View full schedule
      </Link>
    </section>
  );
}

function RoadCard({ seasonId }: { seasonId: number }) {
  return (
    <section className="road-card" aria-labelledby="road-title">
      <h2 id="road-title">The road to the title</h2>
      <p>Top 8 advance to the playoffs.</p>
      <ol className="path">
        <li>Quarterfinals</li>
        <li>Semifinals</li>
        <li>Final</li>
      </ol>
      <p className="cap-note">First {ROUND_CAP} rounds count.</p>
      <div className="score-key">
        <h3>Scoring per round won</h3>
        <ul>
          <li>
            <span>BO3</span> <strong>+{POINTS_PER_ROUND.BO3}</strong>
          </li>
          <li>
            <span>BO5</span> <strong>+{POINTS_PER_ROUND.BO5}</strong>
          </li>
          <li>
            <span>BO7</span> <strong>+{POINTS_PER_ROUND.BO7}</strong>
          </li>
        </ul>
      </div>
      <Link className="text-link" to={withSeason("/bracket", seasonId)}>
        Open the bracket
      </Link>
    </section>
  );
}

function phaseLine(phase: ReturnType<typeof seasonPhase>, week: number | null): string {
  if (phase === "regular" && week) return `Week ${week} of 10 · Regular season`;
  if (phase === "playoffs") return "Playoffs · two weeks";
  if (phase === "break") return "Off week before the next season";
  if (phase === "complete") return "Season complete";
  return "Regular season has not started";
}

function ChipIcon({ kind }: { kind: "calendar" | "cash" | "trophy" }) {
  if (kind === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "cash") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <ellipse cx="12" cy="7" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 11v3M9 20h6M10 14h4v3h-4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
