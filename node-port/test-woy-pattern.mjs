#!/usr/bin/env node
import { Next } from './dist/index.js';

console.log('🔥 JCRON Node.js Port - WOY Pattern Test');
console.log('======================================');

const pattern = '0 0 * * * * * WOY:* TZ:EUROPE/ISTANBUL E1W';
console.log(`Pattern: ${pattern}`);
console.log('');

try {
    console.log('Testing Next() function...');
    const result = Next(pattern);
    
    console.log('✅ SUCCESS!');
    console.log(`Next occurrence: ${result}`);
    console.log(`Result type: ${typeof result}`);
    console.log(`Is Date: ${result instanceof Date}`);
    
    if (result instanceof Date) {
        console.log('');
        console.log('📅 Date Details:');
        console.log(`  Local time: ${result.toLocaleString()}`);
        console.log(`  UTC time: ${result.toISOString()}`);
        console.log(`  Timestamp: ${result.getTime()}`);
        
        // Istanbul timezone için manuel hesaplama
        const istanbulOffset = 3; // UTC+3
        const istanbulTime = new Date(result.getTime() + (istanbulOffset * 60 * 60 * 1000));
        console.log(`  Istanbul time: ${istanbulTime.toISOString().replace('Z', '+03:00')}`);
    }
    
} catch (error) {
    console.error('❌ ERROR:');
    console.error(error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
}
