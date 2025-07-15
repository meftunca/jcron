// src/humanize/humanize.test.ts
import { test,it, expect, describe } from "bun:test";
import { toString, toResult } from "./index";

describe("Humanize cron expressions", () => {
  it("should humanize every minute", () => {
    expect(toString("* * * * *")).toMatch(/every minute|her dakika|chaque minute/);
  });

  it("should humanize every 15 minutes", () => {
    expect(toString("*/15 * * * *")).toMatch(/every 15 minutes|her 15 dakika|chaque 15 minutes/);
  });

  it("should humanize every day at 12:00", () => {
    expect(toString("0 12 * * *")).toMatch(/at 12:00|at noon|saat 12:00|à 12:00/);
  });

  it("should humanize every Monday at 9:00", () => {
    expect(toString("0 9 * * 1")).toMatch(/Monday|Pazartesi|Lundi/);
  });

  it("should warn for invalid cron", () => {
    expect(toResult("").description).toMatch(/Invalid cron expression/);
  });

  it("should humanize step pattern with range", () => {
    expect(toString("0 9-17/2 * * *")).toMatch(/every 2 hours|her 2 saat|chaque 2 heures|at.*AM.*PM/);
  });
});
