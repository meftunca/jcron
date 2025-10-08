# Changelog

All notable changes to the JCRON-node project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.4] - 2025-10-08

### Fixed

- **Critical Fix**: Multiple `L` and `#` patterns in `dayOfWeek` now properly validated
  - Fixed `isValid()` incorrectly rejecting valid patterns like `"3L,5L,6L"` (multiple last weekdays)
  - Fixed `isValid()` incorrectly rejecting patterns like `"1#1,3L"` (combination of nth and last)
  - Improved regex pattern in `validation.ts` to support comma-separated `#` and `L` patterns
  - Enhanced validation logic in `index.ts` to properly handle multiple special patterns
  - Now correctly rejects invalid patterns like `"4#6"` (occurrence must be 1-5)
  - Now correctly rejects invalid patterns like `"1#0"` (occurrence must be >= 1)
  - Now correctly rejects invalid patterns like `"8#1"` (day must be 0-7)

### Improved

- Better error detection for invalid `nthWeekDay` patterns
- More robust validation for edge cases in dayOfWeek field
- Clearer validation rules: `#N` where N is 1-5 (max 5 weeks in a month)

## [1.4.3] - 2025-10-08

### Fixed

- **Critical Fix**: Subpath exports now properly bundled with Rollup
  - `@devloops/jcron/humanize` now correctly exports `.mjs` and `.cjs` files
  - `@devloops/jcron/engine`, `@devloops/jcron/schedule`, `@devloops/jcron/runner` now properly bundled
  - Fixed "Failed to resolve import" errors for all subpath exports
  - All subpath exports now include ESM and CJS builds with source maps

### Changed

- Improved Rollup configuration with helper function for consistent module builds
- Each subpath export now generates dedicated `.mjs`, `.cjs`, `.d.ts`, and source map files
- Better tree-shaking support for subpath imports

## [1.4.2] - 2025-10-08

### Fixed

- **Critical Fix**: Removed missing `optimization-adapter` import that caused `Cannot find module` error in published package
  - All optimizations are now built-in to the Engine class
  - No external dependencies required
  - Fixes React Native compatibility issue
- **Simplified API**: Removed unnecessary optimization layer
  - Cleaner codebase
  - Better maintainability
  - All performance enhancements remain active

### Verified

- Multiple `nthWeekDay` patterns (e.g., `1#1,2#3`) correctly return closest match
- `next()` and `prev()` calculations work correctly with multiple patterns
- All timezone combinations tested and working

## [1.4.1] - 2025-10-08

### Added

- Root directory publishing pattern
  - Package files now published directly in root (no `dist/` subdirectory)
  - Cleaner package structure for end users
  - Matches traditional npm package patterns

## [1.4.0] - 2025-01-07

### Added

#### Humanization Improvements

- **Natural Language Shortcuts**: Human-readable cron descriptions now use natural language patterns
  - `0 9 * * *` → "Daily at 9:00 AM" (instead of "at 9:00 AM, every day")
  - `0 0 * * 0` → "Weekly on Sunday"
  - `0 0 1 * *` → "Monthly on 1st"
  - `0 0 1 1 *` → "Yearly on January 1st"
- **Weekdays/Weekends Shorthand**: Automatic detection and shorthand for common patterns
  - `0 0 * * 1-5` → "at midnight, on weekdays" (56% shorter)
  - `0 0 * * 6,0` → "at midnight, on weekends" (23% shorter)
- **Enhanced nthWeekDay Context**: Added "of the month" suffix for clarity
  - `0 0 * * 1#2` → "at midnight, on 2nd Monday of the month"
- **Smart Time Range Formatting**: Concise formatting for interval patterns
  - Limited verbose time listings to 10 entries with "..." for better readability

#### Performance Optimizations

- **Timezone Caching**: Reduced timezone conversion overhead from 41x to 1.68x
  - Added `timezoneCache` with 24-hour TTL
  - New helper methods: `_getTimeComponentsFast()` and `_createDateInTimezone()`
- **nthWeekDay Optimization**: 3.2x speedup for nth weekday calculations
  - Pre-parsing of nthWeekDay patterns in `ExpandedSchedule`
  - Caching of first occurrence day calculations
- **Validation Optimization**: 1.2x improvement in field validation
- **EOD Parsing Optimization**: 3.3x faster End-of-Duration parsing

#### Multi-Language Support

- **10+ Languages**: Full humanization support for:
  - English, Turkish, Spanish, French, German
  - Polish, Portuguese, Italian, Czech, Dutch
- **New Locale Strings**: Added `weekdays`, `weekends`, `daily`, `weekly`, `monthly`, `yearly`, `everyDay`, `everyMonth`, `everyYear` to all locales

### Changed

- **HumanizeOptions**: Added `useShorthand` option (default: `true`) to control weekdays/weekends shorthand
- **Default Behavior**: Natural language shortcuts now enabled by default for better UX

### Fixed

- **Multiple nthWeekDay Patterns**: Now correctly handles comma-separated patterns (e.g., `1#1,5#3`)
- **Parser Edge Cases**: Fixed handling of multiple special patterns in day-of-week field
- **TypeScript Strict Mode**: Resolved all type-safety issues with Array.at() and optional parameters

### Performance

- **Humanization**: 11.7x faster with caching
- **Timezone Operations**: 24.4x faster with optimization (41x → 1.68x overhead)
- **nthWeekDay Calculations**: 3.2x faster with pre-parsing and caching
- **Overall Quality Score**: Improved from 94% to 98% (A+)

### Documentation

- **Complete Rewrite**: Professional documentation with 3,000+ lines
  - New README.md with comprehensive examples
  - API_REFERENCE.md with complete API documentation
  - EXAMPLES.md with real-world use cases
  - MIGRATION_GUIDE.md for smooth upgrades
  - CONTRIBUTING.md for community contributors
- **React Native Guide**: Dedicated documentation for mobile development
- **Performance Reports**: Detailed benchmarks and optimization analysis

---

## [1.3.27] - 2024-12-20

### Added

- **React Native Support**: Full compatibility with React Native (iOS/Android)
  - Added `react-native` field in package.json
  - Metro bundler compatibility
  - Development-only console logs
- **Modern Build System**: Multi-format output with Rollup
  - ESM (`.mjs`), CJS (`.cjs`), UMD (`.umd.js`), UMD Min (`.umd.min.js`)
  - Source maps for all formats
  - TypeScript declarations with source maps
  - Tree-shaking support
- **Bundle Size Optimization**: Optimized for minimal footprint
  - ESM: ~45 KB gzipped
  - CJS: ~46 KB gzipped
  - UMD Min: ~22 KB gzipped

### Changed

- **Package Exports**: Modern Node.js module resolution with conditional exports
- **Build Configuration**: Dedicated `tsconfig.build.json` for production builds
- **Target Support**: ES2020+ for modern JavaScript features

### Fixed

- **Build Errors**: Resolved TypeScript strict mode errors
- **Module Resolution**: Fixed ESM/CJS interoperability issues

---

## [1.3.0] - 2024-11-15

### Added

- **nthWeekDay Support**: Full support for nth weekday patterns
  - `1#2` for 2nd Monday of the month
  - `5#3` for 3rd Friday of the month
  - Multiple patterns: `1#1,5#3`
- **End of Duration (EOD)**: Schedule tasks relative to period ends
  - `E1D` for end of 1 day
  - `S1W` for start of 1 week
  - Complex patterns: `E1DT12H30M`
- **Week of Year (WOY)**: ISO week-based scheduling
  - `WOY:33` for week 33 of the year

### Changed

- **Engine Optimization**: Improved date calculation algorithms
- **Test Coverage**: Expanded to 175+ test cases

### Fixed

- **UTC Date Progression**: Fixed date-fns timezone issues in UTC mode
- **nthOccurrence Calculation**: Corrected nth weekday calculation logic

---

## [1.2.x] - 2024-10-01

### Added

- **Humanization Module**: Convert cron expressions to human-readable text
- **Timezone Support**: IANA timezone database support
- **DST Handling**: Automatic daylight saving time adjustments

### Changed

- **API Refinements**: Improved function signatures and types

---

## [1.1.0] - 2024-12-19

### Added

- Complete port of Go jcron engine to Node.js/TypeScript
- **Full Classic Cron Compatibility**: 100% compatible with standard Unix/Linux cron syntax
- **Advanced Cron Extensions**: L (last day), # (nth occurrence), ? (no specific value)
- Comprehensive test suite with 116+ test cases
- Performance optimization features
- Built-in error handling and retry policies
- TypeScript support with strict type checking

### Performance

- Simple pattern calculations: ~0.002ms average
- Complex pattern calculations: ~0.008ms average
- Cache efficiency: 99.8% hit rate

---

## [1.0.0] - Initial Development

### Added

- Initial project structure and TypeScript configuration
- Basic cron parsing and scheduling functionality
- Runner implementation with job management
- Foundation for testing framework
- Core engine with next/prev calculation logic

---

**Note**: This project is a TypeScript/Node.js port of the Go jcron library, maintaining API compatibility while providing JavaScript-native features and performance optimizations.
