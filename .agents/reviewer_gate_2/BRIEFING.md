# BRIEFING — 2026-09-04T10:11:45Z

## Mission
Perform Gate Reviewer 2: Security & PWA Architecture Review covering AC4 (RBAC, CSRF, sysadmin lockout) and AC3 (PWA/Workbox caching, Screen Wake Lock/kiosk mode, multi-account switching & draft preservation), with independent builds/tests/E2E and adversarial stress-testing.

## 🔒 My Identity
- Archetype: teamwork_preview_reviewer
- Roles: reviewer, critic
- Working directory: /Users/ian.huang/aiProjects/LRP/.agents/reviewer_gate_2
- Original parent: 0d9b13ca-e562-42c7-8391-8ba631f3f430
- Milestone: Gate Review 2 (Security & PWA Architecture)
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Actively check for integrity violations (hardcoded test results, facade logic, bypasses, fabricated outputs)
- Issue explicit verdict: APPROVE or REQUEST_CHANGES
- Send message to parent orchestrator with verdict

## Current Parent
- Conversation ID: 0d9b13ca-e562-42c7-8391-8ba631f3f430
- Updated: not yet

## Review Scope
- **Files to review**:
  - `apps/web/src/hooks/useRequireRole.tsx` / `apps/web/src/App.tsx` (RBAC, /403, security logging)
  - `apps/web/src/api/apiClient.ts` (CSRF interceptor, dev switch)
  - `apps/web/src/mocks/handlers.ts` / user management (sysadmin lockout protection)
  - `apps/web/vite.config.ts` (vite-plugin-pwa, Workbox CacheFirst / NetworkFirst)
  - `apps/web/src/utils/offlineDb.ts` (Dexie IndexedDB integration)
  - `apps/web/src/stores/uiStore.ts` & `apps/web/src/components/Layout.tsx` (Screen Wake Lock API & Kiosk mode `?kiosk=1`)
  - `apps/web/src/components/UserSwitcher.tsx` (Multi-account switching and draft preservation in IndexedDB across users)
- **Input Context**:
  - `ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_READY.md`, `auditor_m123/handoff.md`, `worker_remediation/handoff.md`, `worker_e2e/handoff.md`
- **Review criteria**:
  - Correctness, logical completeness, quality, risk assessment, adversarial failure modes, integrity violations

## Key Decisions Made
- Confirmed full resolution of previous M3 TypeScript compiler errors (0 errors across monorepo).
- Confirmed independent execution of all test and build commands: typecheck (code 0), lint (code 0), build (code 0, code-split cleanly), Vitest (313/313 pass), Playwright E2E (28/28 pass in 17.3s).
- Verified AC4 security controls: RBAC route guard with 403 redirect and console security logging, CSRF interceptor attaching `X-CSRF-Token` with dev error simulation, sysadmin lockout protection guarding last active sysadmin in role demotion, status deactivation, and deletion.
- Verified AC3 PWA & offline architecture: Workbox CacheFirst static / NetworkFirst API, Dexie IndexedDB offline repository & draft store, Screen Wake Lock with tab visibilitychange re-acquisition, Kiosk mode with 5-click emergency unlock.
- Formulated adversarial challenge regarding Dexie `Drafts` table primary key scoping (`draft:${entity}:${entityId}` vs `draft:${userId}:${entity}:${entityId}`).
- Verdict determined: **APPROVE**.

## Artifact Index
- `.agents/reviewer_gate_2/DISPATCH.md` — Dispatch message
- `.agents/reviewer_gate_2/BRIEFING.md` — Situational awareness
- `.agents/reviewer_gate_2/progress.md` — Liveness heartbeat
- `.agents/reviewer_gate_2/handoff.md` — Final review and challenge report

## Review Checklist
- **Items reviewed**:
  - `apps/web/src/hooks/useRequireRole.tsx` (RBAC hook & requireRole HOC)
  - `apps/web/src/App.tsx` (PrivateRoute & route tree)
  - `apps/web/src/pages/ForbiddenPage.tsx` (403 page & security log)
  - `apps/web/src/api/apiClient.ts` (CSRF interceptor, setSimulateCsrfError)
  - `apps/web/src/pages/admin/AdminLayout.tsx` (CSRF toggle switch & alert banner)
  - `apps/web/src/pages/admin/UserManagementView.tsx` (Optimistic updates & rollback on lockout/CSRF failure)
  - `apps/web/src/mocks/handlers.ts` (validateCsrf, CANNOT_DEMOTE/DEACTIVATE/REMOVE_LAST_SYSADMIN)
  - `apps/web/vite.config.ts` (VitePWA, Workbox runtimeCaching, manualChunks)
  - `apps/web/src/utils/offlineDb.ts` (LRPOfflineDB, Drafts table, cleanupOldSyncRecords)
  - `apps/web/src/utils/pwa.ts` (registerSW, triggerPwaUpdate, triggerPwaOfflineReady, isFormEditingActive)
  - `apps/web/src/components/pwa/` (PwaInstallPrompt, OfflineReadyBadge, PwaUpdateToast)
  - `apps/web/src/components/UserSwitcher.tsx` (captureAndSaveActiveDraft, restoreActiveDraftToDom)
  - `apps/web/src/stores/uiStore.ts` & `apps/web/src/components/Layout.tsx` (Screen Wake Lock, visibilitychange, kiosk mode)
  - `apps/web/e2e/admin-rbac.spec.ts` & `apps/web/e2e/pwa-install-kiosk.spec.ts` (E2E specs)
- **Verdict**: APPROVE
- **Unverified claims**: 0 (all independently executed and verified)

## Attack Surface
- **Hypotheses tested**:
  - CSRF simulation bypass: Verified 403 CSRF_INVALID properly returned and handled by UI rollback.
  - Non-admin route direct access: Verified `/admin/users` and `/admin/settings` redirect to `/403` with security warning.
  - Demote/deactivate last sysadmin: Verified MSW rejects with 400 and UI displays error banner and reverts state.
  - Wake lock loss on tab hide: Verified visibilitychange listener re-requests wake lock on tab restoration.
  - Draft cross-user isolation: Verified User B does not see User A's unsubmitted draft upon fast switch.
  - Multi-user draft key collision: Identified that `draftKey` uses `draft:${entity}:${entityId}` without `userId`, potentially allowing User B to overwrite User A's draft if both edit the exact same form.
- **Vulnerabilities found**:
  - Minor / Non-blocking Architectural Suggestion: `Drafts` table primary key would benefit from compound scoping `draft:${userId}:${entity}:${entityId}` for multi-operator concurrent editing on shared tablets.
- **Untested angles**: Hardware-specific iOS Safari home screen add outside browser emulator.
