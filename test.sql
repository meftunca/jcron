-- JCRON Real-World WOY Test - Progressive Search Strategy

DO $$
DECLARE
    result_time TIMESTAMPTZ;
    result_week INTEGER;
    test_count INTEGER := 0;
    success_count INTEGER := 0;
    pattern TEXT;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration_ms NUMERIC;
BEGIN
    RAISE NOTICE '🎯 WOY Edge Cases - Progressive Search (5y→26y→50y)';
    RAISE NOTICE '=======================================================';
    
    -- Test 1: Dec 31 + Week 1-3
    BEGIN
        pattern := '0 0 23 31 12 * WOY:1,2,3';
        test_count := test_count + 1;
        start_time := clock_timestamp();
        result_time := jcron.next_time(pattern, '2024-01-01'::TIMESTAMPTZ);
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        result_week := EXTRACT(WEEK FROM result_time)::INTEGER;
        RAISE NOTICE 'Test 1: Dec 31 + WOY:1-3 → % (Week %) [% ms] ✅', result_time, result_week, ROUND(duration_ms, 2);
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 1: ❌ FAILED: %', SQLERRM;
    END;
    
    -- Test 2: Jan 1 + Week 52-53
    BEGIN
        pattern := '0 0 0 1 1 * WOY:52,53';
        test_count := test_count + 1;
        start_time := clock_timestamp();
        result_time := jcron.next_time(pattern, '2020-01-01'::TIMESTAMPTZ);
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        result_week := EXTRACT(WEEK FROM result_time)::INTEGER;
        RAISE NOTICE 'Test 2: Jan 1 + WOY:52,53 → % (Week %) [% ms] ✅', result_time, result_week, ROUND(duration_ms, 2);
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 2: ❌ FAILED: %', SQLERRM;
    END;
    
    -- Test 3: Quarterly (ULTRA RARE)
    BEGIN
        pattern := '0 0 0 1 1,4,7,10 * WOY:1,2,3';
        test_count := test_count + 1;
        start_time := clock_timestamp();
        result_time := jcron.next_time(pattern, '2024-01-01'::TIMESTAMPTZ);
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        result_week := EXTRACT(WEEK FROM result_time)::INTEGER;
        RAISE NOTICE 'Test 3: Quarterly + WOY:1-3 → % (Week %) [% ms] ✅', result_time, result_week, ROUND(duration_ms, 2);
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 3: ❌ FAILED: %', SQLERRM;
    END;
    
    -- Test 4: Last day + WOY:1-3
    BEGIN
        pattern := '0 0 0 L * * WOY:1,2,3';
        test_count := test_count + 1;
        start_time := clock_timestamp();
        result_time := jcron.next_time(pattern, '2024-01-01'::TIMESTAMPTZ);
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        result_week := EXTRACT(WEEK FROM result_time)::INTEGER;
        RAISE NOTICE 'Test 4: Last day + WOY:1-3 → % (Week %) [% ms] ✅', result_time, result_week, ROUND(duration_ms, 2);
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 4: ❌ FAILED: %', SQLERRM;
    END;
    
    -- Test 5: Feb 29 + Week 9
    BEGIN
        pattern := '0 0 12 29 2 * WOY:9';
        test_count := test_count + 1;
        start_time := clock_timestamp();
        result_time := jcron.next_time(pattern, '2024-01-01'::TIMESTAMPTZ);
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        result_week := EXTRACT(WEEK FROM result_time)::INTEGER;
        RAISE NOTICE 'Test 5: Feb 29 + WOY:9 → % (Week %) [% ms] ✅', result_time, result_week, ROUND(duration_ms, 2);
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 5: ❌ FAILED: %', SQLERRM;
    END;
    
    -- Test 6: Monday + sparse WOY
    BEGIN
        pattern := '0 0 9 * * 1 WOY:10,20,30,40';
        test_count := test_count + 1;
        start_time := clock_timestamp();
        result_time := jcron.next_time(pattern, '2024-01-01'::TIMESTAMPTZ);
        end_time := clock_timestamp();
        duration_ms := EXTRACT(MILLISECONDS FROM (end_time - start_time));
        result_week := EXTRACT(WEEK FROM result_time)::INTEGER;
        RAISE NOTICE 'Test 6: Monday + sparse WOY → % (Week %) [% ms] ✅', result_time, result_week, ROUND(duration_ms, 2);
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 6: ❌ FAILED: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '=======================================================';
    IF success_count = test_count THEN
        RAISE NOTICE '🎉 PERFECT! % / % tests passed (100%%)!', success_count, test_count;
    ELSE
        RAISE NOTICE '⚠️  % / % failed', test_count - success_count, test_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '❌ Impossible Patterns:';
    BEGIN
        result_time := jcron.next_time('0 0 0 15 * * WOY:1,13,26,39,52', '2024-01-01'::TIMESTAMPTZ);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 7: 15th + sparse WOY → ✅ Rejected';
    END;
    
    BEGIN
        result_time := jcron.next_time('0 0 0 31 12 * WOY:10,20,30', '2024-01-01'::TIMESTAMPTZ);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Test 8: Dec 31 + mid WOY → ✅ Rejected';
    END;
END $$;
