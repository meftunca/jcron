-- Test TZ parsing
DO $$
DECLARE
    test_expr TEXT := '0 0 * * * TZ=UTC';
    cleaned_expr TEXT;
    tz_part TEXT;
    parts TEXT[];
BEGIN
    -- Test TZ pattern matching
    RAISE NOTICE 'Original: %', test_expr;
    
    -- Check if TZ pattern is detected
    IF test_expr ~ 'TZ[:=]' THEN
        RAISE NOTICE 'TZ pattern detected!';
        tz_part := substring(test_expr from 'TZ[:=]([^ ]+)');
        RAISE NOTICE 'TZ part: %', tz_part;
        
        cleaned_expr := regexp_replace(test_expr, 'TZ[:=][^ ]+\s*', '', 'g');
        RAISE NOTICE 'Cleaned expr: %', cleaned_expr;
    ELSE
        RAISE NOTICE 'TZ pattern NOT detected';
        cleaned_expr := test_expr;
    END IF;
    
    -- Split and check parts
    parts := string_to_array(trim(cleaned_expr), ' ');
    RAISE NOTICE 'Parts array length: %', array_length(parts, 1);
    FOR i IN 1..array_length(parts, 1) LOOP
        RAISE NOTICE 'Part %: %', i, parts[i];
    END LOOP;
    
END $$;
