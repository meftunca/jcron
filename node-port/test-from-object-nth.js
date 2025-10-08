// Test fromObject with multiple nthWeekDay patterns
import { fromObject, getNext } from "./dist/index.mjs";

console.log("\n=== Testing fromObject with Multiple nthWeekDay ===\n");

const testObj = {
  s: "0",
  m: "0",
  h: "0",
  D: "*",
  M: "*",
  dow: "1#1,2#3", // 1st Monday (1#1) and 3rd Tuesday (2#3)
  Y: "*",
  woy: null,
  eod: "E1D",
};

console.log("Test Object:", JSON.stringify(testObj, null, 2));
console.log("");

const schedule = fromObject(testObj);
console.log("Schedule created from object:");
console.log("  dow field:", schedule.dow);
console.log("  eod field:", schedule.eod?.toString());
console.log("");

// Test from different dates
const testDates = [
  new Date("2025-10-01T00:00:00Z"), // Oct 1 (Wed)
  new Date("2025-10-05T00:00:00Z"), // Oct 5 (Sun)
  new Date("2025-10-06T00:00:00Z"), // Oct 6 (Mon) - 1st Monday
  new Date("2025-10-07T00:00:00Z"), // Oct 7 (Tue)
  new Date("2025-10-20T00:00:00Z"), // Oct 20 (Mon)
  new Date("2025-10-21T00:00:00Z"), // Oct 21 (Tue) - 3rd Tuesday
];

console.log("October 2025 Calendar Context:");
console.log("  1st Monday:   Oct 6");
console.log("  3rd Tuesday:  Oct 21");
console.log("");

testDates.forEach((testDate) => {
  const next = getNext(schedule, testDate);
  const day = next.getDate();
  const dow = next.getDay();
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  console.log(
    `From: ${testDate.toISOString().split("T")[0]} (${
      dowNames[testDate.getDay()]
    })`
  );
  console.log(`Next: ${next.toISOString()}`);
  console.log(`  → ${dowNames[dow]}, Oct ${day}`);

  // Check if correct
  if (day === 6 && dow === 1) {
    console.log("  ✅ CORRECT: 1st Monday (closest)");
  } else if (day === 21 && dow === 2) {
    if (testDate.getDate() > 6) {
      console.log("  ✅ CORRECT: 3rd Tuesday (next after 1st Monday)");
    } else {
      console.log(
        "  ❌ WRONG: Should be Oct 6 (1st Monday), got Oct 21 (3rd Tuesday)"
      );
    }
  } else if (day === 3 && dow === 1) {
    console.log("  ✅ CORRECT: 1st Monday of November (wrapped to next month)");
  } else {
    console.log("  ❓ UNEXPECTED");
  }
  console.log("");
});

// Direct test without date parameter (uses current time)
console.log(
  "=== Testing without explicit date (should use current time) ===\n"
);
const now = new Date();
console.log("Current time:", now.toISOString());

const nextFromNow = getNext(schedule);
console.log("Next from now:", nextFromNow.toISOString());
console.log("  ", nextFromNow.toString());
console.log("");

// Check EOD impact
console.log("=== Checking EOD (E1D) Impact ===\n");
console.log("Schedule has EOD:", schedule.eod ? "Yes" : "No");
if (schedule.eod) {
  console.log(
    "EOD Type:",
    schedule.eod.isSOD ? "Start of Duration" : "End of Duration"
  );
  console.log("EOD Amount:", schedule.eod.amount);
  console.log("EOD Unit:", schedule.eod.unit);
}
console.log("");

// Test the same pattern without EOD
const testObjNoEOD = {
  s: "0",
  m: "0",
  h: "0",
  D: "*",
  M: "*",
  dow: "1#1,2#3",
  Y: "*",
  woy: null,
  eod: null,
};

const scheduleNoEOD = fromObject(testObjNoEOD);
const testDateNoEOD = new Date("2025-10-01T00:00:00Z");

console.log("=== Same Pattern WITHOUT EOD ===\n");
console.log("From:", testDateNoEOD.toISOString());

const nextNoEOD = getNext(scheduleNoEOD, testDateNoEOD);
console.log("Next:", nextNoEOD.toISOString());
console.log("  ", nextNoEOD.toString());

const dayNoEOD = nextNoEOD.getDate();
const dowNoEOD = nextNoEOD.getDay();
const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

if (dayNoEOD === 6 && dowNoEOD === 1) {
  console.log("  ✅ CORRECT: Oct 6 (1st Monday)");
} else if (dayNoEOD === 21 && dowNoEOD === 2) {
  console.log("  ❌ WRONG: Got Oct 21 (3rd Tuesday) instead of Oct 6");
} else {
  console.log(
    `  ❓ UNEXPECTED: day=${dayNoEOD}, dow=${dowNoEOD} (${dowNames[dowNoEOD]})`
  );
}
