# Learning Lessons

## Product Lessons

### 1. Passive reading is not enough
Users get more value when reading is paired with an explicit transformation loop:
- read,
- reframe,
- store,
- test,
- teach.

This app’s strongest product pattern is that each module feeds the next one.

### 2. Persona-switching creates durable understanding
Analysis from multiple lenses leads to stronger concept transfer than single-tone summarization. Users can compare reasoning styles and expose hidden assumptions.

### 3. Retention improves when output becomes reusable artifacts
Ledger entries, quiz results, and lesson plans create cumulative value. The app is most useful when users can build a “knowledge trail,” not one-off answers.

## Engineering Lessons

### 1. Keep model credentials server-side
Moving all Gemini calls behind Express endpoints protects API keys and simplifies future security controls (rate limits, auth, audit logging).

### 2. Prompt design is product design
Personas, focus modes, and explanation depth are not minor tuning; they are core user-facing product behavior. Prompt contracts should be versioned and tested like application logic.

### 3. Local-first persistence is fast and practical
IndexedDB provided low-friction per-book persistence with no backend database complexity. This accelerated feature delivery for research ledger workflows.

### 4. Simplified EPUB parsing enabled fast iteration
Using spine-based chapter order instead of full NCX parsing reduced initial complexity and made v1 shippable. Tradeoff: lower fidelity TOC labels.

### 5. Single-bundle growth becomes visible early
Current production build shows a >500 kB JS chunk warning. Feature-rich monolith UI needs code-splitting strategy before scale features are added.

## UX Lessons

### 1. Control density must stay understandable
The product has high capability density (persona, focus, depth, quiz config, lesson config). Users need clear defaults and guided modes to reduce setup fatigue.

### 2. Explicit empty states are essential
Modules that depend on ledger context (lesson planner, ledger-weighted quiz) perform better with hard gates and clear messaging when prerequisites are missing.

### 3. Small actions matter
Copy/save/export actions materially improve adoption by letting users quickly move outputs into external workflows.

## Reliability and Risk Lessons

### 1. Full-book prompting is expensive at scale
Aggregating all chapter text for quiz generation risks token overflow, cost spikes, and latency regressions on large books. Chunking and retrieval are required for growth.

### 2. Input sanitization is multi-layered
EPUB sanitization exists, but search highlight uses dynamic regex from raw user query and should escape regex characters to avoid breakage.

### 3. No tests means low change confidence
The app currently builds successfully, but absence of automated tests increases regression risk as prompts and UI logic evolve.

## Team and Process Lessons

### 1. Vertical slices worked well
Shipping user-visible slices (reader, then analysis, then ledger, then quiz, then lesson plan) created momentum and validated value quickly.

### 2. Product copy and UX framing matter for adoption
Library onboarding panels communicate intended usage behavior and help reposition the app from “reader” to “thinking environment.”

### 3. Next scale step is operational discipline
To move from prototype to dependable product, prioritize:
- automated tests,
- observability,
- prompt/version governance,
- performance budgets,
- release checklists.

## Actionable Follow-Ups
1. Add test harness for service functions and API endpoints.
2. Implement quiz context chunking/retrieval instead of full-book prompting.
3. Escape search query before regex construction.
4. Code-split heavy overlays (quiz, ledger, lesson planner, markdown renderers).
5. Add request metrics and error tracking for production readiness.
