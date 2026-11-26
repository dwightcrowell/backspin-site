const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export const STREAM_TIME_ZONE = "America/New_York";

export function isoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Accepts 2027-02-11, 2/11/2027, and February 11, 2027. Returns YYYY-MM-DD or null. */
export function parseFlexibleDate(value: string): string | null {
  const text = value.trim();
  if (!text) return null;

  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return isoDate(Number(match[1]), Number(match[2]), Number(match[3]));

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return isoDate(Number(match[3]), Number(match[1]), Number(match[2]));

  match = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return null;
    return isoDate(Number(match[3]), month, Number(match[2]));
  }

  return null;
}

export function parseClock(value: string): { hour: number; minute: number } | null {
  const text = value.trim();
  if (!text) return null;

  let match = text.match(/^(\d{1,2})\s*:\s*(\d{2})\s*(a\.?m\.?|p\.?m\.?)?$/i);
  if (match) {
    return applyMeridiem(Number(match[1]), Number(match[2]), match[3]);
  }

  match = text.match(/^(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)$/i);
  if (match) return applyMeridiem(Number(match[1]), 0, match[2]);

  return null;
}

function applyMeridiem(hour: number, minute: number, meridiem: string | undefined): { hour: number; minute: number } | null {
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;
  if (!meridiem) {
    if (hour > 23) return null;
    return { hour, minute };
  }
  const marker = meridiem.toLowerCase().startsWith("p") ? "pm" : "am";
  if (hour < 1 || hour > 12) return null;
  let normalized = hour % 12;
  if (marker === "pm") normalized += 12;
  return { hour: normalized, minute };
}

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const bag: Record<string, string> = {};
  for (const part of parts) bag[part.type] = part.value;
  const hour = bag.hour === "24" ? "0" : bag.hour;
  const asUtc = Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    Number(hour),
    Number(bag.minute),
    Number(bag.second),
  );
  return asUtc - instant.getTime();
}

/** Wall-clock time in Eastern Time, as a UTC instant. */
export function easternToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = zoneOffsetMs(guess, STREAM_TIME_ZONE);
  const first = new Date(guess.getTime() - offset);
  const refined = zoneOffsetMs(first, STREAM_TIME_ZONE);
  return new Date(guess.getTime() - refined);
}

export function easternDateTime(isoDateText: string, hour: number, minute: number): Date | null {
  const match = isoDateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return easternToUtc(Number(match[1]), Number(match[2]), Number(match[3]), hour, minute);
}

export function formatLongDate(isoDateText: string): string {
  const match = isoDateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDateText;
  const stamp = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(stamp);
}

export function formatMonthDay(isoDateText: string): string {
  const match = isoDateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDateText;
  const stamp = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(stamp);
}

export function weekdayName(isoDateText: string): string {
  const match = isoDateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const stamp = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(stamp);
}

export function formatTimeEt(value: string): string {
  const parsed = parseClock(value);
  if (!parsed) return value.trim() ? `${value.trim()} ET` : "Time TBA";
  const suffix = parsed.hour >= 12 ? "PM" : "AM";
  let hour = parsed.hour % 12;
  if (hour === 0) hour = 12;
  const minutes = parsed.minute === 0 ? "" : `:${String(parsed.minute).padStart(2, "0")}`;
  return `${hour}${minutes} ${suffix} ET`;
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function formatWinPct(wins: number, losses: number): string {
  const total = wins + losses;
  if (total === 0) return "—";
  const pct = Math.round((wins / total) * 1000) / 10;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

export function formatList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
