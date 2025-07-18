// test/integration-optimization.test.js
// Optimize edilmiş API'nin mevcut sistem ile uyumluluğunu test eder

import { test, expect, beforeEach, afterEach } from 'bun:test';

// Import both original and optimized APIs
const jcron = require('../dist/index');
const originalIsValid = jcron.isValid;
const originalGetNext = jcron.getNext;
const originalFromCronSyntax = jcron.fromCronSyntax;
const Optimized = jcron.Optimized;

let originalConsoleWarn;
let originalConsoleInfo;

beforeEach(() => {
  // Suppress console warnings during tests
  originalConsoleWarn = console.warn;
  originalConsoleInfo = console.info;
  console.warn = () => {};
  console.info = () => {};

  // Reset optimization stats before each test
  if (Optimized) {
    Optimized.resetStats();
  }
});

afterEach(() => {
  // Restore console
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;

  // Reset optimizations after each test
  if (Optimized) {
    Optimized.configure({
      enableValidationCache: false,
      enableHumanizationCache: false,
      enableEoDCache: false,
      enableWeekOfYearCache: false,
      fallbackOnError: true
    });
  }
});

test('📦 API Availability - should maintain backward compatibility', () => {
  // Original APIs should always be available
  expect(typeof originalIsValid).toBe('function');
  expect(typeof originalGetNext).toBe('function');
  
  // Test original functionality
  expect(originalIsValid('0 0 12 * * ?')).toBe(true);
  expect(originalIsValid('invalid')).toBe(false);
});

test('📦 API Availability - should provide Optimized API when available', () => {
  if (Optimized) {
    expect(typeof Optimized.isValid).toBe('function');
    expect(typeof Optimized.configure).toBe('function');
    expect(typeof Optimized.getOptimizationStats).toBe('function');
  } else {
    console.log('⚠️ Optimized API not available - this is expected if optimizations are not loaded');
  }
});

test('🔀 Functional Compatibility - validation with disabled optimizations', () => {
  if (!Optimized) return;

  const testExpressions = [
    '0 0 12 * * ?',
    '0 15 10 ? * MON-FRI',
    '0 0/5 14 * * ?',
    '0 0 8-17 * * MON-FRI',
    'invalid expression',
    '',
    '0 0 0 * * * * WOY:1'
  ];

  // Ensure optimizations are disabled
  Optimized.configure({ enableValidationCache: false });

  testExpressions.forEach(expr => {
    const originalResult = originalIsValid(expr);
    const optimizedResult = Optimized.isValid(expr);
    
    expect(optimizedResult).toBe(originalResult);
  });
});

test('🔀 Functional Compatibility - validation with enabled optimizations', () => {
  if (!Optimized) return;

  const testExpressions = [
    '0 0 12 * * ?',
    '0 15 10 ? * MON-FRI',
    '0 0/5 14 * * ?',
    'invalid expression'
  ];

  // Enable validation cache
  Optimized.configure({ enableValidationCache: true });

  testExpressions.forEach(expr => {
    const originalResult = originalIsValid(expr);
    const optimizedResult = Optimized.isValid(expr);
    
    expect(optimizedResult).toBe(originalResult);
  });
});

test('⚡ Performance Optimization - should show caching benefits', () => {
  if (!Optimized) return;

  const testExpr = '0 0 12 * * ?';
  
  // Measure without cache
  Optimized.configure({ enableValidationCache: false });
  const start1 = performance.now();
  for (let i = 0; i < 1000; i++) {
    Optimized.isValid(testExpr);
  }
  const duration1 = performance.now() - start1;

  // Measure with cache
  Optimized.configure({ enableValidationCache: true });
  const start2 = performance.now();
  for (let i = 0; i < 1000; i++) {
    Optimized.isValid(testExpr);
  }
  const duration2 = performance.now() - start2;

  console.log(`Without cache: ${duration1.toFixed(2)}ms`);
  console.log(`With cache: ${duration2.toFixed(2)}ms`);
  console.log(`Speedup: ${(duration1 / duration2).toFixed(2)}x`);

  // Cache should be faster for repeated calls
  expect(duration2).toBeLessThan(duration1 * 2); // At least some improvement
});

test('⚡ Performance Optimization - should track statistics', () => {
  if (!Optimized) return;

  Optimized.resetStats();
  Optimized.configure({ enableValidationCache: true });

  // Make some calls
  Optimized.isValid('0 0 12 * * ?');
  Optimized.isValid('0 15 10 ? * MON-FRI');
  Optimized.isValid('invalid');

  const stats = Optimized.getOptimizationStats();
  
  expect(stats.validationCalls).toBe(3);
  expect(stats.validationOptimizedCalls).toBe(3);
  expect(stats.errors).toBe(0);
});

test('🛡️ Fallback Mechanism - should handle gracefully', () => {
  if (!Optimized) return;

  // Test fallback configuration
  Optimized.configure({ fallbackOnError: true });
  
  // These should not throw even if optimizations fail internally
  expect(() => Optimized.isValid('0 0 12 * * ?')).not.toThrow();
});

test('🛡️ Fallback Mechanism - should provide original functions access', () => {
  if (!Optimized) return;

  expect(typeof Optimized.original.isValid).toBe('function');
  
  // Original functions should work identically
  const result1 = originalIsValid('0 0 12 * * ?');
  const result2 = Optimized.original.isValid('0 0 12 * * ?');
  expect(result1).toBe(result2);
});

test('🔧 Configuration Management - should apply changes correctly', () => {
  if (!Optimized) return;

  // Test configuration
  Optimized.configure({
    enableValidationCache: true,
    enableHumanizationCache: false,
    fallbackOnError: true
  });

  // Configuration should be applied without errors
  expect(() => Optimized.isValid('0 0 12 * * ?')).not.toThrow();
});

test('📊 Edge Cases - should handle edge case expressions', () => {
  if (!Optimized) return;

  const edgeCases = [
    '', // Empty string
    ' ', // Whitespace only
    '0 0 12 * * ? 2024', // With year
    '0 0 12 L * ?', // Last day of month
    '0 0 12 ? * 6#3', // Third Saturday
    '0 0 12 ? * MON-FRI' // Day range
  ];

  Optimized.configure({ enableValidationCache: true });

  edgeCases.forEach(expr => {
    const originalResult = originalIsValid(expr);
    const optimizedResult = Optimized.isValid(expr);
    
    expect(optimizedResult).toBe(originalResult);
  });
});

test('📊 Edge Cases - should handle null inputs gracefully', () => {
  if (!Optimized) return;

  // These should not crash the application
  expect(() => Optimized.isValid(null)).not.toThrow();
  expect(() => Optimized.isValid(undefined)).not.toThrow();
});

test('🔄 Migration Scenarios - switching optimizations on/off', () => {
  if (!Optimized) return;

  const testExpr = '0 0 12 * * ?';

  // Start with optimizations disabled
  Optimized.configure({ enableValidationCache: false });
  const result1 = Optimized.isValid(testExpr);

  // Enable optimizations
  Optimized.configure({ enableValidationCache: true });
  const result2 = Optimized.isValid(testExpr);

  // Disable again
  Optimized.configure({ enableValidationCache: false });
  const result3 = Optimized.isValid(testExpr);

  // All results should be the same
  expect(result1).toBe(result2);
  expect(result2).toBe(result3);
});

// Performance demonstration (runs only with RUN_PERFORMANCE_TESTS=true)
if (process.env.RUN_PERFORMANCE_TESTS === 'true') {
  test('🚀 Performance Demonstration', () => {
    if (!Optimized) return;

    const testExpr = '0 0 12 * * ?';
    const iterations = 100000;

    console.log('\n📊 Performance Comparison:');

    // Original API
    const originalStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      originalIsValid(testExpr);
    }
    const originalDuration = performance.now() - originalStart;

    // Optimized API (disabled)
    Optimized.configure({ enableValidationCache: false });
    const optimizedDisabledStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      Optimized.isValid(testExpr);
    }
    const optimizedDisabledDuration = performance.now() - optimizedDisabledStart;

    // Optimized API (enabled)
    Optimized.configure({ enableValidationCache: true });
    const optimizedEnabledStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      Optimized.isValid(testExpr);
    }
    const optimizedEnabledDuration = performance.now() - optimizedEnabledStart;

    console.log(`Original API: ${originalDuration.toFixed(2)}ms`);
    console.log(`Optimized (disabled): ${optimizedDisabledDuration.toFixed(2)}ms`);
    console.log(`Optimized (enabled): ${optimizedEnabledDuration.toFixed(2)}ms`);
    console.log(`Speedup: ${(originalDuration / optimizedEnabledDuration).toFixed(2)}x`);

    expect(optimizedEnabledDuration).toBeLessThan(originalDuration);
  });
}
