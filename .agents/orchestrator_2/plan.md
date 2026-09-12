# Execution Plan: Project Orchestrator (Generation 2)

## Goal
Achieve 100% build, typecheck, lint, unit/integration and E2E test passes across the monorepo, publish `TEST_READY.md`, obtain APPROVE and CLEAN verdicts from fresh Reviewer and Forensic Auditor, and conclude the project with all acceptance criteria (AC1-AC5) verified.

## Phased Plan

### Phase 1: Remediation & Bundle Optimization (Milestone M3)
1. Dispatch `teamwork_preview_worker` (`remediation_worker`) armed with:
   - Full audit report from `auditor_m123/handoff.md` and reviewer findings from `reviewer_m123_1/handoff.md`.
   - Clear instructions to:
     - Remove unused React default imports (`TS6133`) in `OfflineReadyBadge.tsx`, `PwaInstallPrompt.tsx`, `PwaUpdateToast.tsx`, and test files.
     - Fix `targetForm` and null/undefined handling in `apps/web/src/components/UserSwitcher.tsx` (`TS18048`, `TS2322`).
     - Fix mock data types in `apps/web/src/test/pwa/DraftPreservation.test.tsx` (`TS2322`, `TS2741`) and `KioskMode.test.tsx`.
     - Implement route code-splitting in `apps/web/src/App.tsx` via `React.lazy()` and `<Suspense>`.
     - Add `manualChunks: { charts: ['recharts'] }` to `apps/web/vite.config.ts`.
     - Run and verify:
       - `npm run typecheck` (exit 0)
       - `npm run lint` (exit 0)
       - `npm run build` (exit 0)
       - `npm test` (100% pass)
2. Verify worker's handoff.

### Phase 2: E2E Test Suite Finalization & Publication (Milestone M4)
1. Dispatch `teamwork_preview_worker` (`e2e_worker`) to:
   - Ensure complete Playwright E2E test coverage across all features:
     - `apps/web/e2e/reports.spec.ts` (R1)
     - `apps/web/e2e/admin-rbac.spec.ts` (R2, AC4)
     - `apps/web/e2e/pwa-install-kiosk.spec.ts` (R3, AC3)
     - `apps/web/e2e/real-world-scenarios.spec.ts` (Tier 4 scenarios)
   - Run the E2E suites or integration tests to verify all test cases pass.
   - Publish `/Users/ian.huang/aiProjects/LRP/TEST_READY.md` conforming to `TEST_INFRA.md`.

### Phase 3: Independent Gate Verification
1. Dispatch fresh `teamwork_preview_reviewer` to review:
   - Code correctness, RBAC & CSRF security, PWA conformance, route code-splitting, bundle chunk sizes.
   - Verification commands & test passes.
2. Dispatch fresh `teamwork_preview_challenger` to verify:
   - Edge case robustness, boundary handling, concurrent actions.
3. Dispatch fresh `teamwork_preview_auditor` to conduct forensic integrity audit:
   - Static analysis, authenticity checks, layout compliance, typecheck, build, test execution.
4. Record verdicts in `GATE_STATUS.md`. Require APPROVE, CONFIRMED, and CLEAN.

### Phase 4: Project Completion & Reporting
1. Update `PROJECT.md` milestones to DONE.
2. Synthesize final report covering AC1-AC5.
3. Send completion message to parent (`4da12d94-da3e-473d-a2cf-768d410bd35e`).
