const { toHumanize } = require("./dist/index.cjs");

console.log("=== HUMANIZE QUALITY ANALYSIS ===\n");

const testCases = [
  {
    pattern: "0 9 * * *",
    expected: "Daily at 9 AM",
    category: "Simple Daily",
  },
  {
    pattern: "*/5 * * * *",
    expected: "Every 5 minutes",
    category: "Simple Interval",
  },
  {
    pattern: "0 0 * * 0",
    expected: "Weekly on Sunday at midnight",
    category: "Weekly",
  },
  {
    pattern: "0 0 1 * *",
    expected: "Monthly on the 1st at midnight",
    category: "Monthly",
  },
  {
    pattern: "0 9-17 * * 1-5",
    expected: "Hourly from 9 AM to 5 PM, Monday through Friday",
    category: "Business Hours",
  },
  {
    pattern: "*/15 9-17 * * 1-5",
    expected: "Every 15 minutes from 9 AM to 5 PM, Monday through Friday",
    category: "Business Hours Interval",
  },
  {
    pattern: "0 0 * * 1#2",
    expected: "Second Monday of the month at midnight",
    category: "nthWeekDay",
  },
  {
    pattern: "0 0 * * 1#1,5#3",
    expected: "First Monday and third Friday of the month at midnight",
    category: "Multiple nthWeekDay",
  },
  {
    pattern: "0 0 1 1 *",
    expected: "Yearly on January 1st at midnight",
    category: "Yearly",
  },
  {
    pattern: "30 14 15 * *",
    expected: "Monthly on the 15th at 2:30 PM",
    category: "Specific Time",
  },
  {
    pattern: "0 */2 * * *",
    expected: "Every 2 hours",
    category: "Hour Interval",
  },
  {
    pattern: "*/10 * * * * *",
    expected: "Every 10 seconds",
    category: "Second Interval",
  },
  {
    pattern: "0 0 * * 1-5",
    expected: "Weekdays at midnight",
    category: "Weekdays",
  },
  {
    pattern: "0 0 * * 6,0",
    expected: "Weekends at midnight",
    category: "Weekends",
  },
  {
    pattern: "0 12 * * *",
    expected: "Daily at noon",
    category: "Noon",
  },
  {
    pattern: "0 0 * * *",
    expected: "Daily at midnight",
    category: "Midnight",
  },
  {
    pattern: "0 * * * *",
    expected: "Every hour",
    category: "Hourly",
  },
  {
    pattern: "* * * * *",
    expected: "Every minute",
    category: "Every Minute",
  },
];

let issues = [];

testCases.forEach(({ pattern, expected, category }) => {
  try {
    const result = toHumanize(pattern);

    // Check for quality issues
    const problems = [];

    // 1. Too verbose (listing all hours/minutes)
    if (result.length > 150) {
      problems.push("TOO_VERBOSE");
    }

    // 2. Redundant information
    if (
      result.includes("every") &&
      result.includes("minutes") &&
      /\d+:\d+/.test(result)
    ) {
      if ((result.match(/\d+:\d+/g) || []).length > 5) {
        problems.push("REDUNDANT_TIME_LIST");
      }
    }

    // 3. Confusing midnight/noon representation
    if (pattern === "0 12 * * *" && !result.toLowerCase().includes("noon")) {
      problems.push("SHOULD_USE_NOON");
    }
    if (pattern === "0 0 * * *" && !result.toLowerCase().includes("midnight")) {
      problems.push("SHOULD_USE_MIDNIGHT");
    }

    // 4. Missing context
    if (
      pattern.includes("#") &&
      !result.toLowerCase().includes("of the month")
    ) {
      problems.push("MISSING_CONTEXT");
    }

    const status = problems.length > 0 ? "⚠️" : "✅";
    console.log(`${status} [${category}]`);
    console.log(`   Pattern:  ${pattern}`);
    console.log(`   Current:  ${result}`);
    if (expected) console.log(`   Expected: ${expected}`);
    if (problems.length > 0) {
      console.log(`   Issues:   ${problems.join(", ")}`);
      issues.push({ pattern, category, problems, result });
    }
    console.log("");
  } catch (err) {
    console.log(`❌ [${category}]`);
    console.log(`   Pattern: ${pattern}`);
    console.log(`   Error:   ${err.message}`);
    console.log("");
    issues.push({
      pattern,
      category,
      problems: ["ERROR"],
      result: err.message,
    });
  }
});

console.log("\n=== SUMMARY ===\n");
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${testCases.length - issues.length}`);
console.log(`Issues: ${issues.length}`);

if (issues.length > 0) {
  console.log("\n=== ISSUES BREAKDOWN ===\n");
  const issueTypes = {};
  issues.forEach(({ problems }) => {
    problems.forEach((problem) => {
      issueTypes[problem] = (issueTypes[problem] || 0) + 1;
    });
  });

  Object.entries(issueTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`${type}: ${count} cases`);
    });
}
