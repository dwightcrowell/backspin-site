import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { kickUrl } from "../config";
import { useData } from "../data/context";
import { useSeason, withSeason } from "../hooks";
import { SEASONS } from "../lib/seasons";

const NAV = [
  { to: "/", label: "Leaderboard" },
  { to: "/schedule", label: "Schedule" },
  { to: "/bracket", label: "Bracket" },
  { to: "/players", label: "Players" },
];

export function Layout({ children }: { children: ReactNode }) {
  const data = useData();
  const { seasonId, setSeason } = useSeason();
  const sampleTabs = (Object.entries(data.sources) as [string, string][])
    .filter(([, source]) => source === "sample")
    .map(([name]) => name);
  const previewClock = sampleTabs.length === 4;

  return (
    <>
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <NavLink className="brand" to={withSeason("/", seasonId)} aria-label="BSG home">
            <Logo />
          </NavLink>
          <nav className="site-nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink key={item.to} to={withSeason(item.to, seasonId)} end={item.to === "/"}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <label className="season-picker">
            <span className="sr-only">Season</span>
            <select
              value={seasonId}
              onChange={(event) => setSeason(Number(event.target.value))}
              disabled={data.loading}
            >
              {SEASONS.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} · {season.rangeLabel}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      {data.usingSample && !data.loading ? (
        <p className="banner" role="status">
          Sample data
          {sampleTabs.length < 4 ? ` for ${sampleTabs.join(", ")}` : ""}.{" "}
          {previewClock ? "Previewing the season as of February 8, 2027." : "Anything still on sample data is not the live sheet."}{" "}
          Paste published CSV links into <code>src/config.ts</code> to use the live tracker.
        </p>
      ) : null}
      {data.loadNotes.length > 0 ? (
        <div className="banner warning" role="alert">
          {data.loadNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      ) : null}
      <main id="content">{data.loading ? <p className="loading">Loading the tracker…</p> : children}</main>
      <footer className="site-footer">
        <p>Backspin Games · BSG</p>
        <p>All rewards shown are bonus cash. Standings are calculated in your browser from the tracker.</p>
        <p>
          <a href={kickUrl} target="_blank" rel="noreferrer">
            Watch on Kick
          </a>
        </p>
      </footer>
    </>
  );
}

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <ellipse cx="24" cy="24" rx="16" ry="9" transform="rotate(-28 24 24)" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <ellipse cx="24" cy="24" rx="16" ry="9" transform="rotate(28 24 24)" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      </svg>
      <span>
        <span className="logo-word">Backspin</span>
        <span className="logo-sub">BSG</span>
      </span>
    </span>
  );
}
