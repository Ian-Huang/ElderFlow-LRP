## 2026-09-04T13:50:47Z
# Task Assignment: System Hardening & Final Monorepo Verification

You are `worker_polish` (TypeName: `teamwork_preview_worker`).
Your working directory is: `/Users/ian.huang/aiProjects/LRP/.agents/worker_polish`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
Subagents MUST read these files before starting work:
- Master Plan: `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
- Gate Challenger 1 Report: `/Users/ian.huang/aiProjects/LRP/.agents/challenger_gate_1/handoff.md`
- Gate Challenger 2 Report: `/Users/ian.huang/aiProjects/LRP/.agents/challenger_gate_2/handoff.md`
- Gate Auditor Report: `/Users/ian.huang/aiProjects/LRP/.agents/auditor_gate/handoff.md`

## Specific Hardening Tasks
1. **Fix Date Input Stepping RangeError in `apps/web/src/pages/reports/DailyCompletionView.tsx`**:
   In lines 50-60, replace the naive date stepping with a safe date stepping function that guards against empty string or invalid dates:
   ```ts
   const stepDate = (current: string, deltaDays: number): string => {
     const base = current && !isNaN(new Date(current).getTime()) ? new Date(current) : new Date();
     base.setDate(base.getDate() + deltaDays);
     return base.toISOString().split('T')[0] ?? '';
   };
   ```
   Use `stepDate(selectedDate, -1)` in `handlePrevDay` and `stepDate(selectedDate, 1)` in `handleNextDay`.
2. **Resolve Typecheck and Lint in any Challenger Test Files**:
   Inspect `apps/web/src/test/pwa/ChallengerGate2Stress.test.tsx` and `apps/web/src/test/adversarial-gate1.test.tsx`.
   Ensure all imports and type definitions (such as `SwitchableUser`) strictly comply with `@lrp/shared` and TypeScript compiler options (`noUnusedLocals`, `strict`, `noUncheckedIndexedAccess`). If any test in `ChallengerGate2Stress.test.tsx` has type errors, fix them so that `npm run typecheck` passes with 0 errors across the monorepo.
3. **Multi-User Draft Isolation in `apps/web/src/utils/offlineDb.ts`**:
   In `saveFormDraft`, `getFormDraft`, `clearFormDraft`:
   Ensure `draftKey` scopes to `userId`:
   `const draftKey = draft:${userId || 'default'}:${entity}:${entityId};`
   Ensure existing unit and E2E tests for drafts continue to pass cleanly.
4. **Independent Execution & Verification**:
   Execute and document:
   - `npm run typecheck` (MUST exit 0 with 0 errors across monorepo)
   - `npm run lint` (MUST exit 0 with 0 errors across monorepo)
   - `npm run build` (MUST exit 0 with 0 errors and zero chunks > 500 kB)
   - `npm test` (MUST pass 100%)
   - `npm run test:e2e --workspace=apps/web` (MUST pass 100%)

## Output Requirements
- Write your progress to `/Users/ian.huang/aiProjects/LRP/.agents/worker_polish/progress.md`.
- Write your handoff to `/Users/ian.huang/aiProjects/LRP/.agents/worker_polish/handoff.md`.
- Document all file changes, exact command line outputs, and test pass counts.
- Send message to parent orchestrator when complete.
