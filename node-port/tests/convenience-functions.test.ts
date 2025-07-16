import { describe, test, expect } from "bun:test";
import { 
  getNext, 
  getPrev, 
  getNextN, 
  isValid, 
  match,
  isTime,
  validateCron,
  Schedule 
} from "../src/index";

describe("Convenience Functions with Schedule Support", () => {
  describe("getNext", () => {
    test("should work with Schedule object", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5");
      const from = new Date("2025-07-16T08:00:00Z");
      
      const next = getNext(schedule, from);
      expect(next).toBeInstanceOf(Date);
      expect(next.getUTCHours()).toBe(9);
      expect(next.getUTCMinutes()).toBe(30);
    });

    test("should work with cron string", () => {
      const cronString = "0 30 9 * * 1-5";
      const from = new Date("2025-07-16T08:00:00Z");
      
      const next = getNext(cronString, from);
      expect(next).toBeInstanceOf(Date);
      expect(next.getUTCHours()).toBe(9);
      expect(next.getUTCMinutes()).toBe(30);
    });
  });

  describe("getPrev", () => {
    test("should work with Schedule object", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5");
      const from = new Date("2025-07-16T10:00:00Z");
      
      const prev = getPrev(schedule, from);
      expect(prev).toBeInstanceOf(Date);
      expect(prev.getUTCHours()).toBe(9);
      expect(prev.getUTCMinutes()).toBe(30);
    });

    test("should work with cron string", () => {
      const cronString = "0 30 9 * * 1-5";
      const from = new Date("2025-07-16T10:00:00Z");
      
      const prev = getPrev(cronString, from);
      expect(prev).toBeInstanceOf(Date);
      expect(prev.getUTCHours()).toBe(9);
      expect(prev.getUTCMinutes()).toBe(30);
    });
  });

  describe("getNextN", () => {
    test("should work with Schedule object", () => {
      const schedule = new Schedule("0", "0", "12", "*", "*", "*");
      const from = new Date("2025-07-16T00:00:00Z");
      
      const dates = getNextN(schedule, 3, from);
      expect(Array.isArray(dates)).toBe(true);
      expect(dates.length).toBe(3);
      expect(dates[0].getUTCHours()).toBe(12);
    });

    test("should work with cron string", () => {
      const cronString = "0 0 12 * * *";
      const from = new Date("2025-07-16T00:00:00Z");
      
      const dates = getNextN(cronString, 3, from);
      expect(Array.isArray(dates)).toBe(true);
      expect(dates.length).toBe(3);
      expect(dates[0].getUTCHours()).toBe(12);
    });
  });

  describe("match", () => {
    test("should work with Schedule object", () => {
      const schedule = new Schedule("0", "30", "9", "16", "7", "*");
      const testDate = new Date("2025-07-16T09:30:00Z");
      
      expect(match(schedule, testDate)).toBe(true);
    });

    test("should work with cron string", () => {
      const cronString = "0 30 9 16 7 *";
      const testDate = new Date("2025-07-16T09:30:00Z");
      
      expect(match(cronString, testDate)).toBe(true);
    });
  });

  describe("isTime", () => {
    test("should work with Schedule object", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "*");
      const testDate = new Date("2025-07-16T09:30:00Z");
      
      expect(isTime(schedule, testDate)).toBe(true);
    });

    test("should work with cron string", () => {
      const cronString = "0 30 9 * * *";
      const testDate = new Date("2025-07-16T09:30:00Z");
      
      expect(isTime(cronString, testDate)).toBe(true);
    });
  });

  describe("isValid", () => {
    test("should validate Schedule object", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5");
      expect(isValid(schedule)).toBe(true);
    });

    test("should validate valid cron string", () => {
      const cronString = "0 30 9 * * 1-5";
      expect(isValid(cronString)).toBe(true);
    });

    test("should validate JCRON string with extensions", () => {
      const jcronString = "0 30 9 * * 1-5 WOY:1-4 TZ:UTC";
      expect(isValid(jcronString)).toBe(true);
    });

    test("should reject invalid cron string", () => {
      const invalidCron = "invalid cron string";
      expect(isValid(invalidCron)).toBe(false);
    });

    test("should validate Schedule with JCRON extensions", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5", "2025", "1-4", "UTC");
      expect(isValid(schedule)).toBe(true);
    });
  });

  describe("validateCron", () => {
    test("should validate Schedule object", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5");
      const result = validateCron(schedule);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should validate valid cron string", () => {
      const cronString = "0 30 9 * * 1-5";
      const result = validateCron(cronString);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should return errors for invalid cron", () => {
      const invalidCron = "invalid cron expression"; // Completely invalid
      const result = validateCron(invalidCron);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("JCRON Extensions Support", () => {
    test("should handle Schedule with week-of-year (WOY) extension", () => {
      const schedule = new Schedule("0", "0", "9", "*", "*", "1", null, "1-4", null);
      
      expect(isValid(schedule)).toBe(true);
      expect(schedule.woy).toBe("1-4");
      expect(schedule.toString()).toContain("WOY:1-4");
    });

    test("should handle Schedule with timezone (TZ) extension", () => {
      const schedule = new Schedule("0", "0", "9", "*", "*", "*", null, null, "America/New_York");
      
      expect(isValid(schedule)).toBe(true);
      expect(schedule.tz).toBe("America/New_York");
      expect(schedule.toString()).toContain("TZ:America/New_York");
    });

    test("should handle Schedule with both WOY and TZ extensions", () => {
      const schedule = new Schedule("0", "0", "9", "*", "*", "1-5", "2025", "1-10", "UTC");
      
      expect(isValid(schedule)).toBe(true);
      expect(schedule.woy).toBe("1-10");
      expect(schedule.tz).toBe("UTC");
      expect(schedule.toString()).toBe("0 0 9 * * 1-5 2025 WOY:1-10 TZ:UTC");
    });

    test("should handle JCRON string with extensions", () => {
      const jcronString = "0 0 9 * * 1-5 2025 WOY:1-10 TZ:UTC";
      
      expect(isValid(jcronString)).toBe(true);
      
      const next = getNext(jcronString, new Date("2025-01-01T00:00:00Z"));
      expect(next).toBeInstanceOf(Date);
    });
  });
});
