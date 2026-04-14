# Product Documentation

## Product Name
Non-Human Intelligence (NHI) Reader

## Product Summary
NHI Reader is a macOS-first EPUB reading and cognition app. It combines chapter reading, persona-based AI analysis, research ledgering, quiz generation, and lesson planning in one local workflow.

## What It Solves
Most reader apps optimize for passive reading. NHI Reader optimizes for active thinking:
- Read source material.
- Reframe ideas through multiple reasoning lenses.
- Save useful analysis to a ledger.
- Convert understanding into quizzes and teaching artifacts.

## Current Product Scope

### 1. EPUB Reading Workspace
- EPUB upload via drag/drop and file picker.
- Desktop-native open path for EPUB (Finder flow when running in Tauri).
- Spine-based chapter reading with sanitized chapter HTML.
- Table of contents, search, chapter navigation, font controls, and light/dark mode.

### 2. AI Analysis
- Persona-driven analysis on selected/pasted text.
- Focus modes:
  - Expert
  - Executive
  - Storyteller
  - Educator
  - Reels
- Explanation depth profiles:
  - 5th Grader
  - 8th Grader
  - MBA
- Save/copy analysis outputs.

### 3. Research Ledger
- Per-book ledger in IndexedDB.
- Entry types: analysis, annotation, note, quiz.
- Import/export plain text ledger workflow.

### 4. Quiz Mode
- Whole-book and ledger-weighted quiz generation.
- Difficulty, question count, and timer controls.
- Score breakdown and add-to-ledger workflow.

### 5. Lesson Planner
- Generates lesson plans from ledger context.
- Student age and teaching focus controls.
- Copy/export lesson output.

## AI Platform Architecture (Current Direction)

### Runtime Direction
- macOS-first native shell via Tauri v2.
- Secure secret persistence planned through Stronghold.
- Non-secret AI preferences persisted via Tauri Store.

### Provider Strategy
- Provider-agnostic AI service layer (`OpenAI` + `Gemini`) with normalized request/response flow.
- Curated model lists per provider.
- Active provider/model selection in settings.
- Key validation flows surfaced in UI.
- Read-only degrade behavior: reading/search/ledger remain usable if AI configuration is invalid.

### Token Budget Policy
- Request-size control by task class:
  - analysis: focused text budget
  - quiz: sampled/chunked book + optional ledger excerpts
  - lesson plan: capped ledger context

## Core Data Structures
- `Book`: title/author/toc/content map
- `LedgerEntry`: source text, analysis output, tags, metadata
- `AISettings`: active provider, model by provider, key status, validation timestamps
- `NormalizedAIRequest` / `NormalizedAIResponse`: provider-neutral AI contract

## Build and Quality Status

### Verified on April 15, 2026
- `npm run build`: pass
- `npx tsc --noEmit`: pass
- `cargo check --manifest-path src-tauri/Cargo.toml`: pass
- `npm run tauri:build`: partial pass (release app + DMG staging created, final Tauri DMG script failed)

### Performance Signal
- Frontend bundle warning persists:
  - main JS bundle around `940.53 kB` before gzip

## Local macOS Installer

### Prerequisites
- macOS with Rust/Cargo installed.
- Node/NPM dependencies installed (`npm install`).
- Full Xcode app installed for stable macOS packaging workflows.

### Build Commands
1. `npm run build`
2. `npx tsc --noEmit`
3. `cargo check --manifest-path src-tauri/Cargo.toml`
4. `npm run tauri:build`
5. `npm run tauri:build:installer` (recommended canonical installer build)

### Current Artifact Paths
- Release app bundle:
  - `src-tauri/target/release/bundle/macos/NHI Reader.app`
- Final local installer DMG (manual finalize fallback):
  - `src-tauri/target/release/bundle/dmg/NHI-ePub-Reader.dmg`

### DMG Finalize Fallback (Used on April 15, 2026)
When `npm run tauri:build` fails at `bundle_dmg.sh` after creating a writable staging image, the canonical build command below handles fallback and still outputs the final installer name:

`npm run tauri:build:installer`

### Install Verification Steps
1. Mount DMG:
   - `hdiutil attach 'src-tauri/target/release/bundle/dmg/NHI-ePub-Reader.dmg'`
2. Install app:
   - copy `NHI Reader.app` to `/Applications` (drag/drop or `cp -R`)
3. Launch app:
   - `open -a '/Applications/NHI Reader.app'`

### Unsigned Local Build Note
- This installer is unsigned for local testing.
- Gatekeeper may show a warning on first launch.
- For external distribution, add Developer ID signing + notarization in a dedicated release pass.

## Known Limitations
- TOC labels are still spine-fallback (`Chapter N`) vs full NCX/nav fidelity.
- Native shell migration is not fully build-clean yet.
- No automated tests in repo yet.
- Initial bundle size is high for first-load performance.

## Next Milestones
1. Fix root cause of Tauri `bundle_dmg.sh` failure so `npm run tauri:build` completes without manual conversion.
2. Complete AI settings + provider switch runtime testing in native shell.
3. Reduce JS entry bundle via code-splitting.
4. Add regression tests for AI service normalization and critical UI flows.
