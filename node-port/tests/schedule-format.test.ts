import { describe, test, expect } from "bun:test";
import { fromObject, validateSchedule, isValidScheduleObject, Schedule } from "../src/schedule";

describe("Schedule Format Support", () => {
  describe("fromObject", () => {
    test("should create Schedule from Schedule format object", () => {
      const scheduleObj = {
        s: "0",
        m: "30", 
        h: "9",
        D: "*",
        M: "*",
        dow: "1-5",
        Y: null,
        woy: null,
        tz: null
      };
      
      const schedule = fromObject(scheduleObj);
      expect(schedule.s).toBe("0");
      expect(schedule.m).toBe("30");
      expect(schedule.h).toBe("9");
      expect(schedule.D).toBe("*");
      expect(schedule.M).toBe("*");
      expect(schedule.dow).toBe("1-5");
      expect(schedule.Y).toBe(null);
      expect(schedule.woy).toBe(null);
      expect(schedule.tz).toBe(null);
    });

    test("should create Schedule from partial Schedule format object", () => {
      const scheduleObj = {
        s: "0",
        m: "15",
        h: "14"
      };
      
      const schedule = fromObject(scheduleObj);
      expect(schedule.s).toBe("0");
      expect(schedule.m).toBe("15");
      expect(schedule.h).toBe("14");
      expect(schedule.D).toBe("*");
      expect(schedule.M).toBe("*");
      expect(schedule.dow).toBe("*");
    });

    test("should create Schedule from Schedule instance", () => {
      const originalSchedule = new Schedule("0", "15", "14", "*", "*", "*");
      const newSchedule = fromObject(originalSchedule);
      
      expect(newSchedule.s).toBe("0");
      expect(newSchedule.m).toBe("15");
      expect(newSchedule.h).toBe("14");
      expect(newSchedule).not.toBe(originalSchedule); // Should be a new instance
    });

    test("should handle JCRON extensions (woy, tz)", () => {
      const scheduleObj = {
        s: "0",
        m: "0",
        h: "12",
        D: "1",
        M: "1",
        dow: "*",
        Y: "2025",
        woy: "1-4",
        tz: "UTC"
      };
      
      const schedule = fromObject(scheduleObj);
      expect(schedule.Y).toBe("2025");
      expect(schedule.woy).toBe("1-4");
      expect(schedule.tz).toBe("UTC");
    });

    test("should convert textual month and day names", () => {
      const scheduleObj = {
        s: "0",
        m: "0",
        h: "9",
        D: "*",
        M: "JAN",
        dow: "MON-FRI"
      };
      
      const schedule = fromObject(scheduleObj);
      expect(schedule.M).toBe("1");
      expect(schedule.dow).toBe("1-5");
    });
  });

  describe("validateSchedule", () => {
    test("should validate and normalize Schedule format object", () => {
      const scheduleObj = {
        s: "0",
        m: "0",
        h: "12",
        D: "1",
        M: "1",
        dow: "*",
        Y: "2025",
        woy: null,
        tz: "UTC"
      };
      
      const validated = validateSchedule(scheduleObj);
      expect(validated).toBeInstanceOf(Schedule);
      expect(validated.s).toBe("0");
      expect(validated.tz).toBe("UTC");
    });

    test("should validate Schedule instance", () => {
      const originalSchedule = new Schedule("0", "30", "9", "*", "*", "1-5");
      const validated = validateSchedule(originalSchedule);
      
      expect(validated).toBeInstanceOf(Schedule);
      expect(validated).not.toBe(originalSchedule); // Should be a new instance
      expect(validated.s).toBe("0");
      expect(validated.m).toBe("30");
    });

    test("should handle empty strings as null", () => {
      const scheduleObj = {
        s: "",
        m: "30",
        h: "9",
        D: "",
        M: "*",
        dow: "1-5"
      };
      
      const validated = validateSchedule(scheduleObj);
      expect(validated.s).toBe(null);
      expect(validated.D).toBe(null);
      expect(validated.m).toBe("30");
    });

    test("should throw error for invalid input", () => {
      expect(() => validateSchedule(null)).toThrow("Invalid schedule");
      expect(() => validateSchedule("string")).toThrow("Invalid schedule");
      expect(() => validateSchedule(123)).toThrow("Invalid schedule");
    });
  });

  describe("isValidScheduleObject", () => {
    test("should return true for valid Schedule format", () => {
      const validObj = { s: "0", m: "30", h: "9" };
      expect(isValidScheduleObject(validObj)).toBe(true);
    });

    test("should return true for Schedule instance", () => {
      const schedule = new Schedule("0", "30", "9");
      expect(isValidScheduleObject(schedule)).toBe(true);
    });

    test("should return true for minimal valid object", () => {
      const validObj = { s: "0" };
      expect(isValidScheduleObject(validObj)).toBe(true);
    });

    test("should return false for empty object", () => {
      expect(isValidScheduleObject({})).toBe(false);
    });

    test("should return false for null/undefined", () => {
      expect(isValidScheduleObject(null)).toBe(false);
      expect(isValidScheduleObject(undefined)).toBe(false);
    });

    test("should return false for non-objects", () => {
      expect(isValidScheduleObject("string")).toBe(false);
      expect(isValidScheduleObject(123)).toBe(false);
      expect(isValidScheduleObject(true)).toBe(false);
    });

    test("should return false for objects with only invalid properties", () => {
      const invalidObj = { invalid: "property", another: "invalid" };
      expect(isValidScheduleObject(invalidObj)).toBe(false);
    });
  });

  describe("Schedule toString methods", () => {
    test("toString should return JCRON format with extensions", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5", "2025", "1-4", "UTC");
      const result = schedule.toString();
      
      expect(result).toBe("0 30 9 * * 1-5 2025 WOY:1-4 TZ:UTC");
    });

    test("toStandardCron should return standard cron format", () => {
      const schedule = new Schedule("0", "30", "9", "*", "*", "1-5", "2025", "1-4", "UTC");
      const result = schedule.toStandardCron();
      
      expect(result).toBe("0 30 9 * * 1-5 2025");
    });

    test("toStandardCron with textual name conversion", () => {
      const schedule = new Schedule("0", "30", "9", "*", "JAN", "MON-FRI");
      const result = schedule.toStandardCron(true);
      
      expect(result).toBe("0 30 9 * 1 1-5");
    });

    test("toString should handle null values with wildcards", () => {
      const schedule = new Schedule("0", "30", null, "*", null, "1-5");
      const result = schedule.toString();
      
      expect(result).toBe("0 30 * * * 1-5");
    });
  });
});
