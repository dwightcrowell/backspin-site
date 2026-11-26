import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ResultsTable } from "../components/ResultsTable";
import { PlayerLink } from "../components/PlayerLink";
import { useData } from "../data/context";
import { useDocumentTitle, useSeason, withSeason } from "../hooks";
import { formatMoney, formatWinPct } from "../lib/dates";
import { playerBySlug } from "../lib/directory";
import { recordFor, type HeadToHead, type Tally } from "../lib/records";
import { FORMATS, ROUND_CAP } from "../lib/rules";
import { scoreRegularSeason } from "../lib/scoring";
import { buildSeasonView } from "../lib/view";

export function PlayerPage() {
  const { slug = "" } = useParams();
  const data = useData();
  const { season, seasonId } = useSeason();
  const player = playerBySlug(data.players, slug);
  useDocumentTitle(player?.name ?? "Player");
  const [allRecent, setAllRecent] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openOpponent, setOpenOpponent] = useState<string | null>(null);

  const view = useMemo(() => buildSeasonView(data.players, data.rounds, season, data.now), [data, season]);
  const scores = useMemo(() => scoreRegularSeason(data.rounds, seasonId), [data.rounds, seasonId]);
  const names = useMemo(() => new Map(data.players.map((item) => [item.key, item.name])), [data.players]);

  if (!player) {
    return (
      <div className="page">
        <h1>Player not found</h1>
        <p className="empty">Nobody on the tracker uses that link.</p>
        <Link className="text-link" to={withSeason("/players", seasonId)}>
          All players
        </Link>
      </div>
    );
  }

  const standing = view.standings.find((row) => row.key === player.key);
  const score = scores.get(player.key);
  const record = recordFor(data.rounds, player.key);
  const counted = new Set(score?.countedRows ?? []);
  const uncounted = new Set(score?.uncountedRows ?? []);
  const recentPool = record.recent.filter((round) =>
    allRecent ? true : round.seasonId === seasonId && (round.phase === "regular" || round.phase === "playoffs"),
  );
  const recent = showAll ? recentPool : recentPool.slice(0, 12);
  const playoffPrize = view.bracket.prizes[player.key];
  const games = [...player.games, ...player.wildcards.map((game) => `${game} (wildcard)`)];

  return (
    <div className="page player-page">
      <Link className="text-link back" to={withSeason("/players", seasonId)}>
        All players
      </Link>
      <header className="player-hero">
        <div>
          <p className="eyebrow">{season.name}</p>
          <h1>{player.name}</h1>
          <p className="meta-row">
            {player.status ? <span className={`status s-${player.status.toLowerCase().replace(/\s+/g, "-")}`}>{player.status}</span> : null}
            {player.language ? <span>{player.language}</span> : null}
          </p>
          {games.length > 0 ? (
            <ul className="game-chips">
              {games.map((game) => (
                <li key={game}>{game}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <section className="stat-grid" aria-label={`${season.name} regular season`}>
        <article>
          <h2>Points</h2>
          <p className="stat">{score?.points ?? 0}</p>
          <p>From the first {ROUND_CAP} regular-season rounds.</p>
        </article>
        <article>
          <h2>Rank</h2>
          <p className="stat">{standing?.placeLabel ?? "—"}</p>
          <p>{standing?.needsFightNight ? "Tied. A Fight Night decides the place." : standing ? "On the current leaderboard." : "No counted rounds yet."}</p>
        </article>
        <article>
          <h2>Rounds</h2>
          <p className="stat">
            {score?.roundsCounted ?? 0}/{ROUND_CAP}
          </p>
          <p>
            {score && score.roundsPlayed > score.roundsCounted
              ? `${score.roundsPlayed - score.roundsCounted} later ${score.roundsPlayed - score.roundsCounted === 1 ? "round was" : "rounds were"} played and did not add points.`
              : "Counted toward season points."}
          </p>
        </article>
        <article>
          <h2>Bonus cash</h2>
          <p className="stat">
            {standing?.needsFightNight && standing.payout === null ? "Tied" : standing?.payout ? formatMoney(standing.payout) : "—"}
          </p>
          <p>
            Leaderboard bonus
            {playoffPrize ? ` · playoff bonus ${formatMoney(playoffPrize)}` : ""}.
          </p>
        </article>
      </section>

      <section aria-labelledby="all-time-title">
        <h2 id="all-time-title">All-time record</h2>
        <p className="lede">Every decisive round, including playoffs, other seasons, and Non-BSG. Ties and blank winners are left out.</p>
        <p className="record-line">
          <strong>{tallyText(record.overall)}</strong>
          <span>{formatWinPct(record.overall.wins, record.overall.losses)} win rate</span>
        </p>
        <div className="format-grid">
          {FORMATS.map((format) => (
            <article key={format}>
              <h3>{format}</h3>
              <p>{tallyText(record.byFormat[format])}</p>
              <p>{formatWinPct(record.byFormat[format].wins, record.byFormat[format].losses)}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="games-title">
        <h2 id="games-title">By game</h2>
        {record.byGame.length === 0 ? (
          <p className="empty">No completed rounds yet.</p>
        ) : (
          <SimpleTable
            headers={["Game", "Record", "Win %"]}
            rows={record.byGame.map((row) => [row.game, tallyText(row.tally), formatWinPct(row.tally.wins, row.tally.losses)])}
          />
        )}
      </section>

      <section aria-labelledby="combo-title">
        <h2 id="combo-title">By game and format</h2>
        {record.byGameFormat.length === 0 ? (
          <p className="empty">—</p>
        ) : (
          <SimpleTable
            headers={["Game", "Format", "Record", "Win %"]}
            rows={record.byGameFormat.map((row) => [
              row.game,
              row.format ?? "—",
              tallyText(row.tally),
              formatWinPct(row.tally.wins, row.tally.losses),
            ])}
          />
        )}
      </section>

      <section aria-labelledby="h2h-title">
        <h2 id="h2h-title">Head-to-head</h2>
        {record.headToHead.length === 0 ? (
          <p className="empty">No opponents yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="h2h">
              <caption className="sr-only">Record against each opponent</caption>
              <thead>
                <tr>
                  <th scope="col">Opponent</th>
                  <th scope="col">Record</th>
                  <th scope="col">Win %</th>
                  <th scope="col">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.headToHead.map((row) => (
                  <HeadRow
                    key={row.opponentKey}
                    row={row}
                    name={names.get(row.opponentKey) ?? row.opponentKey}
                    open={openOpponent === row.opponentKey}
                    onToggle={() => setOpenOpponent((current) => (current === row.opponentKey ? null : row.opponentKey))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="recent-title">
        <div className="panel-head">
          <h2 id="recent-title">Recent rounds</h2>
          <div className="status-row" role="group" aria-label="Which rounds to list">
            <button type="button" aria-pressed={!allRecent} onClick={() => setAllRecent(false)}>
              This season
            </button>
            <button type="button" aria-pressed={allRecent} onClick={() => setAllRecent(true)}>
              All time
            </button>
          </div>
        </div>
        <ResultsTable rounds={recent} showDate counted={counted} uncounted={uncounted} />
        {recentPool.length > 12 ? (
          <button type="button" className="text-button" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Show fewer" : `Show all ${recentPool.length}`}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function tallyText(tally: Tally): string {
  if (tally.wins + tally.losses === 0) return "—";
  return `${tally.wins}–${tally.losses}`;
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={`${headers[index]}-${cell}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeadRow({
  row,
  name,
  open,
  onToggle,
}: {
  row: HeadToHead;
  name: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = `h2h-${row.opponentKey.replace(/[^a-z0-9]+/gi, "-")}`;
  return (
    <>
      <tr>
        <th scope="row">
          <PlayerLink name={name} />
        </th>
        <td>{tallyText(row.overall)}</td>
        <td>{formatWinPct(row.overall.wins, row.overall.losses)}</td>
        <td>
          <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
            {open ? "Hide" : "By game"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="h2h-detail">
          <td colSpan={4} id={panelId}>
            <div className="split-detail">
              <div>
                <h3>By format</h3>
                <ul>
                  {FORMATS.map((format) => (
                    <li key={format}>
                      {format}: {lineFor(row.byFormat[format])}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>By game</h3>
                {row.byGame.length === 0 ? (
                  <p>—</p>
                ) : (
                  <ul>
                    {row.byGame.map((game) => (
                      <li key={game.game}>
                        {game.game}: {lineFor(game.tally)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3>By game and format</h3>
                {row.byGameFormat.length === 0 ? (
                  <p>—</p>
                ) : (
                  <ul>
                    {row.byGameFormat.map((game) => (
                      <li key={`${game.game}-${game.format}`}>
                        {game.game} {game.format}: {lineFor(game.tally)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function lineFor(tally: Tally): string {
  return `${tallyText(tally)} · ${formatWinPct(tally.wins, tally.losses)}`;
}
