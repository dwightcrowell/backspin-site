export const FORMATS = ["BO3", "BO5", "BO7"] as const;
export type Format = (typeof FORMATS)[number];

/** Points awarded to the player who wins the round (one best-of series). */
export const POINTS_PER_ROUND: Record<Format, number> = {
  BO3: 1,
  BO5: 2,
  BO7: 3,
};

/** Only the first this-many regular-season rounds a player plays award points. */
export const ROUND_CAP = 20;

/** Regular-season bonus cash by finishing place. Index 0 is 1st. Places 13+ are unpaid. */
export const REGULAR_PAYOUTS = [350, 250, 200, 150, 125, 100, 80, 70, 60, 50, 40, 25] as const;

export const REGULAR_POOL = 1500;
export const PLAYOFF_POOL = 1000;

export const PLAYOFF_PRIZES = {
  champion: 400,
  runnerUp: 200,
  semifinal: 100,
  quarterfinal: 50,
} as const;

export const PLAYOFF_SPOTS = 8;
export const PAID_PLACES = REGULAR_PAYOUTS.length;

export function payoutForPlace(place: number): number {
  if (place < 1) return 0;
  return REGULAR_PAYOUTS[place - 1] ?? 0;
}

export function pointsForFormat(format: Format | null): number {
  if (!format) return 0;
  return POINTS_PER_ROUND[format];
}

export function formatName(format: Format | string | null): string {
  if (format === "BO3") return "Best of 3";
  if (format === "BO5") return "Best of 5";
  if (format === "BO7") return "Best of 7";
  return format ? String(format) : "Format TBA";
}
