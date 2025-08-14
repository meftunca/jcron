// tests/eod-user-scenario.test.ts
import { describe, test, expect } from 'bun:test';
import { Schedule, getNext } from '../src/index';

describe('EOD User Scenario Tests', () => {
  test('should reproduce the user reported issue', () => {
    console.log('\n=== USER SCENARIO REPRODUCTION ===');
    
    // User's scenario: E1W with specific dates
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W'); // Weekdays 9 AM + 1 week
    
    // Simulate the user's scenario
    const fromTime = new Date('2025-08-14T09:00:00+03:00');
    console.log('fromTime:', fromTime.toString());
    console.log('fromTime ISO:', fromTime.toISOString());
    
    const nextRun = getNext(schedule, fromTime);
    console.log('nextRun:', nextRun.toString());
    console.log('nextRun ISO:', nextRun.toISOString());
    
    // Problem: user wants endOf(fromTime) to return the end time from nextRun, not from previous
    const endTime = schedule.endOf(fromTime);
    console.log('endTime (current implementation):', endTime?.toString());
    console.log('endTime ISO:', endTime?.toISOString());
    
    // What user expects: endOf should be calculated from nextRun
    const expectedEndTime = schedule.endOf(nextRun);
    console.log('expectedEndTime (from nextRun):', expectedEndTime?.toString());
    console.log('expectedEndTime ISO:', expectedEndTime?.toISOString());
    
    console.log('\n--- Analysis ---');
    if (nextRun && endTime) {
      const diff = endTime.getTime() - nextRun.getTime();
      console.log('Difference between endTime and nextRun (ms):', diff);
      console.log('Difference (days):', diff / (1000 * 60 * 60 * 24));
      console.log('Is endTime after nextRun?', endTime > nextRun);
    }
  });

  test('should test endOfFromNext method (proposed solution)', () => {
    console.log('\n=== PROPOSED SOLUTION TEST ===');
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W');
    const fromTime = new Date('2025-08-14T09:00:00+03:00');
    
    const nextRun = getNext(schedule, fromTime);
    console.log('nextRun:', nextRun.toString());
    
    // Current implementation (from previous trigger)
    const endFromPrev = schedule.endOf(fromTime);
    console.log('endOf from previous trigger:', endFromPrev?.toString());
    
    // Proposed: calculate from next trigger
    const endFromNext = schedule.endOf(nextRun);
    console.log('endOf from next trigger:', endFromNext?.toString());
    
    // The difference should be significant
    if (endFromPrev && endFromNext) {
      const diff = endFromNext.getTime() - endFromPrev.getTime();
      console.log('Time difference (days):', diff / (1000 * 60 * 60 * 24));
      
      // End from next should be after next run
      expect(endFromNext.getTime()).toBeGreaterThan(nextRun.getTime());
      
      // End from prev might be before next run (the user's issue)
      console.log('End from prev before next run?', endFromPrev.getTime() < nextRun.getTime());
    }
  });

  test('should test with different EOD durations', () => {
    console.log('\n=== DIFFERENT EOD DURATIONS TEST ===');
    
    const testCases = [
      { eod: 'E1D', desc: '1 day' },
      { eod: 'E1W', desc: '1 week' },
      { eod: 'E2W', desc: '2 weeks' },
      { eod: 'E1M', desc: '1 month' },
    ];
    
    const fromTime = new Date('2025-08-14T09:00:00+03:00');
    
    testCases.forEach(({ eod, desc }) => {
      console.log(`\n--- Testing ${desc} (${eod}) ---`);
      
      const schedule = new Schedule(`0 0 9 * * 1-5 EOD:${eod}`);
      const nextRun = getNext(schedule, fromTime);
      const endTime = schedule.endOf(fromTime);
      
      console.log('nextRun:', nextRun.toString());
      console.log('endTime:', endTime?.toString());
      
      if (endTime) {
        const isEndAfterNext = endTime.getTime() > nextRun.getTime();
        console.log('End after next?', isEndAfterNext);
        
        const diffDays = (endTime.getTime() - nextRun.getTime()) / (1000 * 60 * 60 * 24);
        console.log('Difference from nextRun (days):', diffDays);
      }
    });
  });

  test('should validate the expected behavior for user scenario', () => {
    console.log('\n=== USER EXPECTATION VALIDATION ===');
    
    // User's expectation: when I pass fromTime, I want endOf to calculate 
    // the end time for the NEXT execution window, not the previous one
    
    const schedule = new Schedule('0 0 9 * * 1-5 EOD:E1W');
    const fromTime = new Date('2025-08-14T09:00:00+03:00');
    
    console.log('User scenario:');
    console.log('- Schedule: Weekdays at 9 AM, duration 1 week');
    console.log('- fromTime:', fromTime.toString());
    
    const nextRun = getNext(schedule, fromTime);
    console.log('- nextRun:', nextRun.toString());
    
    // Current behavior
    const currentEndOf = schedule.endOf(fromTime);
    console.log('- Current endOf result:', currentEndOf?.toString());
    
    // What user expects
    if (schedule.eod && nextRun) {
      const expectedEndOf = schedule.eod.calculateEndDate(nextRun);
      console.log('- Expected endOf result:', expectedEndOf.toString());
      
      const expectationMet = currentEndOf?.getTime() === expectedEndOf.getTime();
      console.log('- Expectation met?', expectationMet);
      
      if (!expectationMet) {
        console.log('- Problem: endOf calculates from previous trigger, user wants from next trigger');
      }
    }
  });
});
