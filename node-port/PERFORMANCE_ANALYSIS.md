# JCRON Node.js Port - Comprehensive Benchmark Results

## 🎯 Executive Summary

Bu benchmark testi, JCRON Node.js port'unun tüm hesaplama modüllerini kapsayan kapsamlı bir performans analizidir. Runner modülü dışındaki tüm önemli hesaplama yapıları test edilmiştir.

## 📊 Performance Results

### 1. Core Engine Operations
**En kritik hesaplama fonksiyonları:**

- **Engine.next() - Simple Pattern**: 365,449 ops/sec ±0.97%
- **Engine.next() - Business Hours**: 46,151 ops/sec ±8.07%
- **Engine.next() - Complex Pattern**: 70,892 ops/sec ±4.98%
- **Engine.next() - With Timezone**: 78,169 ops/sec ±3.07%
- **Engine.next() - With Week of Year**: 719 ops/sec ±8.16% ⚠️ **BOTTLENECK**
- **Engine.prev() - Business Hours**: 66,731 ops/sec ±4.77%
- **Engine.isMatch() - Simple**: 373,415 ops/sec ±3.04% 🏆 **FASTEST**
- **Engine.isMatch() - Complex**: 296,268 ops/sec ±1.89%

**📈 Analysis:**
- Simple pattern matching çok hızlı (365K ops/sec)
- Week of Year hesaplaması en yavaş (719 ops/sec) - optimizasyon gerekli
- isMatch() fonksiyonu next()'ten daha hızlı

### 2. Schedule Parsing & Validation
**Parsing performansı:**

- **fromCronSyntax() - Simple**: 1,308,477 ops/sec ±1.41%
- **fromCronSyntax() - Complex**: 1,228,017 ops/sec ±0.53%
- **fromJCronString() - With Timezone**: 928,485 ops/sec ±0.72%
- **fromJCronString() - With WOY**: 968,543 ops/sec ±0.47%
- **fromJCronString() - With EoD**: 764,037 ops/sec ±3.82%
- **fromJCronString() - Complex JCRON**: 613,273 ops/sec ±1.87%
- **Schedule Constructor - Direct**: 53,161,566 ops/sec ±4.72% 🏆 **ULTRA FAST**
- **Schedule Constructor - With Timezone**: 53,640,136 ops/sec ±4.09%

**📈 Analysis:**
- Constructor çok hızlı (53M ops/sec)
- JCRON extension'ları parsing hızını düşürüyor
- EoD parsing en yavaş extension

### 3. Convenience Functions
**Kullanıcı dostu API fonksiyonları:**

- **getNext() - String Input**: 26,774 ops/sec ±4.66%
- **getNext() - Schedule Input**: 28,047 ops/sec ±2.30%
- **getPrev() - String Input**: 35,451 ops/sec ±0.60%
- **getNextN() - 5 iterations**: 7,794 ops/sec ±2.42%
- **getNextN() - 10 iterations**: 4,399 ops/sec ±1.23%
- **match() - String Input**: 70,218 ops/sec ±1.27% 🏆 **FASTEST**
- **match() - Schedule Input**: 57,451 ops/sec ±14.90%
- **isTime() - With Tolerance**: 56,340 ops/sec ±5.20%

**📈 Analysis:**
- match() fonksiyonu en hızlı convenience function
- getNextN() iterasyon sayısı ile ters orantılı performans
- String vs Schedule input arasında önemli fark yok

### 4. Validation Functions
**Geçerlilik kontrolü:**

- **isValid() - Simple Cron**: 64,536 ops/sec ±4.97%
- **isValid() - Complex Cron**: 36,949 ops/sec ±2.71%
- **isValid() - JCRON with TZ**: 37,461 ops/sec ±1.33%
- **isValid() - Invalid Expression**: 4,483 ops/sec ±1.85% ⚠️ **SLOW ERROR HANDLING**
- **validateCron() - Valid Expression**: 970,527 ops/sec ±5.96%
- **validateCron() - Invalid Expression**: 916,161 ops/sec ±0.81%
- **getPattern() - Business Hours**: 1,062,783 ops/sec ±2.61%
- **matchPattern() - Weekly Check**: 1,091,155 ops/sec ±0.61% 🏆 **FASTEST**

**📈 Analysis:**
- Pattern matching çok hızlı (1M+ ops/sec)
- Error handling optimize edilebilir
- validateCron() isValid()'den çok daha hızlı

### 5. End-of-Duration (EoD) Operations
**Süre sonu hesaplamaları:**

- **parseEoD() - Simple (E30D)**: 5,792,515 ops/sec ±2.56%
- **parseEoD() - Time (E1H30M)**: 4,000,195 ops/sec ±18.97%
- **parseEoD() - Complex (E1DT12H M)**: 1,057,534 ops/sec ±22.02% ⚠️ **HIGH VARIANCE**
- **parseEoD() - Start (S30M)**: 5,709,102 ops/sec ±4.47%
- **createEoD() - Days**: 49,830,798 ops/sec ±4.28%
- **createEoD() - Complex**: 52,007,700 ops/sec ±4.11% 🏆 **FASTEST**
- **isValidEoD() - Valid**: 4,493,189 ops/sec ±5.24%
- **isValidEoD() - Invalid**: 437,764 ops/sec ±5.12%
- **endOfDuration() - Calculate**: 15,902,580 ops/sec ±0.99%

**📈 Analysis:**
- createEoD() çok hızlı (52M ops/sec)
- Complex parsing'de yüksek varyans
- Error case'lerde performans düşüşü

### 6. Humanization Functions
**İnsan okunabilir format dönüşümü:**

- **humanizeToString() - Simple**: 498,450 ops/sec ±0.70%
- **humanizeToString() - Business Hours**: 198,163 ops/sec ±1.06%
- **humanizeToString() - Complex**: 79,343 ops/sec ±3.41%
- **humanizeToResult() - With Options**: 199,193 ops/sec ±0.58%
- **humanizeFromSchedule() - Schedule Object**: 257,882 ops/sec ±0.76%
- **getSupportedLocales() - List**: 3,172,125 ops/sec ±0.46%
- **isLocaleSupported() - Check**: 408,785,516 ops/sec ±50.97% 🏆 **ULTRA FAST** ⚠️ **HIGH VARIANCE**
- **getDetectedLocale() - Detect**: 11,031,023 ops/sec ±0.81%

**📈 Analysis:**
- Locale check aşırı hızlı ama kararsız
- Complex pattern humanization yavaş
- Humanization genel olarak orta hızda

### 7. Stress Tests
**Yük testleri:**

- **Batch Processing - 100 getNext() calls**: 292 ops/sec ±0.88%
- **Batch Validation - 100 isValid() calls**: 395 ops/sec ±3.28%
- **Batch Parsing - 100 fromCronSyntax() calls**: 12,081 ops/sec ±0.55%
- **Heavy getNextN() - 50 iterations**: 6,485 ops/sec ±1.02%
- **Complex Schedule Matching - 100 isMatch() calls**: 2,995 ops/sec ±5.06%
- **EoD Parsing Stress - 100 parseEoD() calls**: 54,405 ops/sec ±3.10% 🏆 **FASTEST**
- **Humanization Stress - 50 toString() calls**: 3,406 ops/sec ±3.77%

**📈 Analysis:**
- Batch işlemler beklendiği gibi yavaş
- EoD parsing batch işlemlerde en iyi performans
- getNext() batch işlemlerde en yavaş

### 8. Cache Performance
**Önbellekleme etkinliği:**

- **Cache Miss - New Schedule Each Time**: 27,433 ops/sec ±4.27%
- **Cache Hit - Reused Schedule**: 47,062 ops/sec ±0.54% (**71% faster**)
- **Parser Cache - Repeated fromCronSyntax()**: 1,138,884 ops/sec ±0.87% 🏆 **FASTEST**
- **Validation Cache - Repeated isValid()**: 39,886 ops/sec ±1.44%

**📈 Analysis:**
- Cache çok etkili (%71 performans artışı)
- Parser cache en iyi performans
- Schedule reuse önemli optimizasyon

## 🎯 Key Performance Insights

### 🚀 Top Performers
1. **isLocaleSupported()**: 408M ops/sec (Locale checking)
2. **Schedule Constructor**: 53M ops/sec (Object creation)
3. **createEoD()**: 52M ops/sec (EoD creation)
4. **endOfDuration()**: 15M ops/sec (Duration calculation)
5. **parseEoD() - Simple**: 5.7M ops/sec (Simple EoD parsing)

### ⚠️ Performance Bottlenecks
1. **Week of Year calculations**: 719 ops/sec (500x slower than simple patterns)
2. **Invalid expression handling**: 4,483 ops/sec
3. **Complex EoD parsing**: High variance (±22%)
4. **Batch getNext() operations**: 292 ops/sec
5. **Complex humanization**: 79,343 ops/sec

### 💡 Optimization Opportunities

1. **Week of Year Algorithm**: En büyük darboğaz - algoritma optimizasyonu gerekli
2. **Error Handling**: Invalid case'lerde early exit stratejileri
3. **Complex Pattern Parsing**: Regex optimizasyonu
4. **Batch Operations**: Bulk processing APIs
5. **Cache Utilization**: Daha agresif caching stratejileri

### 🏆 Overall Assessment

**Strengths:**
- Çok hızlı object creation ve basic operations
- Etkili caching mechanisms
- İyi single-operation performance

**Areas for Improvement:**
- Week of Year calculations (critical)
- Complex pattern handling
- Error case performance
- Batch operation efficiency

**Recommendation:** Week of Year hesaplama algoritması kritik optimizasyon gerektirir. Diğer alanlar genel olarak production-ready performans seviyesinde.

---
*Benchmark Date: 17 Temmuz 2025*  
*Platform: macOS arm64, Bun v1.2.18*  
*Total Tests: 70 different performance scenarios*
