# Contributing to JCRON

Thank you for considering contributing to JCRON! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

- ✅ Be respectful and inclusive
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what is best for the community
- ❌ No harassment, trolling, or discriminatory language

---

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm >= 7.0.0 or Bun
- Git
- TypeScript knowledge

### Fork & Clone

\`\`\`bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/jcron.git
cd jcron/node-port

# Add upstream remote
git remote add upstream https://github.com/meftunca/jcron.git
\`\`\`

---

## Development Setup

### Install Dependencies

\`\`\`bash
# Using bun (recommended)
bun install

# Or using npm
npm install
\`\`\`

### Build

\`\`\`bash
# Full build (all formats)
npm run build

# TypeScript only
npm run build:tsc

# Watch mode
npm run build:watch
\`\`\`

### Run Tests

\`\`\`bash
# Run all tests
bun test

# Run specific test file
bun test tests/01-core-engine.test.ts

# Run with coverage
bun test --coverage
\`\`\`

### Linting

\`\`\`bash
# Type check
npm run lint

# Fix auto-fixable issues
npm run lint:fix
\`\`\`

---

## Project Structure

\`\`\`
jcron/node-port/
├── src/
│   ├── engine.ts          # Core scheduling engine
│   ├── schedule.ts        # Schedule class & parsing
│   ├── runner.ts          # Task runner
│   ├── eod.ts             # End of Duration logic
│   ├── validation.ts      # Input validation
│   ├── humanize/          # Humanization module
│   │   ├── index.ts
│   │   ├── formatters.ts
│   │   ├── parser.ts
│   │   └── locales/       # 10+ language files
│   └── types.ts           # TypeScript types
├── tests/                 # Test files
├── benchmark/             # Performance benchmarks
├── dist/                  # Built files (gitignored)
└── docs/                  # Documentation
\`\`\`

---

## Coding Standards

### TypeScript Style

- Use strict TypeScript settings
- Prefer interfaces over types for objects
- Use explicit return types for public functions
- Document complex logic with comments

**Example:**

\`\`\`typescript
/**
 * Calculate the next run time for a schedule
 * @param schedule - Schedule object or cron string
 * @param from - Start date for calculation
 * @returns Next scheduled run time
 * @throws {ScheduleError} If schedule is invalid
 */
export function getNext(schedule: Schedule | string, from?: Date): Date {
  // Implementation
}
\`\`\`

### Naming Conventions

- **Files**: kebab-case (e.g., `schedule-parser.ts`)
- **Classes**: PascalCase (e.g., `Engine`, `Schedule`)
- **Functions**: camelCase (e.g., `getNext`, `isMatch`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`)
- **Interfaces**: PascalCase (e.g., `ScheduleOptions`)

### Code Formatting

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multi-line objects/arrays

\`\`\`typescript
// Good
const schedule = {
  h: "9",
  m: "0",
  tz: "UTC",
};

// Bad
const schedule = {
  h: "9",
  m: "0",
  tz: "UTC"
}
\`\`\`

---

## Testing

### Writing Tests

- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases
- Mock external dependencies

**Example:**

\`\`\`typescript
import { describe, test, expect } from 'bun:test';
import { getNext } from '../src/index';

describe('getNext()', () => {
  test('should calculate next run for daily pattern', () => {
    // Arrange
    const schedule = '0 9 * * *';
    const from = new Date('2024-12-25 08:00:00');
    
    // Act
    const next = getNext(schedule, from);
    
    // Assert
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(0);
  });

  test('should throw error for invalid schedule', () => {
    // Arrange
    const invalidSchedule = '99 99 * * *';
    
    // Act & Assert
    expect(() => getNext(invalidSchedule)).toThrow();
  });
});
\`\`\`

### Test Categories

1. **Unit Tests**: Test individual functions/methods
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test full workflows
4. **Performance Tests**: Benchmark critical paths

---

## Pull Request Process

### Before Submitting

1. ✅ Run all tests: `bun test`
2. ✅ Run linter: `npm run lint`
3. ✅ Build project: `npm run build`
4. ✅ Update documentation if needed
5. ✅ Add tests for new features
6. ✅ Update CHANGELOG.md

### PR Template

\`\`\`markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed code
- [ ] Commented complex logic
- [ ] Documentation updated
- [ ] No new warnings
- [ ] CHANGELOG.md updated
\`\`\`

### PR Review Process

1. Submit PR with clear description
2. Automated tests run (CI/CD)
3. Code review by maintainers
4. Address feedback
5. Approval and merge

---

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (e.g., 1.0.0 → 1.0.1)

### Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Build all formats: `npm run build`
5. Test in sample projects
6. Create Git tag
7. Publish to npm: `npm publish`
8. Create GitHub release with notes

---

## Areas for Contribution

### High Priority

- 🔴 **Performance**: Optimize hot paths
- 🔴 **Tests**: Increase coverage to 95%+
- 🔴 **Documentation**: Add more examples
- 🔴 **Locales**: Add more language support

### Medium Priority

- 🟡 **Features**: New scheduling patterns
- 🟡 **TypeScript**: Improve type definitions
- 🟡 **Errors**: Better error messages
- 🟡 **Logging**: Enhanced logging options

### Good First Issues

- 🟢 **Documentation**: Fix typos, improve clarity
- 🟢 **Examples**: Add real-world use cases
- 🟢 **Tests**: Add edge case tests
- 🟢 **Locales**: Improve translations

---

## Community

### Communication Channels

- **Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Pull Requests**: Code contributions
- **Email**: support@devloops.com

### Getting Help

- Check [Documentation](./README.md)
- Search [Issues](https://github.com/meftunca/jcron/issues)
- Ask in [Discussions](https://github.com/meftunca/jcron/discussions)

---

## Recognition

Contributors are recognized in:
- `CHANGELOG.md` release notes
- GitHub Contributors list
- Project README (for major contributions)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to JCRON! 🎉**

See also: [README](./README.md) | [API Reference](./API_REFERENCE.md)
