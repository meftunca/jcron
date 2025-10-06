const { fromJCronString } = require('./dist/index.js');

console.log('Testing WOY parsing...');

const tests = [
  '0 0 * * * * * WOY:*',
  '0 0 * * * * * WOY:1',
  '0 0 * * * * * WOY:1,13,26,39,52',
  '0 0 * * * * * WOY:1-4',
];

tests.forEach(pattern => {
  console.log(`\nInput: ${pattern}`);
  try {
    const schedule = fromJCronString(pattern);
    console.log(`Schedule.woy: "${schedule.woy}"`);
    console.log(`toString(): ${schedule.toString()}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
});
