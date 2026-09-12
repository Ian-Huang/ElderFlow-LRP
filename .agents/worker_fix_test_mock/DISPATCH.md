## 2026-09-04T14:07:59Z
# Task Assignment: Fix ResizeObserver Mock in Test Setup & Full Canonical Test Verification

You are `worker_fix_test_mock` (TypeName: `teamwork_preview_worker`).
Your working directory is: `/Users/ian.huang/aiProjects/LRP/.agents/worker_fix_test_mock`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A victory auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
Subagents MUST read these files before starting work:
- Victory Auditor Report (with full failure trace): `/Users/ian.huang/aiProjects/LRP/.agents/victory_auditor_1/handoff.md`
- Master Plan: `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
- Test Readiness Report: `/Users/ian.huang/aiProjects/LRP/TEST_READY.md`
- Test setup file: `apps/web/src/test/setup.ts`
- Failing test file: `apps/web/src/test/adversarial-gate1.test.tsx`

## Defect Summary from Victory Audit
When running the full canonical monorepo test suite (`npm test`), 1 test fails in `src/test/adversarial-gate1.test.tsx`:
`Challenge 2.2: Empty Alert Queries & Rapid Tab Switching > rapid tab switching across report tabs completes without crash`
`TypeError: observer.observe is not a function`
At `node_modules/recharts/lib/component/ResponsiveContainer.js:106:14`.

**Root Cause**:
In `apps/web/src/test/setup.ts`, `global.ResizeObserver` was mocked as `vi.fn().mockImplementation(...)`.
When running the full test suite, earlier tests invoke `vi.restoreAllMocks()`, which resets `vi.fn()` instances, stripping the implementation and leaving `new ResizeObserver()` returning `{}` without an `.observe` method.

## Required Tasks

### 1. Robust ResizeObserver Mock in `apps/web/src/test/setup.ts`
Replace the `vi.fn()` definition of `ResizeObserver` with an ES6 class that survives `vi.restoreAllMocks()`:
```ts
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
if (typeof window !== 'undefined') {
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

// In beforeEach, also re-ensure ResizeObserver is attached in case any test overwrites it
beforeEach(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  if (typeof window !== 'undefined') {
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  }
});
```

### 2. Standard Recharts Mock in `apps/web/src/test/adversarial-gate1.test.tsx`
In `apps/web/src/test/adversarial-gate1.test.tsx`, add the standard `recharts` mock (consistent with `DailyCompletionView.test.tsx` and `ResidentSummaryView.test.tsx`):
```ts
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>();
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container" style={{ width: 600, height: 300 }}>
        {children}
      </div>
    ),
  };
});
```

### 3. Full Independent Execution & Canonical Test Run
Execute and document verbatim outputs and exit codes:
1. `npm test` (MUST run across the full monorepo, ALL test files MUST pass, exit code 0, 0 failures!)
2. `npm run typecheck` (MUST exit code 0 across `@lrp/web` and `@lrp/shared`)
3. `npm run lint` (MUST exit code 0 across monorepo)
4. `npm run build` (MUST exit code 0, clean build, no chunk > 500 kB)
5. `npm run test:e2e --workspace=apps/web` (MUST exit code 0, all 28 Playwright tests pass)

### 4. Update `TEST_READY.md`
Verify `TEST_READY.md` reflects the accurate total test count and 100% pass rate.

## Output Requirements
- Write your progress to `/Users/ian.huang/aiProjects/LRP/.agents/worker_fix_test_mock/progress.md`.
- Write your final handoff to `/Users/ian.huang/aiProjects/LRP/.agents/worker_fix_test_mock/handoff.md`.
- Document all file changes and verbatim outputs from all 5 commands.
- Send message to parent orchestrator when complete.
