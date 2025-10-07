import { parseEoD } from "./dist/index.js";

console.log("Testing S0W (start of current week):");
console.log();

const eod = parseEoD("S0W");
console.log("EOD:", eod.toString());
console.log("isSOD:", eod.isSOD);
console.log("referencePoint:", eod.referencePoint);
console.log();

const testDate = new Date("2024-08-14T10:00:00.000Z"); // Wednesday
console.log("Test date:", testDate.toISOString());
console.log(
  "Day of week:",
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][testDate.getUTCDay()]
);
console.log();

const startDate = eod.calculateEndDate(testDate);
console.log("Result from calculateEndDate:", startDate.toISOString());
console.log(
  "Day of week:",
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][startDate.getUTCDay()]
);
console.log("Expected: Monday (1), Got:", startDate.getUTCDay());
console.log();

const startDate2 = eod.calculateStartDate(testDate);
console.log("Result from calculateStartDate:", startDate2.toISOString());
console.log(
  "Day of week:",
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][startDate2.getUTCDay()]
);
console.log();

// Manual calculation
const daysFromMonday =
  testDate.getUTCDay() === 0 ? 6 : testDate.getUTCDay() - 1;
console.log("Days from Monday:", daysFromMonday);
const monday = new Date(testDate);
monday.setUTCDate(monday.getUTCDate() - daysFromMonday);
monday.setUTCHours(0, 0, 0, 0);
console.log("Manual calculation:", monday.toISOString());
console.log(
  "Day of week:",
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][monday.getUTCDay()]
);
