// benchmark/week-of-year-focused.js
// Week of Year darboğazına özel odaklanmış benchmark
// En kritik performans sorunu olan WoY hesaplamalarını test eder

const Benchmark = require('benchmark');
const fs = require('fs');

console.log('📅 WEEK OF YEAR DARBOĞAZ TESTLERİ');
console.log('===================================');
console.log('En kritik darboğaz olan Week of Year hesaplamalarına odaklanır\n');

// Original and optimized modules
let originalEngine, optimizedEngine;
let originalFromCronSyntax, optimizedFromCronSyntax;

try {
  const engineModule = require('../dist/engine');
  originalEngine = engineModule.Engine;
  const scheduleModule = require('../dist/schedule');
  originalFromCronSyntax = scheduleModule.fromCronSyntax;
} catch(e) {
  console.log('⚠️  Original engine/schedule modules not found:', e.message);
}

try {
  const optimizedEngineModule = require('../dist/engine-optimized-v2');
  optimizedEngine = optimizedEngineModule.OptimizedEngineV2;
} catch(e) {
  console.log('⚠️  Optimized engine module not found:', e.message);
}

// Week of Year test expressions
const woyExpressions = [
  "0 0 0 * * * * WOY:1",      // İlk hafta
  "0 0 12 * * * * WOY:26",    // Yılın ortası
  "0 30 8 * * * * WOY:52",    // Son hafta
  "0 15 16 * * * * WOY:13,26,39,52", // Çoklu hafta
  "0 0 9 * * * * WOY:1-4",    // Hafta aralığı
  "0 45 14 * * * * WOY:*/4"   // Her 4 haftada bir
];

// Test dates for different scenarios
const testDates = [
  new Date(2024, 0, 15),   // Ocak ortası
  new Date(2024, 5, 15),   // Haziran ortası
  new Date(2024, 11, 15),  // Aralık ortası
  new Date(2023, 0, 1),    // Yıl başı
  new Date(2023, 11, 31)   // Yıl sonu
];

const results = [];

function addResult(testName, originalOps, optimizedOps) {
  const improvement = originalOps > 0 ? ((optimizedOps - originalOps) / originalOps * 100) : 0;
  const speedup = originalOps > 0 ? optimizedOps / originalOps : 0;
  
  results.push({
    test: testName,
    original: originalOps,
    optimized: optimizedOps,
    improvement: improvement,
    speedup: speedup
  });
}

// 1. WOY SCHEDULE CREATION BENCHMARK
console.log('\n📊 1. WOY SCHEDULE CREATION');
console.log('=============================');

const originalCreationSuite = new Benchmark.Suite('Original WoY Creation');
const optimizedCreationSuite = new Benchmark.Suite('Optimized WoY Creation');

if (originalFromCronSyntax) {
  originalCreationSuite.add('Original: WoY schedule creation', function() {
    woyExpressions.forEach(expr => {
      try {
        originalFromCronSyntax(expr);
      } catch {}
    });
  });
}

if (optimizedEngine && optimizedEngine.fromCronSyntax) {
  optimizedCreationSuite.add('Optimized: WoY schedule creation', function() {
    woyExpressions.forEach(expr => {
      try {
        optimizedEngine.fromCronSyntax(expr);
      } catch {}
    });
  });
}

let originalCreationOps = 0;
let optimizedCreationOps = 0;

originalCreationSuite.on('complete', function() {
  if (this[0]) {
    originalCreationOps = Math.round(this[0].hz);
    console.log(`Original Creation:  ${originalCreationOps.toLocaleString()} ops/sec`);
  }
});

optimizedCreationSuite.on('complete', function() {
  if (this[0]) {
    optimizedCreationOps = Math.round(this[0].hz);
    console.log(`Optimized Creation: ${optimizedCreationOps.toLocaleString()} ops/sec`);
    
    if (originalCreationOps > 0) {
      const improvement = ((optimizedCreationOps - originalCreationOps) / originalCreationOps * 100);
      console.log(`🚀 Improvement: ${improvement.toFixed(1)}% (${(optimizedCreationOps/originalCreationOps).toFixed(1)}x faster)`);
      addResult('WoY Schedule Creation', originalCreationOps, optimizedCreationOps);
    }
  }
});

// 2. WOY NEXT() CALCULATION BENCHMARK
console.log('\n📊 2. WOY NEXT() CALCULATIONS');
console.log('==============================');

// Create schedule instances for testing
let originalSchedules = [];
let optimizedSchedules = [];

try {
  if (originalFromCronSyntax) {
    originalSchedules = woyExpressions.map(expr => {
      try {
        return originalFromCronSyntax(expr);
      } catch {
        return null;
      }
    }).filter(s => s);
  }
} catch {}

try {
  if (optimizedEngine && optimizedEngine.fromCronSyntax) {
    optimizedSchedules = woyExpressions.map(expr => {
      try {
        return optimizedEngine.fromCronSyntax(expr);
      } catch {
        return null;
      }
    }).filter(s => s);
  }
} catch {}

const originalNextSuite = new Benchmark.Suite('Original WoY Next');
const optimizedNextSuite = new Benchmark.Suite('Optimized WoY Next');

if (originalSchedules.length > 0 && originalEngine) {
  originalNextSuite.add('Original: WoY next() calculation', function() {
    testDates.forEach(date => {
      originalSchedules.forEach(schedule => {
        try {
          originalEngine.prototype.next ? originalEngine.prototype.next.call({schedule: schedule}, date) :
          schedule.next ? schedule.next(date) : null;
        } catch {}
      });
    });
  });
}

if (optimizedSchedules.length > 0 && optimizedEngine) {
  optimizedNextSuite.add('Optimized: WoY next() calculation', function() {
    testDates.forEach(date => {
      optimizedSchedules.forEach(schedule => {
        try {
          optimizedEngine.prototype.next ? optimizedEngine.prototype.next.call({schedule: schedule}, date) :
          schedule.next ? schedule.next(date) : null;
        } catch {}
      });
    });
  });
}

let originalNextOps = 0;
let optimizedNextOps = 0;

originalNextSuite.on('complete', function() {
  if (this[0]) {
    originalNextOps = Math.round(this[0].hz);
    console.log(`Original Next:  ${originalNextOps.toLocaleString()} ops/sec`);
  }
});

optimizedNextSuite.on('complete', function() {
  if (this[0]) {
    optimizedNextOps = Math.round(this[0].hz);
    console.log(`Optimized Next: ${optimizedNextOps.toLocaleString()} ops/sec`);
    
    if (originalNextOps > 0) {
      const improvement = ((optimizedNextOps - originalNextOps) / originalNextOps * 100);
      console.log(`🚀 Improvement: ${improvement.toFixed(1)}% (${(optimizedNextOps/originalNextOps).toFixed(1)}x faster)`);
      addResult('WoY Next Calculation', originalNextOps, optimizedNextOps);
    }
  }
});

// 3. WOY CACHE EFFECTIVENESS TEST
console.log('\n📊 3. WOY CACHE EFFECTIVENESS');
console.log('==============================');

// Cache hit test - same dates repeatedly
const cacheTestSuite = new Benchmark.Suite('Cache Test');

if (optimizedEngine && optimizedEngine.WeekOfYearCache) {
  cacheTestSuite.add('Cache effectiveness test', function() {
    // Clear cache first
    try {
      optimizedEngine.WeekOfYearCache.clearCache();
    } catch {}
    
    // First run - should populate cache
    testDates.forEach(date => {
      try {
        optimizedEngine.WeekOfYearCache.getWeekOfYear(date);
      } catch {}
    });
    
    // Second run - should hit cache
    testDates.forEach(date => {
      try {
        optimizedEngine.WeekOfYearCache.getWeekOfYear(date);
      } catch {}
    });
  });
}

let cacheTestOps = 0;

cacheTestSuite.on('complete', function() {
  if (this[0]) {
    cacheTestOps = Math.round(this[0].hz);
    console.log(`Cache Test: ${cacheTestOps.toLocaleString()} ops/sec`);
    console.log('📊 Cache hit rate should show significant performance boost');
  }
});

// Results summary
function printSummary() {
  console.log('\n\n🏆 WEEK OF YEAR OPTİMİZASYON ÖZETİ');
  console.log('====================================');
  
  if (results.length === 0) {
    console.log('❌ Test sonuçları mevcut değil - modüller doğru yüklenmemiş olabilir');
    return;
  }
  
  results.forEach(result => {
    console.log(`\n📊 ${result.test}:`);
    console.log(`   • Original:  ${result.original.toLocaleString()} ops/sec`);
    console.log(`   • Optimized: ${result.optimized.toLocaleString()} ops/sec`);
    console.log(`   • 🚀 ${result.improvement > 0 ? '+' : ''}${result.improvement.toFixed(1)}% (${result.speedup.toFixed(1)}x)`);
  });
  
  // Overall statistics
  const improvements = results.filter(r => r.improvement > 0);
  if (improvements.length > 0) {
    const avgImprovement = improvements.reduce((sum, r) => sum + r.improvement, 0) / improvements.length;
    const avgSpeedup = improvements.reduce((sum, r) => sum + r.speedup, 0) / improvements.length;
    
    console.log('\n📈 WOY OPTİMİZASYON İSTATİSTİKLERİ:');
    console.log(`   • İyileştirilen testler: ${improvements.length}/${results.length}`);
    console.log(`   • Ortalama iyileştirme: ${avgImprovement.toFixed(1)}%`);
    console.log(`   • Ortalama hızlanma: ${avgSpeedup.toFixed(1)}x`);
    
    if (avgSpeedup > 5) {
      console.log('   🎉 Muhteşem! Week of Year darboğazı başarıyla çözülmüş!');
    } else if (avgSpeedup > 2) {
      console.log('   ✅ İyi! Week of Year optimizasyonu olumlu sonuç vermiş');
    } else {
      console.log('   ⚠️  Week of Year optimizasyonu beklenen kadar etkili olmamış');
    }
  }
  
  // Write results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    runtime: 'Bun v' + process.versions.bun,
    platform: process.platform + ' ' + process.arch,
    focus: 'Week of Year Performance Bottleneck',
    results: results,
    cacheTestResult: cacheTestOps,
    summary: {
      totalTests: results.length,
      improvedTests: improvements.length,
      averageImprovement: improvements.length > 0 ? 
        improvements.reduce((sum, r) => sum + r.improvement, 0) / improvements.length : 0,
      averageSpeedup: improvements.length > 0 ? 
        improvements.reduce((sum, r) => sum + r.speedup, 0) / improvements.length : 0
    }
  };
  
  fs.writeFileSync('week-of-year-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 WoY sonuçları week-of-year-results.json dosyasına kaydedildi');
}

// Run benchmarks sequentially
console.log('\n🏃 Week of Year benchmarkları çalışıyor...\n');

// Run creation tests
if (originalFromCronSyntax || (optimizedEngine && optimizedEngine.fromCronSyntax)) {
  originalCreationSuite.run();
  setTimeout(() => {
    optimizedCreationSuite.run();
    setTimeout(() => runNextTests(), 1000);
  }, 1000);
} else {
  runNextTests();
}

function runNextTests() {
  // Run next() calculation tests
  if (originalSchedules.length > 0 || optimizedSchedules.length > 0) {
    originalNextSuite.run();
    setTimeout(() => {
      optimizedNextSuite.run();
      setTimeout(() => runCacheTests(), 1000);
    }, 1000);
  } else {
    runCacheTests();
  }
}

function runCacheTests() {
  // Run cache effectiveness test
  if (optimizedEngine && optimizedEngine.WeekOfYearCache) {
    cacheTestSuite.run();
    setTimeout(printSummary, 1000);
  } else {
    console.log('⚠️  Cache test skipped - OptimizedEngine.WeekOfYearCache not found');
    printSummary();
  }
}
