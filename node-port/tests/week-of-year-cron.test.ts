#!/usr/bin/env bun
import { describe, expect, it } from "bun:test";
import { Engine } from "../src/engine.js";
import {
  fromCronSyntax,
  fromCronWithWeekOfYear,
  WeekPatterns,
} from "../src/schedule.js";

const engine = new Engine();

// Helper for edge-case test matrix
function runEdgeCase(label, cron, weekOfYear, date, shouldMatch) {
  it(`${label} | cron: '${cron}' | woy: '${weekOfYear}' | date: ${date.toISOString()}`, () => {
    const schedule = fromCronWithWeekOfYear(cron, weekOfYear);
    expect(engine.isMatch(schedule, date)).toBe(shouldMatch);
  });
}

describe("fromCronWithWeekOfYear edge-cases", () => {
  // Odd weeks only
  runEdgeCase(
    "Odd weeks",
    "0 0 12 * * MON",
    WeekPatterns.ODD_WEEKS,
    new Date("2024-01-01T00:00:00Z"),
    false
  ); // Not Monday
  runEdgeCase(
    "Odd weeks",
    "0 0 12 * * MON",
    WeekPatterns.ODD_WEEKS,
    new Date("2024-01-08T12:00:00Z"),
    false
  ); // Monday, week 2 (even)
  runEdgeCase(
    "Odd weeks",
    "0 0 12 * * MON",
    WeekPatterns.ODD_WEEKS,
    new Date("2024-01-15T12:00:00Z"),
    true
  ); // Monday, week 3 (odd)

  // Even weeks only
  runEdgeCase(
    "Even weeks",
    "0 0 12 * * MON",
    WeekPatterns.EVEN_WEEKS,
    new Date("2024-01-08T12:00:00Z"),
    true
  ); // Monday, week 2 (even)
  runEdgeCase(
    "Even weeks",
    "0 0 12 * * MON",
    WeekPatterns.EVEN_WEEKS,
    new Date("2024-01-15T12:00:00Z"),
    false
  ); // Monday, week 3 (odd)

  // First week of year
  runEdgeCase(
    "First week",
    "0 0 8 * * MON",
    WeekPatterns.FIRST_WEEK,
    new Date("2024-01-01T08:00:00Z"),
    true
  ); // Monday, week 1

  // Last week of year (2024 has 1-52)
  runEdgeCase(
    "Last week",
    "0 0 8 * * MON",
    WeekPatterns.LAST_WEEK,
    new Date("2024-12-23T08:00:00Z"),
    false
  ); // Not week 53
  runEdgeCase(
    "Last week",
    "0 0 8 * * MON",
    WeekPatterns.LAST_WEEK,
    new Date("2020-12-28T08:00:00Z"),
    true
  ); // 2020, week 53

  // Week 1 at year boundary
  runEdgeCase(
    "Week 1 boundary",
    "0 0 8 * * MON",
    "1",
    new Date("2023-12-31T08:00:00Z"),
    false
  ); // Sunday, not week 1 of 2024

  // Week 53 (leap week year)
  runEdgeCase(
    "Week 53",
    "0 0 8 * * MON",
    "53",
    new Date("2020-12-28T08:00:00Z"),
    true
  );
  runEdgeCase(
    "Week 53",
    "0 0 8 * * MON",
    "53",
    new Date("2024-12-30T08:00:00Z"),
    false
  );

  // No match (week 54)
  runEdgeCase(
    "No match",
    "0 0 8 * * MON",
    "54",
    new Date("2024-01-01T08:00:00Z"),
    false
  );

  // Week of year with year constraint
  runEdgeCase(
    "Week 10 of 2025",
    "0 0 8 * * MON 2025",
    "10",
    new Date("2025-03-03T08:00:00Z"),
    true
  );
  runEdgeCase(
    "Week 10 of 2025",
    "0 0 8 * * MON 2024",
    "10",
    new Date("2025-03-03T08:00:00Z"),
    false
  );
});

describe("fromCronSyntax (classic cron) edge-cases", () => {
  // Classic cron, no week of year
  it("classic cron: matches Monday at 12:00", () => {
    const schedule = fromCronSyntax("0 0 12 * * MON");
    expect(engine.isMatch(schedule, new Date("2024-01-08T12:00:00Z"))).toBe(
      true
    );
  });
  it("classic cron: does not match wrong day", () => {
    const schedule = fromCronSyntax("0 0 12 * * MON");
    expect(engine.isMatch(schedule, new Date("2024-01-09T12:00:00Z"))).toBe(
      false
    );
  });
  it("classic cron: year constraint", () => {
    const schedule = fromCronSyntax("0 0 12 * * MON 2025");
    expect(engine.isMatch(schedule, new Date("2025-01-06T12:00:00Z"))).toBe(
      true
    );
    expect(engine.isMatch(schedule, new Date("2024-01-08T12:00:00Z"))).toBe(
      false
    );
  });
  it("classic cron: year and timezone", () => {
    const schedule = fromCronSyntax("0 0 12 * * MON 2025 Europe/Istanbul");
    expect(schedule.Y).toBe("2025");
    expect(schedule.tz).toBe("Europe/Istanbul");
  });
});
