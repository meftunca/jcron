#!/usr/bin/env bun

// Test script for JCRON updated implementation
import { next_time, getNext, parseEoD, Schedule, parse_expression } from './src/index';

console.log('🚀 Testing JCRON Updated Implementation\n');

// Test 1: Traditional Cron (should work as before)
console.log('=== Test 1: Traditional Cron ===');
try {
  const result1 = next_time('0 30 14 * * *', new Date('2024-01-15 10:00:00'));
  console.log('✅ Traditional cron "0 30 14 * * *":', result1.toISOString());
} catch (error) {
  console.log('❌ Traditional cron error:', error.message);
}

// Test 2: Pure EOD Expression (new feature)
console.log('\n=== Test 2: Pure EOD Expressions ===');
try {
  const result2 = next_time('E0W', new Date('2024-01-15 10:00:00')); // This week end
  console.log('✅ Pure EOD "E0W" (this week end):', result2.toISOString());
} catch (error) {
  console.log('❌ Pure EOD error:', error.message);
}

try {
  const result3 = next_time('E1M', new Date('2024-01-15 10:00:00')); // Next month end
  console.log('✅ Pure EOD "E1M" (next month end):', result3.toISOString());
} catch (error) {
  console.log('❌ Pure EOD error:', error.message);
}

// Test 3: SOD Expression (new feature)
console.log('\n=== Test 3: SOD Expressions ===');
try {
  const fromDate = new Date('2024-01-15 10:00:00'); // Monday
  const result4 = next_time('S0W', fromDate); // This week start
  const schedule = parse_expression('S0W');
  console.log('Schedule EOD object:', schedule.eod?.toString());
  console.log('From date (Monday):', fromDate.toISOString());
  console.log('✅ SOD "S0W" (this week start):', result4.toISOString());
  
  // Expected: Monday 00:00:00 (start of week)
  const expected = new Date('2024-01-15 00:00:00'); // Same Monday but start of day
  console.log('Expected start of week (Monday 00:00):', expected.toISOString());
} catch (error) {
  console.log('❌ SOD error:', error.message);
}

// Test 4: WOY (Week of Year) syntax
console.log('\n=== Test 4: WOY Syntax ===');
try {
  const result5 = next_time('0 0 9 * * * WOY:1', new Date('2024-01-15 10:00:00'));
  console.log('✅ WOY "0 0 9 * * * WOY:1" (first week):', result5.toISOString());
} catch (error) {
  console.log('❌ WOY error:', error.message);
}

// Test 5: TZ (Timezone) syntax
console.log('\n=== Test 5: TZ Syntax ===');
try {
  const result6 = next_time('0 0 9 * * * TZ:UTC', new Date('2024-01-15 10:00:00'));
  console.log('✅ TZ "0 0 9 * * * TZ:UTC":', result6.toISOString());
} catch (error) {
  console.log('❌ TZ error:', error.message);
}

// Test 6: Hybrid Expression (cron + EOD)
console.log('\n=== Test 6: Hybrid Expressions ===');
try {
  const result7 = next_time('0 0 9 * * MON EOD:E0M', new Date('2024-01-15 10:00:00'));
  console.log('✅ Hybrid "0 0 9 * * MON EOD:E0M" (Monday 9am + month end):', result7.toISOString());
} catch (error) {
  console.log('❌ Hybrid error:', error.message);
}

// Test 7: Sequential Processing (complex EOD)
console.log('\n=== Test 7: Sequential Processing ===');
try {
  const result8 = next_time('E1M2W', new Date('2024-01-15 10:00:00')); // Next month + 2 weeks end
  console.log('✅ Sequential "E1M2W" (next month + 2 weeks end):', result8.toISOString());
} catch (error) {
  console.log('❌ Sequential error:', error.message);
}

console.log('\n🎉 Test completed!');
