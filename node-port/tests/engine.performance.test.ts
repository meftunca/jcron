// tests/engine.performance.test.ts

import { describe, expect, test } from "bun:test";
import { Engine } from "../src/engine";
import { Schedule, fromCronSyntax } from "../src/schedule";

describe("JCRON Engine Performance & Benchmarks", () => {
  const engine = new Engine();
  const fromTime = new Date("2025-01-01T12:00:00Z");

  const schedules = {
    simple: fromCronSyntax("0 * * * *"), // Every hour
    complex: fromCronSyntax("0 5,15,25,35,45,55 8-17 * * 1-5"), // Business hours
    withSpecialChars: new Schedule("0", "0", "12", "L", "*", "*", null, "UTC"), // Last day of month
    withTimezone: new Schedule(
      "0",
      "30",
      "9",
      "*",
      "*",
      "1-5",
      null,
      "America/New_York"
    ),
    frequent: fromCronSyntax("*/5 * * * * *"), // Every 5 seconds
    rare: fromCronSyntax("0 0 0 1 1 *"), // Once a year
  };

  // Basic functionality tests
  test("Engine.next() - Simple Schedule", () => {
    const result = engine.next(schedules.simple, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Simple schedule next time:", result.toISOString());
  });

  test("Engine.next() - Complex Schedule", () => {
    const result = engine.next(schedules.complex, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Complex schedule next time:", result.toISOString());
  });

  test("Engine.next() - Special Characters", () => {
    const result = engine.next(schedules.withSpecialChars, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Special chars next time:", result.toISOString());
  });

  test("Engine.next() - Timezone", () => {
    const result = engine.next(schedules.withTimezone, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Timezone next time:", result.toISOString());
  });

  test("Engine.next() - Frequent", () => {
    const result = engine.next(schedules.frequent, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Frequent next time:", result.toISOString());
  });

  test("Engine.next() - Rare", () => {
    const result = engine.next(schedules.rare, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Rare next time:", result.toISOString());
  });

  test("Engine.prev() - Simple Schedule", () => {
    const result = engine.prev(schedules.simple, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Simple schedule prev time:", result.toISOString());
  });

  test("Engine.prev() - Complex Schedule", () => {
    const result = engine.prev(schedules.complex, fromTime);
    expect(result).toBeInstanceOf(Date);
    console.log("Complex schedule prev time:", result.toISOString());
  });

  test("Cache functionality - Same schedule multiple calls", () => {
    const schedule = schedules.simple;
    const result1 = engine.next(schedule, fromTime);
    const result2 = engine.next(schedule, fromTime);

    expect(result1.getTime()).toBe(result2.getTime());
    console.log(
      "Cache test - both results equal:",
      result1.getTime() === result2.getTime()
    );
  });

  test("Multiple schedules - Cache misses", () => {
    Object.entries(schedules).forEach(([name, schedule]) => {
      const result = engine.next(schedule, fromTime);
      expect(result).toBeInstanceOf(Date);
      console.log(`${name} schedule result:`, result.toISOString());
    });
  });

  test("Basic functionality validation", () => {
    const result1 = engine.next(schedules.simple, fromTime);
    const result2 = engine.next(schedules.complex, fromTime);
    const result3 = engine.next(schedules.withSpecialChars, fromTime);
    const result4 = engine.next(schedules.withTimezone, fromTime);

    expect(result1).toBeInstanceOf(Date);
    expect(result2).toBeInstanceOf(Date);
    expect(result3).toBeInstanceOf(Date);
    expect(result4).toBeInstanceOf(Date);

    console.log("Simple schedule works:", result1 instanceof Date);
    console.log("Complex schedule works:", result2 instanceof Date);
    console.log("Special chars works:", result3 instanceof Date);
    console.log("Timezone works:", result4 instanceof Date);
  });
});

// Performance Benchmark Tests
describe("Engine Performance Benchmarks", () => {
  const engine = new Engine();
  const testTime = new Date("2025-01-01T12:00:00Z");

  test("Benchmark - Simple pattern performance", () => {
    const schedule = fromCronSyntax("0 * * * *");
    const iterations = 1000;

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.next(schedule, testTime);
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`Simple pattern benchmark:`);
    console.log(`  ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${avgTime.toFixed(4)}ms per operation`);
    console.log(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);

    expect(avgTime).toBeLessThan(1); // Should be under 1ms per operation
  });

  test("Benchmark - Complex pattern performance", () => {
    const schedule = fromCronSyntax("0 5,15,25,35,45,55 8-17 * * 1-5");
    const iterations = 500;

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.next(schedule, testTime);
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`Complex pattern benchmark:`);
    console.log(`  ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${avgTime.toFixed(4)}ms per operation`);
    console.log(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);

    expect(avgTime).toBeLessThan(5); // Should be under 5ms per operation
  });

  test("Benchmark - Special character pattern (L) performance", () => {
    const schedule = new Schedule("0", "0", "12", "L", "*", "*", null, "UTC");
    const iterations = 100;

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.next(schedule, testTime);
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`Special character (L) benchmark:`);
    console.log(`  ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${avgTime.toFixed(4)}ms per operation`);
    console.log(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);

    expect(avgTime).toBeLessThan(10); // Should be under 10ms per operation
  });

  test("Benchmark - Timezone handling performance", () => {
    const schedule = new Schedule(
      "0",
      "30",
      "9",
      "*",
      "*",
      "1-5",
      null,
      "America/New_York"
    );
    const iterations = 200;

    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.next(schedule, testTime);
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`Timezone handling benchmark:`);
    console.log(`  ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${avgTime.toFixed(4)}ms per operation`);
    console.log(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);

    expect(avgTime).toBeLessThan(3); // Should be under 3ms per operation
  });

  test("Benchmark - prev() vs next() performance comparison", () => {
    const schedule = fromCronSyntax("0 * * * *");
    const iterations = 500;

    // Benchmark next()
    let startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.next(schedule, testTime);
    }
    let endTime = performance.now();
    const nextTime = endTime - startTime;
    const nextAvg = nextTime / iterations;

    // Benchmark prev()
    startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      engine.prev(schedule, testTime);
    }
    endTime = performance.now();
    const prevTime = endTime - startTime;
    const prevAvg = prevTime / iterations;

    console.log(`next() vs prev() performance comparison:`);
    console.log(
      `  next(): ${nextAvg.toFixed(4)}ms avg (${(1000 / nextAvg).toFixed(
        0
      )} ops/sec)`
    );
    console.log(
      `  prev(): ${prevAvg.toFixed(4)}ms avg (${(1000 / prevAvg).toFixed(
        0
      )} ops/sec)`
    );
    console.log(
      `  Ratio: prev() is ${(prevAvg / nextAvg).toFixed(2)}x slower than next()`
    );

    expect(nextAvg).toBeLessThan(1);
    expect(prevAvg).toBeLessThan(2);
  });

  test("Benchmark - Memory usage and cache efficiency", () => {
    const schedules = [
      fromCronSyntax("0 * * * *"),
      fromCronSyntax("*/15 * * * * *"),
      fromCronSyntax("0 0 12 * * *"),
      fromCronSyntax("0 0 9-17 * * 1-5"),
      new Schedule("0", "0", "12", "L", "*", "*", null, "UTC"),
    ];

    const iterations = 100;

    // Test cache efficiency with repeated calls
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      schedules.forEach((schedule) => {
        engine.next(schedule, testTime);
        engine.next(schedule, testTime); // Second call should use cache
      });
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const totalOps = iterations * schedules.length * 2;
    const avgTime = totalTime / totalOps;

    console.log(`Cache efficiency benchmark:`);
    console.log(`  ${totalOps} operations in ${totalTime.toFixed(2)}ms`);
    console.log(`  Average: ${avgTime.toFixed(4)}ms per operation`);
    console.log(`  Throughput: ${(1000 / avgTime).toFixed(0)} ops/sec`);

    expect(avgTime).toBeLessThan(0.5); // Should be very fast with caching
  });
});

// Stress Tests
describe("Engine Stress Tests", () => {
  const engine = new Engine();
  const testTime = new Date("2025-01-01T12:00:00Z");

  test("Multiple complex patterns", () => {
    const complexPatterns = [
      "0 0 9-17 * * 1-5", // Business hours
      "*/15 * * * * *", // Every 15 seconds
      "0 0,30 8-12,14-18 1,15 1,6,12 *", // Complex list and ranges
      "0 0 12 L * *", // Last day of month
      "0 0 9 * * 1#1", // First Monday
      "0 0 22 * * 5L", // Last Friday
    ];

    complexPatterns.forEach((pattern, index) => {
      try {
        const schedule = fromCronSyntax(pattern);
        const result = engine.next(schedule, testTime);
        expect(result).toBeInstanceOf(Date);
        console.log(`Pattern ${index + 1} (${pattern}):`, result.toISOString());
      } catch (error) {
        console.log(`Pattern ${index + 1} failed:`, pattern, error.message);
        throw error;
      }
    });
  });

  test("Year boundary tests", () => {
    const yearBoundarySchedules = [
      fromCronSyntax("59 59 23 31 12 *"), // Last second of year
      fromCronSyntax("0 0 0 1 1 *"), // First second of year
      new Schedule("0", "0", "0", "1", "1", "*", "2025-2030", "UTC"), // Specific years
    ];

    yearBoundarySchedules.forEach((schedule, index) => {
      try {
        const result = engine.next(schedule, testTime);
        expect(result).toBeInstanceOf(Date);
        console.log(`Year boundary ${index + 1}:`, result.toISOString());
      } catch (error) {
        console.log(`Year boundary ${index + 1} failed:`, error.message);
        throw error;
      }
    });
  });

  test("High frequency pattern stress test", () => {
    const highFreqPatterns = [
      "* * * * * *", // Every second
      "*/5 * * * * *", // Every 5 seconds
      "*/10 * * * * *", // Every 10 seconds
      "0,30 * * * * *", // Every 30 seconds
    ];

    highFreqPatterns.forEach((pattern, index) => {
      const schedule = fromCronSyntax(pattern);
      const startTime = performance.now();

      // Calculate next 10 occurrences
      let currentTime = testTime;
      for (let i = 0; i < 10; i++) {
        currentTime = engine.next(schedule, currentTime);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(
        `High freq pattern ${index + 1} (${pattern}): ${totalTime.toFixed(
          2
        )}ms for 10 calculations`
      );
      expect(totalTime).toBeLessThan(50); // Should complete in under 50ms
    });
  });

  test("Large date range stress test", () => {
    const schedule = fromCronSyntax("0 0 12 L * *"); // Last day of each month
    const startDate = new Date("2025-01-01T00:00:00Z");
    const endDate = new Date("2030-12-31T23:59:59Z");

    const startTime = performance.now();

    let currentTime = startDate;
    let count = 0;

    // Calculate occurrences for 5 years
    while (currentTime <= endDate && count < 100) {
      // Limit to prevent infinite loops
      currentTime = engine.next(schedule, currentTime);
      count++;
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(
      `Large date range test: ${count} calculations in ${totalTime.toFixed(
        2
      )}ms`
    );
    console.log(`Average per calculation: ${(totalTime / count).toFixed(4)}ms`);

    expect(count).toBeGreaterThan(50); // Should find many occurrences
    expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});
