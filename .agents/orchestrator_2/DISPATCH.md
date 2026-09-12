# Task Assignment: Project Orchestrator (Generation 2)

## Identity
- Role: Project Orchestrator (Generation 2)
- Type: teamwork_preview_orchestrator
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/orchestrator_2
- Parent Conversation ID: 4da12d94-da3e-473d-a2cf-768d410bd35e
- Predecessor Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1

## Context & Key Documents
- User Request: `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md`
- Master Plan & Architecture: `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
- E2E Test Infra: `/Users/ian.huang/aiProjects/LRP/TEST_INFRA.md`
- Predecessor Soft Handoff: `/Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1/handoff.md`
- Predecessor Gate Status: `/Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1/GATE_STATUS.md`
- Predecessor Briefing: `/Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1/BRIEFING.md`
- Audit Evidence Report: `/Users/ian.huang/aiProjects/LRP/.agents/auditor_m123/handoff.md`
- Review Reports: `/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_1/handoff.md` and `/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_2/handoff.md`

## Mission & Action Items for Generation 2
1. **Remediation of 27 TypeScript Compiler Errors & AC5 Bundle Splitting**:
   - Dispatch a worker (`remediation_worker`) to:
     a. Fix TS6133 unused React imports in `apps/web/src/components/pwa/OfflineReadyBadge.tsx`, `PwaInstallPrompt.tsx`, `PwaUpdateToast.tsx`, and `apps/web/src/test/pwa/*.tsx`.
     b. Fix `apps/web/src/components/UserSwitcher.tsx` (lines 55, 74-77, 82, 95) with proper `targetForm` guards, nullable handling, and robust form matching by `data-entity`.
     c. Fix mock fixtures in `apps/web/src/test/pwa/DraftPreservation.test.tsx` (valid `conflictType`, `lastUsedAt`, `createdAt`, `resolvedAt`) and `KioskMode.test.tsx` (`createdAt`, `window.location`).
     d. Implement route code splitting in `apps/web/src/App.tsx` using `React.lazy()` with `<Suspense>` for `/reports` and `/admin/*`.
     e. Configure `charts: ['recharts']` in `manualChunks` in `apps/web/vite.config.ts`.
     f. Verify `npm run typecheck` exits 0, `npm run build` exits 0, `npm run lint` exits 0, and `npm test` passes 100%.

2. **Finalize E2E Test Suite**:
   - Ensure Playwright E2E suites (`reports.spec.ts`, `admin-rbac.spec.ts`, `pwa-install-kiosk.spec.ts`, `real-world-scenarios.spec.ts`) and Vitest integration suites pass.
   - Publish `/Users/ian.huang/aiProjects/LRP/TEST_READY.md`.

3. **Re-Run Gate Verification**:
   - Dispatch Reviewer, Challenger, and Forensic Auditor.
   - Ensure all pass: Reviewer APPROVE, Challenger CONFIRMED, Auditor CLEAN.

4. **Complete Project & Submit Final Report**:
   - Send completion message to parent (`4da12d94-da3e-473d-a2cf-768d410bd35e`).

## 2026-09-04T08:51:12Z
You are the Project Orchestrator (Generation 2).

Your working directory is:
/Users/ian.huang/aiProjects/LRP/.agents/orchestrator_2

Your predecessor (Generation 1) completed all initial milestones (M0, M1, M2, M3) and conducted an audit before succession.
Please carefully read:
1. /Users/ian.huang/aiProjects/LRP/.agents/orchestrator_2/DISPATCH.md
2. /Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1/handoff.md
3. /Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1/GATE_STATUS.md
4. /Users/ian.huang/aiProjects/LRP/.agents/auditor_m123/handoff.md
5. /Users/ian.huang/aiProjects/LRP/PROJECT.md
6. /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md

Your mission:
Execute the action items outlined in DISPATCH.md:
1. Dispatch remediation worker to resolve the 27 TypeScript compiler errors in M3 files and apply AC5 route code-splitting (React.lazy) and Recharts bundle chunking in Vite. Verify npm run typecheck (exit 0), npm run lint (exit 0), npm run build (exit 0), and npm test pass 100%.
2. Finalize and execute the Playwright E2E test suites and publish TEST_READY.md.
3. Conduct re-audit and gate verification (fresh Reviewer and Forensic Auditor) to achieve CLEAN and APPROVE verdicts.
4. When all acceptance criteria (AC1-AC5) are verified and all checks pass, report project completion.

Maintain plan.md, progress.md, and BRIEFING.md in /Users/ian.huang/aiProjects/LRP/.agents/orchestrator_2.
