#!/usr/bin/env bun

// Simple WOY debug test
import { next_time, parse_expression } from './src/index';

console.log('🔍 WOY Debug Test\n');

const fromDate = new Date('2024-01-15 10:00:00');
console.log('From date:', fromDate.toISOString());

// Parse the expression
const schedule = parse_expression('0 0 9 * * * WOY:1');
console.log('Schedule object:', {
  s: schedule.s,
  m: schedule.m, 
  h: schedule.h,
  D: schedule.D,
  M: schedule.M,
  dow: schedule.dow,
  Y: schedule.Y,
  woy: schedule.woy,
  tz: schedule.tz
});

// Get ISO week of fromDate
function getISOWeek(date: Date): number {
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  targetDate.setUTCDate(targetDate.getUTCDate() + 4 - (targetDate.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(targetDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((targetDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return weekNo;
}

console.log('ISO week of fromDate:', getISOWeek(fromDate));
console.log('Expected: Week 1 of 2024');

try {
  const result = next_time('0 0 9 * * * WOY:1', fromDate);
  console.log('Result:', result.toISOString());
  console.log('Result ISO week:', getISOWeek(result));
  console.log('Result year:', result.getUTCFullYear());
} catch (error) {
  console.log('Error:', error.message);
}
