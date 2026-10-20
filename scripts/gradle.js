#!/usr/bin/env node
/**
 * Runs the Android Gradle wrapper with whatever arguments it is given:
 *
 *   node scripts/gradle.js assembleRelease
 *
 * Exists so the npm scripts work the same on Windows (gradlew.bat) and
 * macOS/Linux (./gradlew). The wrapper is called by its full path because
 * some Windows setups don't look in the current folder for commands.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const androidDir = path.join(__dirname, "..", "android");
const isWindows = process.platform === "win32";
const wrapper = path.join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

// Quoted because the shell splits on spaces, and project paths often have them.
const result = spawnSync(isWindows ? `"${wrapper}"` : wrapper, process.argv.slice(2), {
  cwd: androidDir,
  stdio: "inherit",
  // .bat files can only be started through a shell on Windows.
  shell: isWindows,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
