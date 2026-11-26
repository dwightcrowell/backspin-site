import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "./data/context";
import { defaultSeasonId, seasonById, type SeasonWindow } from "./lib/seasons";

export function withSeason(path: string, seasonId: number): string {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("season", String(seasonId));
  return `${pathname}?${params.toString()}`;
}

export function useSeason(): {
  seasonId: number;
  season: SeasonWindow;
  setSeason: (id: number) => void;
} {
  const data = useData();
  const [params, setParams] = useSearchParams();
  const fallback = defaultSeasonId(data.now, data.rounds);
  const requested = Number(params.get("season"));
  const seasonId = requested >= 1 && requested <= 4 ? requested : fallback;

  const setSeason = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("season", String(id));
    setParams(next);
  };

  return { seasonId, season: seasonById(seasonId), setSeason };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title === "BSG" ? "BSG · Backspin Games" : `${title} · BSG`;
  }, [title]);
}
