-- Test DST (Daylight Saving Time) transitions
\timing on

-- Load JCRON
\i sql-ports/jcron.sql

DO $$
DECLARE
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
    result TIMESTAMPTZ;
    week_num INTEGER;
BEGIN
    RAISE NOTICE '🌍 DST Transition Tests (US timezone)';
    RAISE NOTICE '====================================';
    
    -- Test 1: Spring Forward (2:00 AM → 3:00 AM) - March 10, 2024
    -- Clock jumps from 01:59:59 to 03:00:00
    test_count := test_count + 1;
    BEGIN
        -- WOY pattern during spring DST transition
        result := jcron.next_from('0 2 * * * WOY:10 TZ:America/New_York', '2024-03-10 06:00:00+00'::TIMESTAMPTZ);
        week_num := EXTRACT(week FROM result)::INTEGER;
        
        IF week_num = 10 THEN
            RAISE NOTICE 'Test 1: Spring DST + WOY:10 → % (Week %) ✅', result, week_num;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 1: Spring DST + WOY:10 → % (Week %) ❌ Expected Week 10', result, week_num;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 1: Spring DST + WOY:10 → ❌ %', SQLERRM;
    END;
    
    -- Test 2: Fall Back (2:00 AM → 1:00 AM) - November 3, 2024
    -- Clock goes back: 01:59:59 → 01:00:00
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 2 * * * WOY:44 TZ:America/New_York', '2024-11-03 05:00:00+00'::TIMESTAMPTZ);
        week_num := EXTRACT(week FROM result)::INTEGER;
        
        IF week_num = 44 THEN
            RAISE NOTICE 'Test 2: Fall DST + WOY:44 → % (Week %) ✅', result, week_num;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 2: Fall DST + WOY:44 → % (Week %) ❌ Expected Week 44', result, week_num;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 2: Fall DST + WOY:44 → ❌ %', SQLERRM;
    END;
    
    -- Test 3: Europe DST (Last Sunday March) - March 31, 2024
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 2 * * * WOY:13 TZ:Europe/Berlin', '2024-03-31 00:00:00+00'::TIMESTAMPTZ);
        week_num := EXTRACT(week FROM result)::INTEGER;
        
        IF week_num = 13 THEN
            RAISE NOTICE 'Test 3: Europe DST + WOY:13 → % (Week %) ✅', result, week_num;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 3: Europe DST + WOY:13 → % (Week %) ❌ Expected Week 13', result, week_num;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 3: Europe DST + WOY:13 → ❌ %', SQLERRM;
    END;
    
    -- Test 4: Turkey (No DST since 2016) - should be stable
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 2 * * * WOY:10 TZ:Europe/Istanbul', '2024-03-10 00:00:00+00'::TIMESTAMPTZ);
        week_num := EXTRACT(week FROM result)::INTEGER;
        
        IF week_num = 10 THEN
            RAISE NOTICE 'Test 4: Turkey (no DST) + WOY:10 → % (Week %) ✅', result, week_num;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 4: Turkey (no DST) + WOY:10 → % (Week %) ❌ Expected Week 10', result, week_num;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 4: Turkey (no DST) + WOY:10 → ❌ %', SQLERRM;
    END;
    
    -- Test 5: Cross-year DST with WOY:1 (edge case)
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 31 12 * WOY:1 TZ:America/New_York', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        week_num := EXTRACT(week FROM result)::INTEGER;
        
        IF week_num = 1 THEN
            RAISE NOTICE 'Test 5: Cross-year DST + WOY:1 → % (Week %) ✅', result, week_num;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 5: Cross-year DST + WOY:1 → % (Week %) ❌ Expected Week 1', result, week_num;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 5: Cross-year DST + WOY:1 → ❌ %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    IF pass_count = test_count THEN
        RAISE NOTICE '🎉 PERFECT! % / % tests passed (100%%)!', pass_count, test_count;
    ELSE
        RAISE NOTICE '⚠️  % / % tests passed', pass_count, test_count;
    END IF;
END;
$$;
