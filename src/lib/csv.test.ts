import { describe, expect, it } from "vitest";
import { csvCell, RESULTS_CSV_NOTE, toCsv } from "./csv";

describe("csv", () => {
  it("escapes quotes, commas, and newlines", () => {
    expect(csvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("defends against CSV injection", () => {
    expect(csvCell("=CMD()")).toBe("'=CMD()");
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("-1+1")).toBe("'-1+1");
    expect(csvCell("@sum(A1)")).toBe("'@sum(A1)");
  });

  it("includes the Best Auction Squad header note", () => {
    const csv = toCsv(RESULTS_CSV_NOTE, ["rank", "team"], [[1, "Alpha"]]);
    expect(csv.startsWith(RESULTS_CSV_NOTE)).toBe(true);
    expect(csv).toContain("rank,team");
  });
});
