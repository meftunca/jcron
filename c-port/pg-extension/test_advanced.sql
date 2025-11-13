-- Test JCRON Advanced Features in PostgreSQL

-- Test EOD parsing
SELECT * FROM jcron.parse_eod('0 17 * * 1-5 EOD');
SELECT * FROM jcron.parse_eod('0 9 * * * EOM');
SELECT * FROM jcron.parse_eod('0 18 * * 5 EOW');

-- Test SOD parsing
SELECT * FROM jcron.parse_sod('0 9 * * 1-5 SOD');
SELECT * FROM jcron.parse_sod('0 8 * * * SOM');
SELECT * FROM jcron.parse_sod('0 10 * * 1 SOW');

-- Test nth weekday calculation
SELECT jcron.get_nth_weekday(2024, 1, 1, 1); -- First Monday of January 2024
SELECT jcron.get_nth_weekday(2024, 1, 1, 2); -- Second Monday of January 2024
SELECT jcron.get_nth_weekday(2024, 1, 5, -1); -- Last Friday of January 2024

-- Test WOY scheduling
SELECT jcron.schedule('0 9 * * 1#1', '2024-01-01 00:00:00'::timestamp); -- First Monday
SELECT jcron.schedule('0 9 * * 5L', '2024-01-01 00:00:00'::timestamp); -- Last Friday

-- Test pattern analysis
SELECT * FROM jcron.analyze_pattern_complexity('0 9 * * 1-5 EOD');
SELECT * FROM jcron.analyze_pattern_complexity('0 9 * * 1#1');
SELECT * FROM jcron.analyze_pattern_complexity('0 9,17 * * *');

-- Test batch scheduling
SELECT * FROM jcron.batch_schedule(
    ARRAY['0 9 * * 1-5', '0 17 * * 1-5 EOD', '0 9 * * 1#1'],
    '2024-01-01 00:00:00'::timestamp,
    10
);

-- Test business hours validation
SELECT jcron.is_business_hours('0 9 * * 1-5');
SELECT jcron.is_business_hours('0 2 * * *'); -- Not business hours
SELECT jcron.is_business_hours('0 9 * * 1-5 EOD');

-- Test pattern validation
SELECT jcron.validate_pattern('0 9 * * 1-5 EOD');
SELECT jcron.validate_pattern('0 9 * * 1#1');
SELECT jcron.validate_pattern('invalid pattern');