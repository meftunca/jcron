import { describe, expect, test } from "bun:test";
import { Engine, fromObject, getNextN } from "../src/index.js";

const engine = new Engine();

describe("Multiple nthWeekDay Pattern Tests", () => {
  describe("Parsing Multiple nth Patterns", () => {
    test("should parse 1#2,2#4 (2nd Monday OR 4th Tuesday)", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4",
        Y: "*",
      });
      expect(schedule.dow).toBe("1#2,2#4");
    });

    test("should parse 1#1,3#2,5#3 (1st Mon, 2nd Wed, 3rd Fri)", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "14",
        D: "*",
        M: "*",
        dow: "1#1,3#2,5#3",
        Y: "*",
      });
      expect(schedule.dow).toBe("1#1,3#2,5#3");
    });
  });

  describe("Next Trigger with Multiple nth Patterns", () => {
    test("should find next trigger for 1#2,2#4 (2nd Monday OR 4th Tuesday)", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4", // 2nd Monday OR 4th Tuesday
        Y: "*",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should find Feb 12 (2nd Monday) or Feb 27 (4th Tuesday)
      expect(next.toISOString()).toBe("2024-02-12T09:00:00.000Z");
      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBe(12);
    });

    test("should find next trigger for 1#1,3#2,5#3 (1st Mon, 2nd Wed, 3rd Fri)", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "14",
        D: "*",
        M: "*",
        dow: "1#1,3#2,5#3", // 1st Monday, 2nd Wednesday, 3rd Friday
        Y: "*",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should find Feb 5 (1st Monday)
      expect(next.toISOString()).toBe("2024-02-05T14:00:00.000Z");
      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBe(5);
    });

    test("should handle sequence of multiple nth patterns", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4", // 2nd Monday OR 4th Tuesday
        Y: "*",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const nextRuns = getNextN(schedule, 4, fromTime);

      // Feb 12 (Mon), Feb 27 (Tue), Mar 11 (Mon), Mar 26 (Tue)
      expect(nextRuns[0].toISOString()).toBe("2024-02-12T09:00:00.000Z");
      expect(nextRuns[0].getUTCDay()).toBe(1); // Monday

      expect(nextRuns[1].toISOString()).toBe("2024-02-27T09:00:00.000Z");
      expect(nextRuns[1].getUTCDay()).toBe(2); // Tuesday

      expect(nextRuns[2].toISOString()).toBe("2024-03-11T09:00:00.000Z");
      expect(nextRuns[2].getUTCDay()).toBe(1); // Monday

      expect(nextRuns[3].toISOString()).toBe("2024-03-26T09:00:00.000Z");
      expect(nextRuns[3].getUTCDay()).toBe(2); // Tuesday
    });

    test("should handle three different patterns", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "14",
        D: "*",
        M: "*",
        dow: "1#1,3#2,5#3", // 1st Mon, 2nd Wed, 3rd Fri
        Y: "*",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const nextRuns = getNextN(schedule, 3, fromTime);

      // Feb 5 (Mon), Feb 14 (Wed), Feb 16 (Fri)
      expect(nextRuns[0].getUTCDay()).toBe(1); // Monday
      expect(nextRuns[0].getUTCDate()).toBe(5);

      expect(nextRuns[1].getUTCDay()).toBe(3); // Wednesday
      expect(nextRuns[1].getUTCDate()).toBe(14);

      expect(nextRuns[2].getUTCDay()).toBe(5); // Friday
      expect(nextRuns[2].getUTCDate()).toBe(16);
    });
  });

  describe("Multiple nth Patterns with EOD", () => {
    test("should work with 1#1 and EOD:E1D", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "0",
        D: "*",
        M: "*",
        dow: "1#1", // 1st Monday
        Y: "*",
        eod: "E1D",
      });

      const fromTime = new Date("2024-02-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should find 1st Monday (Feb 5)
      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBeLessThanOrEqual(7); // First week
    });

    test("should work with 1#2,2#4 and EOD:E1D", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4", // 2nd Monday OR 4th Tuesday
        Y: "*",
        eod: "E1D",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should find Feb 12 (2nd Monday)
      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBe(12);
    });
  });

  describe("isMatch with Multiple nth Patterns", () => {
    test("should match on 2nd Monday with 1#2,2#4", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4",
        Y: "*",
      });

      // Feb 12, 2024 is 2nd Monday
      const date = new Date("2024-02-12T09:00:00.000Z");
      expect(engine.isMatch(schedule, date)).toBe(true);
    });

    test("should match on 4th Tuesday with 1#2,2#4", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4",
        Y: "*",
      });

      // Feb 27, 2024 is 4th Tuesday
      const date = new Date("2024-02-27T09:00:00.000Z");
      expect(engine.isMatch(schedule, date)).toBe(true);
    });

    test("should NOT match on 3rd Monday with 1#2,2#4", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "*",
        dow: "1#2,2#4",
        Y: "*",
      });

      // Feb 19, 2024 is 3rd Monday (should NOT match)
      const date = new Date("2024-02-19T09:00:00.000Z");
      expect(engine.isMatch(schedule, date)).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    test("should handle same day with different nth values (1#1,1#3)", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "10",
        D: "*",
        M: "*",
        dow: "1#1,1#3", // 1st Monday OR 3rd Monday
        Y: "*",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const nextRuns = getNextN(schedule, 2, fromTime);

      // Should get 1st Monday (Feb 5) and 3rd Monday (Feb 19)
      expect(nextRuns[0].getUTCDay()).toBe(1); // Monday
      expect(nextRuns[0].getUTCDate()).toBe(5); // 1st

      expect(nextRuns[1].getUTCDay()).toBe(1); // Monday
      expect(nextRuns[1].getUTCDate()).toBe(19); // 3rd
    });

    test("should handle all weekdays on different nth occurrences", () => {
      const schedule = fromObject({
        s: "0",
        m: "0",
        h: "12",
        D: "*",
        M: "*",
        dow: "0#2,1#2,2#2,3#2,4#2,5#2,6#2", // All 2nd weekdays
        Y: "*",
      });

      const fromTime = new Date("2024-02-01T00:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should find first 2nd occurrence of any weekday in Feb 2024
      // Feb 1, 2024 is Thursday
      // 1st Thu: Feb 1, 2nd Thu: Feb 8
      // 1st Fri: Feb 2, 2nd Fri: Feb 9
      // 1st Sat: Feb 3, 2nd Sat: Feb 10
      // 1st Sun: Feb 4, 2nd Sun: Feb 11
      // So earliest 2nd occurrence is Feb 8 (Thursday)
      expect(next.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(next.getUTCDate()).toBe(8); // 2nd Thursday
      expect(next.getUTCDay()).toBe(4); // Thursday
    });
  });
});
