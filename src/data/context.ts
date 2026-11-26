import { createContext, useContext } from "react";
import type { SiteData } from "./DataProvider";

export const DataContext = createContext<SiteData | null>(null);

export function useData(): SiteData {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData must be used inside DataProvider");
  return value;
}
