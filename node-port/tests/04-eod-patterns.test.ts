import { describe, test, expect, beforeEach } from "bun:test";
import { fromJCronString, Engine, parseEoD } from "../src/index";

describe("JCRON EOD (End of Duration) Tests", () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe("EOD Pattern Parsing", () => {
    test("should parse E0W (end of current week)", () => {
      const schedule = fromJCronString("0 0 * * * * * EOD:E0W");
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.IsSOD).toBe(false);
    });

    test("should parse E1W (end of next week)", () => {
      const schedule = fromJCronString("0 0 * * * * * EOD:E1W");
      expect(schedule.eod).toBeDefined();
    });

    test("should parse S0W (start of current week)", () => {
      const schedule = fromJCronString("0 0 * * * * * EOD:S0W");
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.IsSOD).toBe(true);
    });

    test("should parse E0D (end of current day)", () => {
      const schedule = fromJCronString("0 0 * * * * * EOD:E0D");
      expect(schedule.eod).toBeDefined();
    });

    test("should parse E1M (end of next month)", () => {
      const schedule = fromJCronString("0 0 * * * * * EOD:E1M");
      expect(schedule.eod).toBeDefined();
    });

    test("should parse complex EOD patterns E1M2W", () => {
      const schedule = fromJCronString("0 0 * * * * * EOD:E1M2W");
      expect(schedule.eod).toBeDefined();
    });

    test("should parse direct EOD modifiers without EOD: prefix", () => {
      const schedule = fromJCronString("0 0 * * * * * E1W");
      expect(schedule.eod).toBeDefined();
    });
  });

  describe("EOD calculateEndDate Function", () => {
    test("should calculate E0W (end of current week) correctly", () => {
      const eod = parseEoD("E0W");
      const testDate = new Date("2024-08-14T10:00:00.000Z"); // Wednesday
      const endDate = eod.calculateEndDate(testDate);
      
      // Should be end of Sunday (week end)
      expect(endDate.getUTCDay()).toBe(0); // Sunday
      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
      expect(endDate.getUTCSeconds()).toBe(59);
    });

    test("should calculate E1W (end of next week) correctly", () => {
      const eod = parseEoD("E1W");
      const testDate = new Date("2024-08-14T10:00:00.000Z"); // Wednesday
      const endDate = eod.calculateEndDate(testDate);
      
      // Should be end of Sunday of next week
      expect(endDate.getUTCDay()).toBe(0); // Sunday
      expect(endDate > testDate).toBe(true);
      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
    });

    test("should calculate E0D (end of current day) correctly", () => {
      const eod = parseEoD("E0D");
      const testDate = new Date("2024-08-14T10:00:00.000Z");
      const endDate = eod.calculateEndDate(testDate);
      
      // Should be end of same day
      expect(endDate.getUTCDate()).toBe(testDate.getUTCDate());
      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
      expect(endDate.getUTCSeconds()).toBe(59);
    });

    test("should calculate E1D (end of next day) correctly", () => {
      const eod = parseEoD("E1D");
      const testDate = new Date("2024-08-14T10:00:00.000Z");
      const endDate = eod.calculateEndDate(testDate);
      
      // Should be end of next day
      expect(endDate.getUTCDate()).toBe(15);
      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
    });

    test("should calculate E0M (end of current month) correctly", () => {
      const eod = parseEoD("E0M");
      const testDate = new Date("2024-08-14T10:00:00.000Z"); // August 14
      const endDate = eod.calculateEndDate(testDate);
      
      // Should be end of August (31st)
      expect(endDate.getUTCMonth()).toBe(7); // August (0-indexed)
      expect(endDate.getUTCDate()).toBe(31);
      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
    });

    test("should calculate S0W (start of current week) correctly", () => {
      const eod = parseEoD("S0W");
      const testDate = new Date("2024-08-14T10:00:00.000Z"); // Wednesday
      const startDate = eod.calculateEndDate(testDate);
      
      // Should be start of Monday (week start)
      expect(startDate.getUTCDay()).toBe(1); // Monday
      expect(startDate.getUTCHours()).toBe(0);
      expect(startDate.getUTCMinutes()).toBe(0);
      expect(startDate.getUTCSeconds()).toBe(0);
    });
  });

  describe("EOD with WOY Integration", () => {
    test("should work with WOY:33 E0W pattern", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:33 E0W");
      expect(schedule.woy).toBe("WOY:33");
      expect(schedule.eod).toBeDefined();
    });

    test("should work with WOY:1,13,26,39 E1W pattern", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:1,13,26,39 E1W");
      expect(schedule.woy).toBe("WOY:1,13,26,39");
      expect(schedule.eod).toBeDefined();
    });
  });

  describe("EOD with Timezone Integration", () => {
    test("should work with TZ:Europe/Istanbul E0W pattern", () => {
      const schedule = fromJCronString("0 0 * * * * * TZ:Europe/Istanbul E0W");
      expect(schedule.tz).toBe("Europe/Istanbul");
      expect(schedule.eod).toBeDefined();
    });

    test("should work with complex pattern WOY:33 TZ:Europe/Istanbul E1W", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:33 TZ:Europe/Istanbul E1W");
      expect(schedule.woy).toBe("WOY:33");
      expect(schedule.tz).toBe("Europe/Istanbul");
      expect(schedule.eod).toBeDefined();
    });
  });

  describe("isRangeNow Function with EOD", () => {
    test("should return true when in range for WOY pattern", () => {
      // Week 33 of 2024 is around August 11-17
      const schedule = fromJCronString("0 0 * * * * * WOY:33 E0W");
      const testTime = new Date("2024-08-14T10:00:00.000Z"); // Wednesday of week 33
      
      const isInRange = schedule.isRangeNow(testTime);
      expect(isInRange).toBe(true);
    });

    test("should return false when not in range for WOY pattern", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:33 E0W");
      const testTime = new Date("2024-07-15T10:00:00.000Z"); // Week 29, not 33
      
      const isInRange = schedule.isRangeNow(testTime);
      expect(isInRange).toBe(false);
    });

    test("should return true for multiple week pattern when in range", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:6,19,32,45 E0W");
      const testTime = new Date("2024-08-05T10:00:00.000Z"); // Week 32
      
      const isInRange = schedule.isRangeNow(testTime);
      expect(isInRange).toBe(true);
    });

    test("should return false for multiple week pattern when not in range", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:6,19,32,45 E0W");
      const testTime = new Date("2024-07-28T10:00:00.000Z"); // Week 31, not in list
      
      const isInRange = schedule.isRangeNow(testTime);
      expect(isInRange).toBe(false);
    });
  });

  describe("ISO Week Boundary with EOD", () => {
    test("should handle ISO Week 1 boundary with EOD", () => {
      // Dec 30, 2024 is in ISO Week 1 of 2025
      const schedule = fromJCronString("0 0 * * * * * WOY:1 E0W");
      const testTime = new Date("2024-12-30T10:00:00.000Z");
      
      const isInRange = schedule.isRangeNow(testTime);
      expect(isInRange).toBe(true);
    });
  });

  describe("EOD Error Handling", () => {
    test("should handle invalid EOD patterns gracefully", () => {
      expect(() => {
        parseEoD("INVALID");
      }).toThrow();
    });

    test("should handle empty EOD patterns", () => {
      expect(() => {
        parseEoD("");
      }).toThrow();
    });

    test("should return false for isRangeNow when no EOD specified", () => {
      const schedule = fromJCronString("0 0 * * * * *");
      const testTime = new Date("2024-08-14T10:00:00.000Z");
      
      const isInRange = schedule.isRangeNow(testTime);
      expect(isInRange).toBe(false);
    });
  });
});
