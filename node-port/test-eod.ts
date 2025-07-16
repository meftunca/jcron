import { Schedule, endOfDuration, EoDHelpers } from './src/index.ts';

// Test 1: Schedule.endOf() method
const schedule1 = new Schedule('0 9 * * 1-5 EOD:E8h');
console.log('Schedule 1:', schedule1.toString());
console.log('End date:', schedule1.endOf());

// Test 2: endOfDuration convenience function
const endDate = endOfDuration('0 30 14 * * * EOD:E2DT4H');
console.log('End date from function:', endDate);

// Test 3: EoDHelpers usage
const eod = EoDHelpers.endOfMonth(2, 12, 0);
console.log('EoD helper result:', eod.toString());

// Test 4: Schedule.fromObject with EoD
const scheduleFromObj = Schedule.fromObject({
  minute: '0',
  hour: '9',
  dayOfWeek: 'MON-FRI',
  eod: eod
});
console.log('Schedule from object:', scheduleFromObj.toString());
console.log('End date from object schedule:', scheduleFromObj.endOf());
