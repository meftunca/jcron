// test-exports.ts
// Quick test to verify all exports are working

import { 
  Engine, 
  Schedule, 
  getNext, 
  getPrev, 
  match, 
  isValid, 
  toString, 
  toResult, 
  fromSchedule,
  Runner,
  fromCronSyntax,
  AVAILABLE_LOCALES
} from './src/index';

console.log('=== JCRON Export System Test ===');

// Test basic schedule
const schedule = fromCronSyntax('0 9 * * *'); // 9:00 AM daily
console.log('Schedule created:', schedule.toString());

// Test convenience functions
const now = new Date('2025-01-01T08:00:00Z');
const nextTime = getNext('0 9 * * *', now);
console.log('Next run time:', nextTime.toISOString());

const prevTime = getPrev('0 9 * * *', now);
console.log('Previous run time:', prevTime.toISOString());

const matches = match('0 9 * * *', new Date('2025-01-01T09:00:00Z'));
console.log('Matches 9:00 AM:', matches);

const valid = isValid('0 9 * * *');
console.log('Schedule is valid:', valid);

// Test humanization
const humanText = toString(schedule, { locale: 'en' });
console.log('Human readable:', humanText);

const detailedResult = toResult(schedule, { locale: 'tr' });
console.log('Turkish description:', detailedResult.description);
console.log('Pattern type:', detailedResult.patternType);

// Test from Schedule
const engineSchedule = fromCronSyntax('30 9,17 * * *');
const humanFromSchedule = fromSchedule(engineSchedule);
console.log('From Schedule:', humanFromSchedule);

// Test locale availability
console.log('\n=== Available Locales ===');
console.log('Available locales:', AVAILABLE_LOCALES);

console.log('\n=== Test completed successfully! ===');
