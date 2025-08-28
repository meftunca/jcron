#!/usr/bin/env node
import {fromJCronString, Schedule, getNext } from './dist/index.js';

console.log('🔥 JCRON Node.js Port - WOY Pattern Test');
console.log('======================================');

const pattern = '0 0 * * * * WOY:* TZ:EUROPE/ISTANBUL E1W';
console.log(`Pattern: ${pattern}`);
console.log('');

try {
    console.log('Testing fromJCronString() function...');
    const schedule = fromJCronString(pattern);
    
    console.log('✅ Schedule created successfully!');
    console.log(`Schedule object:`, schedule);
    console.log(`Schedule toString(): ${schedule.toString()}`);
    
    // Next occurrence hesapla
    console.log('');
    console.log('🕐 Testing getNext() function...');
    const nextTime = getNext(schedule);
    console.log(`✅ Next occurrence: ${nextTime}`);
    console.log(`  ISO String: ${nextTime.toISOString()}`);
    console.log(`  Local String: ${nextTime.toLocaleString()}`);
    
    // WOY pattern için özel bilgiler
    console.log('');
    console.log('📅 WOY Pattern Analysis:');
    console.log(`  Current date: ${new Date().toISOString().split('T')[0]}`);
    console.log(`  Target pattern: WOY:* (all weeks)`);
    console.log(`  EOD modifier: E1W (End of Week)`);
    console.log(`  Timezone: EUROPE/ISTANBUL`);
    
    // Schedule methodlarını kontrol edelim
    console.log('');
    console.log('� Schedule Properties:');
    console.log(`  Second: ${schedule.s}`);
    console.log(`  Minute: ${schedule.m}`);
    console.log(`  Hour: ${schedule.h}`);
    console.log(`  Day: ${schedule.D}`);
    console.log(`  Month: ${schedule.M}`);
    console.log(`  DayOfWeek: ${schedule.dow}`);
    console.log(`  Year: ${schedule.Y}`);
    console.log(`  WeekOfYear: ${schedule.woy}`);
    console.log(`  Timezone: ${schedule.tz}`);
    console.log(`  EOD: ${schedule.eod}`);
    
} catch (error) {
    console.error('❌ ERROR:');
    console.error(error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
}
