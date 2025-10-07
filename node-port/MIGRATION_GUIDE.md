# Migration Guide

Guide for upgrading between versions of `@devloops/jcron`.

## Table of Contents

- [1.4.0 (Upcoming)](#140-upcoming)
- [1.3.x to 1.4.0](#13x-to-140)
- [1.2.x to 1.3.x](#12x-to-13x)
- [Breaking Changes](#breaking-changes)

---

## 1.4.0 (Upcoming)

### New Features

1. **Natural Language Shortcuts**
   - `0 9 * * *` → "Daily at 9:00 AM"
   - `0 0 * * 0` → "Weekly on Sunday"
   - `0 0 1 * *` → "Monthly on 1st"
   - `0 0 1 1 *` → "Yearly on January 1st"

2. **Weekdays/Weekends Shorthand**
   - `0 0 * * 1-5` → "at midnight, on weekdays"
   - `0 0 * * 6,0` → "at midnight, on weekends"

3. **New Humanize Option**
   - `useShorthand`: Enable/disable shorthand patterns (default: `true`)

### Migration Steps

No breaking changes. All existing code continues to work.

**Optional: Update humanize calls to use new options**

\`\`\`typescript
// Old (still works)
toString('0 0 * * 1-5');
// "at midnight, on Monday, Tuesday, Wednesday, Thursday, and Friday"

// New (shorter)
toString('0 0 * * 1-5');
// "at midnight, on weekdays" (automatic with v1.4.0)

// Disable shorthand if needed
toString('0 0 * * 1-5', { useShorthand: false });
// "at midnight, on Monday, Tuesday, Wednesday, Thursday, and Friday"
\`\`\`

---

## 1.3.x to 1.4.0

### No Breaking Changes

Version 1.4.0 is fully backward compatible with 1.3.x.

### New Features to Adopt

1. **Use natural language shortcuts** for better UX
2. **Enable weekdays/weekends shorthand** (enabled by default)
3. **Leverage 10+ language support** for internationalization

---

## 1.2.x to 1.3.x

### Breaking Changes

1. **Module Exports Changed**
   - Old ESM export path may differ
   - Solution: Update import paths to use package exports

**Before (1.2.x):**
\`\`\`typescript
import { Runner } from '@devloops/jcron/dist/runner';
\`\`\`

**After (1.3.x):**
\`\`\`typescript
import { Runner } from '@devloops/jcron';
// or
import { Runner } from '@devloops/jcron/runner';
\`\`\`

2. **Build Output Format**
   - New multi-format build system
   - CJS, ESM, UMD, UMD Min now available
   - No code changes required, bundler will pick correct format

3. **React Native Support**
   - Added `react-native` field in package.json
   - No changes needed for existing RN projects

---

## Breaking Changes

### None in 1.4.0

Version 1.4.0 introduces only additive changes:
- New humanization shortcuts
- New locale strings
- New `useShorthand` option

All existing APIs remain unchanged and fully compatible.

---

## Upgrading

### From 1.3.x

\`\`\`bash
npm install @devloops/jcron@latest
\`\`\`

No code changes required. Rebuild and test.

### From 1.2.x or earlier

\`\`\`bash
npm install @devloops/jcron@latest
\`\`\`

Update import paths if using direct dist imports:

\`\`\`diff
- import { Runner } from '@devloops/jcron/dist/runner';
+ import { Runner } from '@devloops/jcron';
\`\`\`

---

## Deprecations

### None

No features have been deprecated in recent versions.

---

## Version History

| Version | Release Date | Status | Notes |
|---------|--------------|--------|-------|
| 1.4.0 | Upcoming | Development | Natural language, weekdays/weekends |
| 1.3.27 | 2024-12-20 | Current | React Native, modern build |
| 1.3.0 | 2024-11-15 | Stable | nthWeekDay optimization |
| 1.2.x | 2024-10-01 | Legacy | Original TypeScript port |

---

## Rollback Procedure

If you encounter issues after upgrading:

\`\`\`bash
# Rollback to previous version
npm install @devloops/jcron@1.3.27

# Clear node_modules and lock file
rm -rf node_modules package-lock.json
npm install
\`\`\`

---

## Support

For migration help:
- [Issues](https://github.com/meftunca/jcron/issues)
- [Discussions](https://github.com/meftunca/jcron/discussions)
- Email: support@devloops.com

---

See also: [CHANGELOG](./CHANGELOG.md) | [API Reference](./API_REFERENCE.md)
