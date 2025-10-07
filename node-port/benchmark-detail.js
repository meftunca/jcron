#!/usr/bin/env bun
/**
 * 🔬 DETAYLI BOTTLENECK ANALİZİ
 * Her operation için micro-benchmark ve profiling
 */

import { fromJCronString, parseEoD } from "./dist/index.js";

const ITERATIONS = 100000;

console.log("\n🔬 DETAYLI BOTTLENECK ANALİZİ");
console.log("=".repeat(60));

// Test patterns
const patterns = {
  simple: "0 0 12 * * * *",
  nthWeekday: "0 0 12 * * 1#2 *",
  multipleNth: "0 0 12 * * 1#2,3#4 *",
  withEod: "0 0 12 * * 1#1 * E1D",
  complex: "0 0 12 * * 1#2 * TZ:America/New_York E1W",
  utc: "0 0 12 * * * * TZ:UTC",
  nonUtc: "0 0 12 * * * * TZ:Europe/Istanbul",
};

const eodPatterns = ["E1D", "E1W", "E1M", "S0D", "S0W", "S1Y"];

// Helper functions
function measure(name, fn, iterations = ITERATIONS) {
  // Warm up
  for (let i = 0; i < 100; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();

  const totalMs = end - start;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);
  const avgMs = totalMs / iterations;
  const avgUs = (avgMs * 1000).toFixed(3);

  return { name, opsPerSec, avgMs, avgUs, totalMs };
}

function formatOps(ops) {
  if (ops >= 1_000_000) return `${(ops / 1_000_000).toFixed(2)}M`;
  if (ops >= 1_000) return `${(ops / 1_000).toFixed(0)}K`;
  return ops.toString();
}

const results = [];

console.log("\n📊 1. PARSING OPERATIONS");
console.log("-".repeat(60));

for (const [name, pattern] of Object.entries(patterns)) {
  const result = measure(
    `Parse ${name}`,
    () => fromJCronString(pattern),
    ITERATIONS
  );
  results.push({ ...result, category: "Parsing" });
  console.log(
    `  ${name.padEnd(20)} ${formatOps(result.opsPerSec).padStart(
      8
    )} ops/sec  (${result.avgUs}µs)`
  );
}

console.log("\n📊 2. EOD PARSING");
console.log("-".repeat(60));

for (const eod of eodPatterns) {
  const result = measure(`Parse ${eod}`, () => parseEoD(eod), ITERATIONS);
  results.push({ ...result, category: "EOD" });
  console.log(
    `  ${eod.padEnd(20)} ${formatOps(result.opsPerSec).padStart(8)} ops/sec  (${
      result.avgUs
    }µs)`
  );
}

console.log("\n📊 3. NEXT CALCULATIONS (Different Patterns)");
console.log("-".repeat(60));

const now = new Date("2024-08-14T10:00:00.000Z");
const schedules = {};

for (const [name, pattern] of Object.entries(patterns)) {
  schedules[name] = fromJCronString(pattern);
}

// Import engine
const { Engine } = await import("./dist/engine.js");
const engine = new Engine();

for (const [name, schedule] of Object.entries(schedules)) {
  const result = measure(
    `Next ${name}`,
    () => engine.next(schedule, now),
    10000 // Daha az iteration (next daha expensive)
  );
  results.push({ ...result, category: "Next" });
  console.log(
    `  ${name.padEnd(20)} ${formatOps(result.opsPerSec).padStart(
      8
    )} ops/sec  (${result.avgUs}µs)`
  );
}

console.log("\n📊 4. PREV CALCULATIONS");
console.log("-".repeat(60));

for (const [name, schedule] of Object.entries(schedules)) {
  const result = measure(
    `Prev ${name}`,
    () => engine.prev(schedule, now),
    10000
  );
  results.push({ ...result, category: "Prev" });
  console.log(
    `  ${name.padEnd(20)} ${formatOps(result.opsPerSec).padStart(
      8
    )} ops/sec  (${result.avgUs}µs)`
  );
}

console.log("\n📊 5. ISMATCH OPERATIONS");
console.log("-".repeat(60));

const matchDate = new Date("2024-08-12T12:00:00.000Z"); // Second Monday

for (const [name, schedule] of Object.entries(schedules)) {
  const result = measure(
    `isMatch ${name}`,
    () => engine.isMatch(schedule, matchDate),
    ITERATIONS
  );
  results.push({ ...result, category: "isMatch" });
  console.log(
    `  ${name.padEnd(20)} ${formatOps(result.opsPerSec).padStart(
      8
    )} ops/sec  (${result.avgUs}µs)`
  );
}

console.log("\n📊 6. TIMEZONE IMPACT ANALYSIS");
console.log("-".repeat(60));

const tzPatterns = [
  ["UTC", "0 0 12 * * * * TZ:UTC"],
  ["America/New_York", "0 0 12 * * * * TZ:America/New_York"],
  ["Europe/Istanbul", "0 0 12 * * * * TZ:Europe/Istanbul"],
  ["Asia/Tokyo", "0 0 12 * * * * TZ:Asia/Tokyo"],
];

for (const [tz, pattern] of tzPatterns) {
  const schedule = fromJCronString(pattern);
  const result = measure(
    `Next (${tz})`,
    () => engine.next(schedule, now),
    10000
  );
  results.push({ ...result, category: "Timezone" });
  console.log(
    `  ${tz.padEnd(20)} ${formatOps(result.opsPerSec).padStart(8)} ops/sec  (${
      result.avgUs
    }µs)`
  );
}

console.log("\n🎯 BOTTLENECK SUMMARY");
console.log("=".repeat(60));

// Categorize results
const byCategory = {};
for (const result of results) {
  if (!byCategory[result.category]) {
    byCategory[result.category] = [];
  }
  byCategory[result.category].push(result);
}

// Find slowest in each category
console.log("\n🔴 EN YAVAŞ OPERASYONLAR (Her Kategoride):");
for (const [category, items] of Object.entries(byCategory)) {
  const sorted = items.sort((a, b) => a.opsPerSec - b.opsPerSec);
  const slowest = sorted[0];
  const fastest = sorted[sorted.length - 1];

  console.log(`\n📂 ${category}`);
  console.log(`  En yavaş: ${slowest.name}`);
  console.log(
    `    → ${formatOps(slowest.opsPerSec)} ops/sec (${slowest.avgUs}µs)`
  );
  console.log(`  En hızlı:  ${fastest.name}`);
  console.log(
    `    → ${formatOps(fastest.opsPerSec)} ops/sec (${fastest.avgUs}µs)`
  );
  console.log(`  Fark: ${(fastest.opsPerSec / slowest.opsPerSec).toFixed(2)}x`);
}

// Timezone overhead analysis
console.log("\n\n🌍 TIMEZONE OVERHEAD ANALİZİ:");
const tzResults = results.filter((r) => r.category === "Timezone");
const utcResult = tzResults.find((r) => r.name.includes("UTC"));

if (utcResult) {
  console.log(`\n  UTC Baseline: ${formatOps(utcResult.opsPerSec)} ops/sec`);

  for (const result of tzResults) {
    if (result === utcResult) continue;

    const overhead = (
      ((utcResult.opsPerSec - result.opsPerSec) / utcResult.opsPerSec) *
      100
    ).toFixed(1);
    const slowdown = (utcResult.opsPerSec / result.opsPerSec).toFixed(2);

    console.log(`  ${result.name}`);
    console.log(
      `    → ${formatOps(
        result.opsPerSec
      )} ops/sec (-${overhead}% overhead, ${slowdown}x yavaş)`
    );
  }
}

// Overall statistics
console.log("\n\n📈 GENEL İSTATİSTİKLER:");
const allOps = results.map((r) => r.opsPerSec);
const avgOps = allOps.reduce((a, b) => a + b, 0) / allOps.length;
const minOps = Math.min(...allOps);
const maxOps = Math.max(...allOps);

console.log(`  Ortalama: ${formatOps(Math.round(avgOps))} ops/sec`);
console.log(`  En yavaş: ${formatOps(minOps)} ops/sec`);
console.log(`  En hızlı:  ${formatOps(maxOps)} ops/sec`);
console.log(`  Varyans:   ${(maxOps / minOps).toFixed(0)}x`);

console.log("\n✅ Analiz tamamlandı!\n");
