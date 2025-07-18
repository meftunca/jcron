// benchmark/comprehensive.bench.js

import * as Benchmark from 'benchmark';
import { Engine } from '../dist/engine.js';
import { fromCronSyntax, fromJCronString, Schedule } from '../dist/schedule.js';
import { 
  getNext, 
  getPrev, 
  getNextN, 
  match, 
  isValid, 
  isTime,
  validateCron,
  getPattern,
  matchPattern,
  endOfDuration
} from '../dist/index.js';

console.log("🚀 JCRON Kapsamlı Benchmark Testi");
console.log("=" .repeat(50));

const engine = new Engine();
const testDate = new Date('2024-01-15T10:30:00Z');
const testDate2 = new Date('2024-06-15T14:20:30Z');

// Test schedules for different scenarios
const testSchedules = {
  // Basic patterns
  everySecond: fromCronSyntax('* * * * * *'),
  everyMinute: fromCronSyntax('0 * * * * *'),
  hourly: fromCronSyntax('0 0 * * * *'),
  daily: fromCronSyntax('0 0 12 * * *'),
  weekly: fromCronSyntax('0 0 9 * * 1'),
  monthly: fromCronSyntax('0 0 9 1 * *'),
  yearly: fromCronSyntax('0 0 12 1 1 *'),
  
  // Complex patterns
  businessHours: fromCronSyntax('0 */15 9-17 * * 1-5'),
  multipleHours: fromCronSyntax('0 0 6,12,18 * * *'),
  weekendOnly: fromCronSyntax('0 0 10 * * 0,6'),
  lastDayOfMonth: new Schedule('0', '0', '23', 'L', '*', '*'),
  
  // Special characters
  withHash: new Schedule('0', '30', '9', '*', '*', '1#2'), // Second Monday
  withLast: new Schedule('0', '0', '17', '*', '*', '5L'), // Last Friday
  stepValues: fromCronSyntax('0 */5 */2 */3 * *'),
  ranges: fromCronSyntax('0 15-45 8-16 1-15 * 1-5'),
  
  // JCRON extensions
  withTimezone: new Schedule('0', '30', '9', '*', '*', '1-5', null, null, 'America/New_York'),
  withWeekOfYear: fromJCronString('0 0 12 * * * WOY:1,26,52'),
  withEoD: fromJCronString('0 0 9 * * 1-5 EOD:+30d'),
  
  // Complex combinations
  complexMixed: fromJCronString('0 */10 8-18 1-15,L * 1-5 TZ:Europe/London WOY:10-40'),
  
  // Performance stress tests
  manyValues: fromCronSyntax('0 0,5,10,15,20,25,30,35,40,45,50,55 * * * *'),
  wideRanges: fromCronSyntax('* 0-59 0-23 1-31 1-12 0-6'),
};

// Test expressions as strings
const testExpressions = {
  simple: '* * * * * *',
  businessHours: '0 */15 9-17 * * 1-5',
  complex: '0 5,15,25,35,45,55 8-17 ? * 1-5',
  jcronWithTZ: '0 30 9 * * 1-5 TZ:America/New_York',
  jcronWithWOY: '0 0 12 * * * WOY:1,26,52',
  jcronWithEoD: '0 0 9 * * 1-5 EOD:+30d',
  invalid: '* * * * * * * *', // Too many fields
};

console.log("\n📊 Engine Core Methods");
console.log("-".repeat(30));

const engineSuite = new Benchmark.Suite('Engine Core');

engineSuite
  .add('Engine.next() - Every Second', () => {
    engine.next(testSchedules.everySecond, testDate);
  })
  .add('Engine.next() - Business Hours', () => {
    engine.next(testSchedules.businessHours, testDate);
  })
  .add('Engine.next() - Complex Mixed', () => {
    engine.next(testSchedules.complexMixed, testDate);
  })
  .add('Engine.next() - With Timezone', () => {
    engine.next(testSchedules.withTimezone, testDate);
  })
  .add('Engine.prev() - Business Hours', () => {
    engine.prev(testSchedules.businessHours, testDate);
  })
  .add('Engine.isMatch() - Hourly', () => {
    engine.isMatch(testSchedules.hourly, testDate);
  })
  .add('Engine.isMatch() - Complex', () => {
    engine.isMatch(testSchedules.complexMixed, testDate);
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

console.log("\n🔧 Convenience Functions");
console.log("-".repeat(30));

const convenienceSuite = new Benchmark.Suite('Convenience Functions');

convenienceSuite
  .add('getNext() - String Input', () => {
    getNext(testExpressions.businessHours, testDate);
  })
  .add('getNext() - Schedule Input', () => {
    getNext(testSchedules.businessHours, testDate);
  })
  .add('getPrev() - String Input', () => {
    getPrev(testExpressions.businessHours, testDate);
  })
  .add('getNextN() - 5 iterations', () => {
    getNextN(testExpressions.businessHours, 5, testDate);
  })
  .add('getNextN() - 10 iterations', () => {
    getNextN(testExpressions.businessHours, 10, testDate);
  })
  .add('match() - String Input', () => {
    match(testExpressions.simple, testDate);
  })
  .add('match() - Schedule Input', () => {
    match(testSchedules.businessHours, testDate);
  })
  .add('isTime() - With Tolerance', () => {
    isTime(testExpressions.businessHours, testDate, 1000);
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

console.log("\n✅ Validation Functions");
console.log("-".repeat(30));

const validationSuite = new Benchmark.Suite('Validation');

validationSuite
  .add('isValid() - Simple Cron', () => {
    isValid(testExpressions.simple);
  })
  .add('isValid() - Complex Cron', () => {
    isValid(testExpressions.complex);
  })
  .add('isValid() - JCRON with TZ', () => {
    isValid(testExpressions.jcronWithTZ);
  })
  .add('isValid() - Invalid Expression', () => {
    isValid(testExpressions.invalid);
  })
  .add('validateCron() - Valid Expression', () => {
    validateCron(testExpressions.businessHours);
  })
  .add('validateCron() - Invalid Expression', () => {
    validateCron(testExpressions.invalid);
  })
  .add('getPattern() - Business Hours', () => {
    getPattern(testExpressions.businessHours);
  })
  .add('matchPattern() - Weekly Check', () => {
    matchPattern(testExpressions.businessHours, 'weekly');
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

console.log("\n🔄 Parsing Functions");
console.log("-".repeat(30));

const parsingSuite = new Benchmark.Suite('Parsing');

parsingSuite
  .add('fromCronSyntax() - Simple', () => {
    fromCronSyntax(testExpressions.simple);
  })
  .add('fromCronSyntax() - Complex', () => {
    fromCronSyntax(testExpressions.complex);
  })
  .add('fromJCronString() - With TZ', () => {
    fromJCronString(testExpressions.jcronWithTZ);
  })
  .add('fromJCronString() - With WOY', () => {
    fromJCronString(testExpressions.jcronWithWOY);
  })
  .add('fromJCronString() - With EoD', () => {
    fromJCronString(testExpressions.jcronWithEoD);
  })
  .add('Schedule Constructor - Direct', () => {
    new Schedule('0', '30', '9', '*', '*', '1-5');
  })
  .add('Schedule Constructor - With TZ', () => {
    new Schedule('0', '30', '9', '*', '*', '1-5', null, null, 'UTC');
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

console.log("\n🎯 Special Features");
console.log("-".repeat(30));

const specialSuite = new Benchmark.Suite('Special Features');

specialSuite
  .add('Last Day of Month (L)', () => {
    engine.next(testSchedules.lastDayOfMonth, testDate);
  })
  .add('Nth Weekday (#)', () => {
    engine.next(testSchedules.withHash, testDate);
  })
  .add('Last Weekday (L)', () => {
    engine.next(testSchedules.withLast, testDate);
  })
  .add('Week of Year', () => {
    engine.next(testSchedules.withWeekOfYear, testDate);
  })
  .add('End of Duration', () => {
    endOfDuration(testSchedules.withEoD, testDate);
  })
  .add('Timezone Conversion', () => {
    engine.next(testSchedules.withTimezone, testDate);
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

console.log("\n⚡ Performance Stress Tests");
console.log("-".repeat(30));

const stressSuite = new Benchmark.Suite('Stress Tests');

stressSuite
  .add('Many Values (12 times/hour)', () => {
    engine.next(testSchedules.manyValues, testDate);
  })
  .add('Wide Ranges (Every combination)', () => {
    engine.next(testSchedules.wideRanges, testDate);
  })
  .add('getNextN() - 50 iterations', () => {
    getNextN(testExpressions.businessHours, 50, testDate);
  })
  .add('getNextN() - 100 iterations', () => {
    getNextN(testExpressions.simple, 100, testDate);
  })
  .add('Repeated Validation (100x)', () => {
    for (let i = 0; i < 100; i++) {
      isValid(testExpressions.businessHours);
    }
  })
  .add('Repeated Parsing (100x)', () => {
    for (let i = 0; i < 100; i++) {
      fromCronSyntax(testExpressions.businessHours);
    }
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

// Memory usage test
console.log("\n💾 Memory Usage Test");
console.log("-".repeat(30));

const memSuite = new Benchmark.Suite('Memory');

memSuite
  .add('Schedule Creation (No Cache)', () => {
    // Create new schedule each time to test memory usage
    const schedule = fromCronSyntax('0 */15 9-17 * * 1-5');
    engine.next(schedule, testDate);
  })
  .add('Schedule Reuse (With Cache)', () => {
    // Reuse same schedule to test caching effectiveness
    engine.next(testSchedules.businessHours, testDate);
  })
  .on('cycle', (event) => {
    console.log('  ' + String(event.target));
  })
  .on('complete', function () {
    console.log('  🏆 Fastest: ' + this.filter('fastest').map('name'));
  });

// Run all suites sequentially
async function runBenchmarks() {
  console.log("\n🏁 Starting Comprehensive Benchmark Tests...\n");
  
  return new Promise((resolve) => {
    engineSuite.run({ async: true });
    
    engineSuite.on('complete', () => {
      convenienceSuite.run({ async: true });
      
      convenienceSuite.on('complete', () => {
        validationSuite.run({ async: true });
        
        validationSuite.on('complete', () => {
          parsingSuite.run({ async: true });
          
          parsingSuite.on('complete', () => {
            specialSuite.run({ async: true });
            
            specialSuite.on('complete', () => {
              stressSuite.run({ async: true });
              
              stressSuite.on('complete', () => {
                memSuite.run({ async: true });
                
                memSuite.on('complete', () => {
                  console.log("\n" + "=".repeat(50));
                  console.log("🎉 Tüm Benchmark Testleri Tamamlandı!");
                  console.log("=".repeat(50));
                  resolve();
                });
              });
            });
          });
        });
      });
    });
  });
}

runBenchmarks();
