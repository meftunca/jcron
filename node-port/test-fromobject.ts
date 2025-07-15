import { fromObject, fromSchedule } from "./src/index";

console.log("Testing fromObject function:");

// Simple daily schedule
const daily = fromObject({
  hours: 9,
  minutes: 30
});
console.log("Daily 9:30 ->", fromSchedule(daily));

// Weekly schedule with day names
const weekly = fromObject({
  hours: "10",
  minutes: "0",
  dayOfWeek: "MON"
});
console.log("Monday 10:00 ->", fromSchedule(weekly));

// Monthly schedule
const monthly = fromObject({
  hours: 14,
  minutes: 30,
  dayOfMonth: 15
});
console.log("15th of month 14:30 ->", fromSchedule(monthly));

// With timezone
const withTz = fromObject({
  hours: 12,
  minutes: 0,
  timezone: "UTC"
});
console.log("Noon UTC ->", fromSchedule(withTz));

// Complex with week of year
const complex = fromObject({
  hours: 9,
  minutes: 0,
  dayOfWeek: 1, // Monday
  weekOfYear: "1,5,10"
});
console.log("Complex ->", fromSchedule(complex));

// With seconds
const withSeconds = fromObject({
  seconds: 30,
  minutes: 15,
  hours: 8
});
console.log("With seconds ->", fromSchedule(withSeconds, { includeSeconds: true }));
