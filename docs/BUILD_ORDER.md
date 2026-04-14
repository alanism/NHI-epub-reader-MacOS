# Build Order

## Objective
Deliver the NHI Reader from zero to production-ready in a dependency-correct sequence that minimizes rework.

## Phase 0: Foundation
1. Initialize React + Vite + TypeScript app shell.
2. Add Express API service and local dev concurrency (`vite` + `node server.js`).
3. Wire Vite `/api` proxy to local backend.
4. Add environment strategy for Gemini API key and Vertex AI mode.

Exit criteria:
- `npm run dev` starts both frontend/backend.
- `/api/health` responds successfully.

## Phase 1: Core Reader
1. Implement EPUB parsing pipeline:
   - unzip EPUB,
   - parse `container.xml`,
   - resolve OPF,
   - load manifest + spine,
   - sanitize HTML content.
2. Build library upload screen and parse status UX.
3. Build reader view with chapter render + chapter navigation.
4. Add basic TOC panel.

Exit criteria:
- User can upload valid non-DRM EPUB and read chapters end-to-end.

## Phase 2: UX Essentials
1. Add search panel over chapter corpus.
2. Add theme toggle and persisted preference.
3. Add font size controls.
4. Add settings modal + persisted explanation depth.

Exit criteria:
- Reader experience is comfortable for long-form usage.

## Phase 3: AI Analysis Workflow
1. Define persona schema and prompt contract.
2. Implement `POST /api/analyze` server endpoint.
3. Implement analysis panel in UI:
   - input text,
   - persona select,
   - focus mode,
   - explain-depth integration,
   - markdown rendering.
4. Add copy/save actions.

Exit criteria:
- User can produce and save persona-based analysis reliably.

## Phase 4: Ledger System
1. Implement IndexedDB schema and service abstraction.
2. Save/delete/load analysis entries by `bookId`.
3. Build ledger overlay view with structured history.
4. Add import/export text format.

Exit criteria:
- User can persist and recover research notes per book.

## Phase 5: Quiz Module
1. Define quiz schema and generation prompt rules.
2. Implement `POST /api/quiz` endpoint with JSON schema response.
3. Build quiz setup, generation, run, timer, and results UI.
4. Add result-level copy + save-to-ledger.

Exit criteria:
- User can run complete generated quiz loops and retain insights.

## Phase 6: Lesson Planner Module
1. Define lesson-plan prompt and strict output structure.
2. Implement `POST /api/lesson-plan` endpoint.
3. Build lesson planner UI with age/focus controls.
4. Add copy/export for generated lesson plan.

Exit criteria:
- User can generate a coherent lesson from ledger context.

## Phase 7: Productionization
1. Prepare static build + backend serving from `dist/`.
2. Validate Cloud Run source deployment path.
3. Add production env config for Vertex AI.
4. Run smoke tests in deployed environment.

Exit criteria:
- Deployed service is reachable and AI features execute in production.

## Phase 8: Hardening (Recommended Next)
1. Add test coverage:
   - service unit tests,
   - API contract tests,
   - key UI integration tests.
2. Add prompt/token guardrails for large books.
3. Add resilience controls (timeout, retry policy, graceful UI errors).
4. Add observability (request IDs, latency metrics, error tracking).
5. Improve bundle strategy via code-splitting.

Exit criteria:
- Release confidence and operational visibility meet production standards.

## Critical Dependency Chain
1. EPUB parse must ship before reader UX.
2. Reader + content model must ship before analysis/quiz/lesson features.
3. Ledger must exist before ledger-weighted quiz and lesson planning.
4. Server AI endpoints must exist before all AI UI surfaces.
5. Hardening depends on stable baseline feature behavior.

## Suggested Team Parallelization
- Track A (Frontend Reader): Library, Reader, TOC/Search, theme/settings.
- Track B (AI Backend): API endpoints, model config, prompt contracts.
- Track C (Data/Retention): Ledger service, import/export, history UI.
- Track D (Learning Flows): Quiz + Lesson planner UI integration.
- Track E (Platform): Deployment pipeline, env strategy, monitoring.
