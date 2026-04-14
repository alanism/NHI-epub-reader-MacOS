# Build Learning Log

## Date
April 15, 2026 (Asia/Ho_Chi_Minh)

## Checkpoint 1: Native Compile Recovery

### Commands
1. `npm run build`
2. `npx tsc --noEmit`
3. `cargo check --manifest-path src-tauri/Cargo.toml`

### Results
- `npm run build`: Pass
- `npx tsc --noEmit`: Pass
- `cargo check`: Pass after importing `tauri::Manager` in `src-tauri/src/lib.rs`

### Notes
- Frontend build remains healthy after macOS-first refactor.
- Main JS bundle is still large (`dist/assets/index-CuzSrZ1j.js` around `940.53 kB`, `251.95 kB` gzip).

## Checkpoint 2: Local DMG Production

### Commands
1. `npm run tauri:build`
2. `hdiutil convert 'src-tauri/target/release/bundle/macos/rw.9501.NHI Reader_0.1.0_aarch64.dmg' -format UDZO -o 'src-tauri/target/release/bundle/dmg/NHI Reader_0.1.0_aarch64.dmg'`
3. `hdiutil attach 'src-tauri/target/release/bundle/dmg/NHI Reader_0.1.0_aarch64.dmg'`
4. `cp -R '/Volumes/NHI Reader/NHI Reader.app' '/Applications/'`
5. `open -a '/Applications/NHI Reader.app'`

### Results
- `npm run tauri:build`: Partial pass
  - Release binary built.
  - App bundle created at `src-tauri/target/release/bundle/macos/NHI Reader.app`.
  - DMG staging started but failed at `bundle_dmg.sh`.
- Manual `hdiutil convert`: Pass
  - Final installer created at `src-tauri/target/release/bundle/dmg/NHI Reader_0.1.0_aarch64.dmg`.
- Installer verification:
  - DMG mounted successfully.
  - App copied to `/Applications` successfully.
  - App launched successfully (process observed).

### What We Learned
1. The critical path to an installable local artifact is unblocked even when Tauri's final DMG script fails.
2. Keeping a deterministic `hdiutil convert` fallback protects release momentum.
3. The remaining release risk is in DMG script stability/signing polish, not in app compilation.

### Follow-up Actions
1. Investigate and fix root cause of `bundle_dmg.sh` failure to restore one-command packaging.
2. Add a scripted fallback build step for local release automation.
3. Start a separate signing/notarization track for external distribution.

## Checkpoint 3: Canonical Installer Filename

### Commands
1. `npm run tauri:build:installer`
2. `hdiutil verify 'src-tauri/target/release/bundle/dmg/NHI-ePub-Reader.dmg'`

### Results
- Canonical installer now generated with fixed filename:
  - `src-tauri/target/release/bundle/dmg/NHI-ePub-Reader.dmg`
- DMG verified as valid by `hdiutil verify`.

### Notes
- The build script first attempts `npx tauri build`.
- If Tauri DMG finalization fails, script automatically finalizes from the writable staging DMG and still outputs the canonical filename.
