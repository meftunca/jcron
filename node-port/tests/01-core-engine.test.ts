import { describe, test, expect, beforeEach } from "bun:test";
import { fromJCronString, Engine } from "../src/index";

describe("JCRON Core Engine Tests", () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe("Basic Cron Pattern Support", () => {
    test("should parse standard 7-field cron patterns", () => {
      const schedule = fromJCronString("0 30 14 * * * *");
      expect(schedule.s).toBe("0");
      expect(schedule.m).toBe("30");
      expect(schedule.h).toBe("14");
      expect(schedule.D).toBe("*");
      expect(schedule.M).toBe("*");
      expect(schedule.dow).toBe("*");
      expect(schedule.Y).toBe("*");
    });

    test("should parse 6-field cron patterns (without year)", () => {
      const schedule = fromJCronString("30 14 * * * *");
      expect(schedule.s).toBe("*");
      expect(schedule.m).toBe("30");
      expect(schedule.h).toBe("14");
      expect(schedule.D).toBe("*");
      expect(schedule.M).toBe("*");
      expect(schedule.dow).toBe("*");
      expect(schedule.Y).toBe("*");
    });

    test("should parse 5-field cron patterns (classic)", () => {
      const schedule = fromJCronString("14 * * * *");
      expect(schedule.s).toBe("*");
      expect(schedule.m).toBe("*");
      expect(schedule.h).toBe("14");
      expect(schedule.D).toBe("*");
      expect(schedule.M).toBe("*");
      expect(schedule.dow).toBe("*");
      expect(schedule.Y).toBe("*");
    });

    test("should handle wildcard patterns", () => {
      const schedule = fromJCronString("* * * * * * *");
      expect(schedule.s).toBe("*");
      expect(schedule.m).toBe("*");
      expect(schedule.h).toBe("*");
      expect(schedule.D).toBe("*");
      expect(schedule.M).toBe("*");
      expect(schedule.dow).toBe("*");
      expect(schedule.Y).toBe("*");
    });

    test("should handle range patterns", () => {
      const schedule = fromJCronString("0-30 10-15 1-5 * * * *");
      expect(schedule.s).toBe("0-30");
      expect(schedule.m).toBe("10-15");
      expect(schedule.h).toBe("1-5");
    });

    test("should handle list patterns", () => {
      const schedule = fromJCronString("0,15,30,45 * * * * * *");
      expect(schedule.s).toBe("0,15,30,45");
    });

    test("should handle step patterns", () => {
      const schedule = fromJCronString("*/15 */2 * * * * *");
      expect(schedule.s).toBe("*/15");
      expect(schedule.m).toBe("*/2");
    });
  });

  describe("Next Trigger Calculation", () => {
    test("should calculate next trigger for simple patterns", () => {
      const schedule = fromJCronString("0 0 12 * * * *");
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCHours()).toBe(12);
      expect(next.getUTCMinutes()).toBe(0);
      expect(next.getUTCSeconds()).toBe(0);
      expect(next >= fromTime).toBe(true);
    });

    test("should calculate next trigger for every second", () => {
      const schedule = fromJCronString("* * * * * * *");
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getTime() - fromTime.getTime()).toBe(1000); // 1 second later
    });

    test("should calculate next trigger for every minute", () => {
      const schedule = fromJCronString("0 * * * * * *");
      const fromTime = new Date("2024-01-01T10:30:30.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCMinutes()).toBe(31);
      expect(next.getUTCSeconds()).toBe(0);
    });

    test("should handle year boundary crossing", () => {
      const schedule = fromJCronString("0 0 0 1 1 * *"); // New Year
      const fromTime = new Date("2024-12-31T23:59:59.000Z");
      const next = engine.next(schedule, fromTime);
      
      expect(next.getUTCFullYear()).toBe(2025);
      expect(next.getUTCMonth()).toBe(0); // January
      expect(next.getUTCDate()).toBe(1);
    });
  });

  describe("Previous Trigger Calculation", () => {
    test("should calculate previous trigger for simple patterns", () => {
      const schedule = fromJCronString("0 0 12 * * * *");
      const fromTime = new Date("2024-01-01T14:00:00.000Z");
      const prev = engine.prev(schedule, fromTime);
      
      expect(prev.getUTCHours()).toBe(12);
      expect(prev.getUTCMinutes()).toBe(0);
      expect(prev.getUTCSeconds()).toBe(0);
      expect(prev < fromTime).toBe(true);
    });

    test("should handle day boundary crossing backwards", () => {
      const schedule = fromJCronString("0 0 23 * * * *"); // 11 PM
      const fromTime = new Date("2024-01-02T01:00:00.000Z"); // 1 AM next day
      const prev = engine.prev(schedule, fromTime);
      
      expect(prev.getUTCDate()).toBe(1);
      expect(prev.getUTCHours()).toBe(23);
    });
  });

  describe("Pattern Matching", () => {
    test("should match exact time patterns", () => {
      const schedule = fromJCronString("30 15 14 1 6 * 2024");
      const testDate = new Date("2024-06-01T14:15:30.000Z");
      const isMatch = engine.isMatch(schedule, testDate);
      
      expect(isMatch).toBe(true);
    });

    test("should not match different time patterns", () => {
      const schedule = fromJCronString("30 15 14 1 6 * 2024");
      const testDate = new Date("2024-06-01T14:15:31.000Z"); // 1 second off
      const isMatch = engine.isMatch(schedule, testDate);
      
      expect(isMatch).toBe(false);
    });

    test("should match wildcard patterns", () => {
      const schedule = fromJCronString("* * * * * * *");
      const testDate = new Date("2024-06-01T14:15:30.000Z");
      const isMatch = engine.isMatch(schedule, testDate);
      
      expect(isMatch).toBe(true);
    });
  });
});
