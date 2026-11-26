import { useEffect, useMemo, useState, type ReactNode } from "react";
import { columns, csvUrls, samplePreview } from "../config";
import { easternToUtc } from "../lib/dates";
import { sampleCsv } from "../sampleData";
import { assemble, looksLikeCsv, urlsRequested, type Assembled } from "./assemble";
import { DataContext } from "./context";

export type TabSource = "live" | "sample";

export interface SiteData extends Assembled {
  loading: boolean;
  now: Date;
  sources: Record<"rounds" | "streamers" | "matchups" | "streams", TabSource>;
  usingSample: boolean;
  loadNotes: string[];
}

function previewNow(): Date {
  return easternToUtc(samplePreview.year, samplePreview.month, samplePreview.day, samplePreview.hour, samplePreview.minute);
}

function fromSample(now: Date, notes: string[] = []): SiteData {
  return {
    ...assemble(sampleCsv),
    loading: false,
    now,
    sources: { rounds: "sample", streamers: "sample", matchups: "sample", streams: "sample" },
    usingSample: true,
    loadNotes: notes,
  };
}

const expectedHeader = {
  rounds: columns.rounds.date,
  streamers: columns.streamers.player,
  matchups: columns.matchups.date,
  streams: columns.streams.date,
} as const;

async function loadTab(
  url: string,
  label: keyof typeof expectedHeader,
): Promise<{ csv: string; source: TabSource; note?: string }> {
  if (!url.trim()) return { csv: sampleCsv[label], source: "sample" };
  try {
    const response = await fetch(url.trim(), { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`the sheet returned status ${response.status}`);
    const text = await response.text();
    if (!looksLikeCsv(text, expectedHeader[label])) {
      throw new Error("the link did not return a CSV. Publish the tab to the web as CSV, then paste that link");
    }
    return { csv: text, source: "live" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "the request failed";
    return {
      csv: sampleCsv[label],
      source: "sample",
      note: `${label[0].toUpperCase()}${label.slice(1)} could not load (${reason}). That tab is showing sample data.`,
    };
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SiteData>(() =>
    urlsRequested()
      ? {
          rounds: [],
          players: [],
          streams: [],
          warnings: [],
          loading: true,
          now: new Date(),
          sources: { rounds: "sample", streamers: "sample", matchups: "sample", streams: "sample" },
          usingSample: false,
          loadNotes: [],
        }
      : fromSample(previewNow()),
  );

  useEffect(() => {
    if (!urlsRequested()) return;
    let cancelled = false;
    const labels = ["rounds", "streamers", "matchups", "streams"] as const;
    void Promise.all(labels.map((label) => loadTab(csvUrls[label], label))).then((results) => {
      if (cancelled) return;
      const tabs = {
        rounds: results[0].csv,
        streamers: results[1].csv,
        matchups: results[2].csv,
        streams: results[3].csv,
      };
      const sources = {
        rounds: results[0].source,
        streamers: results[1].source,
        matchups: results[2].source,
        streams: results[3].source,
      };
      const usingSample = Object.values(sources).some((source) => source === "sample");
      setData({
        ...assemble(tabs),
        loading: false,
        now: usingSample && Object.values(sources).every((source) => source === "sample") ? previewNow() : new Date(),
        sources,
        usingSample,
        loadNotes: results.flatMap((result) => (result.note ? [result.note] : [])),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => data, [data]);
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

