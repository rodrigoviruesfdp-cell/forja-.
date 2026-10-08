import { describe, expect, it } from "vitest";
import { addDays, dateOf, isIsoDate, localDate, mondayOf, weekdayOfIso } from "./dates";

describe("dates", () => {
  it("moves across months, years and daylight-saving changes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    // Spain changes the clocks on 25 October 2026.
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("weeks start on Monday", () => {
    expect(weekdayOfIso("2026-10-05")).toBe(0);
    expect(weekdayOfIso("2026-10-11")).toBe(6);
    expect(mondayOf("2026-10-11")).toBe("2026-10-05");
    expect(mondayOf("2026-10-05")).toBe("2026-10-05");
  });

  it("round-trips local days and rejects impossible ones", () => {
    expect(localDate(dateOf("2026-02-28"))).toBe("2026-02-28");
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-10-08")).toBe(true);
    expect(isIsoDate("8/10/2026")).toBe(false);
  });
});
