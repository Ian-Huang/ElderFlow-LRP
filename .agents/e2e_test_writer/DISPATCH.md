# Task Assignment: E2E Test Suite Creation & Publishing TEST_READY.md

## Identity
- Role: E2E Test Suite Writer
- Type: teamwork_preview_test_writer
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/e2e_test_writer
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References (Must Read First)
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md` (AC1-AC5, R1-R3)
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
3. `/Users/ian.huang/aiProjects/LRP/TEST_INFRA.md`
4. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m1/handoff.md`
5. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m2/handoff.md`
6. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m3/handoff.md`

## File Ownership (Exclusively Owned)
- `apps/web/e2e/reports.spec.ts`
- `apps/web/e2e/admin-rbac.spec.ts`
- `apps/web/e2e/pwa-install-kiosk.spec.ts`
- `apps/web/e2e/real-world-scenarios.spec.ts`
- `apps/web/src/test/e2e-opaque-tier.test.ts` (Vitest integration tier verification)
- `/Users/ian.huang/aiProjects/LRP/TEST_READY.md` (published at project root when tests pass)

## Objective & Detailed Requirements
1. **Opaque-Box E2E Playwright Test Suite (`apps/web/e2e/`)**:
   - Derive test cases directly from `ORIGINAL_REQUEST.md` and user requirements (not implementation internals).
   - `reports.spec.ts`:
     - Test tab switching between the 4 views (`?tab=daily-completion`, `?tab=resident-summary`, `?tab=alerts`, `?tab=audit-trail`).
     - Test Daily Completion date navigation and low score resident table.
     - Test Resident Summary tube cards and bed occupancy filter.
     - Test Alerts Center severity filter, search, and status toggle.
     - Test Audit Trail pagination (20 rows/page), date filter, and jump-to-page.
     - Test PDF Export Modal: trigger download of all 5 report types.
   - `admin-rbac.spec.ts` (AC4 Security):
     - Test caregiver/supervisor login and attempt to navigate to `/admin` -> expect redirect to `/403` with ForbiddenPage.
     - Test admin/sysadmin login and navigate to `/admin` -> expect successful rendering of AdminLayout and subpages.
     - Test User CRUD: create user, update role, toggle status.
     - Test last sysadmin protection: verify sole sysadmin cannot be deleted, demoted, or deactivated.
     - Test CSRF simulation switch: toggle ON, attempt mutating action, expect 403 `CSRF_INVALID` rejection and security alert.
   - `pwa-install-kiosk.spec.ts` (AC3 PWA):
     - Test PWA install prompt button visibility and `beforeinstallprompt` event handling.
     - Test standalone display mode auto-hiding the install button.
     - Test offline readiness indicator ("離線就緒" green dot online -> "離線模式中" offline).
     - Test Kiosk mode via URL `?kiosk=1`, verify navigation suppression and Wake Lock activation.
     - Test fast user switching with draft preservation.
   - `real-world-scenarios.spec.ts` (Tier 4 Real-World Workflows):
     - Execute the 6 realistic long-term care facility workflows defined in `TEST_INFRA.md § Real-World Application Scenarios`.
   - Also add component-level integration tests in `apps/web/src/test/e2e-opaque-tier.test.ts` runnable directly via Vitest to verify all 4 Tiers.

2. **Publish `TEST_READY.md`**:
   - When all test suites pass with exit code 0, create `/Users/ian.huang/aiProjects/LRP/TEST_READY.md` at project root matching the template in `TEST_INFRA.md`.

## Deliverable
Write your completion report to:
`/Users/ian.huang/aiProjects/LRP/.agents/e2e_test_writer/handoff.md`
Notify the parent agent via `send_message` when complete.

## 2026-09-04T04:43:58Z
You are e2e_test_writer (E2E Test Suite Writer).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/e2e_test_writer
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c
Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/e2e_test_writer/DISPATCH.md, /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md, /Users/ian.huang/aiProjects/LRP/PROJECT.md, and /Users/ian.huang/aiProjects/LRP/TEST_INFRA.md.
Also read the worker handoffs in /Users/ian.huang/aiProjects/LRP/.agents/worker_m1/handoff.md, worker_m2, and worker_m3.
Implement the opaque-box E2E test suites in apps/web/e2e/ (reports, admin-rbac, pwa-install-kiosk, real-world-scenarios) and Vitest e2e-opaque-tier.test.ts covering Tiers 1-4 per TEST_INFRA.md.
Execute and verify all tests pass.
Publish /Users/ian.huang/aiProjects/LRP/TEST_READY.md.
Write your handoff report to /Users/ian.huang/aiProjects/LRP/.agents/e2e_test_writer/handoff.md and notify parent via send_message.
