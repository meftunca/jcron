const { fromJCronString } = require('./dist/index.js');

console.log('Testing cron field parsing...');

const tests = [
  '30 14 * * * *',      // 6-field (s m h D M dow)
  '14 * * * *',         // 5-field (m h D M dow) -> should add s=0
  '0 30 14 * * * *',    // 7-field (s m h D M dow Y)
];

tests.forEach(pattern => {
  console.log(`\nInput: ${pattern}`);
  try {
    const schedule = fromJCronString(pattern);
    console.log(`Fields: s="${schedule.s}" m="${schedule.m}" h="${schedule.h}" D="${schedule.D}" M="${schedule.M}" dow="${schedule.dow}" Y="${schedule.Y}"`);
    console.log(`toString(): ${schedule.toString()}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
});
