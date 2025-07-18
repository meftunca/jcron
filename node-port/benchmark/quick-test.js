// benchmark/quick-test.js

import { Engine } from '../dist/engine.js';
import { OptimizedEngine } from '../dist/engine-optimized.js';
import { fromCronSyntax } from '../dist/schedule.js';

console.log("🚀 Quick Performance Test: Original vs Optimized");
console.log("=".repeat(50));

const originalEngine = new Engine();
const optimizedEngine = new OptimizedEngine();
const testDate = new Date('2024-01-15T10:30:00Z');

const scenarios = [
  { name: 'Simple (* * * * * *)', schedule: fromCronSyntax('* * * * * *') },
  { name: 'Business Hours', schedule: fromCronSyntax('0 */15 9-17 * * 1-5') },
  { name: 'Complex Pattern', schedule: fromCronSyntax('0 5,15,25,35,45,55 8-17 ? * 1-5') },
];

for (const scenario of scenarios) {
  console.log(`\n📊 Testing: ${scenario.name}`);
  console.log("-".repeat(30));
  
  // Original engine test
  const originalStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    originalEngine.next(scenario.schedule, testDate);
  }
  const originalEnd = performance.now();
  const originalTime = originalEnd - originalStart;
  const originalOps = Math.round(10000 / (originalTime / 1000));
  
  // Optimized engine test
  const optimizedStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    optimizedEngine.next(scenario.schedule, testDate);
  }
  const optimizedEnd = performance.now();
  const optimizedTime = optimizedEnd - optimizedStart;
  const optimizedOps = Math.round(10000 / (optimizedTime / 1000));
  
  // Results
  console.log(`Original:  ${originalOps.toLocaleString()} ops/sec (${originalTime.toFixed(2)}ms)`);
  console.log(`Optimized: ${optimizedOps.toLocaleString()} ops/sec (${optimizedTime.toFixed(2)}ms)`);
  
  const improvement = ((optimizedOps - originalOps) / originalOps * 100).toFixed(1);
  const speedup = (optimizedOps / originalOps).toFixed(2);
  
  console.log(`📈 Improvement: ${improvement}% (${speedup}x faster)`);
}

console.log("\n🎯 Cache Performance Test");
console.log("-".repeat(30));

const businessSchedule = fromCronSyntax('0 */15 9-17 * * 1-5');

// Test cache miss (new schedule each time)
const cacheMissStart = performance.now();
for (let i = 0; i < 1000; i++) {
  const newSchedule = fromCronSyntax('0 */15 9-17 * * 1-5');
  originalEngine.next(newSchedule, testDate);
}
const cacheMissEnd = performance.now();
const cacheMissTime = cacheMissEnd - cacheMissStart;

// Test cache hit (reuse same schedule)
const cacheHitStart = performance.now();
for (let i = 0; i < 1000; i++) {
  originalEngine.next(businessSchedule, testDate);
}
const cacheHitEnd = performance.now();
const cacheHitTime = cacheHitEnd - cacheHitStart;

console.log(`Cache Miss: ${cacheMissTime.toFixed(2)}ms`);
console.log(`Cache Hit:  ${cacheHitTime.toFixed(2)}ms`);
console.log(`Cache Benefit: ${((cacheMissTime - cacheHitTime) / cacheMissTime * 100).toFixed(1)}% faster`);

console.log("\n💾 Memory Test (if available)");
console.log("-".repeat(30));

if (global.gc) {
  global.gc();
  const memBefore = process.memoryUsage();
  
  // Stress test
  for (let i = 0; i < 5000; i++) {
    optimizedEngine.next(businessSchedule, testDate);
  }
  
  global.gc();
  const memAfter = process.memoryUsage();
  
  const memUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024; // KB
  console.log(`Memory used: ${memUsed.toFixed(2)} KB for 5000 operations`);
  console.log(`Per operation: ${(memUsed / 5000).toFixed(4)} KB`);
} else {
  console.log("Memory profiling requires --expose-gc flag");
}

console.log("\n" + "=".repeat(50));
console.log("🎉 Quick Performance Test Complete!");
console.log("=".repeat(50));
