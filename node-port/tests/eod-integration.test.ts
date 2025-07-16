// tests/eod-integration.test.ts
import { describe, test, expect } from 'bun:test';
import { Schedule, fromJCronString, fromObject } from '../src/schedule';
import { EndOfDuration, parseEoD, ReferencePoint } from '../src/eod';

describe('End-of-Duration (EoD) Integration Tests', () => {
  describe('Schedule EoD Support', () => {
    test('should create Schedule with EoD from constructor', () => {
      const eod = new EndOfDuration(0, 0, 0, 0, 0, 30, 0, ReferencePoint.END);
      const schedule = new Schedule('0', '*/10', '*', '*', '*', '*', null, null, null, eod);
      
      expect(schedule.eod).toBe(eod);
      expect(schedule.eod?.minutes).toBe(30);
      expect(schedule.eod?.referencePoint).toBe(ReferencePoint.END);
    });

    test('should parse EoD from JCRON string', () => {
      const jcronString = '0 */15 * * * * EOD:E30m';
      const schedule = fromJCronString(jcronString);
      
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.minutes).toBe(30);
      expect(schedule.eod?.referencePoint).toBe(ReferencePoint.END);
    });

    test('should create Schedule with EoD from single string constructor', () => {
      const schedule = new Schedule('0 */5 * * * * EOD:E1h');
      
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.hours).toBe(1);
      expect(schedule.eod?.referencePoint).toBe(ReferencePoint.END);
    });

    test('should convert Schedule with EoD to string with EOD extension', () => {
      const eod = new EndOfDuration(0, 0, 0, 0, 2, 0, 0, ReferencePoint.START);
      const schedule = new Schedule('0', '0', '*/6', '*', '*', '*', null, null, null, eod);
      
      const jcronString = schedule.toString();
      expect(jcronString).toBe('0 0 */6 * * * EOD:S2h');
    });

    test('should handle complex JCRON string with WOY, TZ, and EOD', () => {
      const jcronString = '0 30 14 * * 1-5 2025 WOY:1-26 TZ:UTC EOD:E45m';
      const schedule = fromJCronString(jcronString);
      
      expect(schedule.s).toBe('0');
      expect(schedule.m).toBe('30');
      expect(schedule.h).toBe('14');
      expect(schedule.dow).toBe('1-5');
      expect(schedule.Y).toBe('2025');
      expect(schedule.woy).toBe('1-26');
      expect(schedule.tz).toBe('UTC');
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.minutes).toBe(45);
      expect(schedule.eod?.referencePoint).toBe(ReferencePoint.END);
    });
  });

  describe('Schedule.fromObject with EoD', () => {
    test('should create Schedule from ScheduleObjectNotation with EoD string', () => {
      const scheduleObj = {
        minute: '*/20',
        hour: '9-17',
        dayOfWeek: '1-5',
        eod: 'E15m'
      };
      
      const schedule = Schedule.fromObject(scheduleObj);
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.minutes).toBe(15);
      expect(schedule.eod?.referencePoint).toBe(ReferencePoint.END);
    });

    test('should handle invalid EoD format in fromObject', () => {
      const scheduleObj = {
        minute: '*/30',
        eod: 'INVALID_FORMAT'
      };
      
      expect(() => Schedule.fromObject(scheduleObj)).toThrow('Invalid EoD format');
    });
  });

  describe('fromObject with EoD support', () => {
    test('should create Schedule from object with EoD string', () => {
      const obj = {
        m: '*/10',
        h: '8-18',
        dow: '1-5',
        eod: 'S30m'
      };
      
      const schedule = fromObject(obj);
      expect(schedule.eod).toBeDefined();
      expect(schedule.eod?.minutes).toBe(30);
      expect(schedule.eod?.referencePoint).toBe(ReferencePoint.START);
    });

    test('should create Schedule from object with EndOfDuration instance', () => {
      const eod = new EndOfDuration(0, 0, 0, 0, 2, 0, 0, ReferencePoint.END);
      const obj = {
        h: '*/4',
        eod
      };
      
      const schedule = fromObject(obj);
      expect(schedule.eod).toBe(eod);
    });

    test('should handle invalid EoD string in fromObject', () => {
      const obj = {
        m: '*/15',
        eod: 'INVALID'
      };
      
      expect(() => fromObject(obj)).toThrow('Invalid EoD format');
    });
  });

  describe('EoD Format Variations', () => {
    test('should parse different EoD reference points', () => {
      const testCases = [
        { eod: 'S30m', ref: ReferencePoint.START, minutes: 30 },
        { eod: 'E1h', ref: ReferencePoint.END, hours: 1 },
        { eod: 'E45s', ref: ReferencePoint.END, seconds: 45 },
        { eod: 'S2d', ref: ReferencePoint.START, days: 2 }
      ];

      testCases.forEach(({ eod: eodStr, ref, ...expectedFields }) => {
        const schedule = fromJCronString(`0 0 12 * * * EOD:${eodStr}`);
        expect(schedule.eod?.referencePoint).toBe(ref);
        
        // Check the specific time field that should be set
        Object.entries(expectedFields).forEach(([field, value]) => {
          expect((schedule.eod as any)?.[field]).toBe(value);
        });
      });
    });

    test('should handle different time units in EoD', () => {
      const testCases = [
        { unit: 's', field: 'seconds' },
        { unit: 'm', field: 'minutes' },
        { unit: 'h', field: 'hours' },
        { unit: 'd', field: 'days' },
        { unit: 'w', field: 'weeks' },
        { unit: 'M', field: 'months' },
        { unit: 'Y', field: 'years' }
      ];

      testCases.forEach(({ unit, field }) => {
        const schedule = fromJCronString(`0 0 12 * * * EOD:E1${unit}`);
        expect((schedule.eod as any)?.[field]).toBe(1);
      });
    });
  });

  describe('EoD Error Handling', () => {
    test('should throw error for invalid EoD format in JCRON string', () => {
      expect(() => fromJCronString('0 0 12 * * * EOD:INVALID')).toThrow('Invalid EOD format');
    });

    test('should throw error for missing reference point in EoD', () => {
      expect(() => fromJCronString('0 0 12 * * * EOD:30m')).toThrow('Invalid EOD format');
    });

    test('should throw error for invalid time unit in EoD', () => {
      expect(() => fromJCronString('0 0 12 * * * EOD:E30x')).toThrow('Invalid EOD format');
    });
  });

  describe('EoD Integration with Existing Features', () => {
    test('should work with Schedule validation functions', () => {
      const eod = new EndOfDuration(0, 0, 0, 0, 0, 15, 0, ReferencePoint.END);
      const schedule = new Schedule('0', '*/10', '*', '*', '*', '*', null, null, null, eod);
      
      // Test that existing functions still work
      expect(schedule.toString()).toContain('EOD:E15m');
      expect(schedule.toStandardCron()).not.toContain('EOD:');
    });

    test('should maintain backward compatibility', () => {
      // Test that schedules without EoD still work
      const schedule = new Schedule('0', '*/5', '*', '*', '*', '*');
      expect(schedule.eod).toBe(null);
      expect(schedule.toString()).not.toContain('EOD:');
    });

    test('should work with week-of-year and timezone together', () => {
      const jcronString = '0 0 9 * * 1 WOY:1-26 TZ:America/New_York EOD:E30m';
      const schedule = fromJCronString(jcronString);
      
      expect(schedule.woy).toBe('1-26');
      expect(schedule.tz).toBe('America/New_York');
      expect(schedule.eod?.minutes).toBe(30);
      
      const roundTrip = schedule.toString();
      expect(roundTrip).toBe('0 0 9 * * 1 WOY:1-26 TZ:America/New_York EOD:E30m');
    });
  });

  describe('EoD Extension Order', () => {
    test('should handle different extension orders in JCRON string', () => {
      const testCases = [
        '0 0 12 * * * EOD:E30m TZ:UTC WOY:1-26',
        '0 0 12 * * * TZ:UTC EOD:E30m WOY:1-26',
        '0 0 12 * * * WOY:1-26 TZ:UTC EOD:E30m',
        '0 0 12 * * * WOY:1-26 EOD:E30m TZ:UTC',
        '0 0 12 * * * TZ:UTC WOY:1-26 EOD:E30m',
        '0 0 12 * * * EOD:E30m WOY:1-26 TZ:UTC'
      ];

      testCases.forEach(jcronString => {
        const schedule = fromJCronString(jcronString);
        expect(schedule.woy).toBe('1-26');
        expect(schedule.tz).toBe('UTC');
        expect(schedule.eod?.minutes).toBe(30);
      });
    });
  });

  describe('EoD Basic Usage Examples', () => {
    test('should create simple duration schedules', () => {
      // Every hour, stop 15 minutes before the end
      const schedule1 = fromJCronString('0 0 * * * * EOD:E15m');
      expect(schedule1.eod?.minutes).toBe(15);
      expect(schedule1.eod?.referencePoint).toBe(ReferencePoint.END);

      // Every day at 9 AM, start 30 minutes after beginning
      const schedule2 = fromJCronString('0 0 9 * * * EOD:S30m');
      expect(schedule2.eod?.minutes).toBe(30);
      expect(schedule2.eod?.referencePoint).toBe(ReferencePoint.START);
    });

    test('should create complex duration with multiple units', () => {
      // Parse EoD with multiple time units using complex format
      const eod = parseEoD('E1DT1H30M');
      expect(eod.days).toBe(1);
      expect(eod.hours).toBe(1);
      expect(eod.minutes).toBe(30);
      expect(eod.referencePoint).toBe(null); // No reference point specified
    });
  });
});
