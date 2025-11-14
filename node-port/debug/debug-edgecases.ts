import { fromJCronString, Engine } from "../src/index";
import { addSecondsToDate } from "../src/date-utils";

const engine = new Engine({ tolerantNextSearch: true, tolerantTimezone: true });
const patterns = [
  "0 0 12 29 2 * 2023",
  "0 0 12 31 4 * *",
  "0 0 12 * * * * WOY:54",
];

patterns.forEach(pattern => {
  try {
    const schedule = fromJCronString(pattern, { tolerantWoY: true });
    // inspect expanded schedule
    const exp = (engine as any)._getExpandedSchedule(schedule);
    console.log(`EXPANDED for ${pattern}: years=${Array.from(exp.yearsSet).slice(0,10)} (len=${exp.yearsSet.size}), months=${exp.months}, days=${exp.daysOfMonth}`);
    // Simulate fallback expansion as the engine does
    const fallbackExp = (engine as any)._getExpandedSchedule(schedule);
    const fromYearExtended = new Date("2024-01-01T10:00:00.000Z").getUTCFullYear();
    for (let y = fromYearExtended; y <= fromYearExtended + 100; y++) fallbackExp.yearsSet.add(y);
    console.log(`FALLBACK EXPANDED for ${pattern}: years=${Array.from(fallbackExp.yearsSet).slice(0,10)} (len=${fallbackExp.yearsSet.size}), months=${fallbackExp.months}, days=${fallbackExp.daysOfMonth}`);
    // Simulate month adaptation for impossible day-month combos
    try {
      const Dnum = parseInt(schedule.D as any, 10);
      const Mnum = parseInt(schedule.M as any, 10);
      if (!isNaN(Dnum) && !isNaN(Mnum)) {
        const monthsThatFit: number[] = [];
        for (let m = 1; m <= 12; m++) {
          for (const yVal of Array.from(fallbackExp.yearsSet)) {
            const lastDay = new Date(yVal, m, 0).getDate();
            if (Dnum <= lastDay) {
              monthsThatFit.push(m);
              break;
            }
          }
        }
        console.log(`MONTHS_THAT_FIT for ${pattern}: ${monthsThatFit}`);
      }
    } catch {}
    const next = engine.next(schedule, new Date("2024-01-01T10:00:00.000Z"));
    console.log(`PATTERN: ${pattern} -> NEXT: ${next.toISOString()}`);
  } catch (e) {
    console.error(`PATTERN: ${pattern} -> ERROR: ${(e as Error).message}`);
  }
});

  // Special simulation for Apr31 to attempt to find any next by brute-force second search
  (() => {
    const pattern = "0 0 12 31 4 * *";
    const schedule = fromJCronString(pattern);
    const fromTime = new Date("2024-01-01T10:00:00.000Z");
    const fallbackExp = (engine as any)._getExpandedSchedule(schedule);
    const fromYearExtended = fromTime.getUTCFullYear();
    for (let y = fromYearExtended; y <= fromYearExtended + 100; y++) fallbackExp.yearsSet.add(y);
    const monthsThatFit: number[] = [];
    const Dnum = parseInt(schedule.D as any, 10);
    for (let m = 1; m <= 12; m++) {
      for (const yVal of Array.from(fallbackExp.yearsSet)) {
        const lastDay = new Date(yVal, m, 0).getDate();
        if (Dnum <= lastDay) {
          monthsThatFit.push(m);
          break;
        }
      }
    }
    fallbackExp.months = monthsThatFit;
    fallbackExp.monthsSet = new Set(monthsThatFit);
    // Brute force search
    let searchTime = addSecondsToDate(fromTime, 1);
    for (let i = 0; i < 2000 * 5; i++) {
      const components = (engine as any)._getTimeComponentsFast((engine as any)._createDateInTimezone(searchTime.getUTCFullYear(), searchTime.getUTCMonth() + 1, searchTime.getUTCDate(), searchTime.getUTCHours(), searchTime.getUTCMinutes(), searchTime.getUTCSeconds(), fallbackExp.timezone), fallbackExp.timezone);
      const year = components.year;
      if (fallbackExp.yearsSet.has(year) && (engine as any)._isDayMatch(searchTime, fallbackExp)) {
        console.log(`SIM FOUND for ${pattern} -> ${searchTime.toISOString()} (local month ${components.month})`);
        return;
      }
      searchTime = addSecondsToDate(searchTime, 1);
    }
    console.log(`SIM not found for ${pattern}`);
  })();
