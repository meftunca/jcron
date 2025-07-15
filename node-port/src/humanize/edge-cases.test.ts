import { test, expect, describe } from "bun:test";
import { toString, toResult, fromSchedule } from "./index";
import { fromCronSyntax, withWeekOfYear } from "../schedule";

describe("Humanize Edge Cases", () => {
  describe("Invalid Inputs", () => {
    test("should handle null/undefined inputs", () => {
      expect(toString("")).toBe("Invalid cron expression");
      expect(toString(null as any)).toBe("Invalid cron expression");
      expect(toString(undefined as any)).toBe("Invalid cron expression");
    });

    test("should handle malformed cron expressions", () => {
      expect(toString("invalid")).toBe("Invalid cron expression");
      expect(toString("0")).toBe("Invalid cron expression");
      expect(toString("0 0")).toBe("Invalid cron expression");
      expect(toString("0 0 0")).toBe("Invalid cron expression");
      expect(toString("0 0 0 0")).toBe("Invalid cron expression");
      expect(toString("too many fields here really way too many")).toBe("Invalid cron expression");
    });

    test("should handle invalid field values", () => {
      expect(toString("60 * * * *")).toBe("Invalid cron expression"); // minute > 59
      expect(toString("* 25 * * *")).toBe("Invalid cron expression"); // hour > 23  
      expect(toString("* * 32 * *")).toBe("Invalid cron expression"); // day > 31
      expect(toString("* * * 13 *")).toBe("Invalid cron expression"); // month > 12
      expect(toString("* * * * 8")).toBe("Invalid cron expression"); // dow > 6
    });

    test("should handle negative values", () => {
      expect(toString("0 -1 * * *")).toBe("Invalid cron expression");
      expect(toString("0 0 -1 * *")).toBe("Invalid cron expression");
      expect(toString("0 0 0 -1 *")).toBe("Invalid cron expression");
    });
  });

  describe("Boundary Values", () => {
    test("should handle minimum values", () => {
      expect(toString("0 0 0 1 1 0")).toMatch(/midnight.*1.*Sunday.*January|January.*1.*Sunday.*midnight/);
      expect(toString("0 0 0 1 1 *")).toMatch(/January.*1|1.*January/);
    });

    test("should handle maximum values", () => {
      expect(toString("59 59 23 31 12 6")).toMatch(/11:59.*PM/);
      expect(toString("0 0 23 31 12 *")).toMatch(/11:00.*PM/);
    });

    test("should handle leap year edge cases", () => {
      const result = toResult("0 0 0 29 2 *");
      expect(result.warnings).toContain("February 29th only exists in leap years");
      
      const result2 = toResult("0 0 0 30 2 *");
      expect(result2.warnings).toContain("Day 30+ does not exist in February");
    });

    test("should handle month-day impossibilities", () => {
      const result = toResult("0 0 0 31 4 *"); // April 31st
      expect(result.warnings).toContain("Day 31 does not exist in April, June, September, or November");
      
      const result2 = toResult("0 0 0 31 6 *"); // June 31st
      expect(result2.warnings).toContain("Day 31 does not exist in April, June, September, or November");
    });
  });

  describe("Step Patterns Edge Cases", () => {
    test("should handle division by zero", () => {
      const result = toResult("*/0 * * * *");
      expect(result.warnings).toContain("Division by zero in step pattern");
    });

    test("should handle very small steps", () => {
      expect(toString("*/1 * * * *")).toBe("every minute");
      const result = toResult("*/1 * * * *");
      expect(result.warnings).toContain("Very frequent execution (every minute or less)");
    });

    test("should handle large steps", () => {
      expect(toString("*/30 * * * *")).toBe("every 30 minutes");
      expect(toString("0 */12 * * *")).toBe("every 12 hours");
    });

    test("should handle step patterns with ranges", () => {
      const result1 = toString("0 9-17/3 * * *");
      expect(result1).toContain("9:00");
      expect(result1).toContain("noon"); // 12:00 PM is shown as "noon"
      expect(result1).toContain("3:00");
      
      const result2 = toString("0 0-23/6 * * *");
      expect(result2).toContain("midnight");
      expect(result2).toContain("6:00 AM");
      expect(result2).toContain("noon");
      expect(result2).toContain("6:00 PM");
    });

    test("should handle invalid step ranges", () => {
      expect(toString("0 17-9/2 * * *")).toBe("Invalid cron expression"); // end < start
    });
  });

  describe("List Patterns Edge Cases", () => {
    test("should handle single item lists", () => {
      expect(toString("0 9 * * 1")).toMatch(/Monday/);
    });

    test("should handle long lists", () => {
      expect(toString("0 9,10,11,12,13,14,15,16,17 * * *")).toMatch(/9:00.*10:00.*11:00/);
      
      const result = toResult("0,5,10,15,20,25,30,35,40,45,50,55 * * * *");
      expect(result.warnings).toContain("Very frequent execution pattern (many minute values)");
    });

    test("should handle duplicate values in lists", () => {
      expect(toString("0 9,9,9 * * *")).toMatch(/9:00/);
    });

    test("should handle unsorted lists", () => {
      expect(toString("0 17,9,13 * * *")).toMatch(/9:00.*1:00.*5:00/);
    });
  });

  describe("Range Patterns Edge Cases", () => {
    test("should handle single value ranges", () => {
      expect(toString("0 9-9 * * *")).toMatch(/9:00/);
    });

    test("should handle full ranges", () => {
      expect(toString("0 0-23 * * *")).toBe("every minute");
      // Note: "0 * * * *" means at minute 0 of every hour (top of every hour)
      expect(toString("0 * * * *")).toMatch(/every hour|hourly/);
    });

    test("should handle overlapping patterns", () => {
      const result = toResult("0 9-12,10-15 * * *");
      expect(result.warnings).toContain("Complex hour pattern with both ranges and lists");
    });
  });

  describe("Special Characters Edge Cases", () => {
    test("should handle L (last) patterns", () => {
      expect(toString("0 0 0 L * *")).toMatch(/last day/);
      expect(toString("0 0 0 * * 0L")).toMatch(/last Sunday/);
      expect(toString("0 0 0 * * SUNL")).toMatch(/last Sunday/);
    });

    test("should handle # (nth) patterns", () => {
      expect(toString("0 0 0 * * 1#1")).toMatch(/1st Monday/);
      expect(toString("0 0 0 * * 1#2")).toMatch(/2nd Monday/);
      expect(toString("0 0 0 * * 1#5")).toMatch(/5th Monday/);
    });

    test("should handle invalid # patterns", () => {
      expect(toString("0 0 0 * * 1#0")).toBe("Invalid cron expression"); // 0th occurrence
      expect(toString("0 0 0 * * 1#6")).toBe("Invalid cron expression"); // 6th occurrence (max 5)
    });
  });

  describe("Timezone Edge Cases", () => {
    test("should handle various timezone formats", () => {
      const schedule1 = fromCronSyntax("0 0 12 * * * UTC");
      expect(fromSchedule(schedule1)).toMatch(/noon/);

      const schedule2 = fromCronSyntax("0 0 12 * * * EST");
      expect(fromSchedule(schedule2)).toMatch(/noon.*EST/);

      const schedule3 = fromCronSyntax("0 0 12 * * * GMT+3");
      expect(fromSchedule(schedule3)).toMatch(/noon.*GMT\+3/);
    });

    test("should handle missing timezone", () => {
      const schedule = fromCronSyntax("0 12 * * *");
      expect(fromSchedule(schedule)).toMatch(/noon/);
    });
  });

  describe("Week of Year Edge Cases", () => {
    test("should handle first and last weeks", () => {
      const schedule1 = fromCronSyntax("0 12 * * *");
      const firstWeek = withWeekOfYear(schedule1, "1");
      expect(fromSchedule(firstWeek)).toMatch(/week 1/);

      const lastWeek = withWeekOfYear(schedule1, "53");
      expect(fromSchedule(lastWeek)).toMatch(/week 53/);
    });

    test("should handle invalid week numbers", () => {
      const schedule = fromCronSyntax("0 12 * * *");
      const invalidWeek = withWeekOfYear(schedule, "54"); // Week 54 doesn't exist
      // Should return invalid expression for out-of-range week numbers
      expect(fromSchedule(invalidWeek)).toBe("Invalid cron expression");
    });

    test("should handle week ranges and lists", () => {
      const schedule = fromCronSyntax("0 12 * * *");
      const weekRange = withWeekOfYear(schedule, "1-4");
      expect(fromSchedule(weekRange)).toMatch(/weeks 1.*4/);

      const weekList = withWeekOfYear(schedule, "1,3,5");
      expect(fromSchedule(weekList)).toMatch(/weeks 1.*3.*5/);
    });
  });

  describe("OR Logic Edge Cases", () => {
    test("should detect OR logic patterns", () => {
      const result = toResult("0 9 15 * 1"); // 15th of month OR Monday
      expect(result.warnings).toContain("Uses OR logic");
    });

    test("should handle complex OR patterns", () => {
      const result = toResult("0 9 1,15 6,12 1-5"); // Complex OR with multiple fields
      expect(result.warnings).toContain("Uses OR logic");
    });
  });

  describe("Locale Edge Cases", () => {
    test("should handle unsupported locales", () => {
      expect(toString("0 9 * * 1", { locale: "nonexistent" })).toMatch(/Monday/); // Falls back to English
    });

    test("should handle empty locale", () => {
      expect(toString("0 9 * * 1", { locale: "" })).toMatch(/Monday/);
    });

    test("should handle various case styles", () => {
      expect(toString("0 9 * * 1", { caseStyle: "upper" })).toMatch(/AT.*MONDAY/);
      expect(toString("0 9 * * 1", { caseStyle: "title" })).toMatch(/At.*Monday/);
      expect(toString("0 9 * * 1", { caseStyle: "lower" })).toMatch(/at.*monday/i);
    });
  });

  describe("Performance Edge Cases", () => {
    test("should handle very long descriptions", () => {
      const longExpression = "0 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * 0,1,2,3,4,5,6";
      const result = toString(longExpression, { maxLength: 50 });
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toMatch(/\.\.\.$/); // Should end with ...
    });

    test("should handle complex expressions", () => {
      const complexExpression = "0,15,30,45 8-18/2 1-15,L * * 1-5#1,2,3";
      const result = toString(complexExpression);
      expect(result).toBeTruthy();
      expect(result).not.toBe("Invalid cron expression");
    });
  });

  describe("Options Edge Cases", () => {
    test("should handle extreme option values", () => {
      expect(toString("0 0 * * *", { maxLength: 0 })).toBeTruthy(); // No truncation
      expect(toString("0 0 * * *", { maxLength: 1 })).toBe("..."); // Extreme truncation
      expect(toString("0 0 * * *", { maxLength: -1 })).toBeTruthy(); // Negative value
    });

    test("should handle option combinations", () => {
      const options = {
        use24HourTime: true,
        dayFormat: "short" as const,
        monthFormat: "numeric" as const,
        caseStyle: "title" as const,
        includeTimezone: false,
        includeYear: false,
        includeSeconds: true,
        useOrdinals: false
      };
      
      expect(toString("30 14 15 6 1", options)).toContain("14:30");
    });
  });

  describe("Seconds Field Edge Cases", () => {
    test("should handle seconds in various positions", () => {
      // Without includeSeconds, seconds are ignored in display
      expect(toString("30 0 12 * * *")).toMatch(/12:00/);
      expect(toString("0 30 12 * * *")).toMatch(/12:30/);
      
      // With includeSeconds, seconds should be shown
      expect(toString("30 0 12 * * *", { includeSeconds: true })).toMatch(/12:00:30/);
    });

    test("should handle seconds with includeSeconds option", () => {
      expect(toString("30 0 12 * * *", { includeSeconds: true })).toMatch(/12:00:30/);
      expect(toString("30 0 12 * * *", { includeSeconds: false })).toMatch(/12:00/);
    });
  });

  describe("Frequency Analysis Edge Cases", () => {
    test("should calculate frequency for various patterns", () => {
      const result1 = toResult("*/5 * * * *");
      expect(result1.frequency.type).toBe("minutes");
      expect(result1.frequency.interval).toBe(5);

      const result2 = toResult("0 */3 * * *");
      expect(result2.frequency.type).toBe("hours");
      expect(result2.frequency.interval).toBe(3);

      const result3 = toResult("0 0 * * 0");
      expect(result3.frequency.type).toBe("weeks");
      expect(result3.frequency.interval).toBe(1);
    });
  });
});
