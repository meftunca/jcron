// benchmark/comprehensive-all.js

import Benchmark from 'benchmark';
import { Engine } from '../dist/engine.js';
import { fromCronSyntax, fromJCronString, Schedule, validateSchedule, isValidScheduleObject } from '../dist/schedule.js';
import { parseEoD, createEoD, isValidEoD, EoDHelpers } from '../dist/eod.js';
import { 
  toString as humanizeToString,
  toResult as humanizeToResult,
  fromSchedule as humanizeFromSchedule,
  registerLocale,
  getSupportedLocales,
  isLocaleSupported,
  getDetectedLocale,
  setDefaultLocale
} from '../dist/humanize/index.js';
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

console.log("🚀 JCRON Comprehensive Benchmark - All Computation Modules");
console.log("=".repeat(70));

const engine = new Engine();
const testDate = new Date('2024-01-15T10:30:00Z');
const testDateISO = testDate.toISOString();

// Comprehensive test data
const testSchedules = {
  simple: fromCronSyntax('* * * * * *'),
  everyMinute: fromCronSyntax('0 * * * * *'),
  hourly: fromCronSyntax('0 0 * * * *'),
  daily: fromCronSyntax('0 0 12 * * *'),
  weekly: fromCronSyntax('0 0 9 * * 1'),
  monthly: fromCronSyntax('0 0 9 1 * *'),
  businessHours: fromCronSyntax('0 */15 9-17 * * 1-5'),
  complex: fromCronSyntax('0 5,15,25,35,45,55 8-17 ? * 1-5'),
  withSpecialChars: new Schedule('0', '0', '12', 'L', '*', '5#3', null, null, 'UTC'),
  withTimezone: new Schedule('0', '30', '9', '*', '*', '1-5', null, null, 'America/New_York'),
  withWeekOfYear: fromJCronString('0 0 12 * * * WOY:1,26,52'),
  withEoD: fromJCronString('0 0 9 * * 1-5 EOD:E30D'),
  stressTest: fromCronSyntax('* 0-59 0-23 1-31 1-12 0-6'),
};

const testStrings = {
  simple: '* * * * * *',
  businessHours: '0 */15 9-17 * * 1-5',
  complex: '0 5,15,25,35,45,55 8-17 ? * 1-5',
  jcronTZ: '0 30 9 * * 1-5 TZ:America/New_York',
  jcronWOY: '0 0 12 * * * WOY:1,26,52',
  jcronEoD: '0 0 9 * * 1-5 EOD:E30D',
  jcronComplex: '0 */10 8-18 1-15,L * 1-5 TZ:Europe/London WOY:10-40 EOD:E60D',
  invalid: '* * * * * * * *',
};

const testEoDStrings = [
  'E30D',
  'E1H30M',
  'E1DT12H M',
  'S30M',
  'E2W3D',
  'E1Y6M15D',
  'E1H',
  'E45M15S'
];

const results = [];

function runBenchmarkSuite(suiteName, tests, callback) {
  console.log(`\n📊 ${suiteName}`);
  console.log("-".repeat(50));
  
  const suite = new Benchmark.Suite();
  
  tests.forEach(test => {
    suite.add(test.name, test.fn);
  });
  
  suite
    .on('cycle', (event) => {
      const result = String(event.target);
      console.log('  ' + result);
      results.push(`${suiteName} - ${result}`);
    })
    .on('complete', function () {
      const fastest = this.filter('fastest').map('name')[0];
      console.log(`  🏆 Fastest: ${fastest}`);
      results.push(`${suiteName} - Fastest: ${fastest}\n`);
      
      if (callback) callback();
    })
    .run({ async: false });
}

// 1. CORE ENGINE TESTS
runBenchmarkSuite("Core Engine Operations", [
  {
    name: "Engine.next() - Simple Pattern",
    fn: () => engine.next(testSchedules.simple, testDate)
  },
  {
    name: "Engine.next() - Business Hours",
    fn: () => engine.next(testSchedules.businessHours, testDate)
  },
  {
    name: "Engine.next() - Complex Pattern",
    fn: () => engine.next(testSchedules.complex, testDate)
  },
  {
    name: "Engine.next() - With Timezone",
    fn: () => engine.next(testSchedules.withTimezone, testDate)
  },
  {
    name: "Engine.next() - With Week of Year",
    fn: () => engine.next(testSchedules.withWeekOfYear, testDate)
  },
  {
    name: "Engine.prev() - Business Hours",
    fn: () => engine.prev(testSchedules.businessHours, testDate)
  },
  {
    name: "Engine.isMatch() - Simple",
    fn: () => engine.isMatch(testSchedules.simple, testDate)
  },
  {
    name: "Engine.isMatch() - Complex",
    fn: () => engine.isMatch(testSchedules.complex, testDate)
  },
], () => {

// 2. SCHEDULE PARSING TESTS
runBenchmarkSuite("Schedule Parsing & Validation", [
  {
    name: "fromCronSyntax() - Simple",
    fn: () => fromCronSyntax(testStrings.simple)
  },
  {
    name: "fromCronSyntax() - Complex",
    fn: () => fromCronSyntax(testStrings.complex)
  },
  {
    name: "fromJCronString() - With Timezone",
    fn: () => fromJCronString(testStrings.jcronTZ)
  },
  {
    name: "fromJCronString() - With WOY",
    fn: () => fromJCronString(testStrings.jcronWOY)
  },
  {
    name: "fromJCronString() - With EoD",
    fn: () => fromJCronString(testStrings.jcronEoD)
  },
  {
    name: "fromJCronString() - Complex JCRON",
    fn: () => fromJCronString(testStrings.jcronComplex)
  },
  {
    name: "Schedule Constructor - Direct",
    fn: () => new Schedule('0', '30', '9', '*', '*', '1-5')
  },
  {
    name: "Schedule Constructor - With Timezone",
    fn: () => new Schedule('0', '30', '9', '*', '*', '1-5', null, null, 'UTC')
  },
  {
    name: "validateSchedule() - Valid",
    fn: () => validateSchedule(testSchedules.businessHours)
  },
  {
    name: "isValidScheduleObject() - Check",
    fn: () => isValidScheduleObject(testSchedules.businessHours)
  },
], () => {

// 3. CONVENIENCE FUNCTIONS TESTS
runBenchmarkSuite("Convenience Functions", [
  {
    name: "getNext() - String Input",
    fn: () => getNext(testStrings.businessHours, testDate)
  },
  {
    name: "getNext() - Schedule Input",
    fn: () => getNext(testSchedules.businessHours, testDate)
  },
  {
    name: "getPrev() - String Input",
    fn: () => getPrev(testStrings.businessHours, testDate)
  },
  {
    name: "getNextN() - 5 iterations",
    fn: () => getNextN(testStrings.businessHours, 5, testDate)
  },
  {
    name: "getNextN() - 10 iterations",
    fn: () => getNextN(testStrings.businessHours, 10, testDate)
  },
  {
    name: "match() - String Input",
    fn: () => match(testStrings.simple, testDate)
  },
  {
    name: "match() - Schedule Input",
    fn: () => match(testSchedules.businessHours, testDate)
  },
  {
    name: "isTime() - With Tolerance",
    fn: () => isTime(testStrings.businessHours, testDate, 1000)
  },
], () => {

// 4. VALIDATION FUNCTIONS TESTS
runBenchmarkSuite("Validation Functions", [
  {
    name: "isValid() - Simple Cron",
    fn: () => isValid(testStrings.simple)
  },
  {
    name: "isValid() - Complex Cron",
    fn: () => isValid(testStrings.complex)
  },
  {
    name: "isValid() - JCRON with TZ",
    fn: () => isValid(testStrings.jcronTZ)
  },
  {
    name: "isValid() - Invalid Expression",
    fn: () => isValid(testStrings.invalid)
  },
  {
    name: "validateCron() - Valid Expression",
    fn: () => validateCron(testStrings.businessHours)
  },
  {
    name: "validateCron() - Invalid Expression",
    fn: () => validateCron(testStrings.invalid)
  },
  {
    name: "getPattern() - Business Hours",
    fn: () => getPattern(testStrings.businessHours)
  },
  {
    name: "matchPattern() - Weekly Check",
    fn: () => matchPattern(testStrings.businessHours, 'weekly')
  },
], () => {

// 5. END-OF-DURATION (EoD) TESTS
runBenchmarkSuite("End-of-Duration (EoD) Operations", [
  {
    name: "parseEoD() - Simple (E30D)",
    fn: () => parseEoD(testEoDStrings[0])
  },
  {
    name: "parseEoD() - Time (E1H30M)",
    fn: () => parseEoD(testEoDStrings[1])
  },
  {
    name: "parseEoD() - Complex (E1DT12H M)",
    fn: () => parseEoD(testEoDStrings[2])
  },
  {
    name: "parseEoD() - Start (S30M)",
    fn: () => parseEoD(testEoDStrings[3])
  },
  {
    name: "createEoD() - Days",
    fn: () => createEoD(0, 0, 0, 30)
  },
  {
    name: "createEoD() - Complex",
    fn: () => createEoD(1, 6, 0, 15, 12)
  },
  {
    name: "isValidEoD() - Valid",
    fn: () => isValidEoD(testEoDStrings[0])
  },
  {
    name: "isValidEoD() - Invalid",
    fn: () => isValidEoD('invalid-eod')
  },
  {
    name: "endOfDuration() - Calculate",
    fn: () => endOfDuration(testSchedules.withEoD, testDate)
  },
], () => {

// 6. HUMANIZATION TESTS
runBenchmarkSuite("Humanization Functions", [
  {
    name: "humanizeToString() - Simple",
    fn: () => humanizeToString(testStrings.simple)
  },
  {
    name: "humanizeToString() - Business Hours",
    fn: () => humanizeToString(testStrings.businessHours)
  },
  {
    name: "humanizeToString() - Complex",
    fn: () => humanizeToString(testStrings.complex)
  },
  {
    name: "humanizeToResult() - With Options",
    fn: () => humanizeToResult(testStrings.businessHours, { locale: 'en', verbose: true })
  },
  {
    name: "humanizeFromSchedule() - Schedule Object",
    fn: () => humanizeFromSchedule(testSchedules.businessHours)
  },
  {
    name: "getSupportedLocales() - List",
    fn: () => getSupportedLocales()
  },
  {
    name: "isLocaleSupported() - Check",
    fn: () => isLocaleSupported('en')
  },
  {
    name: "getDetectedLocale() - Detect",
    fn: () => getDetectedLocale()
  },
], () => {

// 7. STRESS TESTS
runBenchmarkSuite("Stress Tests", [
  {
    name: "Batch Processing - 100 getNext() calls",
    fn: () => {
      for (let i = 0; i < 100; i++) {
        getNext(testStrings.businessHours, testDate);
      }
    }
  },
  {
    name: "Batch Validation - 100 isValid() calls",
    fn: () => {
      for (let i = 0; i < 100; i++) {
        isValid(testStrings.businessHours);
      }
    }
  },
  {
    name: "Batch Parsing - 100 fromCronSyntax() calls",
    fn: () => {
      for (let i = 0; i < 100; i++) {
        fromCronSyntax(testStrings.businessHours);
      }
    }
  },
  {
    name: "Heavy getNextN() - 50 iterations",
    fn: () => getNextN(testStrings.simple, 50, testDate)
  },
  {
    name: "Complex Schedule Matching - 100 isMatch() calls",
    fn: () => {
      for (let i = 0; i < 100; i++) {
        engine.isMatch(testSchedules.complex, testDate);
      }
    }
  },
  {
    name: "EoD Parsing Stress - 100 parseEoD() calls",
    fn: () => {
      for (let i = 0; i < 100; i++) {
        parseEoD('E30D');
      }
    }
  },
  {
    name: "Humanization Stress - 50 toString() calls",
    fn: () => {
      for (let i = 0; i < 50; i++) {
        humanizeToString(testStrings.businessHours);
      }
    }
  },
], () => {

// 8. CACHE PERFORMANCE TESTS
runBenchmarkSuite("Cache Performance", [
  {
    name: "Cache Miss - New Schedule Each Time",
    fn: () => {
      const schedule = fromCronSyntax('0 */15 9-17 * * 1-5');
      engine.next(schedule, testDate);
    }
  },
  {
    name: "Cache Hit - Reused Schedule",
    fn: () => engine.next(testSchedules.businessHours, testDate)
  },
  {
    name: "Parser Cache - Repeated fromCronSyntax()",
    fn: () => fromCronSyntax('0 */15 9-17 * * 1-5')
  },
  {
    name: "Validation Cache - Repeated isValid()",
    fn: () => isValid('0 */15 9-17 * * 1-5')
  },
], () => {

// Final summary
console.log("\n" + "=".repeat(70));
console.log("🎉 Comprehensive Benchmark Complete!");
console.log("=".repeat(70));
console.log(`\n📝 Total Tests Run: ${results.length}`);
console.log("🔍 Key Performance Areas Tested:");
console.log("  ✅ Core Engine Operations (next, prev, isMatch)");
console.log("  ✅ Schedule Parsing & Validation");
console.log("  ✅ Convenience Functions");
console.log("  ✅ Validation Functions");
console.log("  ✅ End-of-Duration (EoD) Operations");
console.log("  ✅ Humanization Functions");
console.log("  ✅ Stress Tests & Batch Operations");
console.log("  ✅ Cache Performance");

});
});
});
});
});
});
});
});
