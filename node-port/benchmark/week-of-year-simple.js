// benchmark/week-of-year-simple.js
// Basit Week of Year cache performans testi

const Benchmark = require('benchmark');
const fs = require('fs');

console.log('📅 WEEK OF YEAR CACHE PERFORMANS TESTİ');
console.log('======================================');
console.log('Week of Year hesaplama cache optimizasyonunu test eder\n');

// Load modules
let WeekOfYearCache;

try {
  const optimizedModule = require('../dist/engine-optimized-v2');
  WeekOfYearCache = optimizedModule.WeekOfYearCache;
  console.log('✅ WeekOfYearCache loaded successfully');
} catch(e) {
  console.log('❌ WeekOfYearCache could not be loaded:', e.message);
  process.exit(1);
}

// Test dates
const testDates = [
  new Date(2024, 0, 15),   // Ocak
  new Date(2024, 2, 15),   // Mart
  new Date(2024, 5, 15),   // Haziran
  new Date(2024, 8, 15),   // Eylül
  new Date(2024, 11, 15),  // Aralık
  new Date(2023, 0, 1),    // 2023 başı
  new Date(2023, 11, 31),  // 2023 sonu
  new Date(2025, 5, 15),   // 2025 ortası
];

console.log('📊 TEST SENARYOLARI');
console.log('==================');

// 1. Cold cache performance (first time calculation)
console.log('\n1. Cold Cache Performance (İlk hesaplama)');

const coldCacheSuite = new Benchmark.Suite('Cold Cache');

coldCacheSuite.add('Cold cache - first calculation', function() {
  // Clear cache before each run
  WeekOfYearCache.clearCache();
  
  // Calculate week of year for all test dates
  testDates.forEach(date => {
    WeekOfYearCache.getWeekOfYear(date);
  });
});

let coldCacheOps = 0;

coldCacheSuite.on('complete', function() {
  if (this[0]) {
    coldCacheOps = Math.round(this[0].hz);
    console.log(`Cold Cache: ${coldCacheOps.toLocaleString()} ops/sec`);
  }
});

// 2. Warm cache performance (cached results)
console.log('\n2. Warm Cache Performance (Cache hit)');

const warmCacheSuite = new Benchmark.Suite('Warm Cache');

// Pre-populate cache
WeekOfYearCache.clearCache();
testDates.forEach(date => {
  WeekOfYearCache.getWeekOfYear(date);
});

warmCacheSuite.add('Warm cache - cache hits', function() {
  // All these should be cache hits
  testDates.forEach(date => {
    WeekOfYearCache.getWeekOfYear(date);
  });
});

let warmCacheOps = 0;

warmCacheSuite.on('complete', function() {
  if (this[0]) {
    warmCacheOps = Math.round(this[0].hz);
    console.log(`Warm Cache: ${warmCacheOps.toLocaleString()} ops/sec`);
    
    if (coldCacheOps > 0) {
      const improvement = ((warmCacheOps - coldCacheOps) / coldCacheOps * 100);
      const speedup = warmCacheOps / coldCacheOps;
      console.log(`🚀 Cache speedup: ${improvement.toFixed(1)}% (${speedup.toFixed(1)}x faster)`);
      
      if (speedup > 10) {
        console.log('🎉 Muhteşem! Cache çok etkili çalışıyor!');
      } else if (speedup > 3) {
        console.log('✅ İyi! Cache önemli performans artışı sağlıyor');
      } else if (speedup > 1.5) {
        console.log('📈 Cache performans artışı sağlıyor');
      } else {
        console.log('⚠️  Cache beklenen kadar etkili değil');
      }
    }
  }
});

// 3. Memory efficiency test
console.log('\n3. Memory Efficiency Test');

const memoryTestSuite = new Benchmark.Suite('Memory Test');

memoryTestSuite.add('Large dataset cache test', function() {
  WeekOfYearCache.clearCache();
  
  // Test with many dates to see cache behavior
  for (let year = 2020; year <= 2025; year++) {
    for (let month = 0; month < 12; month++) {
      for (let day = 1; day <= 28; day += 7) { // Weekly samples
        const date = new Date(year, month, day);
        WeekOfYearCache.getWeekOfYear(date);
      }
    }
  }
});

let memoryTestOps = 0;

memoryTestSuite.on('complete', function() {
  if (this[0]) {
    memoryTestOps = Math.round(this[0].hz);
    console.log(`Memory Test: ${memoryTestOps.toLocaleString()} ops/sec`);
    console.log('📊 Bu test cache\'in büyük veri setleriyle performansını ölçer');
  }
});

// 4. Raw JavaScript Date performance comparison
console.log('\n4. Raw Performance Comparison');

const rawPerformanceSuite = new Benchmark.Suite('Raw Performance');

// Simple getWeek function without cache (for comparison)
function getWeekOfYearRaw(date) {
  const year = date.getFullYear();
  const startOfYearDate = new Date(year, 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYearDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const startOfYearDay = startOfYearDate.getDay() || 7;
  return Math.floor((dayOfYear - 1 + startOfYearDay) / 7) + 1;
}

rawPerformanceSuite.add('Raw JS calculation (no cache)', function() {
  testDates.forEach(date => {
    getWeekOfYearRaw(date);
  });
});

let rawOps = 0;

rawPerformanceSuite.on('complete', function() {
  if (this[0]) {
    rawOps = Math.round(this[0].hz);
    console.log(`Raw JS: ${rawOps.toLocaleString()} ops/sec`);
    
    if (warmCacheOps > 0) {
      const improvement = ((warmCacheOps - rawOps) / rawOps * 100);
      const speedup = warmCacheOps / rawOps;
      console.log(`🚀 Cache vs Raw: ${improvement.toFixed(1)}% (${speedup.toFixed(1)}x faster)`);
    }
  }
});

// Results summary
function printSummary() {
  console.log('\n\n🏆 WEEK OF YEAR CACHE PERFORMANS ÖZETİ');
  console.log('=======================================');
  
  const results = [
    { name: 'Cold Cache (ilk hesaplama)', ops: coldCacheOps },
    { name: 'Warm Cache (cache hit)', ops: warmCacheOps },
    { name: 'Memory Test (büyük dataset)', ops: memoryTestOps },
    { name: 'Raw JS (cache yok)', ops: rawOps }
  ];
  
  results.forEach(result => {
    if (result.ops > 0) {
      console.log(`📊 ${result.name}: ${result.ops.toLocaleString()} ops/sec`);
    }
  });
  
  // Key insights
  console.log('\n📈 PERFORMANS ANALİZİ:');
  
  if (warmCacheOps > coldCacheOps) {
    const cacheEffectiveness = warmCacheOps / coldCacheOps;
    console.log(`• Cache Effectiveness: ${cacheEffectiveness.toFixed(1)}x speedup`);
  }
  
  if (warmCacheOps > rawOps) {
    const cacheVsRaw = warmCacheOps / rawOps;
    console.log(`• Cache vs Raw JS: ${cacheVsRaw.toFixed(1)}x faster`);
  }
  
  if (coldCacheOps > 0 && warmCacheOps > 0) {
    console.log(`• Cache hit performance boost: ${((warmCacheOps - coldCacheOps) / coldCacheOps * 100).toFixed(1)}%`);
  }
  
  // Conclusion
  console.log('\n🎯 SONUÇ:');
  if (warmCacheOps > coldCacheOps * 5) {
    console.log('✅ Week of Year cache optimizasyonu çok başarılı!');
  } else if (warmCacheOps > coldCacheOps * 2) {
    console.log('📈 Week of Year cache optimizasyonu olumlu sonuç veriyor');
  } else {
    console.log('⚠️  Week of Year cache optimizasyonu beklenen etkiyi vermiyor');
  }
  
  // Save results
  const reportData = {
    timestamp: new Date().toISOString(),
    runtime: 'Bun v' + process.versions.bun,
    platform: process.platform + ' ' + process.arch,
    focus: 'Week of Year Cache Performance',
    results: {
      coldCache: coldCacheOps,
      warmCache: warmCacheOps,
      memoryTest: memoryTestOps,
      rawJS: rawOps,
      cacheEffectiveness: warmCacheOps > 0 && coldCacheOps > 0 ? warmCacheOps / coldCacheOps : 0,
      cacheVsRaw: warmCacheOps > 0 && rawOps > 0 ? warmCacheOps / rawOps : 0
    }
  };
  
  fs.writeFileSync('woy-cache-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Sonuçlar woy-cache-results.json dosyasına kaydedildi');
}

// Run tests
console.log('\n🏃 Testler çalışıyor...\n');

coldCacheSuite.run();
setTimeout(() => {
  warmCacheSuite.run();
  setTimeout(() => {
    memoryTestSuite.run();
    setTimeout(() => {
      rawPerformanceSuite.run();
      setTimeout(printSummary, 1000);
    }, 1000);
  }, 1000);
}, 1000);
