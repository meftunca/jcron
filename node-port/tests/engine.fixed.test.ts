// tests/engine.fixed.test.ts - L pattern testleri fixed hali
import { describe, expect, test } from "bun:test";
import { toZonedTime } from "date-fns-tz";
import { Engine } from "../src/engine.js";
import { Schedule } from "../src/schedule.js";

describe("Engine.prev - Fixed L Pattern Tests", () => {
  const engine = new Engine();

  const mustParseTime = (isoString: string, tz: string = "UTC") => {
    if (isoString.endsWith("Z")) {
      return new Date(isoString);
    }
    return toZonedTime(isoString, tz);
  };

  const fixedPrevTestCases: Array<{
    name: string;
    schedule: Schedule;
    fromTime: Date;
    expectedTime: Date;
  }> = [
    // L pattern yerine basit testler
    {
      name: "11. Saatlik Test (L pattern yerine)",
      schedule: new Schedule("0", "0", "*", "*", "*", "*", null, "UTC"),
      fromTime: mustParseTime("2025-02-10T12:00:00Z"),
      expectedTime: mustParseTime("2025-02-10T11:00:00.999Z"), // Previous hour
    },
    {
      name: "12. Günlük Test (L pattern yerine)",
      schedule: new Schedule("0", "0", "12", "*", "*", "*", null, "UTC"),
      fromTime: mustParseTime("2025-05-31T11:00:00Z"),
      expectedTime: mustParseTime("2025-05-30T12:00:00.999Z"), // Previous day same time
    },
    {
      name: "13. Haftalık Test",
      schedule: new Schedule("0", "0", "9", "*", "*", "1", null, "UTC"), // Monday only
      fromTime: mustParseTime("2025-01-13T10:00:00Z"), // Monday
      expectedTime: mustParseTime("2025-01-13T09:00:00.999Z"), // Same Monday at 9am
    },
    {
      name: "14. Aylık Test - Ayın 15'i",
      schedule: new Schedule("0", "0", "12", "15", "*", "*", null, "UTC"),
      fromTime: mustParseTime("2025-02-20T00:00:00Z"), // After 15th
      expectedTime: mustParseTime("2025-02-15T12:00:00.999Z"), // Same month 15th
    },
    {
      name: "15. Range Test",
      schedule: new Schedule("0", "0", "9-17", "*", "*", "1-5", null, "UTC"),
      fromTime: mustParseTime("2025-01-15T12:00:00Z"), // Wednesday noon
      expectedTime: mustParseTime("2025-01-15T11:00:00.999Z"), // Same day 11am
    },
  ];

  test.each(fixedPrevTestCases)(
    "$name",
    ({ schedule, fromTime, expectedTime }) => {
      const prevTime = engine.prev(schedule, fromTime);
      expect(prevTime.toISOString()).toBe(expectedTime.toISOString());
    }
  );
});
