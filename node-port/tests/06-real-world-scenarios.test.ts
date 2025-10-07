import { beforeEach, describe, expect, test } from "bun:test";
import { Engine, fromJCronString } from "../src/index";

describe("JCRON Real-World Scenarios Tests", () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
  });

  describe("Business Use Cases", () => {
    test("should handle weekly Monday morning reports (Istanbul time)", () => {
      const schedule = fromJCronString("0 0 9 * * 1 * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-08-15T05:00:00.000Z"); // Thursday
      const next = engine.next(schedule, fromTime);

      // Should be next Monday at 9 AM Istanbul time
      expect(next.getUTCDay()).toBe(1); // Monday
      // 9 AM Istanbul = 6 AM UTC in summer time
      expect(next.getUTCHours()).toBe(6);
    });

    test("should handle quarterly board meetings (first Monday of quarters)", () => {
      const schedule = fromJCronString(
        "0 0 10 * 1,4,7,10 1#1 * TZ:America/New_York"
      );
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should find first Monday of January, April, July, or October
      const month = next.getUTCMonth() + 1;
      expect([1, 4, 7, 10]).toContain(month);
      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBeLessThanOrEqual(7); // First week
    });

    test("should handle bi-weekly sprints (every 2 weeks)", () => {
      const schedule = fromJCronString(
        "0 0 9 * * 1 * WOY:2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50,52 TZ:UTC"
      );
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCHours()).toBe(9);
    });

    test("should handle monthly end-of-month processing", () => {
      const schedule = fromJCronString("0 0 2 L * * * TZ:UTC E0D");
      const fromTime = new Date("2024-01-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should be last day of month at 2 AM
      expect(next.getUTCHours()).toBe(2);
      // Should be last day of January (31st)
      expect(next.getUTCDate()).toBe(31);
    });

    test("should handle weekend maintenance windows", () => {
      const schedule = fromJCronString("0 0 2 * * 0,6 * TZ:UTC"); // Sunday and Saturday
      const fromTime = new Date("2024-08-15T10:00:00.000Z"); // Thursday
      const next = engine.next(schedule, fromTime);

      // Should be Saturday or Sunday
      expect([0, 6]).toContain(next.getUTCDay());
      expect(next.getUTCHours()).toBe(2);
    });
  });

  describe("Educational/Academic Scenarios", () => {
    test("should handle semester start notifications", () => {
      // Fall semester typically starts in week 34-36
      const schedule = fromJCronString(
        "0 0 8 * * 1 * WOY:34,35,36 TZ:America/New_York E0W"
      );
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCDay()).toBe(1); // Monday
      // Should be in late August/early September
      expect(next.getUTCMonth()).toBeGreaterThanOrEqual(7); // August or later
    });

    test("should handle exam periods (specific weeks of semester)", () => {
      // Final exams typically in weeks 16-17 of spring semester (weeks 6-7 of year)
      const schedule = fromJCronString(
        "0 0 6 * * 1-5 * WOY:6,7 TZ:Europe/Istanbul E0W"
      );
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should be weekday during exam weeks
      expect(next.getUTCDay()).toBeGreaterThanOrEqual(1); // Monday
      expect(next.getUTCDay()).toBeLessThanOrEqual(5); // Friday
    });
  });

  describe("Healthcare/Medical Scenarios", () => {
    test("should handle medication reminders (every 8 hours)", () => {
      const schedule = fromJCronString("0 0 0,8,16 * * * * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should be 4 PM Istanbul time (next 8-hour interval)
      expect(next.getUTCHours()).toBe(13); // 16:00 Istanbul = 13:00 UTC in summer
    });

    test("should handle weekly therapy appointments", () => {
      const schedule = fromJCronString(
        "0 30 14 * * 3 * TZ:America/New_York E0D"
      );
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCDay()).toBe(3); // Wednesday
      // 2:30 PM New York = 18:30 UTC in summer time
      expect(next.getUTCHours()).toBe(18);
      expect(next.getUTCMinutes()).toBe(30);
    });
  });

  describe("Financial/Trading Scenarios", () => {
    test("should handle market opening times (NYSE)", () => {
      const schedule = fromJCronString("0 30 9 * * 1-5 * TZ:America/New_York");
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should be weekday at 9:30 AM New York time
      expect(next.getUTCDay()).toBeGreaterThanOrEqual(1); // Monday
      expect(next.getUTCDay()).toBeLessThanOrEqual(5); // Friday
      // 9:30 AM New York = 13:30 UTC in summer time
      expect(next.getUTCHours()).toBe(13);
      expect(next.getUTCMinutes()).toBe(30);
    });

    test("should handle monthly portfolio rebalancing", () => {
      const schedule = fromJCronString("0 0 6 1 * * * TZ:UTC E0D");
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should be first day of next month
      expect(next.getUTCDate()).toBe(1);
      expect(next.getUTCHours()).toBe(6);
      expect(next.getUTCMonth()).toBe(8); // September
    });
  });

  describe("DevOps/Infrastructure Scenarios", () => {
    test("should handle backup schedules (daily at 2 AM)", () => {
      const schedule = fromJCronString("0 0 2 * * * * TZ:UTC E1D");
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCHours()).toBe(2);
      expect(next.getUTCDate()).toBe(16); // Next day
    });

    test("should handle log rotation (weekly Sunday night)", () => {
      const schedule = fromJCronString("0 0 23 * * 0 * TZ:UTC E0D");
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCDay()).toBe(0); // Sunday
      expect(next.getUTCHours()).toBe(23);
    });

    test("should handle security scans (first Monday of month)", () => {
      const schedule = fromJCronString("0 0 3 * * 1#1 * TZ:UTC E0D");
      const fromTime = new Date("2024-08-15T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBeLessThanOrEqual(7); // First week
      expect(next.getUTCHours()).toBe(3);
    });
  });

  describe("International Business Scenarios", () => {
    test("should handle global team standup (morning for all timezones)", () => {
      // 9 AM Istanbul, 10 AM Tokyo, 9 PM New York (previous day)
      const istanbulSchedule = fromJCronString(
        "0 0 9 * * 1-5 * TZ:Europe/Istanbul"
      );
      const tokyoSchedule = fromJCronString("0 0 10 * * 1-5 * TZ:Asia/Tokyo");
      const newYorkSchedule = fromJCronString(
        "0 0 21 * * 1-5 * TZ:America/New_York"
      );

      const fromTime = new Date("2024-08-15T05:00:00.000Z");

      const istanbulNext = engine.next(istanbulSchedule, fromTime);
      const tokyoNext = engine.next(tokyoSchedule, fromTime);
      const newYorkNext = engine.next(newYorkSchedule, fromTime);

      // All should be valid times
      expect(istanbulNext).toBeDefined();
      expect(tokyoNext).toBeDefined();
      expect(newYorkNext).toBeDefined();

      // Should be weekdays
      expect(istanbulNext.getUTCDay()).toBeGreaterThanOrEqual(1);
      expect(istanbulNext.getUTCDay()).toBeLessThanOrEqual(5);
    });
  });

  describe("Personal/Lifestyle Scenarios", () => {
    test("should handle workout reminders (MWF mornings)", () => {
      const schedule = fromJCronString("0 0 7 * * 1,3,5 * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-08-15T04:00:00.000Z"); // Thursday
      const next = engine.next(schedule, fromTime);

      expect([1, 3, 5]).toContain(next.getUTCDay()); // Monday, Wednesday, Friday
      expect(next.getUTCHours()).toBe(4); // 7 AM Istanbul = 4 AM UTC in summer
    });

    test("should handle bill payment reminders (15th of month)", () => {
      const schedule = fromJCronString(
        "0 0 10 15 * * * TZ:Europe/Istanbul E0D"
      );
      const fromTime = new Date("2024-08-10T05:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCDate()).toBe(15);
      expect(next.getUTCHours()).toBe(7); // 10 AM Istanbul = 7 AM UTC in summer
    });
  });

  describe("Seasonal/Holiday Scenarios", () => {
    test("should handle New Year's Day announcements", () => {
      const schedule = fromJCronString("0 0 0 1 1 * * TZ:Europe/Istanbul");
      const fromTime = new Date("2024-12-30T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      expect(next.getUTCFullYear()).toBe(2025);
      expect(next.getUTCMonth()).toBe(0); // January
      expect(next.getUTCDate()).toBe(1);
      expect(next.getUTCHours()).toBe(21); // Midnight Istanbul = 21:00 UTC in winter
    });

    test("should handle summer vacation planning (June-August)", () => {
      const schedule = fromJCronString(
        "0 0 9 1 6,7,8 1 * TZ:Europe/Istanbul E0D"
      );
      const fromTime = new Date("2024-01-01T10:00:00.000Z");
      const next = engine.next(schedule, fromTime);

      // Should be first Monday of June, July, or August
      expect([5, 6, 7]).toContain(next.getUTCMonth()); // June, July, August (0-indexed)
      expect(next.getUTCDay()).toBe(1); // Monday
      expect(next.getUTCDate()).toBeLessThanOrEqual(7); // First week
    });
  });
});
