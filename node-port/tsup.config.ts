import { defineConfig } from "tsup";

export default defineConfig({
  // Entry points
  entry: {
    index: "src/index.ts",
    engine: "src/engine.ts",
    schedule: "src/schedule.ts",
    runner: "src/runner.ts",
    eod: "src/eod.ts",
    validation: "src/validation.ts",
    "humanize/index": "src/humanize/index.ts",
  },

  // Output formats
  format: ["esm", "cjs"],

  // Target environments
  target: ["es2020", "node16"],

  // Output directory
  outDir: "dist",

  // Generate TypeScript declarations
  dts: true,

  // Source maps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Split chunks for better tree-shaking
  splitting: true,

  // Minify for production
  minify: false, // Keep readable for library consumers

  // Bundle dependencies
  external: [
    // Keep external dependencies
    "date-fns",
    "date-fns-tz",
    "dayjs",
    "uuid",
  ],

  // Tree-shaking
  treeshake: true,

  // Platform-specific builds
  platform: "neutral", // Works in Node.js, browser, and React Native

  // ES Module interop
  shims: true,

  // Skip node_modules
  skipNodeModulesBundle: true,

  // Generate package.json exports
  onSuccess: async () => {
    console.log("✅ Build complete! Generating package exports...");
  },
});
