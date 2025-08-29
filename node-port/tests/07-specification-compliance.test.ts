import { describe, test, expect } from "bun:test";
import { fromJCronString, Engine } from "../src/index";

describe("JCRON Specification Compliance Tests", () => {
  const engine = new Engine();

  describe("JCRON_SYNTAX.md Compliance", () => {
    test("should support all standard cron field formats", () => {
      const patterns = [
        "* * * * * * *",              // All wildcards
        "0 0 0 1 1 * *",              // Specific values
        "0-30 * * * * * *",           // Ranges
        "0,15,30,45 * * * * * *",     // Lists
        "*/15 * * * * * *",           // Steps
        "0-30/5 * * * * * *",         // Range with step
      ];

      patterns.forEach(pattern => {
        expect(() => fromJCronString(pattern)).not.toThrow();
      });
    });

    test("should support WOY (Week of Year) patterns as per spec", () => {
      const woyPatterns = [
        "0 0 * * * * * WOY:*",
        "0 0 * * * * * WOY:1",
        "0 0 * * * * * WOY:1,13,26,39,52",
        "0 0 * * * * * WOY:1-4",
        "0 0 * * * * * WOY:*/2",
      ];

      woyPatterns.forEach(pattern => {
        const schedule = fromJCronString(pattern);
        expect(schedule.woy).toBeDefined();
        expect(schedule.woy).toContain("WOY:");
      });
    });

    test("should support timezone patterns as per spec", () => {
      const timezonePatterns = [
        "0 0 12 * * * * TZ:UTC",
        "0 0 12 * * * * TZ:Europe/Istanbul",
        "0 0 12 * * * * TZ:America/New_York",
        "0 0 12 * * * * TZ:Asia/Tokyo",
        "0 0 12 * * * * TZ:Australia/Sydney",
      ];

      timezonePatterns.forEach(pattern => {
        const schedule = fromJCronString(pattern);
        expect(schedule.tz).toBeDefined();
      });
    });

    test("should support EOD/SOD patterns as per spec", () => {
      const eodPatterns = [
        "0 0 * * * * * EOD:E0W",      // End of current week
        "0 0 * * * * * EOD:E1W",      // End of next week
        "0 0 * * * * * EOD:S0W",      // Start of current week
        "0 0 * * * * * EOD:E0D",      // End of current day
        "0 0 * * * * * EOD:E1M",      // End of next month
        "0 0 * * * * * EOD:E1M2W",    // Complex EOD
        "0 0 * * * * * E1W",          // Direct EOD (no EOD: prefix)
      ];

      eodPatterns.forEach(pattern => {
        const schedule = fromJCronString(pattern);
        expect(schedule.eod).toBeDefined();
      });
    });

    test("should support combined patterns as per spec", () => {
      const combinedPatterns = [
        "0 0 9 * * * * WOY:33 TZ:Europe/Istanbul EOD:E0W",
        "0 30 14 * * 1-5 * WOY:1,13,26,39,52 TZ:America/New_York EOD:E1W",
        "*/15 * 9-17 * * * * WOY:* TZ:UTC",
        "0 0 8 * * 1 * WOY:*/2 TZ:Asia/Tokyo EOD:S0W",
      ];

      combinedPatterns.forEach(pattern => {
        const schedule = fromJCronString(pattern);
        expect(schedule).toBeDefined();
        
        // Check that all components are parsed
        if (pattern.includes("WOY:")) expect(schedule.woy).toBeDefined();
        if (pattern.includes("TZ:")) expect(schedule.tz).toBeDefined();
        if (pattern.includes("EOD:") || /\s[ES]\d+[WMDY]/.test(pattern)) {
          expect(schedule.eod).toBeDefined();
        }
      });
    });
  });

  describe("Standard Cron Compatibility", () => {
    test("should be compatible with standard 5-field cron", () => {
      const standardPatterns = [
        "0 9 * * *",          // Daily at 9 AM
        "0 9 * * 1",          // Every Monday at 9 AM
        "0 9 1 * *",          // First day of month at 9 AM
        "*/15 * * * *",       // Every 15 minutes
        "0 */2 * * *",        // Every 2 hours
        "0 9-17 * * 1-5",     // Business hours
      ];

      standardPatterns.forEach(pattern => {
        expect(() => fromJCronString(pattern)).not.toThrow();
      });
    });

    test("should be compatible with 6-field cron (with seconds)", () => {
      const sixFieldPatterns = [
        "0 0 9 * * *",        // Daily at 9 AM (with seconds)
        "30 0 9 * * 1",       // Every Monday at 9:00:30 AM
        "0 0 9 1 * *",        // First day of month at 9 AM
        "*/30 * * * * *",     // Every 30 seconds
      ];

      sixFieldPatterns.forEach(pattern => {
        expect(() => fromJCronString(pattern)).not.toThrow();
      });
    });
  });

  describe("Edge Cases from Specification", () => {
    test("should handle ISO Week 1 boundary correctly", () => {
      // As per ISO 8601, Week 1 is the first week with Thursday
      const schedule = fromJCronString("0 0 12 * * * * WOY:1");
      
      // Test with dates around New Year that should be Week 1
      const testDates = [
        new Date("2024-12-30T10:00:00.000Z"), // Monday of Week 1 2025
        new Date("2025-01-05T10:00:00.000Z"),  // Sunday of Week 1 2025
      ];

      testDates.forEach(testDate => {
        const next = engine.next(schedule, testDate);
        expect(next).toBeDefined();
        expect(next >= testDate).toBe(true);
      });
    });

    test("should handle leap year Week 53", () => {
      // Some years have 53 ISO weeks
      const schedule = fromJCronString("0 0 12 * * * * WOY:53");
      const testDate = new Date("2024-01-01T10:00:00.000Z");
      
      expect(() => {
        const next = engine.next(schedule, testDate);
        expect(next).toBeDefined();
      }).not.toThrow();
    });

    test("should handle DST transitions correctly", () => {
      const schedule = fromJCronString("0 0 3 * * * * TZ:Europe/Istanbul");
      
      // Test around Turkish DST transitions
      const dstDates = [
        new Date("2024-03-30T23:00:00.000Z"), // Before spring DST
        new Date("2024-10-26T23:00:00.000Z"), // Before fall DST
      ];

      dstDates.forEach(testDate => {
        expect(() => {
          const next = engine.next(schedule, testDate);
          expect(next).toBeDefined();
          expect(next > testDate).toBe(true);
        }).not.toThrow();
      });
    });
  });

  describe("Performance Requirements", () => {
    test("should calculate next trigger efficiently", () => {
      const schedule = fromJCronString("0 0 12 * * * * WOY:33 TZ:Europe/Istanbul");
      const testDate = new Date("2024-01-01T10:00:00.000Z");

      const startTime = performance.now();
      const next = engine.next(schedule, testDate);
      const endTime = performance.now();

      expect(next).toBeDefined();
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });

    test("should handle complex patterns efficiently", () => {
      const complexSchedule = fromJCronString("0 0,15,30,45 8-18 1-15 * 1-5 * WOY:* TZ:Europe/Istanbul EOD:E0D");
      const testDate = new Date("2024-01-01T10:00:00.000Z");

      const startTime = performance.now();
      const next = engine.next(complexSchedule, testDate);
      const endTime = performance.now();

      expect(next).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should still be fast
    });
  });

  describe("API Consistency", () => {
    test("should have consistent next/prev behavior", () => {
      const schedule = fromJCronString("0 0 12 * * * * WOY:33");
      const testDate = new Date("2024-08-15T10:00:00.000Z"); // In Week 33

      const next = engine.next(schedule, testDate);
      const prev = engine.prev(schedule, testDate);

      expect(next > testDate).toBe(true);
      expect(prev < testDate).toBe(true);

      // The gap between prev and next should be reasonable
      const gap = next.getTime() - prev.getTime();
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(365 * 24 * 60 * 60 * 1000); // Less than a year
    });

    test("should have consistent isMatch behavior", () => {
      const schedule = fromJCronString("30 15 14 * * * *");
      
      const matchingDate = new Date("2024-08-15T14:15:30.000Z");
      const nonMatchingDate = new Date("2024-08-15T14:15:31.000Z");

      expect(engine.isMatch(schedule, matchingDate)).toBe(true);
      expect(engine.isMatch(schedule, nonMatchingDate)).toBe(false);
    });

    test("should have consistent string representation", () => {
      const originalPattern = "0 30 14 * * 1-5 * WOY:33 TZ:Europe/Istanbul EOD:E0W";
      const schedule = fromJCronString(originalPattern);
      const representation = schedule.toString();

      // Should be parseable back
      expect(() => fromJCronString(representation)).not.toThrow();
      
      // Should contain key components
      expect(representation).toContain("30");
      expect(representation).toContain("14");
      expect(representation).toContain("1-5");
      expect(representation).toContain("WOY:33");
      expect(representation).toContain("Europe/Istanbul");
    });
  });

  describe("Error Handling Compliance", () => {
    test("should provide meaningful error messages", () => {
      const invalidPatterns = [
        "invalid pattern",
        "60 * * * * * *",     // Invalid seconds
        "* 60 * * * * *",     // Invalid minutes
        "* * 25 * * * *",     // Invalid hours
        "* * * 32 * * *",     // Invalid day of month
        "* * * * 13 * *",     // Invalid month
        "* * * * * 8 *",      // Invalid day of week
      ];

      invalidPatterns.forEach(pattern => {
        expect(() => fromJCronString(pattern)).toThrow();
      });
    });

    test("should handle edge cases gracefully", () => {
      const edgeCases = [
        "0 0 12 29 2 * 2023",   // Feb 29 in non-leap year
        "0 0 12 31 4 * *",      // April 31st (doesn't exist)
        "0 0 12 * * * * WOY:54", // Week 54 (usually doesn't exist)
      ];

      edgeCases.forEach(pattern => {
        expect(() => {
          const schedule = fromJCronString(pattern);
          const next = engine.next(schedule, new Date("2024-01-01T10:00:00.000Z"));
          expect(next).toBeDefined();
        }).not.toThrow();
      });
    });
  });
});
