import { test, expect, describe } from "bun:test";
import { toString, toResult, fromSchedule } from "./index";
import { fromCronSyntax, withWeekOfYear } from "../schedule";

describe("Humanize jcron expressions", () => {
  test("should humanize every minute", () => {
    expect(toString("* * * * *")).toBe("every minute");
  });

  test("should humanize every 15 minutes", () => {
    expect(toString("*/15 * * * *")).toBe("every 15 minutes");
  });

  test("should humanize every day at 12:00", () => {
    expect(toString("0 12 * * *")).toMatch(/at.*noon.*every day|at.*12:00.*every day/);
  });

  test("should humanize every Monday at 9:00", () => {
    expect(toString("0 9 * * 1")).toMatch(/Monday/);
  });

  test("should warn for invalid cron", () => {
    expect(toResult("").description).toBe("Invalid cron expression");
  });

  test("should handle jcron with week of year using Schedule API", () => {
    const schedule = fromCronSyntax("0 12 * * *");
    const scheduleWithWoy = withWeekOfYear(schedule, "1");
    expect(fromSchedule(scheduleWithWoy)).toMatch(/week 1/);
  });

  test("should handle timezone in jcron using Schedule API", () => {
    const schedule = fromCronSyntax("0 12 * * *");
    expect(fromSchedule(schedule)).toMatch(/12:00|noon/);
  });

  test("should handle seconds field", () => {
    expect(toString("30 0 12 * * *")).toMatch(/12:00|noon/);
  });

  test("should handle @yearly shortcut", () => {
    expect(toString("@yearly")).toMatch(/January.*1|1.*January/);
  });

  test("should handle @daily shortcut", () => {
    expect(toString("@daily")).toMatch(/midnight/);
  });

  test("should handle complex step pattern", () => {
    expect(toString("0 9-17/2 * * *")).toMatch(/9:00.*11:00.*1:00.*3:00.*5:00/);
  });
});
