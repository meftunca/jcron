// JCRON V2 API Test
import { next, next_end, next_start, parse, is_match, getNext, next_time_v2, version_v2 } from './src/index.ts';

console.log('🚀 Testing JCRON V2 Clean Architecture API...\n');
console.log('📋 Version:', version_v2());

const now = new Date('2025-08-27T10:00:00Z');

console.log('📅 Base time:', now.toISOString());
console.log('');

// Test 1: V2 Clean API - Basic Cron Pattern
console.log('1️⃣ V2 Clean API - Basic Cron Pattern');
console.log('Pattern: "0 0 9 * * *" (Daily 9 AM)');
try {
  const result1 = next('0 0 9 * * *', undefined, now);
  console.log('✅ Result:', result1.toISOString());
} catch (error) {
  console.log('❌ Error:', error instanceof Error ? error.message : String(error));
  // Fallback to existing API
  try {
    const fallback = getNext('0 0 9 * * *', now);
    console.log('🔄 Fallback result:', fallback.toISOString());
  } catch (fbError) {
    console.log('❌ Fallback error:', fbError instanceof Error ? fbError.message : String(fbError));
  }
}
console.log('');

// Test 2: V2 Clean API - Pattern + Modifier
console.log('2️⃣ V2 Clean API - Pattern + Modifier');
console.log('Pattern: "0 0 9 * * MON", Modifier: "E1W" (Monday 9 AM + 1 week end)');
try {
  const result2 = next_end('0 0 9 * * MON', 'E1W', now);
  console.log('✅ Result:', result2.toISOString());
} catch (error) {
  console.log('❌ Error:', error.message);
  // Test existing hybrid API
  try {
    const fallback = getNext('0 0 9 * * MON E1W', now);
    console.log('🔄 Fallback hybrid result:', fallback.toISOString());
  } catch (fbError) {
    console.log('❌ Fallback error:', fbError.message);
  }
}
console.log('');

// Test 3: V2 Clean API - WOY Pattern
console.log('3️⃣ V2 Clean API - WOY Pattern');
console.log('Pattern: "WOY:1" (Week 1 of year)');
try {
  const result3 = next('WOY:1', undefined, now);
  console.log('✅ Result:', result3.toISOString());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log('❌ Error:', message);
  // Test existing WOY API
  try {
    const fallback = getNext('0 0 0 * * * WOY:1', now);
    console.log('🔄 Fallback WOY result:', fallback.toISOString());
  } catch (fbError) {
    const fbMessage = fbError instanceof Error ? fbError.message : String(fbError);
    console.log('❌ Fallback error:', fbMessage);
  }
}
console.log('');

// Test 4: V2 Original Problematic Pattern
console.log('4️⃣ V2 Original Problematic Pattern - WOY:4,15 E1W');
console.log('Pattern: "0 0 * * * * WOY:4,15 E1W" (Week 4,15 + End of next week)');
try {
  const testBase = new Date('2024-01-15T10:00:00Z');
  const result4 = next_time_v2('0 0 * * * * WOY:4,15 E1W', testBase);
  console.log('✅ WOY:4,15 E1W from 2024-01-15:', result4.toISOString());
  
  const testBase2 = new Date('2024-04-15T10:00:00Z');
  const result5 = next_time_v2('0 0 * * * * WOY:4,15 E1W', testBase2);
  console.log('✅ WOY:4,15 E1W from 2024-04-15:', result5.toISOString());
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.log('❌ Error:', message);
}
console.log('');

console.log('🎉 JCRON V2 Clean Architecture API test completed!');
