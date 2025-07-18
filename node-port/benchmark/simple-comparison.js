// benchmark/simple-comparison.js

import Benchmark from 'benchmark';
import { Engine } from '../dist/engine.js';
import { OptimizedEngine } from '../dist/engine-optimized.js';
import { fromCronSyntax } from '../dist/schedule.js';

console.log("⚡ JCRON Performance Comparison: Original vs Optimized");
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
};

console.log("\n🚀 Engine.next() Performance Comparison");
console.log("-".repeat(50));

// Original engine tests
console.log("\n📊 Original Engine Results:");
console.log("-".repeat(30));

const originalSuite = new Benchmark.Suite();

originalSuite
  .add('Original - Simple (* * * * * *)', () => {
    originalEngine.next(scenarios.simple, testDate);
  })
  .add('Original - Every Minute', () => {
    originalEngine.next(scenarios.everyMinute, testDate);
  })
  .add('Original - Business Hours', () => {
    originalEngine.next(scenarios.businessHours, testDate);
  })
  .add('Original - Complex Pattern', () => {
    originalEngine.next(scenarios.complex, testDate);
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('\n🏆 Fastest Original: ' + this.filter('fastest').map('name'));
    
    // Now run optimized tests
    console.log("\n⚡ Optimized Engine Results:");
    console.log("-".repeat(30));
    
    const optimizedSuite = new Benchmark.Suite();
    
    optimizedSuite
      .add('Optimized - Simple (* * * * * *)', () => {
        optimizedEngine.next(scenarios.simple, testDate);
      })
      .add('Optimized - Every Minute', () => {
        optimizedEngine.next(scenarios.everyMinute, testDate);
      })
      .add('Optimized - Business Hours', () => {
        optimizedEngine.next(scenarios.businessHours, testDate);
      })
      .add('Optimized - Complex Pattern', () => {
        optimizedEngine.next(scenarios.complex, testDate);
      })
      .on('cycle', (event) => {
        console.log('  ' + String(event.target));
      })
      .on('complete', function () {
        console.log('\n🏆 Fastest Optimized: ' + this.filter('fastest').map('name'));
        
        // Performance comparison
        console.log("\n📈 Performance Improvements:");
        console.log("-".repeat(40));
        
        // Compare simple patterns
        console.log("Simple Pattern Comparison:");
        console.log(`  Original:  ${originalSuite[0].hz.toLocaleString()} ops/sec`);
        console.log(`  Optimized: ${optimizedSuite[0].hz.toLocaleString()} ops/sec`);
        const simpleImprovement = ((optimizedSuite[0].hz - originalSuite[0].hz) / originalSuite[0].hz * 100).toFixed(1);
        console.log(`  Improvement: ${simpleImprovement}%\n`);
        
        // Compare business hours
        console.log("Business Hours Comparison:");
        console.log(`  Original:  ${originalSuite[2].hz.toLocaleString()} ops/sec`);
        console.log(`  Optimized: ${optimizedSuite[2].hz.toLocaleString()} ops/sec`);
        const businessImprovement = ((optimizedSuite[2].hz - originalSuite[2].hz) / originalSuite[2].hz * 100).toFixed(1);
        console.log(`  Improvement: ${businessImprovement}%\n`);
        
        // Compare complex patterns
        console.log("Complex Pattern Comparison:");
        console.log(`  Original:  ${originalSuite[3].hz.toLocaleString()} ops/sec`);
        console.log(`  Optimized: ${optimizedSuite[3].hz.toLocaleString()} ops/sec`);
        const complexImprovement = ((optimizedSuite[3].hz - originalSuite[3].hz) / originalSuite[3].hz * 100).toFixed(1);
        console.log(`  Improvement: ${complexImprovement}%\n`);
        
        console.log("=".repeat(60));
        console.log("🎉 Performance Comparison Complete!");
        console.log("=".repeat(60));
      })
      .run({ async: false });
  })
  .run({ async: false });
