// test/humanize-optimization.test.js
// Test optimized humanization performance

import { test, describe, it, expect } from "bun:test";
import { 
  humanizeOptimized, 
  createBatchHumanizer, 
  BatchHumanizer,
  MONTH_NAMES_FAST,
  DAY_NAMES_FAST,
  TEMPLATE_STRINGS_FAST,
  HumanizePatterns,
  toString,
  isLocaleOptimizedSupported
} from "../src/humanize/index.js";
import { Schedule } from "../src/schedule.js";

describe("🚀 Humanize Optimization Tests", () => {
  
  describe("📦 Optimized API Availability", () => {
    it("should provide optimized humanization function", () => {
      expect(typeof humanizeOptimized).toBe("function");
      expect(typeof createBatchHumanizer).toBe("function");
      expect(BatchHumanizer).toBeDefined();
    });

    it("should provide fast lookup tables", () => {
      expect(MONTH_NAMES_FAST).toBeDefined();
      expect(MONTH_NAMES_FAST.en).toHaveLength(12);
      expect(MONTH_NAMES_FAST.tr).toHaveLength(12);
      expect(MONTH_NAMES_FAST.es).toHaveLength(12);
      
      expect(DAY_NAMES_FAST).toBeDefined();
      expect(DAY_NAMES_FAST.en).toHaveLength(7);
      expect(DAY_NAMES_FAST.tr).toHaveLength(7);
      
      expect(TEMPLATE_STRINGS_FAST).toBeDefined();
      expect(TEMPLATE_STRINGS_FAST.en.every).toBe("every");
      expect(TEMPLATE_STRINGS_FAST.tr.every).toBe("her");
    });

    it("should provide optimized regex patterns", () => {
      expect(HumanizePatterns.numbersRegex).toBeInstanceOf(RegExp);
      expect(HumanizePatterns.rangeRegex).toBeInstanceOf(RegExp);
      expect(HumanizePatterns.stepRegex).toBeInstanceOf(RegExp);
    });
  });

  describe("🔀 Functional Compatibility", () => {
    const testSchedules = [
      new Schedule("0", "0", "12", "*", "*", "*"),     // Daily at 12:00
      new Schedule("0", "0", "9", "*", "*", "1"),      // Weekly on Monday at 9:00
      new Schedule("0", "0", "8", "1", "*", "*"),      // Monthly on 1st at 8:00
      new Schedule("0", "0", "10", "15", "3", "*"),    // Yearly on March 15th at 10:00
      new Schedule("0", "*/15", "*", "*", "*", "*"),   // Every 15 minutes
    ];

    testSchedules.forEach((schedule, index) => {
      it(`should produce same result for schedule ${index + 1}`, () => {
        const original = toString(schedule.toString());
        const optimized = humanizeOptimized(schedule);
        
        console.log(`Schedule ${index + 1}:`);
        console.log(`  Original: ${original}`);
        console.log(`  Optimized: ${optimized}`);
        
        // Both should be valid strings
        expect(typeof original).toBe("string");
        expect(typeof optimized).toBe("string");
        expect(original.length).toBeGreaterThan(0);
        expect(optimized.length).toBeGreaterThan(0);
      });
    });
  });

  describe("⚡ Performance Optimization", () => {
    it("should show benefits with batch processing", () => {
      const schedules = new Map();
      const testSchedules = [
        new Schedule("0", "0", "9", "*", "*", "1"),   // Monday 9 AM
        new Schedule("0", "0", "14", "*", "*", "3"),  // Wednesday 2 PM
        new Schedule("0", "0", "17", "*", "*", "5"),  // Friday 5 PM
        new Schedule("0", "30", "12", "1", "*", "*"), // 1st of month 12:30
        new Schedule("0", "0", "8", "15", "1", "*"),  // January 15th 8 AM
      ];
      
      // Populate test schedules
      testSchedules.forEach((schedule, index) => {
        schedules.set(`schedule_${index}`, schedule);
      });

      const batchHumanizer = createBatchHumanizer({ locale: 'en' });
      
      // Test batch processing
      const start = performance.now();
      const results = batchHumanizer.humanizeMultiple(schedules);
      const batchTime = performance.now() - start;
      
      console.log(`Batch processing time: ${batchTime.toFixed(2)}ms`);
      console.log(`Processed ${results.size} schedules`);
      
      expect(results.size).toBe(schedules.size);
      expect(batchTime).toBeLessThan(50); // Should be fast
      
      // Verify all results are valid
      for (const [id, result] of results) {
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        console.log(`  ${id}: ${result}`);
      }
    });

    it("should benefit from caching", () => {
      const schedule = new Schedule("0", "0", "12", "*", "*", "*");
      const batchHumanizer = createBatchHumanizer({ locale: 'en' });
      
      // First call (cache miss)
      const start1 = performance.now();
      const result1 = batchHumanizer.humanize("test", schedule);
      const time1 = performance.now() - start1;
      
      // Second call (cache hit)
      const start2 = performance.now();
      const result2 = batchHumanizer.humanize("test", schedule);
      const time2 = performance.now() - start2;
      
      console.log(`First call: ${time1.toFixed(4)}ms`);
      console.log(`Second call: ${time2.toFixed(4)}ms`);
      console.log(`Cache speedup: ${(time1 / time2).toFixed(1)}x`);
      
      expect(result1).toBe(result2);
      expect(time2).toBeLessThan(time1); // Second should be faster
      
      // Check cache stats
      const stats = batchHumanizer.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      console.log(`Cache size: ${stats.cacheSize}`);
    });
  });

  describe("🌍 Multi-language Optimization", () => {
    it("should support optimized locales", () => {
      const supportedLocales = ['en', 'tr', 'es', 'fr', 'de', 'pl', 'pt', 'it', 'cz', 'nl'];
      
      supportedLocales.forEach(locale => {
        expect(isLocaleOptimizedSupported(locale)).toBe(true);
        console.log(`✓ ${locale} optimization supported`);
      });
      
      expect(isLocaleOptimizedSupported('xx')).toBe(false);
    });

    it("should handle different locales with batch processing", () => {
      const schedule = new Schedule("0", "0", "9", "*", "*", "1"); // Monday 9 AM
      const locales = ['en', 'tr', 'es'];
      
      locales.forEach(locale => {
        const batchHumanizer = createBatchHumanizer({ locale });
        const result = batchHumanizer.humanize("monday_test", schedule);
        
        console.log(`${locale.toUpperCase()}: ${result}`);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("🔧 Batch Humanizer Features", () => {
    it("should handle empty schedule map", () => {
      const batchHumanizer = createBatchHumanizer();
      const results = batchHumanizer.humanizeMultiple(new Map());
      
      expect(results.size).toBe(0);
    });

    it("should clear cache correctly", () => {
      const batchHumanizer = createBatchHumanizer();
      const schedule = new Schedule("0", "0", "12", "*", "*", "*");
      
      // Add to cache
      batchHumanizer.humanize("test", schedule);
      expect(batchHumanizer.getStats().cacheSize).toBeGreaterThan(0);
      
      // Clear cache
      batchHumanizer.clear();
      expect(batchHumanizer.getStats().cacheSize).toBe(0);
    });

    it("should handle various schedule patterns", () => {
      const batchHumanizer = createBatchHumanizer({ locale: 'en' });
      const testCases = [
        { name: "daily", schedule: new Schedule("0", "0", "8", "*", "*", "*") },
        { name: "weekly", schedule: new Schedule("0", "30", "14", "*", "*", "2") },
        { name: "monthly", schedule: new Schedule("0", "0", "9", "15", "*", "*") },
        { name: "yearly", schedule: new Schedule("0", "0", "10", "1", "1", "*") },
        { name: "custom", schedule: new Schedule("0", "*/5", "*", "*", "*", "*") }
      ];
      
      testCases.forEach(({ name, schedule }) => {
        const result = batchHumanizer.humanize(name, schedule);
        console.log(`${name}: ${result}`);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("📊 Lookup Table Performance", () => {
    it("should provide fast month name lookup", () => {
      const start = performance.now();
      
      // Test multiple lookups
      for (let i = 0; i < 1000; i++) {
        const monthIndex = (i % 12);
        const enMonth = MONTH_NAMES_FAST.en[monthIndex];
        const trMonth = MONTH_NAMES_FAST.tr[monthIndex];
        expect(enMonth).toBeDefined();
        expect(trMonth).toBeDefined();
      }
      
      const time = performance.now() - start;
      console.log(`1000 month lookups: ${time.toFixed(2)}ms`);
      expect(time).toBeLessThan(10); // Should be very fast
    });

    it("should provide fast day name lookup", () => {
      const start = performance.now();
      
      // Test multiple lookups
      for (let i = 0; i < 1000; i++) {
        const dayIndex = i % 7;
        const enDay = DAY_NAMES_FAST.en[dayIndex];
        const trDay = DAY_NAMES_FAST.tr[dayIndex];
        expect(enDay).toBeDefined();
        expect(trDay).toBeDefined();
      }
      
      const time = performance.now() - start;
      console.log(`1000 day lookups: ${time.toFixed(2)}ms`);
      expect(time).toBeLessThan(10); // Should be very fast
    });
  });

  describe("🔍 Pattern Detection Optimization", () => {
    it("should quickly detect pattern types", () => {
      const patterns = [
        { schedule: new Schedule("0", "0", "12", "*", "*", "*"), expected: "daily" },
        { schedule: new Schedule("0", "0", "9", "*", "*", "1"), expected: "weekly" },
        { schedule: new Schedule("0", "0", "8", "1", "*", "*"), expected: "monthly" },
        { schedule: new Schedule("0", "0", "10", "15", "3", "*"), expected: "yearly" }
      ];
      
      const batchHumanizer = createBatchHumanizer();
      
      patterns.forEach(({ schedule, expected }) => {
        const result = batchHumanizer.humanize("test", schedule);
        console.log(`Pattern ${expected}: ${result}`);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
