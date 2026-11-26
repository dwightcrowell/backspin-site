import { describe, expect, it } from "vitest";
import { formatTimeEt, parseClock, parseFlexibleDate } from "./dates";

describe("dates", () => {
  it("reads the sheet's date formats", () => {
    expect(parseFlexibleDate("2027-02-11")).toBe("2027-02-11");
    expect(parseFlexibleDate("2/11/2027")).toBe("2027-02-11");
    expect(parseFlexibleDate("February 11, 2027")).toBe("2027-02-11");
    expect(parseFlexibleDate("not a date")).toBeNull();
  });

  it("reads afternoon times and labels them in Eastern Time", () => {
    expect(parseClock("1:00 PM")).toEqual({ hour: 13, minute: 0 });
    expect(parseClock("1 PM")).toEqual({ hour: 13, minute: 0 });
    expect(formatTimeEt("1:00 PM")).toBe("1 PM ET");
    expect(formatTimeEt("1:30 PM")).toBe("1:30 PM ET");
  });
});
