const { fromJCronString, Engine } = require('./dist/index.js');

console.log('Testing DST (Daylight Saving Time) scenarios:');
console.log('='.repeat(60));

// Turkey DST dates for reference:
// Spring: Last Sunday in March (clocks forward 1 hour: 03:00 → 04:00)
// Fall: Last Sunday in October (clocks back 1 hour: 04:00 → 03:00)

const engine = new Engine();

const testCases = [
  {
    description: "DST Spring transition - March 31, 2024 (clocks forward)",
    testTime: "2024-03-31T02:30:00.000Z", // Just before DST change
    pattern: "0 0 * * * * * WOY:13 TZ:Europe/Istanbul EOD:E0W"
  },
  {
    description: "DST Fall transition - October 27, 2024 (clocks back)", 
    testTime: "2024-10-27T02:30:00.000Z", // Just before DST change
    pattern: "0 0 * * * * * WOY:43 TZ:Europe/Istanbul EOD:E0W"
  },
  {
    description: "Normal summer time",
    testTime: "2024-07-15T12:00:00.000Z", // Summer time
    pattern: "0 0 * * * * * WOY:29 TZ:Europe/Istanbul EOD:E0W"
  },
  {
    description: "Normal winter time", 
    testTime: "2024-12-15T12:00:00.000Z", // Winter time
    pattern: "0 0 * * * * * WOY:50 TZ:Europe/Istanbul EOD:E0W"
  }
];

// Helper to get ISO week
const getISOWeek = (date) => {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};

testCases.forEach((testCase, index) => {
  const testDate = new Date(testCase.testTime);
  const week = getISOWeek(testDate);
  
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`UTC Time: ${testDate.toISOString()}`);
  console.log(`Istanbul Local: ${testDate.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })}`);
  console.log(`Week: ${week}`);
  
  try {
    const schedule = fromJCronString(testCase.pattern);
    
    // Test basic functionality
    const isInRange = schedule.isRangeNow(testDate);
    const nextTrigger = engine.next(schedule, testDate);
    const prevTrigger = engine.prev(schedule, testDate);
    
    console.log(`isRangeNow: ${isInRange}`);
    console.log(`Next trigger: ${nextTrigger.toISOString()} (Istanbul: ${nextTrigger.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })})`);
    console.log(`Prev trigger: ${prevTrigger.toISOString()} (Istanbul: ${prevTrigger.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })})`);
    
    // Check if EOD calculation looks reasonable
    if (schedule.eod && isInRange) {
      const endTime = schedule.eod.calculateEndDate(prevTrigger);
      console.log(`End time: ${endTime.toISOString()} (Istanbul: ${endTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })})`);
      
      // Check if range calculation looks correct
      const isWithinRange = testDate >= prevTrigger && testDate <= endTime;
      console.log(`Range check: ${isWithinRange ? '✅ Correct' : '❌ Wrong'}`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('');
});
