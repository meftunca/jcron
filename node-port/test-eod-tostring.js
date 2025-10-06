const { fromJCronString } = require('./dist/index.js');

console.log('Testing EOD toString() behavior:');
console.log('='.repeat(50));

const testPatterns = [
  '0 0 0 * * * * EOD:E0D',    // E0D - end of day
  '0 0 0 * * * * EOD:E0W',    // E0W - end of week  
  '0 0 0 * * * * EOD:E1M',    // E1M - end of next month
  '0 0 0 * * * * EOD:S0W',    // S0W - start of week
  '0 0 0 * * * * E0D',        // Direct EOD (without EOD: prefix)
  '0 0 0 * * * * E1W',        // Direct EOD
];

testPatterns.forEach(pattern => {
  console.log(`\nInput pattern: ${pattern}`);
  
  try {
    const schedule = fromJCronString(pattern);
    const reconstructed = schedule.toString();
    
    console.log(`Reconstructed: ${reconstructed}`);
    console.log(`EOD object:`, schedule.eod);
    
    if (schedule.eod) {
      console.log(`EOD toString(): ${schedule.eod.toString()}`);
      console.log(`EOD details:`, {
        years: schedule.eod.years,
        months: schedule.eod.months, 
        weeks: schedule.eod.weeks,
        days: schedule.eod.days,
        hours: schedule.eod.hours,
        minutes: schedule.eod.minutes,
        seconds: schedule.eod.seconds,
        isSOD: schedule.eod.isSOD
      });
    }
    
    // Test if pattern can be re-parsed
    try {
      const reparsed = fromJCronString(reconstructed);
      console.log(`Re-parse: ✅ SUCCESS`);
    } catch (reparseError) {
      console.log(`Re-parse: ❌ FAILED - ${reparseError.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Parse Error: ${error.message}`);
  }
});
