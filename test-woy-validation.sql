-- Test WOY validation
\timing on

-- Load JCRON
\i sql-ports/jcron.sql

DO $$
DECLARE
    test_count INTEGER := 0;
    pass_count INTEGER := 0;
    result TIMESTAMPTZ;
    error_msg TEXT;
BEGIN
    RAISE NOTICE '🎯 WOY Validation Tests';
    RAISE NOTICE '======================';
    
    -- Test 1: Valid WOY (1-53) ✅
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 * * * WOY:1,10,53', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 1: Valid WOY:1,10,53 → % ✅', result;
        pass_count := pass_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 1: Valid WOY:1,10,53 → ❌ %', SQLERRM;
    END;
    
    -- Test 2: Invalid WOY:0 ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 * * * WOY:0', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 2: Invalid WOY:0 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 2: Invalid WOY:0 → ✅ Rejected: %', SQLERRM;
        pass_count := pass_count + 1;
    END;
    
    -- Test 3: Invalid WOY:54 ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 * * * WOY:54', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 3: Invalid WOY:54 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 3: Invalid WOY:54 → ✅ Rejected: %', SQLERRM;
        pass_count := pass_count + 1;
    END;
    
    -- Test 4: Invalid WOY:-1 ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 * * * WOY:-1', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 4: Invalid WOY:-1 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 4: Invalid WOY:-1 → ✅ Rejected: %', SQLERRM;
        pass_count := pass_count + 1;
    END;
    
    -- Test 5: Invalid WOY:100 ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 * * * WOY:100', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 5: Invalid WOY:100 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 5: Invalid WOY:100 → ✅ Rejected: %', SQLERRM;
        pass_count := pass_count + 1;
    END;
    
    -- Test 6: Mixed valid/invalid WOY ❌
    test_count := test_count + 1;
    BEGIN
        result := jcron.next_from('0 0 * * * WOY:1,10,60', '2024-01-01 00:00:00+00'::TIMESTAMPTZ);
        RAISE NOTICE 'Test 6: Mixed WOY:1,10,60 → ❌ Should reject but got %', result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 6: Mixed WOY:1,10,60 → ✅ Rejected: %', SQLERRM;
        pass_count := pass_count + 1;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '======================';
    IF pass_count = test_count THEN
        RAISE NOTICE '🎉 PERFECT! % / % tests passed (100%%)!', pass_count, test_count;
    ELSE
        RAISE NOTICE '⚠️  % / % tests passed', pass_count, test_count;
    END IF;
END;
$$;
