## 2026-09-04T08:52:32Z

# Task Assignment: Remediation of 27 TypeScript Compiler Errors & AC5 Bundle Splitting

You are `worker_remediation` (TypeName: `teamwork_preview_worker`).
Your working directory is: `/Users/ian.huang/aiProjects/LRP/.agents/worker_remediation`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
Subagents MUST read these files before starting work:
- User Request: `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md`
- Master Plan & Architecture: `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
- Forensic Audit Report (with full evidence): `/Users/ian.huang/aiProjects/LRP/.agents/auditor_m123/handoff.md`
- Reviewer Report: `/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_1/handoff.md`
- Predecessor Handoff: `/Users/ian.huang/aiProjects/LRP/.agents/orchestrator_1/handoff.md`

## Your Exclusive File Ownership
- `apps/web/src/components/pwa/*`
- `apps/web/src/components/UserSwitcher.tsx`
- `apps/web/src/test/pwa/*`
- `apps/web/src/App.tsx`
- `apps/web/vite.config.ts`

## Specific Remediation Tasks

### 1. Fix 27 TypeScript Compiler Errors
Refer to `/Users/ian.huang/aiProjects/LRP/.agents/auditor_m123/handoff.md` Section 2.3 and Section 4:
a. **TS6133 Unused React default imports**:
   - `apps/web/src/components/pwa/OfflineReadyBadge.tsx`
   - `apps/web/src/components/pwa/PwaInstallPrompt.tsx`
   - `apps/web/src/components/pwa/PwaUpdateToast.tsx`
   - `apps/web/src/test/pwa/DraftPreservation.test.tsx`
   - `apps/web/src/test/pwa/KioskMode.test.tsx`
   - `apps/web/src/test/pwa/OfflineReadyBadge.test.tsx`
   - `apps/web/src/test/pwa/PwaInstallPrompt.test.tsx`
   - `apps/web/src/test/pwa/PwaUpdateToast.test.tsx`
   Remove `React` from `import React, { ... }` where `React` is unused (`"jsx": "react-jsx"` and `"noUnusedLocals": true`).

b. **TS18048 & TS2322 in `apps/web/src/components/UserSwitcher.tsx`**:
   - Fix lines 55 & 82: `getAttribute('data-entity')` returns `string | null`. Change `let entity = ...` to properly handle `string | null | undefined`.
   - Fix line 76: `const targetForm = forms[0];` has type `HTMLFormElement | undefined` under `"noUncheckedIndexedAccess": true`. Add guard `if (!targetForm) return false;`.
   - Make form resolution robust (match form by `data-entity` instead of assuming `forms[0]`).
   - Fix line 95: ensure `targetForm` is guarded.

c. **TS2322 & TS2741 in `apps/web/src/test/pwa/DraftPreservation.test.tsx` and `KioskMode.test.tsx`**:
   - Lines 88 & 104: Check `ConflictType` in `packages/shared/src/index.ts` or local types and replace invalid `"version_conflict"` with a valid union member (e.g., `'ClientWins'` or `'Manual'` or `'FieldLevel'`).
   - Lines 93, 94, 109, 110: Provide `undefined` instead of `null` for optional string fields if required by schema/interface.
   - Line 145 & 149: Fix `Object is possibly 'undefined'`.
   - Line 204: Add required property `createdAt: '2024-01-01T00:00:00Z'` to mock `User`.
   - Line 211: Add required property `lastUsedAt: '2024-01-15T00:00:00Z'` to mock `SwitchableUser`.
   - Line 243: Handle `HTMLElement | undefined`.
   - In `DraftPreservation.test.tsx:31` and `KioskMode.test.tsx:66`: Replace `window.location = ...` assignment with `vi.spyOn(window, 'location', 'get')` or `Object.defineProperty` so TypeScript doesn't reject assigning `Location` to `string & Location`.
   - In `KioskMode.test.tsx:17`: Add required `createdAt: '2024-01-01T00:00:00Z'` to mock `User`.

### 2. AC5 Bundle Optimization & Route Code-Splitting
a. **Route Splitting in `apps/web/src/App.tsx`**:
   - Convert static imports of page components (`ReportsLayout`, `/admin/*` views, etc.) to dynamic imports using `React.lazy(() => import(...))`.
   - Wrap the routes in `<React.Suspense fallback={<div className="flex h-screen items-center justify-center">載入中...</div>}>`.
b. **Vite Manual Chunks in `apps/web/vite.config.ts`**:
   - In `build.rollupOptions.output.manualChunks`, configure:
     ```ts
     manualChunks: {
       charts: ['recharts'],
     }
     ```
   - Verify that running `npm run build` eliminates the large monolithic chunk warning (>500 kB) and cleanly separates charts into their own chunk.

### 3. Verification Commands (Worker MUST execute all of these and document results):
1. `npm run typecheck` (MUST exit with code 0 across the monorepo)
2. `npm run lint` (MUST exit with code 0 across the monorepo)
3. `npm run build` (MUST exit with code 0 across both packages/shared and apps/web; must successfully run `tsc && vite build`)
4. `npm test` (All monorepo tests must execute and pass 100%)

## Output Requirements
- Write your progress to `/Users/ian.huang/aiProjects/LRP/.agents/worker_remediation/progress.md`.
- Write your final handoff to `/Users/ian.huang/aiProjects/LRP/.agents/worker_remediation/handoff.md`.
- Handoff MUST document:
  - Every file modified and exact changes made
  - Exact command line output and exit codes for `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`
  - Bundle chunk breakdown from `npm run build`
- Send message to parent orchestrator when complete.
