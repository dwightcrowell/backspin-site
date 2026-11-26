import { useMemo } from "react";
import { kickUrl } from "../config";
import { ResultsTable } from "../components/ResultsTable";
import { useData } from "../data/context";
import { useDocumentTitle, useSeason } from "../hooks";
import { formatName } from "../lib/rules";
import { nightHeading, recentNights, upcomingNights, type NightGroup } from "../lib/schedule";
import { PlayerLink } from "../components/PlayerLink";

export function SchedulePage() {
  const data = useData();
  const { season, seasonId } = useSeason();
  useDocumentTitle("Schedule");
  const upcoming = useMemo(() => upcomingNights(data.streams, data.now, seasonId), [data, seasonId]);
  const past = useMemo(
    () => recentNights(data.rounds, data.streams, data.now, seasonId),
    [data, seasonId],
  );

  return (
    <div className="page">
      <header className="page-intro">
        <p className="eyebrow">
          {season.name} · {season.rangeLabel}
        </p>
        <h1>The schedule.</h1>
        <p className="lede">Upcoming streams from the Streams tab, then results round by round.</p>
      </header>

      <section aria-labelledby="upcoming-title">
        <h2 id="upcoming-title">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="empty">No upcoming streams are scheduled for {season.name}.</p>
        ) : (
          <div className="upcoming-grid">
            {upcoming.map((night) => (
              <UpcomingCard key={night.key} night={night} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="results-title">
        <h2 id="results-title">Results</h2>
        {past.length === 0 ? (
          <p className="empty">No results have been recorded for {season.name} yet.</p>
        ) : (
          past.map((night) => (
            <article key={night.key} className="night">
              <header>
                <h3>{nightHeading(night)}</h3>
                <p>{night.streamType}</p>
              </header>
              <ResultsTable rounds={night.results} />
            </article>
          ))
        )}
      </section>
    </div>
  );
}

function UpcomingCard({ night }: { night: NightGroup }) {
  return (
    <article className="upcoming-card">
      <p className="eyebrow">{night.streamType}</p>
      <h3>{nightHeading(night)}</h3>
      {night.pairs.length === 0 ? <p>Players TBA</p> : null}
      {night.pairs.map((pair) => (
        <p className="pair" key={pair.join("-")}>
          <PlayerLink name={pair[0]} /> <span className="vs">vs</span> <PlayerLink name={pair[1]} />
        </p>
      ))}
      {night.extras.map((name) => (
        <p key={name}>Also on stream: {name}</p>
      ))}
      {night.plannedRounds.length > 0 ? (
        <ul className="card-rounds">
          {night.plannedRounds.map((round) => (
            <li key={round.label}>
              {round.game || "Game TBA"}
              {round.format ? ` · ${formatName(round.format)}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      {night.notes.map((note) => (
        <p key={note} className="note">
          {note}
        </p>
      ))}
      <a className="btn-gold" href={kickUrl} target="_blank" rel="noreferrer">
        Watch Live
        <span className="sr-only"> on Kick, opens in a new tab</span>
      </a>
    </article>
  );
}
