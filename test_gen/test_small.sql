-- JCRON Test Cases
-- Generated: 2025-10-07T08:53:49.997Z
-- Total tests: 20

DROP TABLE IF EXISTS jcron_tests;

CREATE TABLE jcron_tests (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  valid BOOLEAN NOT NULL,
  category TEXT NOT NULL,
  complexity TEXT NOT NULL,
  timezone TEXT,
  from_time TIMESTAMPTZ,
  expected_time TIMESTAMPTZ,
  note TEXT,
  expected_error TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jcron_tests_valid ON jcron_tests(valid);
CREATE INDEX idx_jcron_tests_category ON jcron_tests(category);
CREATE INDEX idx_jcron_tests_complexity ON jcron_tests(complexity);
CREATE INDEX idx_jcron_tests_tags ON jcron_tests USING GIN(tags);

-- Bulk insert data
INSERT INTO jcron_tests (
  id, pattern, valid, category, complexity, timezone,
  from_time, expected_time, note, expected_error, tags
) VALUES
  ('000001-last-day-of-month', '0 0 0 L * *', TRUE, 'valid_monthly', 'simple', NULL, '2025-09-02T10:52:12.000Z'::TIMESTAMPTZ, '2025-09-02T10:52:12.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_day_of_month']),
  ('000002-lunch-time', 'TZ:Europe/Paris 0 0 12 * * 1-5', TRUE, 'valid_business', 'medium', 'Europe/Paris', '2025-11-12T21:33:28.000Z'::TIMESTAMPTZ, '2025-11-12T21:33:28.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'lunch_time', 'with_timezone']),
  ('000003-monday-morning', '0 0 9 * * 1', TRUE, 'valid_weekly', 'simple', NULL, '2025-09-30T04:39:39.000Z'::TIMESTAMPTZ, '2025-09-30T04:39:39.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'monday_morning']),
  ('000004-business-hours-start', '0 0 9 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-09-08T14:43:16.000Z'::TIMESTAMPTZ, '2025-09-08T14:43:16.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_start']),
  ('000005-first-day-of-month', 'TZ:Asia/Shanghai 0 0 0 1 * *', TRUE, 'valid_monthly', 'medium', 'Asia/Shanghai', '2025-01-19T16:35:35.000Z'::TIMESTAMPTZ, '2025-01-19T16:35:35.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_day_of_month', 'with_timezone']),
  ('000006-first-day-of-month', 'TZ:UTC 0 0 0 1 * *', TRUE, 'valid_monthly', 'medium', 'UTC', '2025-03-09T18:38:08.000Z'::TIMESTAMPTZ, '2025-03-09T18:38:08.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_day_of_month', 'with_timezone']),
  ('000007-first-of-year', 'TZ:America/New_York 0 0 0 1 1 *', TRUE, 'valid_periodic', 'medium', 'America/New_York', '2025-11-04T13:56:52.000Z'::TIMESTAMPTZ, '2025-11-04T13:56:52.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'first_of_year', 'with_timezone']),
  ('000008-sunday-night', 'TZ:Europe/London 0 0 23 * * 0', TRUE, 'valid_weekly', 'medium', 'Europe/London', '2025-01-14T15:58:03.000Z'::TIMESTAMPTZ, '2025-01-14T15:58:03.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'sunday_night', 'with_timezone']),
  ('000009-every-2-hours', '0 0 */2 * * *', TRUE, 'valid_simple', 'simple', NULL, '2025-03-31T11:43:48.000Z'::TIMESTAMPTZ, '2025-03-31T11:43:48.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_2_hours']),
  ('000010-first-day-of-month', 'TZ:Asia/Tokyo 0 0 0 1 * *', TRUE, 'valid_monthly', 'medium', 'Asia/Tokyo', '2025-11-10T10:18:27.000Z'::TIMESTAMPTZ, '2025-11-10T10:18:27.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_day_of_month', 'with_timezone']),
  ('000011-first-day-of-month', 'TZ:America/Los_Angeles 0 0 0 1 * *', TRUE, 'valid_monthly', 'medium', 'America/Los_Angeles', '2025-01-28T06:19:29.000Z'::TIMESTAMPTZ, '2025-01-28T06:19:29.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_day_of_month', 'with_timezone']),
  ('000012-first-monday', '0 0 9 * * 1#1', TRUE, 'valid_monthly', 'simple', NULL, '2025-12-05T15:52:39.000Z'::TIMESTAMPTZ, '2025-12-05T15:52:39.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_monday']),
  ('000013-daily-evening', 'TZ:Australia/Sydney 0 0 18 * * *', TRUE, 'valid_simple', 'medium', 'Australia/Sydney', '2025-02-20T02:44:02.000Z'::TIMESTAMPTZ, '2025-02-20T02:44:02.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'daily_evening', 'with_timezone']),
  ('000014-every-minute', 'TZ:Europe/London 0 * * * * *', TRUE, 'valid_simple', 'medium', 'Europe/London', '2025-08-12T08:26:12.000Z'::TIMESTAMPTZ, '2025-08-12T08:26:12.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_minute', 'with_timezone']),
  ('000015-invalid-woy-error', '0 0 0 * * * WOY:54', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy > 53', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000016-invalid-tz-error', 'TZ: 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'empty timezone', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000017-invalid-syntax-error', '0 */0 * * * *', FALSE, 'invalid_syntax_error', 'simple', NULL, NULL, NULL, NULL, 'step cannot be zero', ARRAY['invalid', 'syntax_errors', 'syntax_error']),
  ('000018-invalid-range-error', '0 * * 32 * *', FALSE, 'invalid_range_error', 'simple', NULL, NULL, NULL, NULL, 'day out of range', ARRAY['invalid', 'out_of_range', 'range_error']),
  ('000020-invalid-woy-error', '0 0 0 * * * WOY:0', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy < 1', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000022-invalid-special-error', '0 0 0 * * 1#6', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'nth > 5', ARRAY['invalid', 'special_syntax_errors', 'special_error']);

-- Summary statistics
SELECT 
  valid,
  complexity,
  COUNT(*) as count
FROM jcron_tests
GROUP BY valid, complexity
ORDER BY valid DESC, complexity;