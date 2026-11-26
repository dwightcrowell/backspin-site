import { easternDateTime, easternToUtc, formatMonthDay } from "./dates";

export interface SeasonWindow {
  id: 1 | 2 | 3 | 4;
  name: string;
  shortLabel: string;
  rangeLabel: string;
  regularStart: string;
  regularEnd: string;
  playoffStart: string;
  playoffEnd: string;
  breakStart: string;
  breakEnd: string;
}

/**
 * Each season is a 13-week cycle: 10 weeks of regular season, 2 of playoffs,
 * and 1 off week. Dates are the planned 2027 windows (Monday through Sunday).
 */
export const SEASONS: SeasonWindow[] = [
  {
    id: 1,
    name: "BSG 1",
    shortLabel: "Season 1",
    rangeLabel: "Jan–Mar 2027",
    regularStart: "2027-01-04",
    regularEnd: "2027-03-14",
    playoffStart: "2027-03-15",
    playoffEnd: "2027-03-28",
    breakStart: "2027-03-29",
    breakEnd: "2027-04-04",
  },
  {
    id: 2,
    name: "BSG 2",
    shortLabel: "Season 2",
    rangeLabel: "Apr–Jun 2027",
    regularStart: "2027-04-05",
    regularEnd: "2027-06-13",
    playoffStart: "2027-06-14",
    playoffEnd: "2027-06-27",
    breakStart: "2027-06-28",
    breakEnd: "2027-07-04",
  },
  {
    id: 3,
    name: "BSG 3",
    shortLabel: "Season 3",
    rangeLabel: "Jul–Sep 2027",
    regularStart: "2027-07-05",
    regularEnd: "2027-09-12",
    playoffStart: "2027-09-13",
    playoffEnd: "2027-09-26",
    breakStart: "2027-09-27",
    breakEnd: "2027-10-03",
  },
  {
    id: 4,
    name: "BSG 4",
    shortLabel: "Season 4",
    rangeLabel: "Oct–Dec 2027",
    regularStart: "2027-10-04",
    regularEnd: "2027-12-12",
    playoffStart: "2027-12-13",
    playoffEnd: "2027-12-26",
    breakStart: "2027-12-27",
    breakEnd: "2028-01-02",
  },
];

export type SeasonPhase = "upcoming" | "regular" | "playoffs" | "break" | "complete";

function startOf(iso: string): Date {
  return easternDateTime(iso, 0, 0) ?? new Date(0);
}

function endOf(iso: string): Date {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(0);
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return easternToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0);
}

export function seasonById(id: number): SeasonWindow {
  return SEASONS.find((season) => season.id === id) ?? SEASONS[0];
}

export function seasonPhase(season: SeasonWindow, now: Date): SeasonPhase {
  if (now < startOf(season.regularStart)) return "upcoming";
  if (now < endOf(season.regularEnd)) return "regular";
  if (now < endOf(season.playoffEnd)) return "playoffs";
  if (now < endOf(season.breakEnd)) return "break";
  return "complete";
}

/** Week 1–10 while the regular season is underway, otherwise null. */
export function regularSeasonWeek(season: SeasonWindow, now: Date): number | null {
  if (seasonPhase(season, now) !== "regular") return null;
  const start = startOf(season.regularStart).getTime();
  const days = Math.floor((now.getTime() - start) / 86_400_000);
  return Math.min(10, Math.max(1, Math.floor(days / 7) + 1));
}

export function seasonIdForDate(iso: string | null): number | null {
  if (!iso) return null;
  const instant = easternDateTime(iso, 12, 0);
  if (!instant) return null;
  for (const season of SEASONS) {
    if (instant >= startOf(season.regularStart) && instant < endOf(season.breakEnd)) return season.id;
  }
  return null;
}

export function seedsLockLabel(season: SeasonWindow): string {
  return formatMonthDay(season.playoffStart);
}

export interface DatedRound {
  seasonId: number | null;
}

export function defaultSeasonId(now: Date, rounds: DatedRound[]): number {
  for (const season of SEASONS) {
    const phase = seasonPhase(season, now);
    if (phase === "regular" || phase === "playoffs" || phase === "break") return season.id;
  }
  const started = SEASONS.filter((season) => now >= startOf(season.regularStart));
  if (started.length > 0) {
    const recent = [...started].reverse();
    const withData = recent.find((season) => rounds.some((round) => round.seasonId === season.id));
    return (withData ?? recent[0]).id;
  }
  const withData = SEASONS.find((season) => rounds.some((round) => round.seasonId === season.id));
  return withData?.id ?? 1;
}
