# 🏗️ JCRON Modern Build System

**Updated:** 2025-10-07  
**Build Tool:** Rollup + TypeScript  
**Target:** Node.js 16+, Modern Browsers, React Native

---

## 🎯 Build Output Strategy

### Multi-Format Support

| Format      | File                    | Use Case                  | Optimization           |
| ----------- | ----------------------- | ------------------------- | ---------------------- |
| **ESM**     | `dist/index.mjs`        | Modern Node.js, Bundlers  | Tree-shakeable ✅      |
| **CJS**     | `dist/index.cjs`        | Legacy Node.js, require() | Full compatibility ✅  |
| **UMD**     | `dist/jcron.umd.js`     | Browser `<script>`        | Global JCRON object ✅ |
| **UMD Min** | `dist/jcron.umd.min.js` | CDN (unpkg, jsdelivr)     | Minified + Gzipped ✅  |
| **Types**   | `dist/**/*.d.ts`        | TypeScript support        | Full type safety ✅    |

---

## 📦 Package Exports (Modern Node.js)

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs", // ESM import
      "require": "./dist/index.cjs", // CJS require
      "default": "./dist/index.mjs"
    },
    "./engine": {
      "types": "./dist/engine.d.ts",
      "import": "./dist/engine.mjs",
      "require": "./dist/engine.cjs"
    }
  }
}
```

### Benefits

- ✅ **Automatic Format Selection:** Node.js picks the right format
- ✅ **Tree-Shaking:** Bundlers can eliminate unused code
- ✅ **Subpath Imports:** Direct access to modules
- ✅ **Type Safety:** TypeScript declarations for all exports

---

## 🚀 Build Commands

### Development

```bash
# Clean build
npm run clean

# Full build (production-ready)
npm run build

# Watch mode (development)
npm run build:watch

# TypeScript only (types check)
npm run lint
```

### Production

```bash
# Pre-publish build (runs automatically)
npm run prepublishOnly

# Size analysis
npm run size
npm run analyze
```

### Testing

```bash
# Run tests
npm test

# Test with coverage
npm test:coverage
```

---

## 🎨 Build Configuration Files

### 1. `rollup.config.js` - Main Build Tool

**Purpose:** Multi-format bundling with optimization

**Features:**

- ESM output (tree-shakeable)
- CJS output (Node.js compatibility)
- UMD output (browser global)
- Minified UMD (CDN)
- Source maps for all formats
- External dependency handling

**Key Plugins:**

- `@rollup/plugin-typescript` - Compile TypeScript
- `@rollup/plugin-node-resolve` - Resolve node_modules
- `@rollup/plugin-commonjs` - Convert CJS to ESM
- `@rollup/plugin-terser` - Minification
- `rollup-plugin-dts` - Bundle type declarations

### 2. `tsconfig.build.json` - TypeScript Build Config

**Purpose:** Production-ready TypeScript compilation

**Features:**

- Target: ES2020 (Node.js 16+, modern browsers)
- Strict type checking
- Source maps + declaration maps
- Optimized module resolution

**Key Settings:**

```json
{
  "target": "ES2020",
  "module": "ESNext",
  "lib": ["ES2020", "DOM"],
  "strict": true,
  "sourceMap": true,
  "declaration": true
}
```

### 3. `.size-limit.json` - Bundle Size Monitoring

**Purpose:** Prevent bundle size regressions

**Limits:**

- Full Bundle: 50 KB gzipped
- Engine Only: 30 KB gzipped
- Schedule Only: 25 KB gzipped
- Humanize Only: 20 KB gzipped
- Browser Bundle: 45 KB gzipped

---

## 🌍 Platform Compatibility

### Node.js

**Supported Versions:** 16.0.0+

```javascript
// ESM (Node.js 16+ with "type": "module")
import { Engine, Schedule } from "@devloops/jcron";

// CJS (All Node.js versions)
const { Engine, Schedule } = require("@devloops/jcron");
```

**Why ESM + CJS?**

- ESM: Future-proof, tree-shakeable
- CJS: Legacy compatibility (Node.js < 16 with require)

### React Native

**Metro Bundler Compatibility:** ✅ Full

```javascript
import { Engine, Schedule } from "@devloops/jcron";
// Automatically uses dist/index.mjs (ESM)
```

**Configuration:**

```javascript
// metro.config.js (auto-detected)
module.exports = {
  resolver: {
    sourceExts: ["jsx", "js", "ts", "tsx", "mjs"],
  },
};
```

### Browser (Modern)

**Bundlers:** Webpack, Vite, Parcel, esbuild

```javascript
import { Engine, Schedule } from "@devloops/jcron";
// Tree-shaking works automatically
```

**Bundle Sizes (Typical):**

- Engine + Schedule: ~25 KB gzipped
- Full library: ~45 KB gzipped
- Tree-shaken: 15-30 KB gzipped

### Browser (Script Tag)

**CDN Support:** unpkg, jsdelivr

```html
<!-- Latest version -->
<script src="https://unpkg.com/@devloops/jcron"></script>
<script>
  const { Engine, Schedule } = window.JCRON;
</script>

<!-- Specific version -->
<script src="https://unpkg.com/@devloops/jcron@1.3.27/dist/jcron.umd.min.js"></script>
```

---

## 🔧 Advanced Build Scenarios

### 1. Subpath Imports (Tree-Shaking)

```javascript
// Import only what you need
import { Engine } from "@devloops/jcron/engine";
import { Schedule } from "@devloops/jcron/schedule";
import { humanize } from "@devloops/jcron/humanize";

// Result: Smaller bundle (only imports used modules)
```

### 2. Custom Build (Webpack)

```javascript
// webpack.config.js
module.exports = {
  resolve: {
    alias: {
      "@devloops/jcron": "@devloops/jcron/dist/index.mjs",
    },
  },
  optimization: {
    usedExports: true, // Enable tree-shaking
  },
};
```

### 3. Custom Build (Vite)

```javascript
// vite.config.js
export default {
  optimizeDeps: {
    include: ["@devloops/jcron"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          jcron: ["@devloops/jcron"],
        },
      },
    },
  },
};
```

---

## 📊 Build Output Structure

```
dist/
├── index.mjs              # ESM entry point
├── index.mjs.map          # ESM source map
├── index.cjs              # CJS entry point
├── index.cjs.map          # CJS source map
├── index.d.ts             # TypeScript definitions
├── jcron.umd.js           # Browser UMD bundle
├── jcron.umd.js.map       # UMD source map
├── jcron.umd.min.js       # Minified UMD
├── jcron.umd.min.js.map   # Minified UMD source map
├── engine.mjs             # Engine module (ESM)
├── engine.cjs             # Engine module (CJS)
├── engine.d.ts            # Engine types
├── schedule.mjs           # Schedule module (ESM)
├── schedule.cjs           # Schedule module (CJS)
├── schedule.d.ts          # Schedule types
├── runner.mjs             # Runner module (ESM)
├── runner.cjs             # Runner module (CJS)
├── runner.d.ts            # Runner types
└── humanize/
    ├── index.mjs          # Humanize module (ESM)
    ├── index.cjs          # Humanize module (CJS)
    └── index.d.ts         # Humanize types
```

---

## 🧪 Build Verification

### 1. Check Bundle Sizes

```bash
npm run size
```

**Expected Output:**

```
  Full Bundle (ESM)          45 KB (limit: 50 KB) ✅
  Full Bundle (CJS)          47 KB (limit: 50 KB) ✅
  Browser Bundle (Minified)  42 KB (limit: 45 KB) ✅
  Engine Only                28 KB (limit: 30 KB) ✅
  Schedule Only              22 KB (limit: 25 KB) ✅
  Humanize Only              18 KB (limit: 20 KB) ✅
```

### 2. Test Imports (Node.js)

```javascript
// test-imports.mjs
import { Engine, Schedule } from "@devloops/jcron";
console.log("✅ ESM import works");

// test-imports.cjs
const { Engine, Schedule } = require("@devloops/jcron");
console.log("✅ CJS require works");
```

### 3. Test Subpath Imports

```javascript
import { Engine } from "@devloops/jcron/engine";
import { humanize } from "@devloops/jcron/humanize";
console.log("✅ Subpath imports work");
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module"

**Solution:** Ensure build is complete

```bash
npm run clean
npm run build
```

### Issue: "Unexpected token 'export'"

**Cause:** Node.js trying to use ESM in CJS context

**Solution:** Add `"type": "module"` to package.json or use `.mjs` extension

### Issue: React Native Metro bundler error

**Solution:** Add `.mjs` to sourceExts

```javascript
// metro.config.js
module.exports = {
  resolver: {
    sourceExts: ["jsx", "js", "ts", "tsx", "mjs", "cjs"],
  },
};
```

### Issue: TypeScript "Cannot find type definitions"

**Solution:** Ensure types are built

```bash
npm run build:types
```

### Issue: Webpack "Can't resolve '@devloops/jcron'"

**Solution:** Clear node_modules and reinstall

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📈 Performance Optimizations

### Build-Time Optimizations

1. **Tree-Shaking Enabled**

   - `sideEffects: false` in package.json
   - Pure ESM modules
   - No global side effects

2. **Code Splitting**

   - Separate entry points (engine, schedule, humanize)
   - Lazy loading support
   - Dynamic imports supported

3. **Minification**
   - Terser plugin for UMD builds
   - Dead code elimination
   - Constant folding

### Runtime Optimizations

1. **Cache Mechanisms** (Already Implemented)

   - Timezone cache (24h TTL)
   - nthWeekDay cache (1000 entries)
   - Humanization cache (500 templates)
   - Schedule cache (WeakMap)

2. **Fast Paths**
   - Pre-parsed patterns
   - Binary search for next values
   - Set-based lookups (O(1))

---

## 🚀 Deployment Checklist

### Pre-Release

- [ ] Run `npm run clean`
- [ ] Run `npm run build`
- [ ] Run `npm run size` (check limits)
- [ ] Run `npm test` (all tests pass)
- [ ] Run `npm run lint` (no TypeScript errors)
- [ ] Test in Node.js (ESM + CJS)
- [ ] Test in React Native
- [ ] Test in browser (script tag)
- [ ] Check bundle sizes (< 50 KB)
- [ ] Verify source maps work

### Release

```bash
# Update version
npm version patch  # or minor/major

# Publish (runs prepublishOnly automatically)
npm publish

# Tag release
git tag v1.3.27
git push --tags
```

### Post-Release Verification

```bash
# Install from npm
npm install @devloops/jcron@latest

# Test import
node -e "import('@devloops/jcron').then(m => console.log(Object.keys(m)))"

# Test CDN
curl https://unpkg.com/@devloops/jcron@latest/dist/jcron.umd.min.js | wc -c
```

---

## 🎓 Build System Benefits

### For Library Users

- ✅ **Automatic Format Selection:** Works everywhere
- ✅ **Tree-Shaking:** Smaller bundles
- ✅ **Type Safety:** Full TypeScript support
- ✅ **Source Maps:** Easy debugging
- ✅ **CDN Ready:** Instant script tag usage

### For Maintainers

- ✅ **Single Build Command:** `npm run build`
- ✅ **Size Monitoring:** Automatic checks
- ✅ **Multi-Platform:** One build for all platforms
- ✅ **Future-Proof:** ESM-first with CJS fallback
- ✅ **Quality Control:** Type checking + tests

---

## 📚 References

- [Rollup Documentation](https://rollupjs.org/)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [Node.js Package Exports](https://nodejs.org/api/packages.html#exports)
- [Size Limit](https://github.com/ai/size-limit)

---

**Build System Version:** 2.0  
**Last Updated:** 2025-10-07  
**Status:** ✅ Production Ready
