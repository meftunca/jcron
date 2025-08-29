// Week verification for August 10, 2025

const aug10 = new Date('2025-08-10T00:00:00+03:00');

console.log('=== August 10, 2025 Analysis ===');
console.log(`Date: ${aug10.toLocaleDateString('tr-TR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}`);
console.log(`Day of Week: ${aug10.getDay()} (0=Sunday, 1=Monday...)`);

// ISO Week calculation
const isoWeek = getISOWeek(aug10);
console.log(`ISO Week: ${isoWeek}`);

// Manual week calculation
const startOfYear = new Date(2025, 0, 1); // January 1, 2025
const daysSinceStart = Math.floor((aug10.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
const simpleWeek = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
console.log(`Simple Week: ${simpleWeek}`);

// Different week calculation methods
console.log('\n=== Different Week Calculations ===');

// Method 1: Start of year based
const jan1 = new Date(2025, 0, 1);
const jan1Day = jan1.getDay(); // 0=Sunday, 1=Monday...
console.log(`January 1, 2025 was: ${jan1.toLocaleDateString('tr-TR', {weekday: 'long'})} (day ${jan1Day})`);

// Method 2: Week 1 definition - first week with at least 4 days in the year
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

console.log(`ISO 8601 Week: ${getWeekNumber(aug10)}`);

// Method 3: Check week boundaries for Week 32
const week32Start = new Date(2025, 7, 4); // August 4, 2025 (Monday)
const week32End = new Date(2025, 7, 10);   // August 10, 2025 (Sunday)

console.log(`\n=== Week 32 Boundaries ===`);
console.log(`Week 32 Start: ${week32Start.toLocaleDateString('tr-TR', {weekday: 'long', month: 'long', day: 'numeric'})}`);
console.log(`Week 32 End: ${week32End.toLocaleDateString('tr-TR', {weekday: 'long', month: 'long', day: 'numeric'})}`);

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

console.log(`\n=== Final Verification ===`);
console.log(`August 10, 2025 is Week: ${getWeekNumber(aug10)}`);
console.log(`August 10, 2025 is ISO Week: ${getISOWeek(aug10)}`);
