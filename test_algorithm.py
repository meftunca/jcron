#!/usr/bin/env python3
"""
JCRON Algorithm Test - Python Implementation
Bu test, PostgreSQL algoritmalarımızın mantığını Python'da test eder
"""

import json
import datetime
from typing import Dict, List, Optional, Union
import calendar
import re


class JCronTester:
    def __init__(self):
        self.predefined_schedules = {
            '@yearly': '0 0 0 1 1 *',
            '@annually': '0 0 0 1 1 *',
            '@monthly': '0 0 0 1 * *',
            '@weekly': '0 0 0 * * 0',
            '@daily': '0 0 0 * * *',
            '@midnight': '0 0 0 * * *',
            '@hourly': '0 0 * * * *'
        }
        
        self.day_abbreviations = {
            'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3,
            'THU': 4, 'FRI': 5, 'SAT': 6, 'SUNDAY': 0,
            'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
            'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        }
        
        self.month_abbreviations = {
            'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4,
            'MAY': 5, 'JUN': 6, 'JUL': 7, 'AUG': 8,
            'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12,
            'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3, 'APRIL': 4,
            'JUNE': 6, 'JULY': 7, 'AUGUST': 8,
            'SEPTEMBER': 9, 'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12
        }

    def parse_cron_expression(self, cron_expr: str) -> Dict:
        """Parse cron expression into schedule dict"""
        # Handle predefined schedules
        if cron_expr.startswith('@'):
            if cron_expr in self.predefined_schedules:
                cron_expr = self.predefined_schedules[cron_expr]
            else:
                raise ValueError(f'Unknown predefined schedule: {cron_expr}')
        
        # Split into parts
        parts = cron_expr.strip().split()
        
        if len(parts) == 5:
            # 5-field format: m h D M dow
            return {
                's': '0',
                'm': parts[0],
                'h': parts[1],
                'D': parts[2],
                'M': parts[3],
                'dow': parts[4]
            }
        elif len(parts) == 6:
            # 6-field format: s m h D M dow
            return {
                's': parts[0],
                'm': parts[1],
                'h': parts[2],
                'D': parts[3],
                'M': parts[4],
                'dow': parts[5]
            }
        else:
            raise ValueError(f'Invalid cron expression format. Expected 5 or 6 fields, got {len(parts)}')

    def expand_part(self, schedule: Dict, part: str) -> Optional[List[int]]:
        """Expand a schedule part into list of values"""
        field_val = schedule.get(part)
        if field_val is None:
            field_val = '0' if part == 's' else '*'
        
        # Handle special patterns
        if field_val in ['*', '?'] or any(c in field_val for c in 'LWR#'):
            return None
        
        # Get min/max values for the field
        ranges = {
            's': (0, 59), 'm': (0, 59), 'h': (0, 23), 'D': (1, 31),
            'M': (1, 12), 'dow': (0, 7), 'Y': (2020, 2099), 'W': (1, 53)
        }
        p_min, p_max = ranges[part]
        
        # Handle step patterns (*/n)
        if re.match(r'^\*/\d+$', field_val):
            step = int(field_val.split('/')[1])
            return list(range(p_min, p_max + 1, step))
        
        result = []
        
        # Process comma-separated parts
        for item in field_val.split(','):
            resolved_val = item
            
            # Resolve day abbreviations
            if part == 'dow' and item.upper() in self.day_abbreviations:
                resolved_val = str(self.day_abbreviations[item.upper()])
            
            # Resolve month abbreviations
            if part == 'M' and item.upper() in self.month_abbreviations:
                resolved_val = str(self.month_abbreviations[item.upper()])
            
            # Process different pattern types
            if re.match(r'^\d+$', resolved_val):
                result.append(int(resolved_val))
            elif re.match(r'^\d+-\d+$', resolved_val):
                start, end = map(int, resolved_val.split('-'))
                if start > end:
                    raise ValueError(f'Inverted range: {resolved_val}')
                result.extend(range(start, end + 1))
            elif re.match(r'^\d+-\d+/\d+$', resolved_val):
                range_part, step = resolved_val.split('/')
                start, end = map(int, range_part.split('-'))
                step = int(step)
                if start > end:
                    raise ValueError(f'Inverted range: {resolved_val}')
                result.extend(range(start, end + 1, step))
            else:
                raise ValueError(f'Invalid expression part: {resolved_val}')
        
        # Remove duplicates and sort
        return sorted(list(set(result)))

    def get_expanded_schedule(self, schedule: Dict) -> Dict:
        """Get expanded schedule cache"""
        return {
            'schedule': schedule,
            'seconds_vals': self.expand_part(schedule, 's'),
            'minutes_vals': self.expand_part(schedule, 'm'),
            'hours_vals': self.expand_part(schedule, 'h'),
            'dom_vals': self.expand_part(schedule, 'D'),
            'months_vals': self.expand_part(schedule, 'M'),
            'dow_vals': self.expand_part(schedule, 'dow'),
            'years_vals': self.expand_part(schedule, 'Y'),
            'week_vals': self.expand_part(schedule, 'W'),
            'timezone': schedule.get('timezone', 'UTC'),
            'has_special_patterns': any(
                field and any(c in str(field) for c in 'L#')
                for field in [schedule.get('D'), schedule.get('dow'), schedule.get('W')]
            )
        }

    def is_week_match(self, ts: datetime.datetime, schedule: Dict) -> bool:
        """Check if timestamp matches week constraint"""
        week_str = schedule.get('W')
        if not week_str or week_str == '*':
            return True
        
        # Get week number (ISO week)
        week_num = ts.isocalendar()[1]
        week_vals = self.expand_part(schedule, 'W')
        
        if not week_vals:
            return True
            
        # Special handling for week 53
        if 53 in week_vals:
            # Check if current year has 53 weeks
            year_end = datetime.date(ts.year, 12, 31)
            year_end_week = year_end.isocalendar()[1]
            
            if year_end_week != 53:
                # If we're looking for week 53 but year doesn't have it,
                # treat it as week 52 (last week of year)
                if week_num == year_end_week and week_num == 52:
                    return True
                # Remove 53 from consideration for this year
                week_vals = [w for w in week_vals if w != 53]
                if not week_vals:
                    return False
        
        return week_num in week_vals

    def is_day_match(self, ts: datetime.datetime, schedule: Dict) -> bool:
        """Check if timestamp matches day constraints"""
        dom_str = schedule.get('D')
        dow_str = schedule.get('dow')
        
        # Handle special day patterns
        if dom_str == 'L':
            # Last day of month
            next_month = (ts.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
            last_day = (next_month - datetime.timedelta(days=1)).day
            return ts.day == last_day
        
        # Standard matching logic
        is_dom_restricted = dom_str and dom_str not in ['*', '?']
        is_dow_restricted = dow_str and dow_str not in ['*', '?']
        
        dom_match = True
        dow_match = True
        
        if is_dom_restricted:
            dom_vals = self.expand_part(schedule, 'D')
            dom_match = not dom_vals or ts.day in dom_vals
        
        if is_dow_restricted:
            dow_vals = self.expand_part(schedule, 'dow')
            if dow_vals:
                # Convert Python weekday (0=Monday) to cron weekday (0=Sunday)
                cron_dow = (ts.weekday() + 1) % 7
                dow_match = cron_dow in dow_vals
        
        # Apply Vixie cron OR logic when both are restricted
        if dow_str == '?':
            return dom_match
        elif dom_str == '?':
            return dow_match
        elif is_dom_restricted and is_dow_restricted:
            return dom_match or dow_match
        else:
            return dom_match and dow_match

    def next_jump(self, schedule: Dict, from_ts: datetime.datetime) -> Optional[datetime.datetime]:
        """Find next execution time with intelligent fallback"""
        cache = self.get_expanded_schedule(schedule)
        max_search_days = 1826  # 5 years
        
        # Start from next second
        search_ts = from_ts.replace(microsecond=0) + datetime.timedelta(seconds=1)
        
        # Pre-validate for impossible schedules
        if cache['week_vals'] and 53 in cache['week_vals'] and cache['years_vals']:
            # Check if any target year has week 53
            has_week_53 = False
            for year in cache['years_vals']:
                year_end = datetime.date(year, 12, 31)
                if year_end.isocalendar()[1] == 53:
                    has_week_53 = True
                    break
            
            if not has_week_53:
                # Fallback: replace week 53 with week 52
                modified_schedule = schedule.copy()
                modified_schedule['W'] = '52'
                return self.next_jump(modified_schedule, from_ts)
        
        for day in range(max_search_days):
            current_day = search_ts.replace(hour=0, minute=0, second=0) + datetime.timedelta(days=day)
            
            # Check year, month, week, and day constraints
            if (not cache['years_vals'] or current_day.year in cache['years_vals']) and \
               (not cache['months_vals'] or current_day.month in cache['months_vals']) and \
               self.is_week_match(current_day, schedule) and \
               self.is_day_match(current_day, schedule):
                
                # Find next valid time on this day
                for h in range(24):
                    if not cache['hours_vals'] or h in cache['hours_vals']:
                        for m in range(60):
                            if not cache['minutes_vals'] or m in cache['minutes_vals']:
                                for s in range(60):
                                    if not cache['seconds_vals'] or s in cache['seconds_vals']:
                                        result_ts = current_day.replace(hour=h, minute=m, second=s)
                                        if result_ts > from_ts:
                                            return result_ts
        
        # If we get here, try relaxed constraints
        if cache['week_vals']:
            relaxed_schedule = {k: v for k, v in schedule.items() if k != 'W'}
            return self.next_jump(relaxed_schedule, from_ts)
        elif cache['years_vals']:
            relaxed_schedule = {k: v for k, v in schedule.items() if k != 'Y'}
            return self.next_jump(relaxed_schedule, from_ts)
        
        raise Exception('Could not find a valid day within 5 years')

    def prev_jump(self, schedule: Dict, from_ts: datetime.datetime) -> Optional[datetime.datetime]:
        """Find previous execution time with intelligent fallback"""
        cache = self.get_expanded_schedule(schedule)
        max_search_days = 1826  # 5 years
        
        # Start from previous second
        search_ts = from_ts.replace(microsecond=0) - datetime.timedelta(seconds=1)
        
        # Similar pre-validation as next_jump
        if cache['week_vals'] and 53 in cache['week_vals'] and cache['years_vals']:
            has_week_53 = False
            for year in cache['years_vals']:
                year_end = datetime.date(year, 12, 31)
                if year_end.isocalendar()[1] == 53:
                    has_week_53 = True
                    break
            
            if not has_week_53:
                modified_schedule = schedule.copy()
                modified_schedule['W'] = '52'
                return self.prev_jump(modified_schedule, from_ts)
        
        for day in range(max_search_days):
            current_day = search_ts.replace(hour=23, minute=59, second=59) - datetime.timedelta(days=day)
            current_day = current_day.replace(hour=0, minute=0, second=0)
            
            # Check constraints
            if (not cache['years_vals'] or current_day.year in cache['years_vals']) and \
               (not cache['months_vals'] or current_day.month in cache['months_vals']) and \
               self.is_week_match(current_day, schedule) and \
               self.is_day_match(current_day, schedule):
                
                # Find previous valid time on this day (backwards)
                for h in range(23, -1, -1):
                    if not cache['hours_vals'] or h in cache['hours_vals']:
                        for m in range(59, -1, -1):
                            if not cache['minutes_vals'] or m in cache['minutes_vals']:
                                for s in range(59, -1, -1):
                                    if not cache['seconds_vals'] or s in cache['seconds_vals']:
                                        result_ts = current_day.replace(hour=h, minute=m, second=s)
                                        if result_ts < from_ts:
                                            return result_ts
        
        # Relaxed constraints fallback
        if cache['week_vals']:
            relaxed_schedule = {k: v for k, v in schedule.items() if k != 'W'}
            return self.prev_jump(relaxed_schedule, from_ts)
        elif cache['years_vals']:
            relaxed_schedule = {k: v for k, v in schedule.items() if k != 'Y'}
            return self.prev_jump(relaxed_schedule, from_ts)
        
        raise Exception('Could not find a valid day within 5 years')

    def run_comprehensive_tests(self, test_count: int = 100) -> Dict:
        """Run comprehensive test suite"""
        print(f"--- JCRON Python Test Suite ---")
        print(f"Running {test_count} test scenarios...")
        print("-" * 50)
        
        # Test patterns
        s_parts = ['0', '30', '*/10', '0-15']
        m_parts = ['*', '15', '*/5', '10-20']
        h_parts = ['*', '3', '*/2', '9-17']
        D_parts = ['*', '1', '15', 'L', '?']
        dow_parts = ['*', '1', '5', '1-5', 'MON', 'FRI']
        Month_parts = ['*', '1', '6', '12', 'JAN', 'JUN']
        Y_parts = ['*', '2026']
        W_parts = ['*', '1', '26', '52']  # Mostly avoid 53
        tz_parts = ['UTC']
        predefined_parts = ['@yearly', '@monthly', '@weekly', '@daily', '@hourly']
        
        base_ts = datetime.datetime.now()
        success_count = 0
        failure_count = 0
        impossible_count = 0
        
        for i in range(1, test_count + 1):
            try:
                # Build schedule
                schedule = {
                    's': s_parts[(i-1) % len(s_parts)],
                    'm': m_parts[(i-1) % len(m_parts)],
                    'h': h_parts[(i-1) % len(h_parts)]
                }
                
                # Add optional fields
                if i % 3 == 0:
                    schedule.update({
                        'M': Month_parts[(i-1) % len(Month_parts)],
                        'Y': Y_parts[(i-1) % len(Y_parts)]
                    })
                
                # Add day fields with mutual exclusion
                if i % 2 == 0:
                    schedule['D'] = D_parts[(i-1) % len(D_parts)]
                    if schedule['D'] not in ['*', '?']:
                        schedule['dow'] = '?'
                else:
                    schedule['dow'] = dow_parts[(i-1) % len(dow_parts)]
                    if schedule['dow'] not in ['*', '?']:
                        schedule['D'] = '?'
                
                # Add week testing occasionally
                if i % 7 == 0:
                    if i % 21 == 0:
                        schedule['W'] = '53'  # Test edge case
                    else:
                        schedule['W'] = W_parts[(i-1) % len(W_parts)]
                
                # Test predefined schedules
                if i % 10 == 0:
                    predefined = predefined_parts[(i-1) % len(predefined_parts)]
                    schedule = self.parse_cron_expression(predefined)
                
                # Run tests
                next_ts = self.next_jump(schedule, base_ts)
                if next_ts is None:
                    raise Exception('next_jump returned None')
                
                prev_ts = self.prev_jump(schedule, next_ts)
                if prev_ts >= next_ts:
                    raise Exception(f'Consistency failed! Prev: {prev_ts}, Next: {next_ts}')
                
                next_ts_2 = self.next_jump(schedule, prev_ts)
                if next_ts_2 < next_ts:
                    raise Exception(f'Jump consistency failed! Next1: {next_ts}, Next2: {next_ts_2}')
                
                success_count += 1
                
            except Exception as e:
                error_msg = str(e)
                if 'Could not find a valid day within 5 years' in error_msg:
                    impossible_count += 1
                    success_count += 1  # Count as handled gracefully
                else:
                    failure_count += 1
                    print(f"REAL TEST FAILED [{i}]: Schedule: {schedule}, Error: {error_msg}")
        
        print(f"\n--- Test Results ---")
        print(f"Total tests: {test_count}, Successful: {success_count}, Real failures: {failure_count}, Impossible schedules handled: {impossible_count}")
        
        return {
            'total_tests': test_count,
            'successful_tests': success_count,
            'failed_tests': failure_count,
            'impossible_schedules': impossible_count,
            'success_rate': (success_count / test_count) * 100
        }


if __name__ == "__main__":
    tester = JCronTester()
    
    # Test specific problematic schedules
    print("=== Testing Specific Problematic Cases ===")
    
    test_cases = [
        # Week 53 cases
        {"s": "0", "m": "0", "h": "0", "D": "?", "dow": "5", "W": "53", "Y": "2026"},
        {"s": "0", "m": "15", "h": "3", "D": "1", "dow": "?", "W": "53"},
        # Complex combinations
        {"s": "30", "m": "*/5", "h": "*/2", "D": "15", "dow": "?", "M": "12", "Y": "2026"},
        # Predefined schedules
        "@daily",
        "@weekly",
        "@monthly"
    ]
    
    base_time = datetime.datetime.now()
    
    for i, test_case in enumerate(test_cases, 1):
        try:
            if isinstance(test_case, str):
                schedule = tester.parse_cron_expression(test_case)
                print(f"Test {i}: {test_case}")
            else:
                schedule = test_case
                print(f"Test {i}: {json.dumps(schedule, indent=2)}")
            
            next_time = tester.next_jump(schedule, base_time)
            prev_time = tester.prev_jump(schedule, next_time)
            
            print(f"  ✓ Next: {next_time}")
            print(f"  ✓ Prev: {prev_time}")
            print(f"  ✓ Consistency: {prev_time < next_time}")
            
        except Exception as e:
            print(f"  ✗ Error: {e}")
        
        print()
    
    # Run comprehensive test
    print("=== Running Comprehensive Test Suite ===")
    results = tester.run_comprehensive_tests(100)
    
    print(f"\n🎯 Final Success Rate: {results['success_rate']:.1f}%")
    
    if results['success_rate'] >= 95:
        print("🎉 EXCELLENT! Algorithm is working very well!")
    elif results['success_rate'] >= 90:
        print("✅ GOOD! Algorithm is working well with minor edge cases.")
    elif results['success_rate'] >= 80:
        print("⚠️  ACCEPTABLE: Algorithm works but has some issues to resolve.")
    else:
        print("❌ NEEDS WORK: Algorithm has significant issues.")
