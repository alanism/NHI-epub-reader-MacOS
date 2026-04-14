# NHI Reader (Non-Human Intelligence Reader)

NHI Reader is a macOS-first EPUB reading and cognition app. It combines reading, AI analysis, quiz generation, lesson planning, and research ledgering in one local workflow.

## Product Summary

- EPUB reader with TOC navigation, search, chapter rendering, and reader controls
- AI analysis with persona lens + explanation depth controls
- Research ledger for saved analysis/notes/quiz outputs
- Quiz generation (`whole-book` and `ledger-weighted`)
- Lesson plan generation from ledger context
- Multi-provider AI support with OpenAI + Gemini switching in app settings

## Research Ledger Source Text Modes

Ledger now supports per-book source text display/export modes to keep entries and `.txt` exports manageable:

- `Whole source text`
- `No source text`
- `Partial source text` (first 7 words + last 7 words)

These modes are non-destructive (stored ledger data is unchanged) and are remembered per book.

## Runtime and Architecture

- Frontend: React + Vite
- Native shell: Tauri v2 (macOS-first)
- Secret/key storage: Tauri Stronghold
- Non-secret settings: Tauri Store
- AI integration: normalized provider layer (`OpenAI` Responses API + Gemini `generateContent`)

## Local Development

```bash
npm install
npm run dev
```

## Run as Native macOS App (Dev)

```bash
npm run tauri:dev
```

## Build and Package macOS Installer

Canonical installer build command:

```bash
npm run tauri:build:installer
```

Output installer:

- `src-tauri/target/release/bundle/dmg/NHI-ePub-Reader.dmg`

Install flow:

1. Open/mount `NHI-ePub-Reader.dmg`
2. Drag `NHI Reader.app` into `/Applications`
3. Launch from Applications

Note: current build is unsigned for local/internal use.

## GitHub

- Repository: [alanism/NHI-epub-reader-MacOS](https://github.com/alanism/NHI-epub-reader-MacOS)
- Latest release: [v0.1.0](https://github.com/alanism/NHI-epub-reader-MacOS/releases/tag/v0.1.0)

## Scripts

- `npm run dev` - Vite web development server
- `npm run build` - production web build
- `npm run tauri:dev` - run Tauri desktop app in development
- `npm run tauri:build` - standard Tauri production build
- `npm run tauri:build:installer` - canonical DMG builder (`NHI-ePub-Reader.dmg`)
