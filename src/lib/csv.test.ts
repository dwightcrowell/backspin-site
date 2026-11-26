import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("keeps quoted commas and escaped quotes", () => {
    const rows = parseCsv('Name,Note\n"Abel, Jose","He said ""hi"""\nplain,ok\n');
    expect(rows).toEqual([
      ["Name", "Note"],
      ["Abel, Jose", 'He said "hi"'],
      ["plain", "ok"],
    ]);
  });

  it("strips a byte-order mark and blank lines", () => {
    const rows = parseCsv("\uFEFFA,B\n\n1,2\r\n");
    expect(rows).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
  });
});
