import { 
  Schedule, 
  endOfDuration, 
  EoDHelpers, 
  fromJCronString,
  toString,
  getNext,
  isValid 
} from './src/index.ts';

console.log('=== JCron EOD Integration Test ===');

// Test 1: Basic EOD functionality
console.log('\n1. Basic EOD Integration:');
const schedule1 = fromJCronString('0 9 * * 1-5 EOD:E8h');
console.log('Schedule:', schedule1.toString());
console.log('Human readable:', toString(schedule1));
console.log('Next run:', getNext(schedule1).toLocaleString());
console.log('Session ends:', schedule1.endOf()?.toLocaleString());

// Test 2: Schedule.fromObject with EOD
console.log('\n2. Schedule.fromObject with EOD:');
const schedule2 = Schedule.fromObject({
  minute: '30',
  hour: '14',
  dayOfWeek: 'MON-FRI',
  eod: EoDHelpers.endOfMonth(2, 12, 0)
});
console.log('Schedule:', schedule2.toString());
console.log('Ends at:', schedule2.endOf()?.toLocaleDateString());

// Test 3: endOfDuration convenience function
console.log('\n3. endOfDuration function:');
const endDate = endOfDuration('0 0 2 * * * EOD:E1DT6H Q');
console.log('End date:', endDate?.toLocaleDateString());

// Test 4: Validation
console.log('\n4. Validation:');
console.log('Valid schedule:', isValid('0 30 9 * * MON-FRI'));
console.log('Valid EOD string:', isValid('0 9 * * 1-5 EOD:E8h'));

console.log('\n✅ All EOD integration tests completed successfully!');
