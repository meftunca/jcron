-- JCRON Test Cases
-- Generated: 2025-10-07T09:40:15.516Z
-- Total tests: 100

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
  ('000001-last-day-of-month', '0 0 0 L * *', TRUE, 'valid_monthly', 'simple', NULL, '2025-07-12T04:57:02.000Z'::TIMESTAMPTZ, '2025-07-13T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_day_of_month']),
  ('000002-lunch-time', '0 0 12 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-11-18T22:50:07.000Z'::TIMESTAMPTZ, '2025-11-19T12:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'lunch_time']),
  ('000003-quarterly', 'TZ:Europe/Paris 0 0 0 1 1,4,7,10 *', TRUE, 'valid_periodic', 'medium', 'Europe/Paris', '2025-01-02T09:39:51.000Z'::TIMESTAMPTZ, '2025-01-03T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'quarterly', 'with_timezone']),
  ('000004-sunday-night', 'TZ:Europe/Paris 0 0 23 * * 0 WOY:10,20,30 E1W', TRUE, 'valid_weekly', 'extreme', 'Europe/Paris', '2025-10-13T23:52:27.000Z'::TIMESTAMPTZ, '2026-03-08T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'sunday_night', 'with_timezone', 'with_woy', 'every_10_weeks', 'with_eod_sod', 'end_of_week']),
  ('000005-first-day-of-month', 'TZ:Asia/Shanghai 0 0 0 1 * *', TRUE, 'valid_monthly', 'medium', 'Asia/Shanghai', '2025-04-27T14:29:05.000Z'::TIMESTAMPTZ, '2025-04-28T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_day_of_month', 'with_timezone']),
  ('000006-monday-morning', 'TZ:Europe/Paris 0 0 9 * * 1', TRUE, 'valid_weekly', 'medium', 'Europe/Paris', '2025-08-24T16:16:58.000Z'::TIMESTAMPTZ, '2025-08-25T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'monday_morning', 'with_timezone']),
  ('000007-business-hours-end', '0 0 17 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-03-16T12:42:18.000Z'::TIMESTAMPTZ, '2025-03-16T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_end']),
  ('000008-business-hours-end', 'TZ:Asia/Tokyo 0 0 17 * * 1-5', TRUE, 'valid_business', 'medium', 'Asia/Tokyo', '2025-12-05T15:52:39.000Z'::TIMESTAMPTZ, '2025-12-05T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_end', 'with_timezone']),
  ('000009-daily-evening', 'TZ:Australia/Sydney 0 0 18 * * * WOY:1,2,3 E1M', TRUE, 'valid_simple', 'extreme', 'Australia/Sydney', '2025-06-25T19:53:21.000Z'::TIMESTAMPTZ, '2026-01-31T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'daily_evening', 'with_timezone', 'with_woy', 'first_3_weeks', 'with_eod_sod', 'end_of_month']),
  ('000010-last-friday', 'TZ:Asia/Tokyo 0 0 17 * * 5L', TRUE, 'valid_monthly', 'medium', 'Asia/Tokyo', '2025-09-15T21:41:17.000Z'::TIMESTAMPTZ, '2025-09-16T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_friday', 'with_timezone']),
  ('000011-lunch-time', '0 0 12 * * 1-5 WOY:*', TRUE, 'valid_business', 'complex', NULL, '2025-12-01T09:12:45.000Z'::TIMESTAMPTZ, '2025-12-01T12:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'lunch_time', 'with_woy', 'all_weeks']),
  ('000012-weekend-morning', 'TZ:Europe/Paris 0 0 10 * * 0,6', TRUE, 'valid_weekly', 'medium', 'Europe/Paris', '2025-04-18T18:01:40.000Z'::TIMESTAMPTZ, '2025-04-19T10:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'weekend_morning', 'with_timezone']),
  ('000013-sunday-night', '0 0 23 * * 0', TRUE, 'valid_weekly', 'simple', NULL, '2025-06-07T15:22:09.000Z'::TIMESTAMPTZ, '2025-06-07T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'sunday_night']),
  ('000014-last-day-of-month', 'TZ:Asia/Tokyo 0 0 0 L * *', TRUE, 'valid_monthly', 'medium', 'Asia/Tokyo', '2025-11-27T05:49:59.000Z'::TIMESTAMPTZ, '2025-11-28T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_day_of_month', 'with_timezone']),
  ('000015-hourly', '0 0 * * * * WOY:*', TRUE, 'valid_simple', 'complex', NULL, '2025-09-16T22:36:13.000Z'::TIMESTAMPTZ, '2025-09-16T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'hourly', 'with_woy', 'all_weeks']),
  ('000016-quarterly', 'TZ:America/New_York 0 0 0 1 1,4,7,10 *', TRUE, 'valid_periodic', 'medium', 'America/New_York', '2025-03-17T12:55:05.000Z'::TIMESTAMPTZ, '2025-03-18T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'quarterly', 'with_timezone']),
  ('000017-last-friday', 'TZ:Asia/Shanghai 0 0 17 * * 5L S1M', TRUE, 'valid_monthly', 'complex', 'Asia/Shanghai', '2025-05-15T22:39:46.000Z'::TIMESTAMPTZ, '2025-05-01T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_friday', 'with_timezone', 'with_eod_sod', 'start_of_month']),
  ('000018-daily-midnight', '0 0 0 * * *', TRUE, 'valid_simple', 'simple', NULL, '2025-03-18T06:44:30.000Z'::TIMESTAMPTZ, '2025-03-19T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'daily_midnight']),
  ('000019-middle-of-month', 'TZ:UTC 0 0 0 15 * *', TRUE, 'valid_monthly', 'medium', 'UTC', '2025-04-17T09:28:15.000Z'::TIMESTAMPTZ, '2025-04-18T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'middle_of_month', 'with_timezone']),
  ('000020-business-hours-end', 'TZ:America/New_York 0 0 17 * * 1-5', TRUE, 'valid_business', 'medium', 'America/New_York', '2025-12-27T19:49:22.000Z'::TIMESTAMPTZ, '2025-12-28T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_end', 'with_timezone']),
  ('000021-every-5-minutes', '0 */5 * * * *', TRUE, 'valid_simple', 'simple', NULL, '2025-06-08T13:26:20.000Z'::TIMESTAMPTZ, '2025-06-08T13:30:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_5_minutes']),
  ('000022-weekend-morning', 'TZ:America/Los_Angeles 0 0 10 * * 0,6', TRUE, 'valid_weekly', 'medium', 'America/Los_Angeles', '2025-06-30T18:29:59.000Z'::TIMESTAMPTZ, '2025-07-01T10:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'weekend_morning', 'with_timezone']),
  ('000023-middle-of-month', '0 0 0 15 * *', TRUE, 'valid_monthly', 'simple', NULL, '2025-04-20T01:18:53.000Z'::TIMESTAMPTZ, '2025-04-21T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'middle_of_month']),
  ('000024-every-hour-business', 'TZ:America/New_York 0 0 9-17 * * 1-5', TRUE, 'valid_business', 'medium', 'America/New_York', '2025-02-15T14:13:50.000Z'::TIMESTAMPTZ, '2025-02-16T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'every_hour_business', 'with_timezone']),
  ('000025-business-hours-start', '0 0 9 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-05-19T16:11:14.000Z'::TIMESTAMPTZ, '2025-05-20T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_start']),
  ('000026-last-of-year', '0 0 23 31 12 *', TRUE, 'valid_periodic', 'simple', NULL, '2025-11-13T16:26:30.000Z'::TIMESTAMPTZ, '2025-11-13T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year']),
  ('000027-last-friday', '0 0 17 * * 5L S1D', TRUE, 'valid_monthly', 'complex', NULL, '2025-10-22T18:30:38.000Z'::TIMESTAMPTZ, '2025-10-23T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_friday', 'with_eod_sod', 'start_of_day']),
  ('000028-business-hours-end', '0 0 17 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-11-10T17:03:49.000Z'::TIMESTAMPTZ, '2025-11-11T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_end']),
  ('000029-multi-hour-steps', 'TZ:UTC 0 0 0,6,12,18 * * * WOY:1,13,26,39,52', TRUE, 'valid_complex', 'complex', 'UTC', '2025-10-05T16:36:08.000Z'::TIMESTAMPTZ, '2025-12-22T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['complex', 'multi_hour_steps', 'with_timezone', 'with_woy', 'quarterly_weeks']),
  ('000030-multi-hour-steps', '0 0 0,6,12,18 * * *', TRUE, 'valid_complex', 'simple', NULL, '2025-08-07T18:38:58.000Z'::TIMESTAMPTZ, '2025-08-08T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['complex', 'multi_hour_steps']),
  ('000031-friday-evening', '0 0 17 * * 5', TRUE, 'valid_weekly', 'simple', NULL, '2025-12-09T04:46:41.000Z'::TIMESTAMPTZ, '2025-12-09T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'friday_evening']),
  ('000032-last-day-of-month', '0 0 0 L * * WOY:10,20,30 E1D', TRUE, 'valid_monthly', 'complex', NULL, '2025-08-25T09:28:18.000Z'::TIMESTAMPTZ, '2026-03-05T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_day_of_month', 'with_woy', 'every_10_weeks', 'with_eod_sod', 'end_of_day']),
  ('000033-last-of-year', '0 0 23 31 12 *', TRUE, 'valid_periodic', 'simple', NULL, '2025-02-22T23:32:09.000Z'::TIMESTAMPTZ, '2025-02-23T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year']),
  ('000034-business-hours-start', 'TZ:America/Los_Angeles 0 0 9 * * 1-5', TRUE, 'valid_business', 'medium', 'America/Los_Angeles', '2025-09-19T11:24:37.000Z'::TIMESTAMPTZ, '2025-09-20T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_start', 'with_timezone']),
  ('000035-last-of-year', 'TZ:Asia/Tokyo 0 0 23 31 12 *', TRUE, 'valid_periodic', 'medium', 'Asia/Tokyo', '2025-06-21T04:41:04.000Z'::TIMESTAMPTZ, '2025-06-21T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year', 'with_timezone']),
  ('000036-friday-evening', 'TZ:America/Los_Angeles 0 0 17 * * 5 WOY:1,13,26,39,52', TRUE, 'valid_weekly', 'complex', 'America/Los_Angeles', '2025-07-13T15:40:57.000Z'::TIMESTAMPTZ, '2025-09-28T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'friday_evening', 'with_timezone', 'with_woy', 'quarterly_weeks']),
  ('000037-middle-of-month', 'TZ:America/New_York 0 0 0 15 * * WOY:1,2,3', TRUE, 'valid_monthly', 'complex', 'America/New_York', '2025-01-26T07:03:07.000Z'::TIMESTAMPTZ, '2026-01-01T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'middle_of_month', 'with_timezone', 'with_woy', 'first_3_weeks']),
  ('000038-report-generation', '0 0 8 1 * * WOY:* E1M', TRUE, 'valid_complex', 'complex', NULL, '2025-03-25T20:15:25.000Z'::TIMESTAMPTZ, '2025-03-31T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['complex', 'report_generation', 'with_woy', 'all_weeks', 'with_eod_sod', 'end_of_month']),
  ('000039-first-of-year', 'TZ:Australia/Sydney 0 0 0 1 1 *', TRUE, 'valid_periodic', 'medium', 'Australia/Sydney', '2025-10-18T16:19:07.000Z'::TIMESTAMPTZ, '2025-10-19T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'first_of_year', 'with_timezone']),
  ('000040-first-monday', '0 0 9 * * 1#1 WOY:1,2,3 E1D', TRUE, 'valid_monthly', 'complex', NULL, '2025-04-06T21:54:35.000Z'::TIMESTAMPTZ, '2026-01-01T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_monday', 'with_woy', 'first_3_weeks', 'with_eod_sod', 'end_of_day']),
  ('000041-last-of-year', '0 0 23 31 12 * E1M', TRUE, 'valid_periodic', 'complex', NULL, '2025-05-04T07:27:13.000Z'::TIMESTAMPTZ, '2025-05-31T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year', 'with_eod_sod', 'end_of_month']),
  ('000042-every-hour-business', '0 0 9-17 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-12-14T12:22:37.000Z'::TIMESTAMPTZ, '2025-12-15T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'every_hour_business']),
  ('000043-lunch-time', '0 0 12 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-07-27T12:22:34.000Z'::TIMESTAMPTZ, '2025-07-28T12:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'lunch_time']),
  ('000044-quarterly', 'TZ:Asia/Shanghai 0 0 0 1 1,4,7,10 *', TRUE, 'valid_periodic', 'medium', 'Asia/Shanghai', '2025-07-22T07:33:08.000Z'::TIMESTAMPTZ, '2025-07-23T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'quarterly', 'with_timezone']),
  ('000045-last-friday', '0 0 17 * * 5L', TRUE, 'valid_monthly', 'simple', NULL, '2025-08-19T12:24:45.000Z'::TIMESTAMPTZ, '2025-08-19T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_friday']),
  ('000046-last-of-year', 'TZ:Australia/Sydney 0 0 23 31 12 *', TRUE, 'valid_periodic', 'medium', 'Australia/Sydney', '2025-05-31T20:01:36.000Z'::TIMESTAMPTZ, '2025-05-31T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year', 'with_timezone']),
  ('000047-friday-evening', '0 0 17 * * 5', TRUE, 'valid_weekly', 'simple', NULL, '2025-09-10T09:42:32.000Z'::TIMESTAMPTZ, '2025-09-10T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'friday_evening']),
  ('000048-every-15-minutes', '0 */15 * * * *', TRUE, 'valid_simple', 'simple', NULL, '2025-08-19T05:30:24.000Z'::TIMESTAMPTZ, '2025-08-19T05:45:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_15_minutes']),
  ('000049-last-of-year', '0 0 23 31 12 * WOY:*', TRUE, 'valid_periodic', 'complex', NULL, '2025-07-18T19:51:47.000Z'::TIMESTAMPTZ, '2025-07-18T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year', 'with_woy', 'all_weeks']),
  ('000050-monday-morning', 'TZ:Australia/Sydney 0 0 9 * * 1', TRUE, 'valid_weekly', 'medium', 'Australia/Sydney', '2025-06-11T14:46:33.000Z'::TIMESTAMPTZ, '2025-06-12T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'monday_morning', 'with_timezone']),
  ('000051-first-monday', '0 0 9 * * 1#1 WOY:1,2,3 E1D', TRUE, 'valid_monthly', 'complex', NULL, '2025-05-18T00:07:08.000Z'::TIMESTAMPTZ, '2026-01-01T23:59:59.999Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_monday', 'with_woy', 'first_3_weeks', 'with_eod_sod', 'end_of_day']),
  ('000052-last-of-year', '0 0 23 31 12 * WOY:1,2,3', TRUE, 'valid_periodic', 'complex', NULL, '2025-09-13T12:12:15.000Z'::TIMESTAMPTZ, '2026-01-01T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'last_of_year', 'with_woy', 'first_3_weeks']),
  ('000053-every-15min-business', '0 */15 9-17 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-05-06T22:53:46.000Z'::TIMESTAMPTZ, '2025-05-06T23:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'every_15min_business']),
  ('000054-every-6-hours', 'TZ:Europe/London 0 0 */6 * * *', TRUE, 'valid_simple', 'medium', 'Europe/London', '2025-09-20T23:10:43.000Z'::TIMESTAMPTZ, '2025-09-27T23:10:43.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_6_hours', 'with_timezone']),
  ('000055-middle-of-month', '0 0 0 15 * * WOY:52,53', TRUE, 'valid_monthly', 'complex', NULL, '2025-12-02T07:03:58.000Z'::TIMESTAMPTZ, '2025-12-24T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'middle_of_month', 'with_woy', 'last_weeks']),
  ('000056-every-minute', 'TZ:America/Los_Angeles 0 * * * * *', TRUE, 'valid_simple', 'medium', 'America/Los_Angeles', '2025-12-28T11:46:45.000Z'::TIMESTAMPTZ, '2026-01-04T11:46:45.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_minute', 'with_timezone']),
  ('000057-last-friday', 'TZ:Asia/Tokyo 0 0 17 * * 5L WOY:52,53', TRUE, 'valid_monthly', 'complex', 'Asia/Tokyo', '2025-05-18T04:42:22.000Z'::TIMESTAMPTZ, '2025-12-28T17:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'last_friday', 'with_timezone', 'with_woy', 'last_weeks']),
  ('000058-every-hour-business', '0 0 9-17 * * 1-5 WOY:1,2,3', TRUE, 'valid_business', 'complex', NULL, '2025-06-07T13:03:20.000Z'::TIMESTAMPTZ, '2026-01-01T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'every_hour_business', 'with_woy', 'first_3_weeks']),
  ('000059-multi-hour-steps', 'TZ:Australia/Sydney 0 0 0,6,12,18 * * * WOY:1,2,3', TRUE, 'valid_complex', 'complex', 'Australia/Sydney', '2025-09-04T05:39:36.000Z'::TIMESTAMPTZ, '2026-01-01T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['complex', 'multi_hour_steps', 'with_timezone', 'with_woy', 'first_3_weeks']),
  ('000060-every-hour-business', 'TZ:America/New_York 0 0 9-17 * * 1-5', TRUE, 'valid_business', 'medium', 'America/New_York', '2025-07-22T17:34:16.000Z'::TIMESTAMPTZ, '2025-07-23T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'every_hour_business', 'with_timezone']),
  ('000061-every-15min-business', '0 */15 9-17 * * 1-5 S1M', TRUE, 'valid_business', 'complex', NULL, '2025-07-31T19:58:59.000Z'::TIMESTAMPTZ, '2025-07-01T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'every_15min_business', 'with_eod_sod', 'start_of_month']),
  ('000062-business-hours-start', 'TZ:Asia/Tokyo 0 0 9 * * 1-5', TRUE, 'valid_business', 'medium', 'Asia/Tokyo', '2025-11-11T21:55:03.000Z'::TIMESTAMPTZ, '2025-11-12T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'business_hours_start', 'with_timezone']),
  ('000063-monday-morning', '0 0 9 * * 1', TRUE, 'valid_weekly', 'simple', NULL, '2025-11-08T03:53:36.000Z'::TIMESTAMPTZ, '2025-11-08T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'monday_morning']),
  ('000064-every-5-minutes', '0 */5 * * * *', TRUE, 'valid_simple', 'simple', NULL, '2025-07-05T16:13:23.000Z'::TIMESTAMPTZ, '2025-07-05T16:15:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['simple', 'every_5_minutes']),
  ('000065-middle-of-month', '0 0 0 15 * * WOY:*', TRUE, 'valid_monthly', 'complex', NULL, '2025-05-07T09:36:04.000Z'::TIMESTAMPTZ, '2025-05-08T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'middle_of_month', 'with_woy', 'all_weeks']),
  ('000066-lunch-time', '0 0 12 * * 1-5', TRUE, 'valid_business', 'simple', NULL, '2025-04-03T01:08:43.000Z'::TIMESTAMPTZ, '2025-04-03T12:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['business', 'lunch_time']),
  ('000067-monday-morning', '0 0 9 * * 1', TRUE, 'valid_weekly', 'simple', NULL, '2025-04-02T19:30:07.000Z'::TIMESTAMPTZ, '2025-04-03T09:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'monday_morning']),
  ('000068-first-day-of-month', '0 0 0 1 * * WOY:*', TRUE, 'valid_monthly', 'complex', NULL, '2025-08-29T03:22:30.000Z'::TIMESTAMPTZ, '2025-08-30T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['monthly', 'first_day_of_month', 'with_woy', 'all_weeks']),
  ('000069-quarterly', '0 0 0 1 1,4,7,10 *', TRUE, 'valid_periodic', 'simple', NULL, '2025-07-07T01:02:24.000Z'::TIMESTAMPTZ, '2025-07-08T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['periodic', 'quarterly']),
  ('000070-friday-evening', '0 0 17 * * 5 WOY:52,53 S1W', TRUE, 'valid_weekly', 'complex', NULL, '2025-03-08T21:06:51.000Z'::TIMESTAMPTZ, '2025-12-29T00:00:00.000Z'::TIMESTAMPTZ, NULL, NULL, ARRAY['weekly', 'friday_evening', 'with_woy', 'last_weeks', 'with_eod_sod', 'start_of_week']),
  ('000071-invalid-syntax-error', '0 * * * 12-6 *', FALSE, 'invalid_syntax_error', 'simple', NULL, NULL, NULL, NULL, 'invalid range', ARRAY['invalid', 'syntax_errors', 'syntax_error']),
  ('000072-invalid-woy-error', '0 0 0 * * * WOY:655', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy > 53', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000073-invalid-woy-error', '0 0 0 * * * WOY:0', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy < 1', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000074-invalid-range-error', '0 * * * 99 *', FALSE, 'invalid_range_error', 'simple', NULL, NULL, NULL, NULL, 'month out of range', ARRAY['invalid', 'out_of_range', 'range_error']),
  ('000075-invalid-special-error', '0 0 0 33W * *', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'invalid W day', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000076-invalid-special-error', '0 0 0 * * 8L', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'dow > 6 with L', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000077-invalid-range-error', '0 * * * * 99', FALSE, 'invalid_range_error', 'simple', NULL, NULL, NULL, NULL, 'dow out of range', ARRAY['invalid', 'out_of_range', 'range_error']),
  ('000078-invalid-special-error', '0 0 0 WW * *', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'double W', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000080-invalid-range-error', '0 * * * */18 *', FALSE, 'invalid_range_error', 'simple', NULL, NULL, NULL, NULL, 'step out of range', ARRAY['invalid', 'out_of_range', 'range_error']),
  ('000082-invalid-tz-error', 'TZ: 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'empty timezone', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000083-invalid-woy-error', '0 0 0 * * * WOY:abc', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'non-numeric woy', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000084-invalid-woy-error', '0 0 0 * * * WOY:1,0', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy < 1 in list', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000085-invalid-woy-error', '0 0 0 * * * WOY:1,98', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy > 53 in list', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000086-invalid-woy-error', '0 0 0 * * * WOY:59', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy > 53', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000087-invalid-woy-error', '0 0 0 * * * WOY:76', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy > 53', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000089-invalid-tz-error', 'TZ:Missing/Region 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'invalid timezone', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000090-invalid-special-error', '0 0 0 * * ##', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'double #', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000091-invalid-tz-error', 'TZ:Fake/City 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'invalid timezone', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000093-invalid-range-error', '0 99 * * * *', FALSE, 'invalid_range_error', 'simple', NULL, NULL, NULL, NULL, 'minute out of range', ARRAY['invalid', 'out_of_range', 'range_error']),
  ('000094-invalid-syntax-error', '0 10-5 * * * *', FALSE, 'invalid_syntax_error', 'simple', NULL, NULL, NULL, NULL, 'invalid range', ARRAY['invalid', 'syntax_errors', 'syntax_error']),
  ('000097-invalid-tz-error', 'TZ:123 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'numeric timezone', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000098-invalid-tz-error', 'TZ:UTC+25 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'invalid offset', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000100-invalid-special-error', '0 0 0 32W * *', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'invalid W day', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000102-invalid-syntax-error', '0 */0 * * * *', FALSE, 'invalid_syntax_error', 'simple', NULL, NULL, NULL, NULL, 'step cannot be zero', ARRAY['invalid', 'syntax_errors', 'syntax_error']),
  ('000105-invalid-range-error', '0 * * * * 80', FALSE, 'invalid_range_error', 'simple', NULL, NULL, NULL, NULL, 'dow out of range', ARRAY['invalid', 'out_of_range', 'range_error']),
  ('000106-invalid-special-error', '0 0 0 99W * *', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'invalid W day', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000108-invalid-special-error', '0 0 0 * * 1#7', FALSE, 'invalid_special_error', 'simple', NULL, NULL, NULL, NULL, 'nth > 5', ARRAY['invalid', 'special_syntax_errors', 'special_error']),
  ('000109-invalid-woy-error', '0 0 0 * * * WOY:85', FALSE, 'invalid_woy_error', 'simple', NULL, NULL, NULL, NULL, 'woy > 53', ARRAY['invalid', 'woy_errors', 'woy_error']),
  ('000110-invalid-tz-error', 'TZ:0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'numeric timezone', ARRAY['invalid', 'timezone_errors', 'tz_error']),
  ('000111-invalid-tz-error', 'TZ:UTC-15 0 * * * * *', FALSE, 'invalid_tz_error', 'simple', NULL, NULL, NULL, NULL, 'invalid offset', ARRAY['invalid', 'timezone_errors', 'tz_error']);

-- Summary statistics
SELECT 
  valid,
  complexity,
  COUNT(*) as count
FROM jcron_tests
GROUP BY valid, complexity
ORDER BY valid DESC, complexity;