import { formatMonthDay, formatMoney } from "../lib/dates";
import type { Round } from "../lib/types";
import { PlayerLink } from "./PlayerLink";

export function ResultsTable({
  rounds,
  showDate = false,
  counted,
  uncounted,
}: {
  rounds: Round[];
  showDate?: boolean;
  counted?: Set<number>;
  uncounted?: Set<number>;
}) {
  if (rounds.length === 0) return <p className="empty">No rounds yet.</p>;
  return (
    <div className="table-wrap">
      <table className="results">
        <caption className="sr-only">Rounds</caption>
        <thead>
          <tr>
            {showDate ? <th scope="col">Date</th> : null}
            <th scope="col">Round</th>
            <th scope="col">Game</th>
            <th scope="col">Format</th>
            <th scope="col">Score</th>
            <th scope="col">Winner</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round) => {
            const tag = uncounted?.has(round.rowIndex) ? "Past the 20-round cap" : counted?.has(round.rowIndex) ? "" : "";
            return (
              <tr key={`${round.rowIndex}-${round.playerAKey}`}>
                {showDate ? <td>{round.date ? formatMonthDay(round.date) : "—"}</td> : null}
                <td>
                  {round.round || "—"}
                  {round.phase === "playoffs" ? <span className="tag">Playoffs</span> : null}
                  {round.phase === "non-bsg" ? <span className="tag">Non-BSG</span> : null}
                  {tag ? <span className="tag">{tag}</span> : null}
                </td>
                <td>{round.game || "—"}</td>
                <td>{round.format ?? "—"}</td>
                <td className="score-cell">
                  {round.playerARaw ? <PlayerLink name={round.playerARaw} /> : "—"}{" "}
                  <span className="score-num">
                    {round.gamesWonA ?? "–"}–{round.gamesWonB ?? "–"}
                  </span>{" "}
                  {round.playerBRaw ? <PlayerLink name={round.playerBRaw} /> : "—"}
                  {round.prizeMoney !== null ? (
                    <span className="tag">Recorded prize {formatMoney(round.prizeMoney)}</span>
                  ) : null}
                  {round.notes ? <span className="note">{round.notes}</span> : null}
                </td>
                <td>
                  {round.winnerKey && (round.winnerKey === round.playerAKey || round.winnerKey === round.playerBKey) ? (
                    <PlayerLink name={round.winnerRaw} />
                  ) : (
                    "No result"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
