// benchmark/performance-analysis.js

import * as Benchmark from 'benchmark';
import { Engine } from '../dist/engine.js';
import { fromCronSyntax } from '../dist/schedule.js';

console.log("🔍 Performance Analysis ve Optimizasyon Fırsatları");
console.log("=".repeat(55));

const engine = new Engine();
const testDate = new Date('2024-01-15T10:30:00Z');

// Test farklı senaryolar
const scenarios = {
  everySecond: fromCronSyntax('* * * * * *'),
  everyMinute: fromCronSyntax('0 * * * * *'),
  businessHours: fromCronSyntax('0 */15 9-17 * * 1-5'),
  complex: fromCronSyntax('0 5,15,25,35,45,55 8-17 ? * 1-5'),
  wideRange: fromCronSyntax('* 0-59 0-23 1-31 1-12 0-6'),
};

console.log("\n📊 Baseline Performance Measurements");
console.log("-".repeat(40));

// Memory usage tracking
const measureMemory = (name, fn) => {
  if (global.gc) {
    global.gc();
    const memBefore = process.memoryUsage();
    
    const start = performance.now();
    fn();
    const end = performance.now();
    
    global.gc();
    const memAfter = process.memoryUsage();
    
    console.log(`${name}:`);
    console.log(`  Time: ${(end - start).toFixed(3)}ms`);
    console.log(`  Memory: ${((memAfter.heapUsed - memBefore.heapUsed) / 1024).toFixed(2)}KB`);
    console.log();
  } else {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(3)}ms`);
  }
};

// Test cache effectiveness
measureMemory("Cache Miss (New Schedule)", () => {
  for (let i = 0; i < 1000; i++) {
    const schedule = fromCronSyntax('0 */15 9-17 * * 1-5');
    engine.next(schedule, testDate);
  }
});

measureMemory("Cache Hit (Reused Schedule)", () => {
  const schedule = scenarios.businessHours;
  for (let i = 0; i < 1000; i++) {
    engine.next(schedule, testDate);
  }
});

// Test different complexity levels
measureMemory("Simple Pattern (Every Second)", () => {
  for (let i = 0; i < 1000; i++) {
    engine.next(scenarios.everySecond, testDate);
  }
});

measureMemory("Complex Pattern (Business Hours)", () => {
  for (let i = 0; i < 1000; i++) {
    engine.next(scenarios.businessHours, testDate);
  }
});

measureMemory("Wide Range Pattern", () => {
  for (let i = 0; i < 1000; i++) {
    engine.next(scenarios.wideRange, testDate);
  }
});

console.log("\n🎯 Identified Performance Bottlenecks:");
console.log("-".repeat(40));
console.log("1. 🐌 Date-fns operations in hot path");
console.log("2. 🐌 Timezone conversions for every calculation");
console.log("3. 🐌 Array.includes() calls in tight loops");
console.log("4. 🐌 Repeated object creation");
console.log("5. 🐌 String parsing in schedule expansion");
console.log("6. 🐌 Lack of fast-path optimizations");

console.log("\n💡 Optimization Strategies:");
console.log("-".repeat(40));
console.log("1. ⚡ Pre-compute and cache expanded schedules");
console.log("2. ⚡ Use Set instead of Array for faster lookups");
console.log("3. ⚡ Minimize date-fns calls");
console.log("4. ⚡ Fast-path for common patterns");
console.log("5. ⚡ Object pooling for temporary objects");
console.log("6. ⚡ Lazy timezone conversion");
console.log("7. ⚡ Binary search for sorted arrays");

// Profiling different lookup methods
console.log("\n🔬 Lookup Method Comparison:");
console.log("-".repeat(40));

const testArray = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const testSet = new Set(testArray);
const testMap = new Map(testArray.map(v => [v, true]));

const lookupSuite = new Benchmark.Suite();

lookupSuite
  .add('Array.includes() lookup', () => {
    testArray.includes(30);
  })
  .add('Set.has() lookup', () => {
    testSet.has(30);
  })
  .add('Map.has() lookup', () => {
    testMap.has(30);
  })
  .add('Array indexOf != -1', () => {
    testArray.indexOf(30) !== -1;
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  })
  .run({ async: false });

console.log("\n=".repeat(55));
console.log("📋 Analysis Complete - Ready for Optimization!");
console.log("=".repeat(55));
