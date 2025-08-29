const { fromJCronString, Engine } = require('./dist/index.js');

console.log('Testing SPECIFIC DST transition moments:');
console.log('='.repeat(60));

const engine = new Engine();

// Turkey 2024 DST transitions:
// Spring: March 31, 2024 03:00 → 04:00 (clocks forward)  
// Fall: October 27, 2024 04:00 → 03:00 (clocks back)

const criticalTimes = [
  {
    description: "Just before spring DST (March 31, 02:59 Istanbul)",
    utcTime: "2024-03-31T00:59:00.000Z", // 02:59 Istanbul time
    pattern: "0 0 3 * * * * TZ:Europe/Istanbul"
  },
  {
    description: "During spring DST gap (March 31, 03:30 - this time doesn't exist!)",
    utcTime: "2024-03-31T01:30:00.000Z", // Would be 03:30 Istanbul but jumps to 04:30
    pattern: "0 0 3 * * * * TZ:Europe/Istanbul"
  },
  {
    description: "After spring DST (March 31, 04:30 Istanbul)",
    utcTime: "2024-03-31T01:30:00.000Z", // 04:30 Istanbul time (summer time)
    pattern: "0 0 4 * * * * TZ:Europe/Istanbul"
  },
  {
    description: "Just before fall DST (October 27, 03:59 Istanbul)",
    utcTime: "2024-10-27T00:59:00.000Z", // 03:59 Istanbul time
    pattern: "0 0 3 * * * * TZ:Europe/Istanbul"
  },
  {
    description: "During fall DST overlap (October 27, 03:30 - this time happens twice!)",
    utcTime: "2024-10-27T00:30:00.000Z", // First occurrence of 03:30
    pattern: "0 0 3 * * * * TZ:Europe/Istanbul"
  }
];

criticalTimes.forEach((test, index) => {
  const testDate = new Date(test.utcTime);
  
  console.log(`Test ${index + 1}: ${test.description}`);
  console.log(`UTC: ${testDate.toISOString()}`);
  console.log(`Istanbul: ${testDate.toLocaleString('en-US', { 
    timeZone: 'Europe/Istanbul',
    hour12: false,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}`);
  
  try {
    const schedule = fromJCronString(test.pattern);
    const nextTrigger = engine.next(schedule, testDate);
    const prevTrigger = engine.prev(schedule, testDate);
    
    console.log(`Next trigger UTC: ${nextTrigger.toISOString()}`);
    console.log(`Next trigger Istanbul: ${nextTrigger.toLocaleString('en-US', { 
      timeZone: 'Europe/Istanbul',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit', 
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })}`);
    
    // Check if the triggers make sense during DST transitions
    const istanbulHour = parseInt(nextTrigger.toLocaleString('en-US', { 
      timeZone: 'Europe/Istanbul',
      hour: '2-digit'
    }));
    
    const expectedHour = parseInt(test.pattern.split(' ')[2]);
    console.log(`Expected Istanbul hour: ${expectedHour}, Got: ${istanbulHour} ${expectedHour === istanbulHour ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('');
});
