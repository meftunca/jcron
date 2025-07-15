// Test week of year functionality in TypeScript
import { Engine } from "./dist/engine.js";
import {
  fromCronSyntax,
  fromCronWithWeekOfYear,
  WeekPatterns,
} from "./dist/schedule.js";

const engine = new Engine();

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

console.log("=== TypeScript jcron Week of Year Test ===");

const now = new Date();
console.log("Current time:", now.toISOString());
console.log("Current ISO week:", getISOWeek(now));
console.log("");

// Test 1: Traditional cron with week constraint
console.log("Test 1: Every Monday at 9 AM during odd weeks");
const schedule1 = fromCronWithWeekOfYear("0 9 * * 1", WeekPatterns.ODD_WEEKS);
const next1 = engine.next(schedule1, now);
console.log(
  "Next execution:",
  next1.toISOString(),
  "(Week",
  getISOWeek(next1) + ")"
);
console.log("Is odd week:", getISOWeek(next1) % 2 === 1);
console.log("");

// Test 2: 7-field cron syntax
console.log("Test 2: Every day at noon during first quarter (weeks 1-13)");
const schedule2 = fromCronSyntax("0 0 12 * * * 1-13");
const next2 = engine.next(schedule2, now);
const week2 = getISOWeek(next2);
console.log("Next execution:", next2.toISOString(), "(Week", week2 + ")");
console.log("In first quarter:", week2 >= 1 && week2 <= 13);
console.log("");

// Test 3: Bi-weekly meetings
console.log("Test 3: Next 3 bi-weekly Friday meetings (even weeks)");
const schedule3 = fromCronWithWeekOfYear("0 14 * * 5", WeekPatterns.EVEN_WEEKS);
let current = now;
for (let i = 0; i < 3; i++) {
  const next = engine.next(schedule3, current);
  const week = getISOWeek(next);
  console.log(
    `${i + 1}. ${next.toISOString()} (Week ${week}, Even: ${week % 2 === 0})`
  );
  current = next;
}

console.log("");
console.log("=== Test Complete ===");
