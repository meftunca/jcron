// benchmark/bottleneck-focused.js
// Darboğazlara odaklanan optimize benchmark testleri
// Bu test sadece en kritik performans sorunlarına odaklanır

const Benchmark = require('benchmark');
const fs = require('fs');

console.log('🔥 DARBOĞAZ ODAKLI BENCHMARK TESTLERI');
console.log('=====================================');
console.log('Bu testler sadece en kritik performans sorunlarına odaklanır\n');

// Original modules
let originalParseEoD, originalIsValid, originalHumanize;
let parseEoDOptimized, isValidOptimized, humanizeOptimized;

try {
  const eodModule = require('../dist/eod');
  originalParseEoD = eodModule.parseEoD;
} catch(e) {
  console.log('⚠️  Original EoD module not found:', e.message);
}

try {
  const indexModule = require('../dist/index');
  originalIsValid = indexModule.isValid;
  originalHumanize = indexModule.fromSchedule;
} catch(e) {
  console.log('⚠️  Original index module not found:', e.message);
}

// Optimized modules  
try {
  const validationOptModule = require('../dist/validation-optimized');
  isValidOptimized = validationOptModule.isValidOptimized;
} catch(e) {
  console.log('⚠️  Optimized validation module not found:', e.message);
}

try {
  const humanizeOptModule = require('../dist/humanize-optimized');
  humanizeOptimized = humanizeOptModule.humanizeOptimized;
} catch(e) {
  console.log('⚠️  Optimized humanize module not found:', e.message);
}

try {
  const eodOptModule = require('../dist/eod-optimized');
  parseEoDOptimized = eodOptModule.parseEoDOptimized;
} catch(e) {
  console.log('⚠️  Optimized EoD module not found:', e.message);
}

// Test data for bottlenecks
const complexEoDExpressions = [
  "E1DT12H30M Q",
  "E2Y6M Q", 
  "E1WT4DT6H M",
  "S30m",
  "E1h",
  "E3DT12H45M30S Y"
];

const validationExpressions = [
  "0 0 12 * * ?",
  "0 15 10 ? * MON-FRI",
  "0 0/5 14 * * ?",
  "0 15 10 ? * 6L 2002-2005",
  "invalid cron expression",
  "* * * * * * * WOY:invalid",
  ""
];

const humanizeExpressions = [
  "0 0 9 * * MON",
  "0 30 14 15 * ?", 
  "0 0 8 ? * MON-FRI",
  "0 0 0 1 1 ? *"
];

const results = [];
let currentCategory = '';

function addResult(name, originalOps, optimizedOps, improvement) {
  results.push({
    category: currentCategory,
    test: name,
    original: originalOps,
    optimized: optimizedOps,
    improvement: improvement,
    speedup: optimizedOps / originalOps
  });
}

// 1. COMPLEX EOD PARSING - Yüksek VARYANS SORUNU
currentCategory = 'EoD Parsing';
console.log('\n📊 1. COMPLEX EOD PARSING (Yüksek Varyans Sorunu)');
console.log('=============================================');

const originalEodSuite = new Benchmark.Suite('Original EoD');
const optimizedEodSuite = new Benchmark.Suite('Optimized EoD');

if (originalParseEoD) {
  originalEodSuite.add('Original: Complex EoD parsing', function() {
    complexEoDExpressions.forEach(expr => {
      try {
        originalParseEoD(expr);
      } catch {}
    });
  });
}

if (parseEoDOptimized) {
  optimizedEodSuite.add('Optimized: Complex EoD parsing', function() {
    complexEoDExpressions.forEach(expr => {
      try {
        parseEoDOptimized(expr);
      } catch {}
    });
  });
}

let originalEodOps = 0;
let optimizedEodOps = 0;

originalEodSuite
  .on('complete', function() {
    if (this[0]) {
      originalEodOps = Math.round(this[0].hz);
      console.log(`Original EoD:  ${originalEodOps.toLocaleString()} ops/sec`);
    }
  });

optimizedEodSuite
  .on('complete', function() {
    if (this[0]) {
      optimizedEodOps = Math.round(this[0].hz);
      console.log(`Optimized EoD: ${optimizedEodOps.toLocaleString()} ops/sec`);
      
      if (originalEodOps > 0) {
        const improvement = ((optimizedEodOps - originalEodOps) / originalEodOps * 100);
        console.log(`🚀 Improvement: ${improvement.toFixed(1)}% (${(optimizedEodOps/originalEodOps).toFixed(1)}x faster)`);
        addResult('Complex EoD parsing', originalEodOps, optimizedEodOps, improvement);
      }
    }
  });

// 2. VALIDATION BOTTLENECKS
currentCategory = 'Validation';
console.log('\n📊 2. VALIDATION OPERATIONS');
console.log('=============================');

const originalValidationSuite = new Benchmark.Suite('Original Validation');
const optimizedValidationSuite = new Benchmark.Suite('Optimized Validation');

if (originalIsValid) {
  originalValidationSuite.add('Original: Batch validation', function() {
    validationExpressions.forEach(expr => {
      try {
        originalIsValid(expr);
      } catch {}
    });
  });
}

if (isValidOptimized) {
  optimizedValidationSuite.add('Optimized: Batch validation', function() {
    validationExpressions.forEach(expr => {
      try {
        isValidOptimized(expr);
      } catch {}
    });
  });
}

let originalValidationOps = 0;
let optimizedValidationOps = 0;

originalValidationSuite
  .on('complete', function() {
    if (this[0]) {
      originalValidationOps = Math.round(this[0].hz);
      console.log(`Original Validation:  ${originalValidationOps.toLocaleString()} ops/sec`);
    }
  });

optimizedValidationSuite
  .on('complete', function() {
    if (this[0]) {
      optimizedValidationOps = Math.round(this[0].hz);
      console.log(`Optimized Validation: ${optimizedValidationOps.toLocaleString()} ops/sec`);
      
      if (originalValidationOps > 0) {
        const improvement = ((optimizedValidationOps - originalValidationOps) / originalValidationOps * 100);
        console.log(`🚀 Improvement: ${improvement.toFixed(1)}% (${(optimizedValidationOps/originalValidationOps).toFixed(1)}x faster)`);
        addResult('Batch validation', originalValidationOps, optimizedValidationOps, improvement);
      }
    }
  });

// 3. HUMANIZATION PERFORMANCE
currentCategory = 'Humanization';
console.log('\n📊 3. HUMANIZATION OPERATIONS');
console.log('===============================');

// Create simple schedule objects for humanization
const humanizeTestData = humanizeExpressions.map(expr => {
  // Create mock schedule objects
  const parts = expr.split(' ');
  if (parts.length >= 6) {
    return {
      s: parts[0] || '*',
      m: parts[1] || '*',
      h: parts[2] || '*',
      D: parts[3] || '*',
      M: parts[4] || '*',
      dow: parts[5] || '*'
    };
  }
  return null;
}).filter(s => s);

const originalHumanizeSuite = new Benchmark.Suite('Original Humanize');
const optimizedHumanizeSuite = new Benchmark.Suite('Optimized Humanize');

if (originalHumanize && humanizeTestData.length > 0) {
  originalHumanizeSuite.add('Original: Batch humanization', function() {
    humanizeTestData.forEach(schedule => {
      try {
        originalHumanize(schedule);
      } catch {}
    });
  });
}

if (humanizeOptimized && humanizeTestData.length > 0) {
  optimizedHumanizeSuite.add('Optimized: Batch humanization', function() {
    humanizeTestData.forEach(schedule => {
      try {
        humanizeOptimized(schedule);
      } catch {}
    });
  });
}

let originalHumanizeOps = 0;
let optimizedHumanizeOps = 0;

originalHumanizeSuite
  .on('complete', function() {
    if (this[0]) {
      originalHumanizeOps = Math.round(this[0].hz);
      console.log(`Original Humanize:  ${originalHumanizeOps.toLocaleString()} ops/sec`);
    }
  });

optimizedHumanizeSuite
  .on('complete', function() {
    if (this[0]) {
      optimizedHumanizeOps = Math.round(this[0].hz);
      console.log(`Optimized Humanize: ${optimizedHumanizeOps.toLocaleString()} ops/sec`);
      
      if (originalHumanizeOps > 0) {
        const improvement = ((optimizedHumanizeOps - originalHumanizeOps) / originalHumanizeOps * 100);
        console.log(`🚀 Improvement: ${improvement.toFixed(1)}% (${(optimizedHumanizeOps/originalHumanizeOps).toFixed(1)}x faster)`);
        addResult('Batch humanization', originalHumanizeOps, optimizedHumanizeOps, improvement);
      }
    }
  });

// RESULTS SUMMARY
function printSummary() {
  console.log('\n\n🏆 DARBOĞAZ OPTİMİZASYONU ÖZETİ');
  console.log('==================================');
  
  if (results.length === 0) {
    console.log('❌ Test sonuçları mevcut değil');
    return;
  }
  
  results.forEach(result => {
    console.log(`\n📂 ${result.category}`);
    console.log(`   ${result.test}:`);
    console.log(`   • Original:  ${result.original.toLocaleString()} ops/sec`);
    console.log(`   • Optimized: ${result.optimized.toLocaleString()} ops/sec`);
    console.log(`   • 🚀 ${result.improvement > 0 ? '+' : ''}${result.improvement.toFixed(1)}% (${result.speedup.toFixed(1)}x)`);
  });
  
  // Overall statistics
  const improvements = results.filter(r => r.improvement > 0);
  if (improvements.length > 0) {
    const avgImprovement = improvements.reduce((sum, r) => sum + r.improvement, 0) / improvements.length;
    const avgSpeedup = improvements.reduce((sum, r) => sum + r.speedup, 0) / improvements.length;
    
    console.log('\n📈 GENEL İSTATİSTİKLER:');
    console.log(`   • İyileştirilen testler: ${improvements.length}/${results.length}`);
    console.log(`   • Ortalama iyileştirme: ${avgImprovement.toFixed(1)}%`);
    console.log(`   • Ortalama hızlanma: ${avgSpeedup.toFixed(1)}x`);
  }
  
  // Write results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    runtime: 'Bun v' + process.versions.bun,
    platform: process.platform + ' ' + process.arch,
    results: results,
    summary: {
      totalTests: results.length,
      improvedTests: improvements.length,
      averageImprovement: improvements.length > 0 ? 
        improvements.reduce((sum, r) => sum + r.improvement, 0) / improvements.length : 0,
      averageSpeedup: improvements.length > 0 ? 
        improvements.reduce((sum, r) => sum + r.speedup, 0) / improvements.length : 0
    }
  };
  
  fs.writeFileSync('bottleneck-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Sonuçlar bottleneck-results.json dosyasına kaydedildi');
}

// Run all benchmarks sequentially
console.log('\n🏃 Benchmarklar çalışıyor...');

if (originalParseEoD || parseEoDOptimized) {
  originalEodSuite.run();
  setTimeout(() => {
    optimizedEodSuite.run();
    setTimeout(() => runValidationTests(), 1000);
  }, 1000);
} else {
  runValidationTests();
}

function runValidationTests() {
  if (originalIsValid || isValidOptimized) {
    originalValidationSuite.run();
    setTimeout(() => {
      optimizedValidationSuite.run();
      setTimeout(() => runHumanizeTests(), 1000);
    }, 1000);
  } else {
    runHumanizeTests();
  }
}

function runHumanizeTests() {
  if (originalHumanize || humanizeOptimized) {
    originalHumanizeSuite.run();
    setTimeout(() => {
      optimizedHumanizeSuite.run();
      setTimeout(printSummary, 1000);
    }, 1000);
  } else {
    printSummary();
  }
}
