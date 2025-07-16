// Test both long and short format support in Schedule.fromObject

import { describe, it, expect } from 'bun:test';
import { Schedule } from '../src/schedule';

describe('Schedule.fromObject format support', () => {
  describe('Short format support (s, m, h, D, M, dow, Y, woy, tz, eod)', () => {
    it('should create schedule from short format object', () => {
      const schedule = Schedule.fromObject({
        s: '0',
        m: '30',
        h: '14',
        D: '1',
        M: '1',
        dow: '*',
        Y: '2024',
        woy: '1',
        tz: 'UTC',
        eod: 'S30m'
      });

      expect(schedule.s).toBe('0');
      expect(schedule.m).toBe('30');
      expect(schedule.h).toBe('14');
      expect(schedule.D).toBe('1');
      expect(schedule.M).toBe('1');
      expect(schedule.dow).toBe('*');
      expect(schedule.Y).toBe('2024');
      expect(schedule.woy).toBe('1');
      expect(schedule.tz).toBe('UTC');
      expect(schedule.eod?.toString()).toBe('S30m');
    });

    it('should create schedule from partial short format', () => {
      const schedule = Schedule.fromObject({
        h: '12',
        m: '30'
      });

      expect(schedule.s).toBe('0');
      expect(schedule.m).toBe('30');
      expect(schedule.h).toBe('12');
      expect(schedule.D).toBe('*');
      expect(schedule.M).toBe('*');
      expect(schedule.dow).toBe('*');
    });
  });

  describe('Long format support (second, minute, hour, dayOfMonth, month, dayOfWeek)', () => {
    it('should create schedule from long format object', () => {
      const schedule = Schedule.fromObject({
        second: '0',
        minute: '30',
        hour: '14',
        dayOfMonth: '1',
        month: '1',
        dayOfWeek: '*',
        year: '2024',
        weekOfYear: '1',
        timezone: 'UTC',
        eod: 'S30m'
      });

      expect(schedule.s).toBe('0');
      expect(schedule.m).toBe('30');
      expect(schedule.h).toBe('14');
      expect(schedule.D).toBe('1');
      expect(schedule.M).toBe('1');
      expect(schedule.dow).toBe('*');
      expect(schedule.Y).toBe('2024');
      expect(schedule.woy).toBe('1');
      expect(schedule.tz).toBe('UTC');
      expect(schedule.eod?.toString()).toBe('S30m');
    });

    it('should create schedule from partial long format', () => {
      const schedule = Schedule.fromObject({
        hour: '12',
        minute: '30'
      });

      expect(schedule.s).toBe('*');
      expect(schedule.m).toBe('30');
      expect(schedule.h).toBe('12');
      expect(schedule.D).toBe('*');
      expect(schedule.M).toBe('*');
      expect(schedule.dow).toBe('*');
    });

    it('should handle ONCE type schedule with date', () => {
      const testDate = new Date('2024-01-01T14:30:00Z');
      const schedule = Schedule.fromObject({
        type: 'ONCE',
        date: testDate,
        timezone: 'UTC'
      });

      expect(schedule.toString()).toContain('0 30 14 1 1 ?');
      expect(schedule.toString()).toContain('TZ:UTC');
    });
  });

  describe('Mixed format handling', () => {
    it('should prioritize short format when both formats are present', () => {
      const schedule = Schedule.fromObject({
        s: '15',
        second: '0', // This should be ignored
        m: '45',
        minute: '30', // This should be ignored
        h: '12',
        hour: '10'   // This should be ignored
      });

      expect(schedule.s).toBe('15');
      expect(schedule.m).toBe('45');
      expect(schedule.h).toBe('12');
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid timezone in long format', () => {
      expect(() => {
        Schedule.fromObject({
          hour: '12',
          timezone: 'INVALID_TZ'
        });
      }).toThrow('Invalid timezone: INVALID_TZ');
    });

    it('should throw error for invalid EoD format in long format', () => {
      expect(() => {
        Schedule.fromObject({
          hour: '12',
          eod: 'INVALID_EOD'
        });
      }).toThrow('Invalid EoD format: INVALID_EOD');
    });
  });

  describe('String conversion consistency', () => {
    it('should produce same result regardless of input format', () => {
      const shortFormat = Schedule.fromObject({
        s: '0',
        m: '30',
        h: '14',
        D: '1',
        M: '6',
        dow: '*',
        Y: '2024',
        woy: '25',
        tz: 'UTC',
        eod: 'E1h'
      });

      const longFormat = Schedule.fromObject({
        second: '0',
        minute: '30',
        hour: '14',
        dayOfMonth: '1',
        month: '6',
        dayOfWeek: '*',
        year: '2024',
        weekOfYear: '25',
        timezone: 'UTC',
        eod: 'E1h'
      });

      expect(shortFormat.toString()).toBe(longFormat.toString());
      expect(shortFormat.toStandardCron()).toBe(longFormat.toStandardCron());
    });
  });
});
