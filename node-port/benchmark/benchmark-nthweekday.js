import { Engine, fromObject, getNextN } from "../dist/index.js";

const engine = new Engine();

console.log("=".repeat(70));
console.log("🚀 JCRON nthWeekDay Performance Benchmark");
console.log("=".repeat(70));
console.log();

// Helper function to measure performance
function benchmark(name, fn, iterations = 1000) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const total = end - start;
  const avg = total / iterations;
  const opsPerSec = (1000 / avg).toFixed(0);

  return {
    name,
    iterations,
    total: total.toFixed(2),
    average: avg.toFixed(4),
    opsPerSec,
  };
}

const results = [];

// Benchmark 1: Simple nthWeekDay pattern parsing
console.log("📊 Benchmark 1: Pattern Parsing");
console.log("-".repeat(70));
const result1 = benchmark(
  "Parse single nth pattern (1#2)",
  () => {
    fromObject({
      s: "0",
      m: "0",
      h: "9",
      D: "*",
      M: "*",
      dow: "1#2",
      Y: "*",
    });
  },
  10000
);
results.push(result1);
console.log(`  Iterations: ${result1.iterations}`);
console.log(`  Total time: ${result1.total}ms`);
console.log(`  Average: ${result1.average}ms per operation`);
console.log(`  Throughput: ${result1.opsPerSec} ops/sec`);
console.log();

// Benchmark 2: Multiple nthWeekDay pattern parsing
console.log("📊 Benchmark 2: Multiple Pattern Parsing");
console.log("-".repeat(70));
const result2 = benchmark(
  "Parse multiple nth patterns (1#1,3#2,5#3)",
  () => {
    fromObject({
      s: "0",
      m: "0",
      h: "14",
      D: "*",
      M: "*",
      dow: "1#1,3#2,5#3",
      Y: "*",
    });
  },
  10000
);
results.push(result2);
console.log(`  Iterations: ${result2.iterations}`);
console.log(`  Total time: ${result2.total}ms`);
console.log(`  Average: ${result2.average}ms per operation`);
console.log(`  Throughput: ${result2.opsPerSec} ops/sec`);
console.log();

// Benchmark 3: Next calculation - single pattern
console.log("📊 Benchmark 3: Next Calculation (Single Pattern)");
console.log("-".repeat(70));
const schedule3 = fromObject({
  s: "0",
  m: "0",
  h: "9",
  D: "*",
  M: "*",
  dow: "1#2",
  Y: "*",
});
const fromTime3 = new Date("2024-03-01T00:00:00.000Z");
const result3 = benchmark(
  "Calculate next for 1#2",
  () => {
    engine.next(schedule3, fromTime3);
  },
  5000
);
results.push(result3);
console.log(`  Iterations: ${result3.iterations}`);
console.log(`  Total time: ${result3.total}ms`);
console.log(`  Average: ${result3.average}ms per operation`);
console.log(`  Throughput: ${result3.opsPerSec} ops/sec`);
console.log();

// Benchmark 4: Next calculation - multiple patterns
console.log("📊 Benchmark 4: Next Calculation (Multiple Patterns)");
console.log("-".repeat(70));
const schedule4 = fromObject({
  s: "0",
  m: "0",
  h: "14",
  D: "*",
  M: "*",
  dow: "1#1,3#2,5#3",
  Y: "*",
});
const fromTime4 = new Date("2024-02-01T00:00:00.000Z");
const result4 = benchmark(
  "Calculate next for 1#1,3#2,5#3",
  () => {
    engine.next(schedule4, fromTime4);
  },
  5000
);
results.push(result4);
console.log(`  Iterations: ${result4.iterations}`);
console.log(`  Total time: ${result4.total}ms`);
console.log(`  Average: ${result4.average}ms per operation`);
console.log(`  Throughput: ${result4.opsPerSec} ops/sec`);
console.log();

// Benchmark 5: Prev calculation
console.log("📊 Benchmark 5: Prev Calculation");
console.log("-".repeat(70));
const schedule5 = fromObject({
  s: "0",
  m: "0",
  h: "9",
  D: "*",
  M: "*",
  dow: "1#2,2#4",
  Y: "*",
});
const fromTime5 = new Date("2024-03-15T00:00:00.000Z");
const result5 = benchmark(
  "Calculate prev for 1#2,2#4",
  () => {
    engine.prev(schedule5, fromTime5);
  },
  5000
);
results.push(result5);
console.log(`  Iterations: ${result5.iterations}`);
console.log(`  Total time: ${result5.total}ms`);
console.log(`  Average: ${result5.average}ms per operation`);
console.log(`  Throughput: ${result5.opsPerSec} ops/sec`);
console.log();

// Benchmark 6: getNextN (multiple future occurrences)
console.log("📊 Benchmark 6: Get Next N Occurrences");
console.log("-".repeat(70));
const schedule6 = fromObject({
  s: "0",
  m: "0",
  h: "12",
  D: "*",
  M: "*",
  dow: "1#1,3#2,5#3",
  Y: "*",
});
const fromTime6 = new Date("2024-01-01T00:00:00.000Z");
const result6 = benchmark(
  "Calculate next 10 occurrences",
  () => {
    getNextN(schedule6, 10, fromTime6);
  },
  1000
);
results.push(result6);
console.log(`  Iterations: ${result6.iterations}`);
console.log(`  Total time: ${result6.total}ms`);
console.log(`  Average: ${result6.average}ms per operation`);
console.log(`  Throughput: ${result6.opsPerSec} ops/sec`);
console.log();

// Benchmark 7: isMatch validation
console.log("📊 Benchmark 7: isMatch Validation");
console.log("-".repeat(70));
const schedule7 = fromObject({
  s: "0",
  m: "0",
  h: "9",
  D: "*",
  M: "*",
  dow: "1#2,2#4",
  Y: "*",
});
const testDate7 = new Date("2024-02-12T09:00:00.000Z"); // 2nd Monday
const result7 = benchmark(
  "isMatch validation",
  () => {
    engine.isMatch(schedule7, testDate7);
  },
  10000
);
results.push(result7);
console.log(`  Iterations: ${result7.iterations}`);
console.log(`  Total time: ${result7.total}ms`);
console.log(`  Average: ${result7.average}ms per operation`);
console.log(`  Throughput: ${result7.opsPerSec} ops/sec`);
console.log();

// Benchmark 8: Complex pattern with EOD
console.log("📊 Benchmark 8: Complex Pattern with EOD");
console.log("-".repeat(70));
const schedule8 = fromObject({
  s: "0",
  m: "0",
  h: "0",
  D: "*",
  M: "*",
  dow: "1#1,5#3",
  Y: "*",
  eod: "E1D",
});
const fromTime8 = new Date("2024-01-15T00:00:00.000Z");
const result8 = benchmark(
  "Next with EOD (1#1,5#3 + E1D)",
  () => {
    engine.next(schedule8, fromTime8);
  },
  3000
);
results.push(result8);
console.log(`  Iterations: ${result8.iterations}`);
console.log(`  Total time: ${result8.total}ms`);
console.log(`  Average: ${result8.average}ms per operation`);
console.log(`  Throughput: ${result8.opsPerSec} ops/sec`);
console.log();

// Benchmark 9: Standard cron (for comparison)
console.log("📊 Benchmark 9: Standard Cron (Baseline Comparison)");
console.log("-".repeat(70));
const schedule9 = fromObject({
  s: "0",
  m: "0",
  h: "9",
  D: "*",
  M: "*",
  dow: "1", // Every Monday
  Y: "*",
});
const fromTime9 = new Date("2024-03-01T00:00:00.000Z");
const result9 = benchmark(
  "Standard cron (every Monday)",
  () => {
    engine.next(schedule9, fromTime9);
  },
  5000
);
results.push(result9);
console.log(`  Iterations: ${result9.iterations}`);
console.log(`  Total time: ${result9.total}ms`);
console.log(`  Average: ${result9.average}ms per operation`);
console.log(`  Throughput: ${result9.opsPerSec} ops/sec`);
console.log();

// Summary
console.log("=".repeat(70));
console.log("📈 SUMMARY - Performance Results");
console.log("=".repeat(70));
console.log();

results.forEach((result, index) => {
  console.log(`${index + 1}. ${result.name}`);
  console.log(
    `   ⏱️  Average: ${result.average}ms | Throughput: ${result.opsPerSec} ops/sec`
  );
});

console.log();
console.log("=".repeat(70));
console.log("🎯 Performance Analysis");
console.log("=".repeat(70));

// Find fastest and slowest
const sorted = [...results].sort(
  (a, b) => parseFloat(a.average) - parseFloat(b.average)
);
const fastest = sorted[0];
const slowest = sorted[sorted.length - 1];

console.log(`✨ Fastest: ${fastest.name} (${fastest.average}ms avg)`);
console.log(`🐌 Slowest: ${slowest.name} (${slowest.average}ms avg)`);
console.log();

// Browser performance guidelines
const avgTime =
  results.reduce((sum, r) => sum + parseFloat(r.average), 0) / results.length;
console.log(`📊 Average operation time: ${avgTime.toFixed(4)}ms`);
console.log();

console.log("🌐 Browser Performance Assessment:");
if (avgTime < 1) {
  console.log("   ✅ EXCELLENT - Suitable for real-time UI updates");
} else if (avgTime < 5) {
  console.log("   ✅ GOOD - Suitable for interactive applications");
} else if (avgTime < 10) {
  console.log(
    "   ⚠️  ACCEPTABLE - May cause slight delays in high-frequency scenarios"
  );
} else {
  console.log("   ❌ NEEDS OPTIMIZATION - May impact user experience");
}

console.log();

// Performance tips
console.log("💡 Performance Tips:");
console.log("   • Cache Schedule objects when reusing patterns");
console.log(
  "   • Use getNextN() for bulk calculations instead of multiple next() calls"
);
console.log("   • isMatch() is the fastest operation - use for validation");
console.log(
  "   • Multiple nth patterns have minimal overhead vs single patterns"
);

console.log();
console.log("=".repeat(70));
