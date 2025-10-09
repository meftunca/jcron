-- Test dayOfnthWeek syntax (W = week-based, # = occurrence-based)
-- W syntax: {day}W{week} = specified weekday in specified week
-- # syntax: {day}#{n} = nth occurrence of specified weekday
-- Week 1 starts on day 1 of month, ends on first Sunday (may be < 7 days)
\timing on

-- Load JCRON
\i sql-ports/jcron.sql

DO $$
DECLARE
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
    result TIMESTAMPTZ;
    expected_date DATE;
    actual_date DATE;
BEGIN
    RAISE NOTICE '🎯 dayOfnthWeek Syntax Tests (W = week-based, # = occurrence-based)';
    RAISE NOTICE '=====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📅 July 2025: Starts Tuesday (Week 1 = days 1-6, no Monday)';
    RAISE NOTICE '   Expected: 1W1 skips July, 1W2=1#1, 1W3=1#2, 1W4=1#3';
    RAISE NOTICE '';
    
    -- Test 1: 1W1 for July 2025 (week 1 has no Monday, should skip to next month)
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1W1', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        actual_date := result::DATE;
        expected_date := '2025-09-01'::DATE; -- September 2025 starts Monday, week 1 has Monday
        
        IF actual_date = expected_date THEN
            RAISE NOTICE 'Test 1: 1W1 July 2025 (no Monday in week 1, skip) → % ✅', result;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 1: 1W1 July 2025 → % ❌ Expected %', result, expected_date;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 1: 1W1 July 2025 → ❌ %', SQLERRM;
    END;
    
    -- Test 2: 1W2 = Monday of week 2 (July 2025)
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1W2', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        actual_date := result::DATE;
        expected_date := '2025-07-07'::DATE; -- Week 2 Monday = July 7
        
        IF actual_date = expected_date THEN
            RAISE NOTICE 'Test 2: 1W2 July 2025 (week 2 Monday) → % ✅', result;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 2: 1W2 July 2025 → % ❌ Expected %', result, expected_date;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 2: 1W2 July 2025 → ❌ %', SQLERRM;
    END;
    
    -- Test 3: 1W4 = Monday of week 4 (July 2025)
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1W4', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        actual_date := result::DATE;
        expected_date := '2025-07-21'::DATE; -- Week 4 Monday = July 21
        
        IF actual_date = expected_date THEN
            RAISE NOTICE 'Test 3: 1W4 July 2025 (week 4 Monday = 3rd Monday) → % ✅', result;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 3: 1W4 July 2025 → % ❌ Expected %', result, expected_date;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 3: 1W4 July 2025 → ❌ %', SQLERRM;
    END;
    
    -- Test 4: 1#3 = 3rd Monday (July 2025) - should equal 1W4
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1#3', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        actual_date := result::DATE;
        expected_date := '2025-07-21'::DATE; -- 3rd Monday = July 21 = 1W4
        
        IF actual_date = expected_date THEN
            RAISE NOTICE 'Test 4: 1#3 July 2025 (3rd Monday = 1W4) → % ✅', result;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 4: 1#3 July 2025 → % ❌ Expected %', result, expected_date;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 4: 1#3 July 2025 → ❌ %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '📅 September 2025: Starts Monday (Week 1 has Monday on day 1)';
    RAISE NOTICE '   Expected: 1W1=1#1, 1W2=1#2';
    RAISE NOTICE '';
    
    -- Test 5: 1W1 for September 2025 (week 1 has Monday on day 1)
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1W1', '2025-08-31 00:00:00+00'::TIMESTAMPTZ);
        actual_date := result::DATE;
        expected_date := '2025-09-01'::DATE; -- Week 1 Monday = Sept 1
        
        IF actual_date = expected_date THEN
            RAISE NOTICE 'Test 5: 1W1 Sept 2025 (week 1 has Monday) → % ✅', result;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 5: 1W1 Sept 2025 → % ❌ Expected %', result, expected_date;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 5: 1W1 Sept 2025 → ❌ %', SQLERRM;
    END;
    
    -- Test 6: 1#1 = 1st Monday (September 2025) - should equal 1W1
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1#1', '2025-08-31 00:00:00+00'::TIMESTAMPTZ);
        actual_date := result::DATE;
        expected_date := '2025-09-01'::DATE; -- 1st Monday = Sept 1 = 1W1
        
        IF actual_date = expected_date THEN
            RAISE NOTICE 'Test 6: 1#1 Sept 2025 (1st Monday = 1W1) → % ✅', result;
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 6: 1#1 Sept 2025 → % ❌ Expected %', result, expected_date;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 6: 1#1 Sept 2025 → ❌ %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '📅 Edge Cases & Validation';
    RAISE NOTICE '';
    
    -- Test 7: Invalid weekday (7W1) ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 7W1', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 7: Invalid 7W1 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Invalid weekday%' THEN
            RAISE NOTICE 'Test 7: Invalid 7W1 → ✅ Rejected correctly';
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 7: Invalid 7W1 → ❌ Wrong error: %', SQLERRM;
        END IF;
    END;
    
    -- Test 8: Invalid week (1W6) ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1W6', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 8: Invalid 1W6 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Invalid week%' THEN
            RAISE NOTICE 'Test 8: Invalid 1W6 → ✅ Rejected correctly';
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 8: Invalid 1W6 → ❌ Wrong error: %', SQLERRM;
        END IF;
    END;
    
    -- Test 9: Negative weekday (-1W1) ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * -1W1', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 9: Invalid -1W1 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 9: Invalid -1W1 → ✅ Rejected';
        pass_count := pass_count + 1;
    END;
    
    -- Test 10: Week 0 (1W0) ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_time('* * * * 1W0', '2025-06-30 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 10: Invalid 1W0 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Invalid week%' THEN
            RAISE NOTICE 'Test 10: Invalid 1W0 → ✅ Rejected correctly';
            pass_count := pass_count + 1;
        ELSE
            RAISE NOTICE 'Test 10: Invalid 1W0 → ❌ Wrong error: %', SQLERRM;
        END IF;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '=========================================';
    IF pass_count = test_count THEN
        RAISE NOTICE '🎉 PERFECT! % / % tests passed (100%%)!', pass_count, test_count;
    ELSE
        RAISE NOTICE '⚠️  % / % tests passed', pass_count, test_count;
    END IF;
END;
$$;
