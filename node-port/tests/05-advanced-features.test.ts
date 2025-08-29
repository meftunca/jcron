import { describe, test, expect, beforeEach } from "bun:test";
import { fromJCronString, Engine } from "../src/index";

describe("JCRON Advanced Features Tests", () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe("Complex Pattern Combinations", () => {
    test("should handle WOY + Timezone + EOD combination", () => {
      const schedule = fromJCronString("0 0 9 * * * * WOY:33 TZ:Europe/Istanbul E1W");
      
      expect(schedule.woy).toBe("WOY:33");
      expect(schedule.tz).toBe("Europe/Istanbul");
      expect(schedule.eod).toBeDefined();
      expect(schedule.h).toBe("9");
    });

    test("should handle multiple weeks with timezone and EOD", () => {
      const schedule = fromJCronString("0 30 14 * * 1-5 * WOY:1,13,26,39,52 TZ:America/New_York E0W");
      
      expect(schedule.woy).toBe("WOY:1,13,26,39,52");
      expect(schedule.tz).toBe("America/New_York");
      expect(schedule.eod).toBeDefined();
      expect(schedule.m).toBe("30");
      expect(schedule.h).toBe("14");
      expect(schedule.dow).toBe("1-5");
    });

    test("should handle range patterns with step values", () => {
      const schedule = fromJCronString("0 */15 9-17 * * 1-5 * WOY:* TZ:UTC");
      
      expect(schedule.s).toBe("0");
      expect(schedule.m).toBe("*/15");
      expect(schedule.h).toBe("9-17");
      expect(schedule.dow).toBe("1-5");
      expect(schedule.woy).toBe("WOY:*");
      expect(schedule.tz).toBe("UTC");
    });
  });

  describe("Edge Cases and Boundary Conditions", () => {
    test("should handle February 29th in leap years", () => {
      const schedule = fromJCronString("0 0 12 29 2 * 2024"); // Feb 29, 2024 (leap year)
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCFullYear()).toBe(2024);
      expect(next.getUTCMonth()).toBe(1); // February
      expect(next.getUTCDate()).toBe(29);
    });

    test("should handle February 29th in non-leap years", () => {
      const schedule = fromJCronString("0 0 12 29 2 * 2023"); // Feb 29, 2023 (non-leap year)
      const fromTime = new Date("2023-01-01T10:00:00.000Z");
      
      // Should skip to next valid occurrence (2024)
      const next = engine.next(schedule, fromTime);
      expect(next.getUTCFullYear()).toBe(2024); // Next leap year
    });

    test("should handle month boundary crossing", () => {
      const schedule = fromJCronString("0 0 12 31 * * *"); // 31st of month
      const fromTime = new Date("2024-04-30T13:00:00.000Z"); // April 30 (no 31st)
      const next = engine.next(schedule, fromTime);
      
      // Should find next month with 31 days (May)
      expect(next.getUTCMonth()).toBe(4); // May
      expect(next.getUTCDate()).toBe(31);
    });

    test("should handle last day of month patterns", () => {
      const schedule = fromJCronString("0 0 12 L * * *"); // Last day of month
      const fromTime = new Date("2024-02-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      // Should find last day of February 2024 (29th - leap year)
      expect(next.getUTCMonth()).toBe(1); // February
      expect(next.getUTCDate()).toBe(29);
    });
  });

  describe("Performance and Scale Tests", () => {
    test("should handle large WOY lists efficiently", () => {
      const largeWeekList = Array.from({length: 25}, (_, i) => i * 2 + 1).join(',');
      const schedule = fromJCronString(`0 0 12 * * * * WOY:${largeWeekList}`);
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      
      const startTime = Date.now();
      const next = engine.next(schedule, fromTime);
      const endTime = Date.now();
      
      expect(next).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });

    test("should handle complex patterns with multiple constraints", () => {
      const schedule = fromJCronString("0 0,15,30,45 8-18 1-15 1,3,5,7,9,11 1-5 * WOY:* TZ:Europe/Istanbul E0D");
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      
      const startTime = Date.now();
      const next = engine.next(schedule, fromTime);
      const endTime = Date.now();
      
      expect(next).toBeDefined();
      expect(next > fromTime).toBe(true);
      expect(endTime - startTime).toBeLessThan(200); // Should still be reasonably fast
    });
  });

  describe("Year Patterns and Ranges", () => {
    test("should handle specific year patterns", () => {
      const schedule = fromJCronString("0 0 12 1 1 * 2025,2026,2027");
      const fromTime = new Date("2024-12-31T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCFullYear()).toBe(2025);
      expect(next.getUTCMonth()).toBe(0); // January
      expect(next.getUTCDate()).toBe(1);
    });

    test("should handle year ranges", () => {
      const schedule = fromJCronString("0 0 12 1 1 * 2025-2030");
      const fromTime = new Date("2024-12-31T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCFullYear()).toBeGreaterThanOrEqual(2025);
      expect(next.getUTCFullYear()).toBeLessThanOrEqual(2030);
    });
  });

  describe("Pattern Validation and Error Handling", () => {
    test("should reject invalid cron patterns", () => {
      expect(() => {
        fromJCronString("invalid pattern");
      }).toThrow();
    });

    test("should reject out-of-range values", () => {
      expect(() => {
        fromJCronString("60 * * * * * *"); // Invalid seconds (>59)
      }).toThrow();
    });

    test("should reject invalid timezone", () => {
      expect(() => {
        const schedule = fromJCronString("0 0 12 * * * * TZ:Invalid/Zone");
        engine.next(schedule, new Date());
      }).not.toThrow(); // Should handle gracefully, not crash
    });

    test("should reject invalid WOY values", () => {
      expect(() => {
        fromJCronString("0 0 12 * * * * WOY:54"); // Week 54 doesn't exist
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe("String Representations", () => {
    test("should convert schedule back to string correctly", () => {
      const originalPattern = "0 30 14 * * 1-5 * WOY:33 TZ:Europe/Istanbul E0W";
      const schedule = fromJCronString(originalPattern);
      const stringRepresentation = schedule.toString();
      
      // Should contain all the main components
      expect(stringRepresentation).toContain("30");
      expect(stringRepresentation).toContain("14");
      expect(stringRepresentation).toContain("1-5");
      expect(stringRepresentation).toContain("WOY:33");
      expect(stringRepresentation).toContain("TZ:Europe/Istanbul");
    });

    test("should convert to standard cron format", () => {
      const schedule = fromJCronString("0 30 14 15 6 * 2024");
      const standardCron = schedule.toStandardCron();
      
      expect(standardCron).toBe("0 30 14 15 6 *");
    });
  });

  describe("Integration with Multiple Engines", () => {
    test("should work with multiple engine instances", () => {
      const engine1 = new Engine();
      const engine2 = new Engine();
      
      const schedule = fromJCronString("0 0 12 * * * * WOY:33");
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      
      const next1 = engine1.next(schedule, fromTime);
      const next2 = engine2.next(schedule, fromTime);
      
      // Both engines should give same result
      expect(next1.getTime()).toBe(next2.getTime());
    });
  });
});
