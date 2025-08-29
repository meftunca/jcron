import { describe, test, expect, beforeEach } from "bun:test";
import { fromJCronString, Engine } from "../src/index";

describe("JCRON Week of Year (WOY) Tests", () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe("WOY Pattern Parsing", () => {
    test("should parse WOY:* (all weeks)", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:*");
      expect(schedule.woy).toBe("WOY:*");
    });

    test("should parse WOY:1 (specific week)", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:1");
      expect(schedule.woy).toBe("WOY:1");
    });

    test("should parse WOY:1,13,26,39,52 (multiple weeks)", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:1,13,26,39,52");
      expect(schedule.woy).toBe("WOY:1,13,26,39,52");
    });

    test("should parse WOY:1-4 (week ranges)", () => {
      const schedule = fromJCronString("0 0 * * * * * WOY:1-4");
      expect(schedule.woy).toBe("WOY:1-4");
    });
  });

  describe("WOY Next Trigger Calculation", () => {
    test("should find next trigger for WOY:1 (New Year week)", () => {
      const schedule = fromJCronString("0 0 9 * * * * WOY:1");
      const fromTime = new Date("2024-06-15T10:00:00.000Z"); // Mid-year
      const next = engine.next(schedule, fromTime);
      
      // Should find Week 1 of 2025 (around Dec 30, 2024 - Jan 5, 2025)
      expect(next.getFullYear()).toBeGreaterThanOrEqual(2024);
      expect(next.getUTCHours()).toBe(9);
    });

    test("should find next trigger for WOY:33 (mid-year)", () => {
      const schedule = fromJCronString("0 0 12 * * * * WOY:33");
      const fromTime = new Date("2024-01-15T10:00:00.000Z"); // Early year
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCHours()).toBe(12);
      // Week 33 should be around August
      expect(next.getMonth()).toBeGreaterThanOrEqual(6); // July or later
    });

    test("should find next trigger for multiple weeks WOY:6,19,32,45", () => {
      const schedule = fromJCronString("0 0 14 * * * * WOY:6,19,32,45");
      const fromTime = new Date("2024-01-15T10:00:00.000Z"); // Early year, should find week 6
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCHours()).toBe(14);
      // Should find week 6 (around February)
      expect(next.getMonth()).toBeGreaterThanOrEqual(1); // February or later
    });

    test("should handle WOY:* (every week)", () => {
      const schedule = fromJCronString("0 0 8 * * * * WOY:*");
      const fromTime = new Date("2024-06-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCHours()).toBe(8);
      expect(next > fromTime).toBe(true);
    });
  });

  describe("WOY Previous Trigger Calculation", () => {
    test("should find previous trigger for WOY:33", () => {
      const schedule = fromJCronString("0 0 16 * * * * WOY:33");
      const fromTime = new Date("2024-12-15T10:00:00.000Z"); // Late year
      const prev = engine.prev(schedule, fromTime);
      
      expect(prev.getUTCHours()).toBe(16);
      // Week 33 should be around August
      expect(prev.getMonth()).toBeLessThanOrEqual(8); // September or earlier
    });
  });

  describe("ISO Week Boundary Cases", () => {
    test("should handle ISO Week 1 spanning year boundary", () => {
      // ISO Week 1 of 2025 starts on Dec 30, 2024
      const schedule = fromJCronString("0 0 10 * * * * WOY:1");
      const fromTime = new Date("2024-12-29T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      // Should trigger on Dec 30, 2024 (which is Week 1 of 2025)
      expect(next.getUTCDate()).toBe(30);
      expect(next.getUTCMonth()).toBe(11); // December
      expect(next.getUTCHours()).toBe(10);
    });

    test("should handle ISO Week 53 (leap week)", () => {
      // Some years have 53 weeks
      const schedule = fromJCronString("0 0 11 * * * * WOY:53");
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCHours()).toBe(11);
      // Should find a valid Week 53
      expect(next > fromTime).toBe(true);
    });
  });

  describe("WOY with Multiple Patterns", () => {
    test("should handle WOY with complex cron patterns", () => {
      const schedule = fromJCronString("0 0,30 9-17 * * 1-5 * WOY:10,20,30,40,50");
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next > fromTime).toBe(true);
      // Should respect both cron pattern and WOY
      const dayOfWeek = next.getUTCDay();
      expect(dayOfWeek).toBeGreaterThanOrEqual(1); // Monday
      expect(dayOfWeek).toBeLessThanOrEqual(5);    // Friday
    });
  });
});
