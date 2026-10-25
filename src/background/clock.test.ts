import { describe, expect, it } from "vitest";
import { advanceClock, createClock } from "./clock";

describe("advanceClock", () => {
  it("advances by real frame time while visible, capped at maxDt", () => {
    let c = advanceClock(createClock(), 1000, true);
    expect(c.elapsed).toBe(0);
    c = advanceClock(c, 1016, true);
    expect(c.elapsed).toBe(16);
    c = advanceClock(c, 1300, true);
    expect(c.elapsed).toBe(66);
  });

  it("pauses while hidden and resumes without catching up", () => {
    let c = advanceClock(advanceClock(createClock(), 0, true), 16, true);
    c = advanceClock(c, 5000, false);
    expect(c.elapsed).toBe(16);
    c = advanceClock(c, 60_000, true);
    expect(c.elapsed).toBe(16);
    c = advanceClock(c, 60_010, true);
    expect(c.elapsed).toBe(26);
  });
});
