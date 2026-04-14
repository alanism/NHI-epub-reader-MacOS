import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BUNDLE_DIR = join(ROOT, "src-tauri", "target", "release", "bundle");
const DMG_DIR = join(BUNDLE_DIR, "dmg");
const MACOS_DIR = join(BUNDLE_DIR, "macos");
const FINAL_DMG_NAME = "NHI-ePub-Reader.dmg";
const FINAL_DMG_PATH = join(DMG_DIR, FINAL_DMG_NAME);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  return result.status ?? 1;
}

function newestFile(dirPath, matcher) {
  if (!existsSync(dirPath)) return null;
  const files = readdirSync(dirPath)
    .filter((name) => matcher(name))
    .map((name) => {
      const fullPath = join(dirPath, name);
      return { fullPath, mtime: statSync(fullPath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files[0]?.fullPath ?? null;
}

console.log("Building Tauri app for macOS DMG...");
const tauriStatus = run("npx", ["tauri", "build"]);
if (tauriStatus !== 0) {
  console.warn("tauri build reported an error. Attempting DMG fallback finalization...");
}

if (existsSync(FINAL_DMG_PATH)) {
  rmSync(FINAL_DMG_PATH);
}

const stagedDmg = newestFile(
  DMG_DIR,
  (name) => name.endsWith(".dmg") && name !== FINAL_DMG_NAME
);

if (stagedDmg) {
  copyFileSync(stagedDmg, FINAL_DMG_PATH);
  console.log(`Created installer: ${FINAL_DMG_PATH}`);
  process.exit(0);
}

const writableDmg = newestFile(MACOS_DIR, (name) => /^rw\..*\.dmg$/.test(name));
if (!writableDmg) {
  console.error("No DMG artifacts found in bundle output.");
  process.exit(1);
}

const convertStatus = run("hdiutil", [
  "convert",
  writableDmg,
  "-format",
  "UDZO",
  "-o",
  FINAL_DMG_PATH,
]);

if (convertStatus !== 0 || !existsSync(FINAL_DMG_PATH)) {
  console.error("Failed to produce final installer DMG.");
  process.exit(1);
}

console.log(`Created installer: ${FINAL_DMG_PATH}`);
