const { toHumanize } = require("./dist/index.cjs");

console.log("=== HUMANIZE ADVANCED ANALYSIS ===\n");

const improvements = [
  {
    pattern: "0 0 * * 1-5",
    current: "at midnight, on Monday, Tuesday, Wednesday, Thursday, and Friday",
    ideal: "at midnight on weekdays",
    issue: "Could use 'weekdays' shorthand",
    priority: "HIGH",
  },
  {
    pattern: "0 0 * * 6,0",
    current: "at midnight, on Sunday and Saturday",
    ideal: "at midnight on weekends",
    issue: "Could use 'weekends' shorthand",
    priority: "HIGH",
  },
  {
    pattern: "0 9 1-7 * 1",
    current: "at 9:00 AM, on 1st, 2nd, 3rd, 4th, 5th, 6th, and 7th, on Monday",
    ideal: "at 9:00 AM on the first Monday of the month",
    issue: "Day range 1-7 + Monday = first Monday, should detect this",
    priority: "MEDIUM",
  },
  {
    pattern: "*/5 9-17 * * 1-5",
    current: "at 9:00 AM, 9:05 AM, ... every 5 minutes",
    ideal: "every 5 minutes from 9 AM to 5 PM on weekdays",
    issue: "Could combine weekdays shorthand",
    priority: "MEDIUM",
  },
  {
    pattern: "0 0 9 * * * * E1D",
    current: "at 9:00 AM, every day, end of duration end of current day",
    ideal: "at 9:00 AM daily, until end of day",
    issue: "EOD description is redundant/unclear",
    priority: "LOW",
  },
];

console.log("🎯 POTENTIAL IMPROVEMENTS:\n");

improvements.forEach(({ pattern, current, ideal, issue, priority }, i) => {
  console.log(`${i + 1}. [${priority}] ${issue}`);
  console.log(`   Pattern: ${pattern}`);

  try {
    const actual = toHumanize(pattern);
    console.log(`   Current: ${actual}`);
  } catch (e) {
    console.log(`   Current: ${current}`);
  }

  console.log(`   Ideal:   ${ideal}`);
  console.log("");
});

console.log("\n=== NATURAL LANGUAGE QUALITY ===\n");

const naturalTests = [
  { pattern: "0 9 * * *", ideal: "Daily at 9 AM" },
  { pattern: "0 0 * * 0", ideal: "Weekly on Sunday" },
  { pattern: "0 0 1 * *", ideal: "Monthly on the 1st" },
  { pattern: "0 0 1 1 *", ideal: "Yearly on January 1st" },
  { pattern: "*/15 * * * *", ideal: "Every 15 minutes" },
  { pattern: "0 */2 * * *", ideal: "Every 2 hours" },
  { pattern: "* * * * *", ideal: "Every minute" },
];

let naturalScore = 0;
naturalTests.forEach(({ pattern, ideal }) => {
  try {
    const actual = toHumanize(pattern).toLowerCase();
    const idealLower = ideal.toLowerCase();

    // Check if output contains key phrases from ideal
    const keyPhrases =
      idealLower.match(/daily|weekly|monthly|yearly|every \d+/g) || [];
    const hasKeyPhrases = keyPhrases.some((phrase) => actual.includes(phrase));

    const similar =
      actual.includes("every day") ||
      actual.includes("daily") ||
      actual.includes("every week") ||
      actual.includes("weekly") ||
      actual.includes("every month") ||
      actual.includes("monthly") ||
      hasKeyPhrases;

    if (similar) naturalScore++;

    const status = similar ? "✅" : "⚠️";
    console.log(`${status} ${pattern.padEnd(20)} → ${toHumanize(pattern)}`);
    console.log(`   Expected: ${ideal}`);
    console.log("");
  } catch (e) {
    console.log(`❌ ${pattern.padEnd(20)} → ERROR`);
  }
});

console.log(
  `\nNatural Language Score: ${naturalScore}/${
    naturalTests.length
  } (${Math.round((naturalScore / naturalTests.length) * 100)}%)\n`
);

console.log("=== RECOMMENDATION ===\n");

if (naturalScore >= naturalTests.length * 0.9) {
  console.log("✅ Humanizer is EXCELLENT - minor improvements only");
} else if (naturalScore >= naturalTests.length * 0.7) {
  console.log("⚠️ Humanizer is GOOD - some improvements would help");
} else {
  console.log("❌ Humanizer needs SIGNIFICANT improvements");
}
