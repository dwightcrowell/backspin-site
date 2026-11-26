import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../data/context";
import { useDocumentTitle, useSeason, withSeason } from "../hooks";
import { scoreRegularSeason } from "../lib/scoring";
import { buildSeasonView } from "../lib/view";

const STATUSES = ["All", "Active", "On hold", "Inactive"];

export function PlayersPage() {
  const data = useData();
  const { season, seasonId } = useSeason();
  useDocumentTitle("Players");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const view = useMemo(() => buildSeasonView(data.players, data.rounds, season, data.now), [data, season]);
  const scores = useMemo(() => scoreRegularSeason(data.rounds, seasonId), [data.rounds, seasonId]);
  const ranks = new Map(view.standings.map((row) => [row.key, row]));

  const players = data.players
    .filter((player) => {
      const haystack = `${player.name} ${player.games.join(" ")} ${player.wildcards.join(" ")}`.toLowerCase();
      if (query.trim() && !haystack.includes(query.trim().toLowerCase())) return false;
      if (status === "All") return true;
      return player.status.toLowerCase() === status.toLowerCase();
    })
    .sort((a, b) => {
      const pointsA = scores.get(a.key)?.points ?? -1;
      const pointsB = scores.get(b.key)?.points ?? -1;
      return pointsB - pointsA || a.name.localeCompare(b.name);
    });

  return (
    <div className="page">
      <header className="page-intro">
        <p className="eyebrow">{season.name}</p>
        <h1>Players.</h1>
        <p className="lede">Everyone on the Streamers tab, plus anyone who shows up in a round.</p>
      </header>
      <div className="filters">
        <label>
          <span className="sr-only">Search players</span>
          <input
            type="search"
            value={query}
            placeholder="Search by name or game"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="status-row" role="group" aria-label="Filter by status">
          {STATUSES.map((item) => (
            <button key={item} type="button" aria-pressed={status === item} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {players.length === 0 ? (
        <p className="empty">No players match that filter.</p>
      ) : (
        <ul className="player-index">
          {players.map((player) => {
            const standing = ranks.get(player.key);
            const points = scores.get(player.key)?.points ?? 0;
            return (
              <li key={player.key}>
                <Link to={withSeason(`/players/${player.slug}`, seasonId)}>
                  <span className="index-name">{player.name}</span>
                  <span className="index-meta">
                    {player.status || "Guest"}
                    {standing ? ` · ${standing.placeLabel} · ${points} pts` : points ? ` · ${points} pts` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
