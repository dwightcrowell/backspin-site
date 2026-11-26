import { useEffect, useState } from "react";
import type { BracketMatch, BracketModel, BracketPlayer } from "../lib/bracket";
import { formatMoney } from "../lib/dates";
import { PLAYOFF_PRIZES } from "../lib/rules";
import { PlayerLink } from "./PlayerLink";

const CARD_W = 260;
const CARD_H = 148;
const GAP_X = 78;
const QF_TOPS = [4, 176, 364, 536];

function center(top: number): number {
  return top + CARD_H / 2;
}

const SF_TOPS = [
  (center(QF_TOPS[0]) + center(QF_TOPS[1])) / 2 - CARD_H / 2,
  (center(QF_TOPS[2]) + center(QF_TOPS[3])) / 2 - CARD_H / 2,
];
const FINAL_TOP = (center(SF_TOPS[0]) + center(SF_TOPS[1])) / 2 - CARD_H / 2;
const CHAMP_TOP = FINAL_TOP + CARD_H + 22;
const COLS = [0, CARD_W + GAP_X, (CARD_W + GAP_X) * 2];
const WIDTH = COLS[2] + CARD_W;
const HEIGHT = QF_TOPS[3] + CARD_H + 12;

function useWideScreen(): boolean {
  const query = "(min-width: 980px)";
  const [wide, setWide] = useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : true));
  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setWide(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  return wide;
}

function Slot({
  player,
  official,
  wins,
  showScore,
  prize,
  won,
}: {
  player: BracketPlayer;
  official: boolean;
  wins: number;
  showScore: boolean;
  prize?: number;
  won: boolean;
}) {
  if (!player.key) {
    return (
      <p className="slot-line">
        <span className="tbd">{player.name || "TBD"}</span>
      </p>
    );
  }
  return (
    <p className={`slot-line ${won ? "won" : ""}`}>
      {player.seed ? <span className="seed">{player.seed}</span> : null}
      {official ? (
        <PlayerLink name={player.name} />
      ) : (
        <>
          <span className="tbd">TBD</span>
          <PlayerLink name={player.name} />
        </>
      )}
      {showScore ? <span className="score-num">{wins}</span> : null}
      {prize ? <span className="tag">{formatMoney(prize)}</span> : null}
    </p>
  );
}

function MatchCard({ match, official, prizes }: { match: BracketMatch; official: boolean; prizes: Record<string, number> }) {
  const showScore = official && (match.winsA > 0 || match.winsB > 0);
  const prizeFor = (player: BracketPlayer, isLoser: boolean) => {
    if (!official || !player.key || !isLoser) return undefined;
    return prizes[player.key];
  };
  return (
    <article className="match-card" aria-label={`${match.roundLabel} ${match.code}`}>
      <header>
        <span>{match.code}</span>
        <span>{match.roundLabel}</span>
      </header>
      <Slot
        player={match.playerA}
        official={official}
        wins={match.winsA}
        showScore={showScore}
        won={match.decided && match.winnerKey === match.playerA.key}
        prize={prizeFor(match.playerA, match.loserKey === match.playerA.key)}
      />
      <Slot
        player={match.playerB}
        official={official}
        wins={match.winsB}
        showScore={showScore}
        won={match.decided && match.winnerKey === match.playerB.key}
        prize={prizeFor(match.playerB, match.loserKey === match.playerB.key)}
      />
      {official && match.decided ? <p className="match-foot">Series decided by rounds won</p> : null}
      {!official && match.playerA.key ? <p className="match-foot">Projected pairing</p> : null}
    </article>
  );
}

function connector(topA: number, topB: number, fromX: number, toX: number): string {
  const y1 = center(topA);
  const y2 = center(topB);
  const mid = fromX + (toX - fromX) / 2;
  const yMid = (y1 + y2) / 2;
  return `M ${fromX} ${y1} H ${mid} M ${fromX} ${y2} H ${mid} M ${mid} ${y1} V ${y2} M ${mid} ${yMid} H ${toX}`;
}

export function BracketBoard({ bracket }: { bracket: BracketModel }) {
  const wide = useWideScreen();
  const cards = [
    { match: bracket.quarters[0], top: QF_TOPS[0], left: COLS[0] },
    { match: bracket.quarters[1], top: QF_TOPS[1], left: COLS[0] },
    { match: bracket.semis[0], top: SF_TOPS[0], left: COLS[1] },
    { match: bracket.quarters[2], top: QF_TOPS[2], left: COLS[0] },
    { match: bracket.quarters[3], top: QF_TOPS[3], left: COLS[0] },
    { match: bracket.semis[1], top: SF_TOPS[1], left: COLS[1] },
    { match: bracket.final, top: FINAL_TOP, left: COLS[2] },
  ];

  const champion = (
    <article className="champion-card" aria-label="BSG champion">
      <p className="eyebrow">BSG Champion</p>
      {bracket.championKey ? (
        <>
          <PlayerLink name={bracket.final.winnerKey === bracket.championKey ? nameOf(bracket.final, bracket.championKey) : bracket.championKey} />
          <p className="prize">{formatMoney(PLAYOFF_PRIZES.champion)}</p>
        </>
      ) : (
        <p className="tbd">TBD</p>
      )}
    </article>
  );

  if (!wide) {
    return (
      <div className="bracket-stack">
        {cards.map((card) => (
          <MatchCard key={card.match.id} match={card.match} official={bracket.seedsFinal} prizes={bracket.prizes} />
        ))}
        {champion}
      </div>
    );
  }

  return (
    <div className="bracket-desktop">
      <div className="bracket-headings" style={{ width: WIDTH }}>
        <span style={{ left: COLS[0] }}>Quarterfinals</span>
        <span style={{ left: COLS[1] }}>Semifinals</span>
        <span style={{ left: COLS[2] }}>Final</span>
      </div>
      <div className="bracket-canvas" style={{ width: WIDTH, height: HEIGHT }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
          <path d={connector(QF_TOPS[0], QF_TOPS[1], CARD_W, COLS[1])} />
          <path d={connector(QF_TOPS[2], QF_TOPS[3], CARD_W, COLS[1])} />
          <path d={connector(SF_TOPS[0], SF_TOPS[1], COLS[1] + CARD_W, COLS[2])} />
        </svg>
        {cards.map((card) => (
          <div key={card.match.id} className="bracket-slot" style={{ top: card.top, left: card.left, width: CARD_W }}>
            <MatchCard match={card.match} official={bracket.seedsFinal} prizes={bracket.prizes} />
          </div>
        ))}
        <div className="bracket-slot" style={{ top: CHAMP_TOP, left: COLS[2], width: CARD_W }}>
          {champion}
        </div>
      </div>
    </div>
  );
}

function nameOf(match: BracketMatch, key: string): string {
  if (match.playerA.key === key) return match.playerA.name;
  if (match.playerB.key === key) return match.playerB.name;
  return key;
}
