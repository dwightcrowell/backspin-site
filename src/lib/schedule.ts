import { formatLongDate, formatTimeEt, weekdayName } from "./dates";
import { compareRounds } from "./parse";
import type { Round, ScheduledStream } from "./types";

export interface NightGroup {
  key: string;
  date: string;
  day: string;
  timeLabel: string;
  start: Date | null;
  streamType: string;
  pairs: [string, string][];
  extras: string[];
  plannedRounds: ScheduledStream["rounds"];
  notes: string[];
  results: Round[];
  upcoming: boolean;
}

function mergeStreams(rows: ScheduledStream[]): Omit<NightGroup, "results" | "upcoming" | "key"> & { date: string } {
  const first = rows[0];
  const pairs: [string, string][] = [];
  const seenPairs = new Set<string>();
  const extras: string[] = [];
  const planned: ScheduledStream["rounds"] = [];
  const notes: string[] = [];
  for (const row of rows) {
    for (const pair of row.pairs) {
      const id = pair.map((name) => name.toLowerCase()).join("|");
      if (seenPairs.has(id)) continue;
      seenPairs.add(id);
      pairs.push(pair);
    }
    for (const extra of row.extras) {
      if (!extras.includes(extra)) extras.push(extra);
    }
    for (const round of row.rounds) {
      if (!planned.some((item) => item.label === round.label)) planned.push(round);
    }
    if (row.notes && !notes.includes(row.notes)) notes.push(row.notes);
  }
  return {
    date: first.date ?? "",
    day: first.day || (first.date ? weekdayName(first.date) : ""),
    timeLabel: formatTimeEt(first.timeLabel),
    start: first.start,
    streamType: first.streamType || "Stream",
    pairs,
    extras,
    plannedRounds: planned,
    notes,
  };
}

export function publicStreams(streams: ScheduledStream[]): ScheduledStream[] {
  return streams.filter((stream) => stream.included && stream.date && stream.start);
}

/**
 * The public schedule is the Streams tab only.
 * Matchups are accepted and ignored so a planning row cannot leak onto the site
 * even if someone concatenates the two lists by mistake at the call site — callers
 * should pass streams alone. This function does not read matchups.
 */
export function upcomingNights(streams: ScheduledStream[], now: Date, seasonId: number): NightGroup[] {
  const rows = publicStreams(streams).filter(
    (stream) => stream.seasonId === seasonId && stream.start && stream.start.getTime() >= now.getTime(),
  );
  return groupStreamRows(rows, [], true);
}

export function recentNights(
  rounds: Round[],
  streams: ScheduledStream[],
  now: Date,
  seasonId: number,
): NightGroup[] {
  const seasonRounds = rounds
    .filter((round) => round.seasonId === seasonId && (round.phase === "regular" || round.phase === "playoffs") && round.date)
    .sort(compareRounds);

  const pastStreams = publicStreams(streams).filter(
    (stream) => stream.seasonId === seasonId && stream.start && stream.start.getTime() < now.getTime(),
  );

  const byDate = new Map<string, { rounds: Round[]; streams: ScheduledStream[] }>();
  for (const round of seasonRounds) {
    const bucket = byDate.get(round.date!) ?? { rounds: [], streams: [] };
    bucket.rounds.push(round);
    byDate.set(round.date!, bucket);
  }
  for (const stream of pastStreams) {
    const bucket = byDate.get(stream.date!) ?? { rounds: [], streams: [] };
    bucket.streams.push(stream);
    byDate.set(stream.date!, bucket);
  }

  const nights: NightGroup[] = [];
  for (const [date, bucket] of byDate) {
    const merged = bucket.streams.length
      ? mergeStreams(bucket.streams)
      : {
          date,
          day: weekdayName(date),
          timeLabel: "Time TBA",
          start: null,
          streamType: bucket.rounds[0]?.streamType || "Results",
          pairs: pairsFromRounds(bucket.rounds),
          extras: [],
          plannedRounds: [],
          notes: [],
        };
    if (!bucket.streams.length) merged.streamType = bucket.rounds[0]?.streamType || merged.streamType;
    nights.push({
      ...merged,
      key: date,
      results: bucket.rounds,
      upcoming: false,
    });
  }

  nights.sort((a, b) => (a.date < b.date ? 1 : -1));
  return nights;
}

function pairsFromRounds(rounds: Round[]): [string, string][] {
  const pairs: [string, string][] = [];
  const seen = new Set<string>();
  for (const round of rounds) {
    if (!round.playerARaw || !round.playerBRaw) continue;
    const id = [round.playerAKey, round.playerBKey].sort().join("|");
    if (seen.has(id)) continue;
    seen.add(id);
    pairs.push([round.playerARaw, round.playerBRaw]);
  }
  return pairs;
}

function groupStreamRows(rows: ScheduledStream[], results: Round[], upcoming: boolean): NightGroup[] {
  const groups = new Map<string, ScheduledStream[]>();
  for (const row of rows) {
    const key = `${row.date}|${row.timeLabel}|${row.streamType}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  const nights = [...groups.values()].map((group) => {
    const merged = mergeStreams(group);
    return {
      ...merged,
      key: `${merged.date}|${group[0].timeLabel}|${merged.streamType}`,
      results,
      upcoming,
    };
  });
  nights.sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  return nights;
}

export function nextNight(streams: ScheduledStream[], now: Date, seasonId: number): NightGroup | null {
  return upcomingNights(streams, now, seasonId)[0] ?? null;
}

export function nightHeading(night: NightGroup): string {
  const when = night.date ? formatLongDate(night.date) : "Date TBA";
  return night.timeLabel && night.timeLabel !== "Time TBA" ? `${when} · ${night.timeLabel}` : when;
}
