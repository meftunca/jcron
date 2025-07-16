import { Schedule, endOfDuration, EoDHelpers, fromJCronString } from './src/index.ts';

// Debug: Test parsing EOD from string
console.log('=== Testing EOD parsing ===');

// Test 1: Direct JCRON string with EOD
const jcronStr = '0 30 14 * * * EOD:E2DT4H';
console.log('Input JCRON string:', jcronStr);

try {
  const schedule = fromJCronString(jcronStr);
  console.log('Parsed schedule:', schedule.toString());
  console.log('EOD property:', schedule.eod);
  console.log('End date:', schedule.endOf());
} catch (error) {
  console.error('Error parsing JCRON string:', error);
}

// Test 2: Direct Schedule constructor
console.log('\n=== Schedule constructor ===');
const schedule2 = new Schedule('0 30 14 * * * EOD:E2DT4H');
console.log('Schedule 2:', schedule2.toString());
console.log('EOD property:', schedule2.eod);
console.log('End date:', schedule2.endOf());

// Test 3: Testing endOfDuration function with valid schedule
console.log('\n=== EndOfDuration function ===');
const endDate = endOfDuration(schedule2);
console.log('End date from function:', endDate);
