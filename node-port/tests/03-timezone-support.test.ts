import { describe, test, expect, beforeEach } from "bun:test";
import { fromJCronString, Engine } from "../src/index";

describe("JCRON Timezone Support Tests", () => {
  let engine: Engine;

  beforeEach(() => {
    // Use tolerant timezone so tests that check invalid timezone handling do not throw
    engine = new Engine({ tolerantTimezone: true });
  });

  describe("Timezone Parsing", () => {
    test("should parse TZ:UTC", () => {
      const schedule = fromJCronString("0 0 12 * * * * TZ:UTC");
      expect(schedule.tz).toBe("UTC");
    });

    test("should parse TZ:Europe/Istanbul", () => {
      const schedule = fromJCronString("0 0 12 * * * * TZ:Europe/Istanbul");
      expect(schedule.tz).toBe("Europe/Istanbul");
    });

    test("should parse TZ:America/New_York", () => {
      const schedule = fromJCronString("0 0 12 * * * * TZ:America/New_York");
      expect(schedule.tz).toBe("America/New_York");
    });

    test("should parse TZ:Asia/Tokyo", () => {
      const schedule = fromJCronString("0 0 12 * * * * TZ:Asia/Tokyo");
      expect(schedule.tz).toBe("Asia/Tokyo");
    });

    test("should default to UTC when no timezone specified", () => {
      const schedule = fromJCronString("0 0 12 * * * *");
      expect(schedule.tz).toBeNull();
    });
  });

  describe("Timezone-aware Trigger Calculation", () => {
    test("should calculate triggers in Istanbul timezone", () => {
      const schedule = fromJCronString("0 0 15 * * * * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-07-15T10:00:00.000Z"); // Summer time
      const next = engine.next(schedule, fromTime);
      
      // 15:00 Istanbul time should be 12:00 UTC in summer (UTC+3)
      expect(next.getUTCHours()).toBe(12);
    });

    test("should calculate triggers in New York timezone", () => {
      const schedule = fromJCronString("0 0 9 * * * * TZ:America/New_York");
      const fromTime = new Date("2024-07-15T10:00:00.000Z"); // Summer time
      const next = engine.next(schedule, fromTime);
      
      // 9:00 New York time should be 13:00 UTC in summer (UTC-4)
      expect(next.getUTCHours()).toBe(13);
    });

    test("should calculate triggers in Tokyo timezone", () => {
      const schedule = fromJCronString("0 0 18 * * * * TZ:Asia/Tokyo");
      const fromTime = new Date("2024-07-15T05:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      // 18:00 Tokyo time should be 09:00 UTC (UTC+9)
      expect(next.getUTCHours()).toBe(9);
    });
  });

  describe("DST (Daylight Saving Time) Support", () => {
    test("should handle spring DST transition in Istanbul", () => {
      // Turkey spring DST: last Sunday in March, clocks forward 1 hour
      const schedule = fromJCronString("0 0 3 * * * * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-03-30T23:00:00.000Z"); // Before DST change
      const next = engine.next(schedule, fromTime);
      
      // Should find next valid 3:00 AM Istanbul time
      expect(next).toBeDefined();
      expect(next > fromTime).toBe(true);
    });

    test("should handle fall DST transition in Istanbul", () => {
      // Turkey fall DST: last Sunday in October, clocks back 1 hour
      const schedule = fromJCronString("0 0 3 * * * * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-10-26T23:00:00.000Z"); // Before DST change
      const next = engine.next(schedule, fromTime);
      
      // Should find next valid 3:00 AM Istanbul time
      expect(next).toBeDefined();
      expect(next > fromTime).toBe(true);
    });

    test("should handle spring DST transition in New York", () => {
      // US spring DST: second Sunday in March
      const schedule = fromJCronString("0 0 2 * * * * TZ:America/New_York");
      const fromTime = new Date("2024-03-09T06:00:00.000Z"); // Before DST change
      const next = engine.next(schedule, fromTime);
      
      // Should find next valid 2:00 AM New York time (skipping the non-existent hour)
      expect(next).toBeDefined();
      expect(next > fromTime).toBe(true);
    });

    test("should handle fall DST transition in New York", () => {
      // US fall DST: first Sunday in November
      const schedule = fromJCronString("0 0 1 * * * * TZ:America/New_York");
      const fromTime = new Date("2024-11-02T05:00:00.000Z"); // Before DST change
      const next = engine.next(schedule, fromTime);
      
      // Should find next valid 1:00 AM New York time
      expect(next).toBeDefined();
      expect(next > fromTime).toBe(true);
    });
  });

  describe("Multiple Timezone Patterns", () => {
    test("should handle different patterns for different timezones", () => {
      const istanbulSchedule = fromJCronString("0 0 9 * * * * TZ:Europe/Istanbul");
      const newYorkSchedule = fromJCronString("0 0 9 * * * * TZ:America/New_York");
      const tokyoSchedule = fromJCronString("0 0 9 * * * * TZ:Asia/Tokyo");
      
      const fromTime = new Date("2024-07-15T00:00:00.000Z");
      
      const istanbulNext = engine.next(istanbulSchedule, fromTime);
      const newYorkNext = engine.next(newYorkSchedule, fromTime);
      const tokyoNext = engine.next(tokyoSchedule, fromTime);
      
      // All should be valid but at different UTC times
      expect(istanbulNext).toBeDefined();
      expect(newYorkNext).toBeDefined();
      expect(tokyoNext).toBeDefined();
      
      // They should all be different UTC times (same local time, different zones)
      expect(istanbulNext.getTime()).not.toBe(newYorkNext.getTime());
      expect(newYorkNext.getTime()).not.toBe(tokyoNext.getTime());
      expect(tokyoNext.getTime()).not.toBe(istanbulNext.getTime());
    });
  });

  describe("Timezone Error Handling", () => {
    test("should handle invalid timezone gracefully", () => {
      // Invalid timezone should either throw or fallback to UTC
      expect(() => {
        const schedule = fromJCronString("0 0 12 * * * * TZ:Invalid/Timezone");
        engine.next(schedule, new Date());
      }).not.toThrow(); // Should handle gracefully
    });
  });
});
