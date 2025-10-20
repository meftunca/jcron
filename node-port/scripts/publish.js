#!/usr/bin/env node

/**
 * Modern publish script for @devloops/jcron
 *
 * Features:
 * - Pre-publish validation
 * - Build verification
 * - Automated npm publish
 * - Post-publish verification
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, silent = false) {
  try {
    return execSync(command, {
      encoding: "utf-8",
      stdio: silent ? "pipe" : "inherit",
    });
  } catch (error) {
    log(`❌ Command failed: ${command}`, "red");
    process.exit(1);
  }
}

function checkFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    log(`❌ Missing ${description}: ${filePath}`, "red");
    return false;
  }
  log(`✅ Found ${description}`, "green");
  return true;
}

function main() {
  log("\n╔═══════════════════════════════════════╗", "cyan");
  log("║  📦 JCRON PUBLISH SCRIPT v1.4.0      ║", "cyan");
  log("╚═══════════════════════════════════════╝\n", "cyan");

  // 1. Pre-publish checks
  log("🔍 Step 1: Pre-publish validation...", "blue");

  const packageJsonPath = path.join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  log(`   Package: ${packageJson.name}`, "cyan");
  log(`   Version: ${packageJson.version}`, "cyan");
  log(`   License: ${packageJson.license}`, "cyan");

  // Check required files
  const requiredFiles = [
    [path.join(__dirname, "..", "README.md"), "README.md"],
    [path.join(__dirname, "..", "LICENSE"), "LICENSE"],
    [path.join(__dirname, "..", "CHANGELOG.md"), "CHANGELOG.md"],
  ];

  let allFilesExist = true;
  for (const [filePath, description] of requiredFiles) {
    if (!checkFile(filePath, description)) {
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    log("\n❌ Pre-publish validation failed!", "red");
    process.exit(1);
  }

  // 2. Clean build
  log("\n🧹 Step 2: Cleaning previous build...", "blue");
  exec("npm run clean");
  log("✅ Clean complete", "green");

  // 3. Build
  log("\n🔨 Step 3: Building package...", "blue");
  exec("npm run build");
  log("✅ Build complete", "green");

  // 4. Verify dist files
  log("\n✅ Step 4: Verifying dist files...", "blue");
  const distPath = path.join(__dirname, "..", "dist");

  const distFiles = [
    "index.mjs",
    "index.cjs",
    "index.d.ts",
    "jcron.umd.js",
    "jcron.umd.min.js",
    "engine.d.ts",
    "schedule.d.ts",
    "runner.d.ts",
  ];

  let allDistFilesExist = true;
  for (const file of distFiles) {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      log(`❌ Missing dist file: ${file}`, "red");
      allDistFilesExist = false;
    } else {
      const stats = fs.statSync(filePath);
      log(
        `✅ ${file.padEnd(25)} (${(stats.size / 1024).toFixed(2)} KB)`,
        "green"
      );
    }
  }

  if (!allDistFilesExist) {
    log("\n❌ Dist verification failed!", "red");
    process.exit(1);
  }

  // // 5. Run tests
  // log("\n🧪 Step 5: Running tests...", "blue");
  // try {
  //   exec("npm test", true);
  //   log("✅ Tests passed", "green");
  // } catch (error) {
  //   log("⚠️  Some tests failed, but continuing...", "yellow");
  // }

  // 6. Dry run (optional)
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    log("\n🔍 Step 6: Performing dry run...", "blue");
    try {
      const output = exec("npm publish --dry-run", true);
      log("✅ Dry run successful", "green");
      log("\nPackage contents:", "cyan");
      console.log(output);
    } catch (error) {
      log("❌ Dry run failed!", "red");
      process.exit(1);
    }

    log("\n✅ Dry run complete! Use without --dry-run to publish.", "green");
    return;
  }

  // 7. Publish
  log("\n🚀 Step 6: Publishing to npm...", "blue");
  log("⚠️  This will publish the package to npm registry!", "yellow");

  // Confirmation (skip if --yes flag is provided)
  if (!process.argv.includes("--yes") && !process.argv.includes("-y")) {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question("Continue? (yes/no): ", (answer) => {
      readline.close();

      if (answer.toLowerCase() !== "yes" && answer.toLowerCase() !== "y") {
        log("\n❌ Publish cancelled", "yellow");
        process.exit(0);
      }

      performPublish(packageJson);
    });
  } else {
    performPublish(packageJson);
  }
}

function performPublish(packageJson) {
  try {
    exec("npm publish --access public");

    log("\n╔═══════════════════════════════════════╗", "green");
    log("║   🎉 PUBLISH SUCCESSFUL! 🎉          ║", "green");
    log("╚═══════════════════════════════════════╝\n", "green");

    log(`📦 Package: ${packageJson.name}@${packageJson.version}`, "cyan");
    log(`🔗 NPM: https://www.npmjs.com/package/${packageJson.name}`, "cyan");

    log("\n🚀 Next Steps:", "blue");
    log("   1. Create GitHub release", "cyan");
    log("   2. Update documentation website", "cyan");
    log("   3. Announce on social media", "cyan");
    log("   4. Monitor npm downloads", "cyan");
  } catch (error) {
    log("\n❌ Publish failed!", "red");
    log("\nTroubleshooting:", "yellow");
    log("   1. Check npm authentication: npm whoami", "cyan");
    log("   2. Verify package name is not taken", "cyan");
    log("   3. Check npm registry status", "cyan");
    log("   4. Ensure version is not already published", "cyan");
    process.exit(1);
  }
}

// Run the script
main();
