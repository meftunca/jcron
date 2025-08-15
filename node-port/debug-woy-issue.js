// Debug script for Week of Year (WOY) issue with isRangeNow
import { fromJCronString } from './dist/schedule.js';
import { Engine } from './dist/engine.js';

// Test scenario
const cronExpression = "0 0 9 * * * WOY:1,4,6,11,15,7,19,23,27,31,35,39,42,50 TZ:Europe/Istanbul EOD:E1W";

// Test different hours on the same day
const testTimes = [
  new Date('2024-12-30T05:00:00.000Z'), // Before trigger (2am Istanbul)
  new Date('2024-12-30T06:00:00.000Z'), // At trigger (9am Istanbul)
  new Date('2024-12-30T08:00:00.000Z'), // After trigger (11am Istanbul)
  new Date('2024-12-30T15:00:00.000Z'), // Afternoon (6pm Istanbul)
  new Date('2024-12-30T21:00:00.000Z'), // Evening (midnight Istanbul)
];

console.log("=== WOY isRangeNow Debug - Multiple Times ===");
console.log(`Expression: ${cronExpression}`);

try {
  const schedule = fromJCronString(cronExpression);
  
  console.log("\n--- Schedule Details ---");
  console.log(`Schedule string: ${schedule.toString()}`);
  console.log(`WOY: ${schedule.woy}`);
  console.log(`TZ: ${schedule.tz}`);
  console.log(`EOD: ${schedule.eod?.toString()}`);
  
  // Test each time
  testTimes.forEach((testDate, index) => {
    console.log(`\n=== Test ${index + 1}: ${testDate.toISOString()} ===`);
    
    // Get week number for test date
    const weekNumber = getWeekOfYear(testDate);
    console.log(`Week number: ${weekNumber}`);
    console.log(`WOY includes week ${weekNumber}? ${schedule.woy && schedule.woy.includes(weekNumber.toString())}`);
    
    // Test isRangeNow
    const isRange = schedule.isRangeNow(testDate);
    console.log(`isRangeNow result: ${isRange}`);
    
    // Get start and end times
    const start = schedule.startOf(testDate);
    const engine = new Engine();
    const next = engine.next(schedule, testDate);
    const prev = engine.prev(schedule, testDate);
    
    console.log(`Previous trigger: ${prev ? prev.toISOString() : 'null'}`);
    console.log(`Start of range: ${start ? start.toISOString() : 'null'}`);
    console.log(`Next trigger: ${next ? next.toISOString() : 'null'}`);
    
    if (schedule.eod && start) {
      const end = schedule.eod.calculateEndDate(start);
      console.log(`End of range: ${end.toISOString()}`);
      console.log(`Test is after start: ${testDate >= start}`);
      console.log(`Test is before end: ${testDate <= end}`);
    }
  });
  
} catch (error) {
  console.error("Error:", error.message);
}

// Helper function to get week of year (ISO 8601)
function getWeekOfYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
