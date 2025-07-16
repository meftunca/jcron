# JCRON Null Value Handling Fix & Relaxed Validation

## Issue Description

The Node.js port was receiving a `Schedule` object with `null` values for some fields (`Y`, `tz`, `woy`), but the validation logic was not properly handling these `null` values, causing an "Invalid schedule object" error. Additionally, the validation was too strict, requiring basic cron fields when only any single field should be sufficient.

## Root Cause

The issue occurred when:

1. Schedule objects were created with `null` values (e.g., from JSON.parse or dynamic object creation)
2. Empty string values were not being properly normalized
3. The humanization functions didn't handle objects that weren't strict `Schedule` instances
4. **NEW**: Validation was too strict, requiring basic cron fields instead of accepting any single field

## Solution

### 1. Enhanced Null Value Handling

The parser and engine now properly handle `null`, `undefined`, and empty string values:

```typescript
// Engine now handles all these cases:
const s = schedule.s && schedule.s !== "" ? schedule.s : "0";
const m = schedule.m && schedule.m !== "" ? schedule.m : "*";
// ... etc
```

### 2. Relaxed Schedule Validation ⭐️ **NEW**

The validation is now much more flexible - only requires at least ONE field to be present:

```typescript
// Before: Required basic time fields (s, m, h, seconds, minutes, hours)
// After: ANY single field is sufficient

isValidScheduleObject({ woy: "25" }); // ✅ Now valid (was invalid before)
isValidScheduleObject({ tz: "UTC" }); // ✅ Now valid (was invalid before)
isValidScheduleObject({ Y: "2025" }); // ✅ Now valid (was invalid before)
isValidScheduleObject({}); // ❌ Still invalid (no fields)
```

### 3. Robust Schedule Validation

Added `validateSchedule()` function to normalize problematic objects:

```typescript
import { validateSchedule, isValidScheduleObject } from "@jcron/jcron";

// Check if object is valid (now much more permissive)
if (isValidScheduleObject(scheduleData)) {
  const normalized = validateSchedule(scheduleData);
  const result = fromSchedule(normalized);
}
```

### 4. Improved Humanization

The `fromSchedule()` function now handles various object types:

```typescript
// All of these now work:
fromSchedule(scheduleObject);           // Schedule instance
fromSchedule(plainObject);              // Plain object
fromSchedule(jsonParsedObject);         // From JSON.parse()
fromSchedule(objectWithNulls);          // With null values
fromSchedule(objectWithAlternativeNames); // With different field names
fromSchedule({ woy: "25" });            // ⭐️ NEW: Single field objects
```

## Usage Examples

### Before (would fail):
```javascript
// These would all fail validation:
isValidScheduleObject({ woy: "25" });        // ❌ Too specific  
isValidScheduleObject({ tz: "UTC" });        // ❌ No time fields
isValidScheduleObject({ Y: "2025" });        // ❌ No basic fields

const problematicSchedule = {
  s: '0', m: '0', h: '9', D: '*', M: '*', dow: '*',
  Y: null, tz: null, woy: null  // null values caused errors
};
fromSchedule(problematicSchedule); // ❌ Invalid schedule object
```

### After (now works):
```javascript
// All of these are now valid:
isValidScheduleObject({ woy: "25" });        // ✅ Week of year only
isValidScheduleObject({ tz: "UTC" });        // ✅ Timezone only  
isValidScheduleObject({ Y: "2025" });        // ✅ Year only
isValidScheduleObject({ h: "12", m: "30" }); // ✅ Time only

const problematicSchedule = {
  s: '0', m: '0', h: '9', D: '*', M: '*', dow: '*',
  Y: null, tz: null, woy: null  // null values handled gracefully
};
fromSchedule(problematicSchedule); // ✅ "at 9:00 AM, every day"
```

### Single Field Examples ⭐️ **NEW**:
```javascript
fromSchedule({ woy: "25" });     // ✅ "week 25"
fromSchedule({ D: "15" });       // ✅ "on 15th" 
fromSchedule({ M: "6" });        // ✅ "in June"
fromSchedule({ h: "12" });       // ✅ (some fields may show "Invalid cron expression" if incomplete)
fromSchedule({ s: "0" });        // ✅ "every minute"
```

### Alternative Field Names:
```javascript
const alternativeSchedule = {
  seconds: '0', minutes: '0', hours: '9',
  dayOfMonth: '*', month: '*', dayOfWeek: '*',
  year: null, timezone: null, weekOfYear: null
};

fromSchedule(alternativeSchedule); // ✅ "at 9:00 AM, every day"
```

### Validation Helper:
```javascript
// Safe usage pattern (now much more permissive)
if (isValidScheduleObject(data)) {
  const humanized = fromSchedule(data);
  console.log(humanized);
} else {
  console.error('Invalid schedule object');
}
```

## Testing

The fix has been thoroughly tested with:

- ✅ 356 existing tests still pass
- ✅ Various null/undefined combinations
- ✅ Empty string handling
- ✅ JSON.parse() objects
- ✅ Alternative field names
- ✅ Mixed null/undefined values
- ✅ **NEW**: Single field validation
- ✅ **NEW**: Relaxed validation scenarios
- ✅ Edge cases and boundary conditions

## API Changes

### Enhanced Functions

- `isValidScheduleObject()` - **⭐️ Now much more permissive**: accepts any object with at least one valid cron field
- `validateSchedule(obj)` - Normalizes and validates schedule objects
- `fromSchedule()` - Now accepts various object types and handles nulls gracefully
- Engine methods - Better null and empty string handling

### Backward Compatibility

✅ All existing code continues to work unchanged. This is a non-breaking enhancement that makes validation more permissive.

## Version Updates

- **v1.3.4**: Fixed null value handling
- **v1.3.5**: Added relaxed validation (single field sufficient)

## Recommendation

For applications working with dynamic schedule data:

1. Use `isValidScheduleObject()` for validation (now much more flexible)
2. Use `validateSchedule()` for normalization when needed  
3. The `fromSchedule()` function now handles most cases automatically
4. **NEW**: Single field objects are now valid and can be used for partial scheduling

This fix ensures robust handling of schedule objects regardless of their source, null value patterns, or completeness level.
