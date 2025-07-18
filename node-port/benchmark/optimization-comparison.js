// benchmark/optimization-comparison.js

import * as Benchmark from 'benchmark';
import { Engine } from '../dist/engine.js';
import { fromCronSyntax } from '../dist/schedule.js';

// Build optimized engine first
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log("🔧 Building Optimized Engine...");

try {
  await execAsync('cd /Users/mapletechnologies/go-workspace/src/github.com/meftunca/jcron/node-port && npx tsc src/engine-optimized.ts --outDir dist --module es2022 --target es2022 --moduleResolution node');
  console.log("✅ Optimized engine built successfully!");
  
  const { OptimizedEngine } = await import('../dist/engine-optimized.js');

  console.log("\n⚡ Performance Comparison: Original vs Optimized");
  console.log("=".repeat(60));

  const originalEngine = new Engine();
  const optimizedEngine = new OptimizedEngine();
  const testDate = new Date('2024-01-15T10:30:00Z');

  // Test scenarios
  const scenarios = {
    simple: fromCronSyntax('* * * * * *'),
    everyMinute: fromCronSyntax('0 * * * * *'),
    businessHours: fromCronSyntax('0 */15 9-17 * * 1-5'),
    complex: fromCronSyntax('0 5,15,25,35,45,55 8-17 ? * 1-5'),
    manyValues: fromCronSyntax('0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *'),
    wideRange: fromCronSyntax('* 0-59 0-23 1-31 1-12 0-6'),
  };

  console.log("\n🚀 Core Engine.next() Performance");
  console.log("-".repeat(40));

  const nextSuite = new Benchmark.Suite();

  nextSuite
    .add('Original - Simple Pattern', () => {
      originalEngine.next(scenarios.simple, testDate);
    })
    .add('Optimized - Simple Pattern', () => {
      optimizedEngine.next(scenarios.simple, testDate);
    })
    .add('Original - Business Hours', () => {
      originalEngine.next(scenarios.businessHours, testDate);
    })
    .add('Optimized - Business Hours', () => {
      optimizedEngine.next(scenarios.businessHours, testDate);
    })
    .add('Original - Complex Pattern', () => {
      originalEngine.next(scenarios.complex, testDate);
    })
    .add('Optimized - Complex Pattern', () => {
      optimizedEngine.next(scenarios.complex, testDate);
    })
    .add('Original - Wide Range', () => {
      originalEngine.next(scenarios.wideRange, testDate);
    })
    .add('Optimized - Wide Range', () => {
      optimizedEngine.next(scenarios.wideRange, testDate);
    })
    .on('cycle', (event) => {
      console.log('  ' + String(event.target));
    })
    .on('complete', function () {
      console.log('\n📊 Performance Summary:');
      const results = this.map(test => ({
        name: test.name,
        hz: test.hz,
        rme: test.stats.rme
      }));
      
      // Group by original vs optimized
      const original = results.filter(r => r.name.includes('Original'));
      const optimized = results.filter(r => r.name.includes('Optimized'));
      
      console.log('\n🔍 Improvement Analysis:');
      for (let i = 0; i < original.length; i++) {
        const origOps = original[i].hz;
        const optOps = optimized[i].hz;
        const improvement = ((optOps - origOps) / origOps * 100).toFixed(1);
        const testName = original[i].name.replace('Original - ', '');
        
        console.log(`  ${testName}: ${improvement > 0 ? '+' : ''}${improvement}% improvement`);
        console.log(`    Original: ${origOps.toLocaleString()} ops/sec`);
        console.log(`    Optimized: ${optOps.toLocaleString()} ops/sec`);
        console.log();
      }
    })
    .run({ async: false });

  console.log("\n🎯 isMatch() Performance");
  console.log("-".repeat(40));

  const matchSuite = new Benchmark.Suite();

  matchSuite
    .add('Original - isMatch Simple', () => {
      originalEngine.isMatch(scenarios.simple, testDate);
    })
    .add('Optimized - isMatch Simple', () => {
      optimizedEngine.isMatch(scenarios.simple, testDate);
    })
    .add('Original - isMatch Complex', () => {
      originalEngine.isMatch(scenarios.complex, testDate);
    })
    .add('Optimized - isMatch Complex', () => {
      optimizedEngine.isMatch(scenarios.complex, testDate);
    })
    .on('cycle', (event) => {
      console.log('  ' + String(event.target));
    })
    .on('complete', function () {
      console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
    })
    .run({ async: false });

  console.log("\n💾 Memory Usage Comparison");
  console.log("-".repeat(40));

  const measureMemoryUsage = (name, engine, scenario, iterations = 1000) => {
    if (global.gc) {
      global.gc();
      const memBefore = process.memoryUsage();
      
      for (let i = 0; i < iterations; i++) {
        engine.next(scenario, testDate);
      }
      
      global.gc();
      const memAfter = process.memoryUsage();
      
      const memDiff = (memAfter.heapUsed - memBefore.heapUsed) / 1024; // KB
      console.log(`  ${name}: ${memDiff.toFixed(2)} KB for ${iterations} operations`);
      return memDiff;
    } else {
      console.log(`  ${name}: Memory profiling requires --expose-gc flag`);
      return 0;
    }
  };

  const origMem = measureMemoryUsage('Original Engine', originalEngine, scenarios.businessHours);
  const optMem = measureMemoryUsage('Optimized Engine', optimizedEngine, scenarios.businessHours);
  
  if (origMem > 0 && optMem > 0) {
    const memImprovement = ((origMem - optMem) / origMem * 100).toFixed(1);
    console.log(`\n  💡 Memory improvement: ${memImprovement}%`);
  }

  console.log("\n🏁 Stress Test Comparison");
  console.log("-".repeat(40));

  const stressSuite = new Benchmark.Suite();

  stressSuite
    .add('Original - 1000 operations', () => {
      for (let i = 0; i < 1000; i++) {
        originalEngine.next(scenarios.businessHours, testDate);
      }
    })
    .add('Optimized - 1000 operations', () => {
      for (let i = 0; i < 1000; i++) {
        optimizedEngine.next(scenarios.businessHours, testDate);
      }
    })
    .on('cycle', (event) => {
      console.log('  ' + String(event.target));
    })
    .on('complete', function () {
      const original = this[0];
      const optimized = this[1];
      const improvement = ((optimized.hz - original.hz) / original.hz * 100).toFixed(1);
      
      console.log(`\n  📈 Batch Processing Improvement: ${improvement}%`);
      console.log(`  🚀 Overall Performance Gain: ${(optimized.hz / original.hz).toFixed(2)}x faster`);
    })
    .run({ async: false });

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Optimization Comparison Complete!");
  console.log("=".repeat(60));

} catch (error) {
  console.error("❌ Error building optimized engine:", error.message);
  console.log("\n🔄 Running comparison with original engine only...");
  
  // Fallback to original engine only
  const originalEngine = new Engine();
  const testDate = new Date('2024-01-15T10:30:00Z');
  
  console.log("\n📊 Original Engine Performance");
  console.log("-".repeat(40));
  
  const fallbackSuite = new Benchmark.Suite();
  
  fallbackSuite
    .add('Every Second Pattern', () => {
      originalEngine.next(fromCronSyntax('* * * * * *'), testDate);
    })
    .add('Business Hours Pattern', () => {
      originalEngine.next(fromCronSyntax('0 */15 9-17 * * 1-5'), testDate);
    })
    .add('Complex Pattern', () => {
      originalEngine.next(fromCronSyntax('0 5,15,25,35,45,55 8-17 ? * 1-5'), testDate);
    })
    .on('cycle', (event) => {
      console.log('  ' + String(event.target));
    })
    .on('complete', function () {
      console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
      console.log("\n💡 Note: Install TypeScript and rebuild for optimization comparison");
    })
    .run({ async: false });
}
