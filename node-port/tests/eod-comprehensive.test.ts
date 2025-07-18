// Test EoD integration and endOf helper functions

import { describe, it, expect } from 'bun:test';
import { Schedule, getNext, fromSchedule } from '../src/index';
import { EoDHelpers, parseEoD, EndOfDuration, ReferencePoint } from '../src/eod';

describe('EoD Integration and EndOf Helpers Test', () => {
  describe('EoD Helpers - endOf functions', () => {
    it('should create endOfDay EoD correctly', () => {
      const eod = EoDHelpers.endOfDay(2, 30, 0); // 2 hours 30 minutes until end of day
      
      expect(eod.hours).toBe(2);
      expect(eod.minutes).toBe(30);
      expect(eod.seconds).toBe(0);
      expect(eod.referencePoint).toBe(ReferencePoint.DAY);
      
      const eodString = eod.toString();
      console.log('End of Day EoD:', eodString);
      expect(eodString).toContain('T'); // Should contain time part
      expect(eodString).toContain('H'); // Should contain hours
      expect(eodString).toContain('M'); // Should contain minutes
    });

    it('should create endOfWeek EoD correctly', () => {
      const eod = EoDHelpers.endOfWeek(1, 12, 0); // 1 day 12 hours until end of week
      
      expect(eod.days).toBe(1);
      expect(eod.hours).toBe(12);
      expect(eod.referencePoint).toBe(ReferencePoint.WEEK);
      
      console.log('End of Week EoD:', eod.toString());
    });

    it('should create endOfMonth EoD correctly', () => {
      const eod = EoDHelpers.endOfMonth(5, 18, 30); // 5 days 18h 30m until end of month
      
      expect(eod.days).toBe(5);
      expect(eod.hours).toBe(18);
      expect(eod.minutes).toBe(30);
      expect(eod.referencePoint).toBe(ReferencePoint.MONTH);
      
      console.log('End of Month EoD:', eod.toString());
    });

    it('should create endOfQuarter EoD correctly', () => {
      const eod = EoDHelpers.endOfQuarter(1, 15, 6); // 1 month 15 days 6 hours until end of quarter
      
      expect(eod.months).toBe(1);
      expect(eod.days).toBe(15);
      expect(eod.hours).toBe(6);
      expect(eod.referencePoint).toBe(ReferencePoint.QUARTER);
      
      console.log('End of Quarter EoD:', eod.toString());
    });

    it('should create endOfYear EoD correctly', () => {
      const eod = EoDHelpers.endOfYear(2, 10, 14); // 2 months 10 days 14 hours until end of year
      
      expect(eod.months).toBe(2);
      expect(eod.days).toBe(10);
      expect(eod.hours).toBe(14);
      expect(eod.referencePoint).toBe(ReferencePoint.YEAR);
      
      console.log('End of Year EoD:', eod.toString());
    });

    it('should create untilEvent EoD correctly', () => {
      const eod = EoDHelpers.untilEvent('project_deadline', 4, 30, 0); // 4h 30m until project deadline
      
      expect(eod.hours).toBe(4);
      expect(eod.minutes).toBe(30);
      expect(eod.eventIdentifier).toBe('project_deadline');
      
      console.log('Until Event EoD:', eod.toString());
    });
  });

  describe('EoD Date Calculation', () => {
    it('should calculate end date correctly for different reference points', () => {
      const testDate = new Date('2025-07-16T10:00:00'); // Wednesday, July 16, 2025, 10:00 AM

      // Test end of day - should go to 23:59:59.999 of the same day + duration
      const endOfDayEoD = EoDHelpers.endOfDay(0, 0, 0);
      const endOfDayDate = endOfDayEoD.calculateEndDate(testDate);
      console.log('Test date:', testDate.toISOString());
      console.log('End of day:', endOfDayDate.toISOString());
      
      expect(endOfDayDate.getDate()).toBe(testDate.getDate());
      expect(endOfDayDate.getHours()).toBe(23);
      expect(endOfDayDate.getMinutes()).toBe(59);

      // Test end of week - should go to end of Sunday
      const endOfWeekEoD = EoDHelpers.endOfWeek(0, 0, 0);
      const endOfWeekDate = endOfWeekEoD.calculateEndDate(testDate);
      console.log('End of week:', endOfWeekDate.toISOString());
      
      expect(endOfWeekDate.getDay()).toBe(0); // Sunday
      expect(endOfWeekDate.getHours()).toBe(23);

      // Test end of month - should go to end of July
      const endOfMonthEoD = EoDHelpers.endOfMonth(0, 0, 0);
      const endOfMonthDate = endOfMonthEoD.calculateEndDate(testDate);
      console.log('End of month:', endOfMonthDate.toISOString());
      
      expect(endOfMonthDate.getMonth()).toBe(6); // July (0-indexed)
      expect(endOfMonthDate.getDate()).toBe(31); // Last day of July
      expect(endOfMonthDate.getHours()).toBe(23);
    });

    it('should add duration before applying reference point', () => {
      const testDate = new Date('2025-07-16T10:00:00'); // Wednesday, July 16, 2025, 10:00 AM

      // Add 2 days, then apply end of week
      const eod = EoDHelpers.endOfWeek(2, 0, 0); // 2 days until end of week
      const resultDate = eod.calculateEndDate(testDate);
      console.log('Test date + 2 days to end of week:', resultDate.toISOString());
      
      // Should be: July 16 + 2 days = July 18 (Friday), then end of that week (July 20, Sunday)
      expect(resultDate.getDay()).toBe(0); // Sunday
      expect(resultDate.getDate()).toBe(20); // July 20
    });
  });

  describe('Schedule Integration with EoD', () => {
    it('should create Schedule with EoD from various formats', () => {
      // Using JCRON string
      const schedule1 = new Schedule('0 9 * * 1-5 EOD:E8h');
      expect(schedule1.eod).toBeTruthy();
      expect(schedule1.eod?.hours).toBe(8);
      console.log('Schedule 1 (JCRON string):', schedule1.toString());

      // Using Schedule.fromObject with EoD string
      const schedule2 = Schedule.fromObject({
        minute: '0',
        hour: '9',
        dayOfWeek: 'MON-FRI',
        eod: 'E1DT4H'
      });
      expect(schedule2.eod).toBeTruthy();
      expect(schedule2.eod?.days).toBe(1);
      expect(schedule2.eod?.hours).toBe(4);
      console.log('Schedule 2 (fromObject with EoD string):', schedule2.toString());

      // Using Schedule.fromObject with EoD object
      const eodHelper = EoDHelpers.endOfDay(6, 0, 0);
      const schedule3 = Schedule.fromObject({
        minute: '30',
        hour: '14',
        dayOfWeek: 'TUE,THU',
        eod: eodHelper
      });
      expect(schedule3.eod).toBeTruthy();
      expect(schedule3.eod?.hours).toBe(6);
      expect(schedule3.eod?.referencePoint).toBe(ReferencePoint.DAY);
      console.log('Schedule 3 (fromObject with EoD object):', schedule3.toString());
    });

    it('should work with convenience functions (getNext, humanize)', () => {
      const schedule = new Schedule('0 9 * * 1-5 EOD:E8h');
      
      // Test getNext
      const nextRun = getNext(schedule);
      console.log('Next run with EoD:', nextRun.toISOString());
      expect(nextRun).toBeInstanceOf(Date);
      
      // Test fromSchedule (humanize equivalent)
      const description = fromSchedule(schedule);
      console.log('Human description with EoD:', description);
      expect(description).toContain('9:00');
    });

    it('should handle complex EoD scenarios', () => {
      // Complex schedule: Every Monday at 9 AM, run until end of quarter
      const complexEoD = EoDHelpers.endOfQuarter(0, 5, 16); // 5 days 16 hours until end of quarter
      const schedule = Schedule.fromObject({
        minute: '0',
        hour: '9',
        dayOfWeek: 'MON',
        eod: complexEoD
      });
      
      console.log('Complex schedule:', schedule.toString());
      console.log('Complex schedule description:', fromSchedule(schedule));
      
      // Should contain both the schedule and EoD information
      const scheduleString = schedule.toString();
      expect(scheduleString).toContain('MON');
      expect(scheduleString).toContain('EOD:');
      expect(scheduleString).toContain('E5D'); // EoD duration part
    });
  });

  describe('EoD Edge Cases and Validation', () => {
    it('should handle invalid EoD formats gracefully', () => {
      expect(() => {
        Schedule.fromObject({
          hour: '9',
          eod: 'INVALID_EOD'
        });
      }).toThrow();
      
      expect(() => {
        parseEoD('');
      }).toThrow();
      
      expect(() => {
        parseEoD('INVALID');
      }).toThrow();
    });

    it('should handle EoD with zero duration', () => {
      // Zero duration should be allowed (immediate finish)
      const eod = parseEoD('E0h');
      expect(eod.hours).toBe(0);
      expect(eod.referencePoint).toBe(ReferencePoint.END);
    });

    it('should parse and generate consistent EoD strings', () => {
      const testCases = [
        'S30m',
        'E1h', 
        'E2d',
        'E1DT12H',
        'E1Y2M3DT4H5M6S',
        'E1DT12H M',
        'E2H E[deadline]'
      ];

      testCases.forEach(eodString => {
        try {
          const parsed = parseEoD(eodString);
          const regenerated = parsed.toString();
          console.log(`Original: ${eodString} -> Parsed -> Regenerated: ${regenerated}`);
          
          // Parse the regenerated string to ensure consistency
          const reparsed = parseEoD(regenerated);
          expect(reparsed.years).toBe(parsed.years);
          expect(reparsed.months).toBe(parsed.months);
          expect(reparsed.days).toBe(parsed.days);
          expect(reparsed.hours).toBe(parsed.hours);
          expect(reparsed.minutes).toBe(parsed.minutes);
          expect(reparsed.seconds).toBe(parsed.seconds);
        } catch (error) {
          console.log(`Failed to parse: ${eodString} - ${error.message}`);
        }
      });
    });
  });

  describe('Real-world EoD Usage Examples', () => {
    it('should handle daily backup with end-of-day constraint', () => {
      // Daily backup at 3 AM, must finish by end of day
      const dailyBackup = Schedule.fromObject({
        minute: '0',
        hour: '3',
        eod: EoDHelpers.endOfDay(18, 0, 0) // 18 hours until end of day (9 PM cutoff)
      });
      
      console.log('Daily backup schedule:', dailyBackup.toString());
      console.log('Description:', fromSchedule(dailyBackup));
      
      const endDate = dailyBackup.eod?.calculateEndDate(new Date('2025-07-16T03:00:00'));
      console.log('Backup must finish by:', endDate?.toISOString());
      
      expect(endDate?.getHours()).toBe(23); // Should be end of day (after duration + ref point)
      expect(endDate?.getMinutes()).toBe(59); // End of day
    });

    it('should handle weekly report with end-of-week constraint', () => {
      // Weekly report every Friday at 5 PM, must finish by end of week
      const weeklyReport = Schedule.fromObject({
        minute: '0',
        hour: '17',
        dayOfWeek: 'FRI',
        eod: EoDHelpers.endOfWeek(0, 6, 0) // 6 hours until end of week
      });
      
      console.log('Weekly report schedule:', weeklyReport.toString());
      
      const endDate = weeklyReport.eod?.calculateEndDate(new Date('2025-07-18T17:00:00')); // Friday 5 PM
      console.log('Report must finish by:', endDate?.toISOString());
      
      expect(endDate?.getDay()).toBe(0); // Should be Sunday
      expect(endDate?.getHours()).toBe(23); // End of week
    });

    it('should handle monthly billing with end-of-month constraint', () => {
      // Monthly billing on 1st of each month, must finish by end of month
      const monthlyBilling = Schedule.fromObject({
        minute: '0',
        hour: '9',
        dayOfMonth: '1',
        eod: EoDHelpers.endOfMonth(0, 0, 0) // Go directly to end of month (no additional days)
      });
      
      console.log('Monthly billing schedule:', monthlyBilling.toString());
      
      const endDate = monthlyBilling.eod?.calculateEndDate(new Date('2025-07-01T09:00:00'));
      console.log('Billing must finish by:', endDate?.toISOString());
      
      expect(endDate?.getDate()).toBe(31); // Should be end of July
    });

    it('should handle project deadline with event-based EoD', () => {
      // Daily standup until project completion
      const projectStandup = Schedule.fromObject({
        minute: '0',
        hour: '9',
        dayOfWeek: 'MON-FRI',
        eod: EoDHelpers.untilEvent('project_alpha_completion', 8, 0, 0)
      });
      
      console.log('Project standup schedule:', projectStandup.toString());
      
      expect(projectStandup.eod?.eventIdentifier).toBe('project_alpha_completion');
      expect(projectStandup.eod?.hours).toBe(8);
    });
  });
});
