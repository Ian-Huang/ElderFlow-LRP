## 2026-09-04T09:02:38Z

# Task Assignment: Playwright E2E Test Finalization & Publication of TEST_READY.md

You are `worker_e2e` (TypeName: `teamwork_preview_worker`).
Your working directory is: `/Users/ian.huang/aiProjects/LRP/.agents/worker_e2e`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Inputs
Subagents MUST read these files before starting work:
- User Request: `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md`
- Master Plan & Architecture: `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
- E2E Test Infra: `/Users/ian.huang/aiProjects/LRP/TEST_INFRA.md`
- Existing E2E specs: `apps/web/e2e/reports.spec.ts`, `apps/web/e2e/offline-sync.spec.ts`
- Playwright config: `apps/web/playwright.config.ts`

## Your Exclusive File Ownership
- `apps/web/e2e/*`
- `/Users/ian.huang/aiProjects/LRP/TEST_READY.md`

## Required Tasks

### 1. Finalize Playwright E2E Test Suites
According to `TEST_INFRA.md`, ensure comprehensive opaque-box E2E test coverage across all features F1-F21 and AC1-AC5.
Create and complete:
1. `apps/web/e2e/admin-rbac.spec.ts` (covering F6-F14, AC4):
   - Admin Layout and navigation across all admin subviews (`/admin/users`, `/admin/settings`, `/admin/health`, `/admin/flags`, `/admin/matrix`).
   - User Management: search/filter, open user creation modal, submit new user, modify inline role, toggle user status, verify last sysadmin lockout protection.
   - System Health: display service statuses (api, db, sw, idb) and system metrics.
   - Feature Flags: toggle module flags, update rollout slider percentage.
   - System Settings: update parameters and save successfully.
   - Role Matrix: verify 4-role permissions matrix is accurately rendered.
   - AC4 Security - 403 Route Guard: log in as caregiver or supervisor, navigate to `/admin/*`, verify automatic redirection to `/403` with warning.
   - AC4 Security - CSRF simulation: toggle CSRF simulation in AdminLayout, attempt mutation, verify CSRF failure handling.

2. `apps/web/e2e/pwa-install-kiosk.spec.ts` (covering F15-F20, AC3):
   - AC3 PWA Install Prompt: check "加入主畫面" / install prompt trigger, install modal, iOS Safari guide.
   - AC3 Offline Ready Indicator: verify green badge "離線就緒" is displayed when ready.
   - Kiosk Mode: access with `?kiosk=1`, verify sidebar/navigation hidden and kiosk mode UI activated.
   - Fast Account Switcher & Draft Preservation: switch between users in UserSwitcher dialog, test draft preservation across switches.
   - PWA Update Toast: verify update toast behavior.

3. `apps/web/e2e/real-world-scenarios.spec.ts` (Tier 4 Application Scenarios):
   - Scenario 1: 早班交接巡檢流程 (Supervisor logs in, inspects daily completion, reviews tube statistics, filters alerts, triggers PDF export).
   - Scenario 2: 機構評鑑稽核準備 (Admin reviews audit trail, tests 20/page pagination, filters by entity and date range).
   - Scenario 3: 新進照護員帳號開立與角色防護 (Admin creates caregiver, logs in as that caregiver, attempts to access `/admin`, verifies 403 redirect).
   - Scenario 4: 機構平板共用交班情境 (Caregiver A starts editing form, switches to Caregiver B, switches back, verifies form draft preserved in IndexedDB).
   - Scenario 5: 地下室離線查房與恢復連線 (Simulate offline mode, verify cached routes/views accessible, return online).
   - Scenario 6: 系統健康與緊急功能降級 (Admin inspects health dashboard, disables feature flag, verifies frontend responds).

### 2. Run and Verify Playwright E2E Tests
- Run Playwright E2E tests:
  `cd apps/web && npx playwright test` (or `npm run test:e2e --workspace=apps/web`)
- Fix any selector, timing, or mock issues so all tests pass cleanly.
- Also verify `npm run typecheck` and `npm test` continue to pass 100%.

### 3. Publish `TEST_READY.md`
- Create `/Users/ian.huang/aiProjects/LRP/TEST_READY.md` conforming to the template in `PROJECT.md § Coordination: TEST_READY.md`:
  - Test runner command and instructions
  - Coverage summary across Tiers 1-4 with exact counts
  - Feature checklist table covering F1-F21

## Output Requirements
- Write your progress to `/Users/ian.huang/aiProjects/LRP/.agents/worker_e2e/progress.md`.
- Write your final handoff to `/Users/ian.huang/aiProjects/LRP/.agents/worker_e2e/handoff.md`.
- Document test run commands, results, and summary of all E2E spec files created.
- Send message to parent orchestrator when complete.
