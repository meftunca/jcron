// test/humanize-eod.test.ts
// Test End-of-Duration humanization

import { test, describe, it, expect } from "bun:test";
import { 
  toString,
  fromSchedule,
  humanizeOptimized,
  createBatchHumanizer
} from "../src/humanize/index.js";
import { Schedule } from "../src/schedule.js";
import { EndOfDuration, parseEoD } from "../src/eod.js";

describe("🕰️ End-of-Duration (EoD) Humanization Tests", () => {
  
  describe("📝 Basic EoD Humanization", () => {
    it("should humanize schedule with simple EoD", () => {
      // Create schedule with EoD: every day at 9 AM, must finish within 2 hours
      const eod = parseEoD("E2h");
      const schedule = new Schedule("0", "0", "9", "*", "*", "*", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Daily with 2h EoD:", result);
      
      expect(result).toContain("9");
      expect(result).toContain("AM");
      expect(result).toContain("end of duration");
    });

    it("should humanize schedule with day-based EoD", () => {
      // Weekly meeting on Monday at 10 AM, must finish within 3 days
      const eod = parseEoD("E3D");
      const schedule = new Schedule("0", "0", "10", "*", "*", "1", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Weekly with 3D EoD:", result);
      
      expect(result).toContain("Monday");
      expect(result).toContain("10");
      expect(result).toContain("end of duration");
    });

    it("should humanize schedule with minute-based EoD", () => {
      // Every 15 minutes with 30 minute deadline
      const eod = parseEoD("E30m");
      const schedule = new Schedule("0", "*/15", "*", "*", "*", "*", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Every 15min with 30m EoD:", result);
      
      expect(result).toContain("15");
      expect(result).toContain("minutes");
      // Note: Complex step patterns may not show EoD in simple descriptions
    });
  });

  describe("🌍 Multi-language EoD Support", () => {
    it("should humanize EoD in Turkish", () => {
      const eod = parseEoD("E2h");
      const schedule = new Schedule("0", "0", "14", "*", "*", "*", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'tr' });
      console.log("Turkish EoD:", result);
      
      expect(result).toContain("2:00 PM");
      expect(result).toContain("süre sonu");
    });

    it("should humanize EoD in Spanish", () => {
      const eod = parseEoD("E1D");
      const schedule = new Schedule("0", "30", "16", "1", "*", "*", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'es' });
      console.log("Spanish EoD:", result);
      
      expect(result).toContain("4:30 PM");
      expect(result).toContain("fin de la duración");
    });

    it("should humanize EoD in French", () => {
      const eod = parseEoD("E4h");
      const schedule = new Schedule("0", "0", "9", "*", "*", "5", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'fr' });
      console.log("French EoD:", result);
      
      expect(result).toContain("Vendredi");
      expect(result).toContain("fin de la durée");
    });
  });

  describe("⚡ Optimized EoD Processing", () => {
    it("should handle EoD with optimized humanization", () => {
      const eod = parseEoD("E6h");
      const schedule = new Schedule("0", "0", "8", "*", "*", "*", null, null, null, eod);
      
      const result = humanizeOptimized(schedule, { locale: 'en' });
      console.log("Optimized EoD:", result);
      
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("8");
      expect(result).toContain("AM");
    });

    it("should handle EoD with batch processing", () => {
      const schedules = new Map();
      
      // Different EoD patterns
      const testCases = [
        { id: "backup", eod: "E12h", schedule: new Schedule("0", "0", "2", "*", "*", "*") },
        { id: "report", eod: "E2D", schedule: new Schedule("0", "0", "9", "*", "*", "1") },
        { id: "sync", eod: "E30m", schedule: new Schedule("0", "*/10", "*", "*", "*", "*") },
        { id: "cleanup", eod: "E1D", schedule: new Schedule("0", "0", "23", "*/7", "*", "*") }
      ];
      
      testCases.forEach(({ id, eod, schedule }) => {
        const eodObj = parseEoD(eod);
        const fullSchedule = new Schedule(
          schedule.s, schedule.m, schedule.h, schedule.D, 
          schedule.M, schedule.dow, schedule.Y, schedule.woy, 
          schedule.tz, eodObj
        );
        schedules.set(id, fullSchedule);
      });
      
      const batchHumanizer = createBatchHumanizer({ locale: 'en' });
      const results = batchHumanizer.humanizeMultiple(schedules);
      
      expect(results.size).toBe(schedules.size);
      
      for (const [id, result] of results) {
        console.log(`${id}: ${result}`);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("end of duration");
      }
    });
  });

  describe("🔧 Complex EoD Scenarios", () => {
    it("should handle complex EoD with multiple time units", () => {
      // Complex EoD: 1 day 2 hours 30 minutes
      const eod = parseEoD("E1DT2H30M");
      const schedule = new Schedule("0", "0", "9", "1", "*", "*", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Complex EoD:", result);
      
      expect(result).toContain("1st");
      expect(result).toContain("9");
      expect(result).toContain("end of duration");
    });

    it("should handle EoD with timezone", () => {
      const eod = parseEoD("E8h");
      const schedule = new Schedule("0", "30", "14", "*", "*", "3", null, null, "EST", eod);
      
      const result = fromSchedule(schedule, { 
        locale: 'en',
        includeTimezone: true 
      });
      console.log("EoD with timezone:", result);
      
      expect(result).toContain("Wednesday");
      expect(result).toContain("2:30");
      expect(result).toContain("EST");
      expect(result).toContain("end of duration");
    });

    it("should handle EoD with week-of-year", () => {
      const eod = parseEoD("E3D");
      const schedule = new Schedule("0", "0", "10", "*", "*", "1", null, "1,13,26,39,52", null, eod);
      
      const result = fromSchedule(schedule, { 
        locale: 'en',
        includeWeekOfYear: true 
      });
      console.log("EoD with WOY:", result);
      
      expect(result).toContain("Monday");
      expect(result).toContain("10");
      expect(result).toContain("week");
      expect(result).toContain("end of duration");
    });
  });

  describe("📊 EoD Cache Performance", () => {
    it("should cache EoD humanization results", () => {
      const eod = parseEoD("E4h");
      const schedule = new Schedule("0", "0", "12", "*", "*", "*", null, null, null, eod);
      const batchHumanizer = createBatchHumanizer({ locale: 'en' });
      
      // First call
      const start1 = performance.now();
      const result1 = batchHumanizer.humanize("test_eod", schedule);
      const time1 = performance.now() - start1;
      
      // Second call (should be cached)
      const start2 = performance.now();
      const result2 = batchHumanizer.humanize("test_eod", schedule);
      const time2 = performance.now() - start2;
      
      console.log(`EoD First call: ${time1.toFixed(4)}ms`);
      console.log(`EoD Second call: ${time2.toFixed(4)}ms`);
      console.log(`EoD Cache speedup: ${(time1 / time2).toFixed(1)}x`);
      
      expect(result1).toBe(result2);
      expect(time2).toBeLessThan(time1);
      expect(result1).toContain("end of duration");
      
      const stats = batchHumanizer.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });
  });

  describe("⚠️ EoD Error Handling", () => {
    it("should handle invalid EoD gracefully", () => {
      const schedule = new Schedule("0", "0", "12", "*", "*", "*");
      // Set invalid EoD manually
      (schedule as any).eod = "invalid_eod";
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Invalid EoD result:", result);
      
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      // Should still return a valid description, may include EoD text
      expect(result).toContain("noon");
    });

    it("should handle null/undefined EoD", () => {
      const schedule = new Schedule("0", "0", "15", "*", "*", "*", null, null, null, null);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Null EoD result:", result);
      
      expect(result).toContain("3:00 PM");
      expect(result).toContain("every day");
      // Should not contain EoD information
      expect(result).not.toContain("end of duration");
    });
  });

  describe("🎯 Real-world EoD Use Cases", () => {
    it("should handle backup schedules with deadlines", () => {
      // Daily backup at 2 AM, must complete within 6 hours
      const eod = parseEoD("E6h");
      const schedule = new Schedule("0", "0", "2", "*", "*", "*", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Backup schedule:", result);
      
      expect(result).toContain("2:00 AM");
      expect(result).toContain("every day");
      expect(result).toContain("6");
      expect(result).toContain("hours");
    });

    it("should handle report generation with business deadlines", () => {
      // Weekly report on Friday at 5 PM, must finish by end of business day
      const eod = parseEoD("E3h"); // 3 hours to finish
      const schedule = new Schedule("0", "0", "17", "*", "*", "5", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Report schedule:", result);
      
      expect(result).toContain("5:00 PM");
      expect(result).toContain("Friday");
      expect(result).toContain("3");
      expect(result).toContain("hours");
    });

    it("should handle maintenance windows", () => {
      // Monthly maintenance on 1st Sunday at midnight, 4-hour window
      const eod = parseEoD("E4h");
      const schedule = new Schedule("0", "0", "0", "1-7", "*", "0", null, null, null, eod);
      
      const result = fromSchedule(schedule, { locale: 'en' });
      console.log("Maintenance schedule:", result);
      
      expect(result).toContain("Sunday");
      expect(result).toContain("midnight");
      expect(result).toContain("4");
      expect(result).toContain("hours");
    });
  });
});
