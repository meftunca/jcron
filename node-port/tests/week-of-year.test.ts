#!/usr/bin/env bun
// jcron week of year edge case tests for Node.js port
import { describe, expect, it } from "bun:test";
import { Engine } from "../src/engine.js";
import {
  fromCronWithWeekOfYear,
  Schedule,
  WeekPatterns,
} from "../src/schedule.js";

const engine = new Engine();

function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function printResult(label: string, date: Date) {
  console.log(`${label}: ${date.toISOString()} (Week ${getISOWeek(date)})`);
}

console.log("=== jcron Week of Year Edge Case Tests (Node.js) ===\n");

// 1. Basic: Odd weeks only
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear(
    "0 0 12 * * MON",
    WeekPatterns.ODD_WEEKS
  );
  const next = engine.next(schedule, start);
  printResult("Odd weeks only, next run", next);
}

// 2. Basic: Even weeks only
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear(
    "0 0 12 * * MON",
    WeekPatterns.EVEN_WEEKS
  );
  const next = engine.next(schedule, start);
  printResult("Even weeks only, next run", next);
}

// 3. Quarterly (first, second, third, fourth quarter)
{
  const start = new Date("2024-01-01T00:00:00Z");
  const quarters = [
    [WeekPatterns.FIRST_QUARTER, "First quarter"],
    [WeekPatterns.SECOND_QUARTER, "Second quarter"],
    [WeekPatterns.THIRD_QUARTER, "Third quarter"],
    [WeekPatterns.FOURTH_QUARTER, "Fourth quarter"],
  ];
  for (const [pattern, label] of quarters) {
    const schedule = fromCronWithWeekOfYear("0 0 9 * * MON", pattern as string);
    const next = engine.next(schedule, start);
    printResult(`${label} next run`, next);
  }
}

// 4. Last week of year
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear(
    "0 0 8 * * MON",
    WeekPatterns.LAST_WEEK
  );
  const next = engine.next(schedule, start);
  printResult("Last week of year, next run", next);
}

// 5. First week of year
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear(
    "0 0 8 * * MON",
    WeekPatterns.FIRST_WEEK
  );
  const next = engine.next(schedule, start);
  printResult("First week of year, next run", next);
}

// 6. Bi-weekly (every other week, odd weeks)
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear(
    "0 0 10 * * FRI",
    WeekPatterns.BI_WEEKLY
  );
  let next = engine.next(schedule, start);
  console.log("Bi-weekly (odd weeks), next 5 runs:");
  for (let i = 0; i < 5; i++) {
    printResult(`  Run ${i + 1}`, next);
    next = engine.next(schedule, new Date(next.getTime() + 1000));
  }
}

// 7. Monthly (every 4 weeks)
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear(
    "0 0 10 * * MON",
    WeekPatterns.MONTHLY
  );
  let next = engine.next(schedule, start);
  console.log("Monthly (every 4 weeks), next 5 runs:");
  for (let i = 0; i < 5; i++) {
    printResult(`  Run ${i + 1}`, next);
    next = engine.next(schedule, new Date(next.getTime() + 1000));
  }
}

// 8. Edge: Week 53 (leap week years)
{
  // 2020 has 53 weeks
  const start = new Date("2020-12-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear("0 0 8 * * MON", "53");
  const next = engine.next(schedule, start);
  printResult("Week 53 (leap week year), next run", next);
}

// 9. Edge: Week 1 at year boundary
{
  const start = new Date("2023-12-31T00:00:00Z");
  const schedule = fromCronWithWeekOfYear("0 0 8 * * MON", "1");
  const next = engine.next(schedule, start);
  printResult("Week 1 at year boundary, next run", next);
}

// 10. Edge: Previous execution (prev) for odd weeks
{
  const start = new Date("2024-07-15T12:00:00Z"); // Monday, week 29
  const schedule = fromCronWithWeekOfYear(
    "0 0 12 * * MON",
    WeekPatterns.ODD_WEEKS
  );
  try {
    const prev = engine.prev(schedule, start);
    printResult("Odd weeks only, previous run", prev);
  } catch (e) {
    console.log(`Odd weeks only, previous run: ${(e as Error).message}`);
  }
}

// 11. Edge: No match in year (e.g. week 54)
{
  const start = new Date("2024-01-01T00:00:00Z");
  const schedule = fromCronWithWeekOfYear("0 0 8 * * MON", "54");
  try {
    const next = engine.next(schedule, start);
    printResult("No match (week 54), next run", next);
  } catch (e) {
    console.log(`No match (week 54), next run: ${(e as Error).message}`);
  }
}

// 12. Edge: Week of year with year constraint
{
  const start = new Date("2024-01-01T00:00:00Z");
  // Only 2025, week 10
  const schedule = fromCronWithWeekOfYear("0 0 8 * * MON 2025", "10");
  const next = engine.next(schedule, start);
  printResult("Week 10 of 2025, next run", next);
}

describe("Schedule (JSON syntax, week of year)", () => {
  const engine = new Engine();
  function scheduleFromJson({ S, M, H, D, Mo, Dw, Y, WoY, tz }: any) {
    return new Schedule(
      S || null,
      M || null,
      H || null,
      D || null,
      Mo || null,
      Dw || null,
      Y || null,
      WoY || null,
      tz || null
    );
  }

  it("should schedule correctly for week of year and year (JSON)", () => {
    const schedule = scheduleFromJson({
      S: "0",
      M: "0",
      H: "8",
      D: "*",
      Mo: "*",
      Dw: "1",
      Y: "2025",
      WoY: "2",
    });
    const dt = new Date("2025-01-06T08:00:00Z"); // 2025, 2. hafta, Pazartesi
    expect(engine.isMatch(schedule, dt)).toBe(true);
  });

  it("should not match if week of year does not match (JSON)", () => {
    const schedule = scheduleFromJson({
      S: "0",
      M: "0",
      H: "8",
      D: "*",
      Mo: "*",
      Dw: "1",
      Y: "2025",
      WoY: "3",
    });
    const dt = new Date("2025-01-06T08:00:00Z"); // 2025, 2. hafta
    expect(engine.isMatch(schedule, dt)).toBe(false);
  });

  it("should support only week of year (JSON)", () => {
    const schedule = scheduleFromJson({
      S: "0",
      M: "0",
      H: "8",
      D: "*",
      Mo: "*",
      Dw: "1",
      WoY: "2",
    });
    const dt = new Date("2025-01-06T08:00:00Z"); // 2025, 2. hafta
    expect(engine.isMatch(schedule, dt)).toBe(true);
  });

  it("should support week of year range (JSON)", () => {
    const schedule = scheduleFromJson({
      S: "0",
      M: "0",
      H: "8",
      D: "*",
      Mo: "*",
      Dw: "1",
      WoY: "2-4",
    });
    const dt = new Date("2025-01-20T08:00:00Z"); // 2025, 4. hafta
    expect(engine.isMatch(schedule, dt)).toBe(true);
  });

  it("should support week of year list (JSON)", () => {
    const schedule = scheduleFromJson({
      S: "0",
      M: "0",
      H: "8",
      D: "*",
      Mo: "*",
      Dw: "1",
      WoY: "2,4,6",
    });
    const dt = new Date("2025-01-20T08:00:00Z"); // 2025, 4. hafta
    expect(engine.isMatch(schedule, dt)).toBe(true);
  });

  it("should support week of year step (JSON)", () => {
    const schedule = scheduleFromJson({
      S: "0",
      M: "0",
      H: "8",
      D: "*",
      Mo: "*",
      Dw: "1",
      WoY: "2-10/2",
    });
    const dt = new Date("2025-01-20T08:00:00Z"); // 2025, 4. hafta
    expect(engine.isMatch(schedule, dt)).toBe(true);
  });
});

console.log("\n=== All edge case tests completed! ===");
