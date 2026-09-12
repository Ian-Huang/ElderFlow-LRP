# BRIEFING — 2026-09-04T10:15:00Z

## Mission
Adversarially and empirically challenge PWA offline resilience and tablet concurrency workflows:
1. Offline form filling and sync queue accumulation
2. Rapid multi-user switching while maintaining uncommitted form drafts in IndexedDB
3. Kiosk mode activation, navigation locking, and 5-click emergency unlock
4. Bundle and performance integrity (inspect build output, verify chunks load as expected without missing assets or network failures)
5. Execution of relevant test suites and stress checks, documenting failures and edge cases

## 🔒 My Identity
- Archetype: challenger
- Roles: critic, specialist
- Working directory: /Users/ian.huang/aiProjects/LRP/.agents/challenger_gate_2
- Original parent: 0d9b13ca-e562-42c7-8391-8ba631f3f430
- Milestone: Gate Challenge 2 (PWA Offline & Concurrency)
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code
- Must run verification code directly (empirical reproduction required)
- .agents/ holds only metadata — source, tests, or data there is a violation
- Write only to your own folder (/Users/ian.huang/aiProjects/LRP/.agents/challenger_gate_2)
- Explicit verdict: CONFIRMED or CHALLENGE_FAILED

## Current Parent
- Conversation ID: 0d9b13ca-e562-42c7-8391-8ba631f3f430
- Updated: not yet

## Review Scope
- **Files to review**: ORIGINAL_REQUEST.md, PROJECT.md, TEST_READY.md, apps/web/src/utils/offlineDb.ts, apps/web/src/utils/syncEngine.ts, apps/web/src/components/UserSwitcher.tsx, apps/web/src/stores/uiStore.ts, apps/web/src/components/Layout.tsx, apps/web/src/components/pwa/*, apps/web/dist/*
- **Interface contracts**: PROJECT.md
- **Review criteria**: PWA compliance, offline sync queue mechanics, draft persistence under concurrency, kiosk locking/emergency unlock, bundle asset integrity

## Key Decisions Made
- Executed Playwright E2E suites: 14/14 tests passed (`pwa-install-kiosk.spec.ts`, `offline-sync.spec.ts`, `real-world-scenarios.spec.ts`)
- Executed existing Vitest PWA tests: 26/26 tests passed across 5 test files
- Authored & executed adversarial stress harness: `apps/web/src/test/pwa/ChallengerGate2Stress.test.tsx` (10/10 passed)
- Authored & executed bundle integrity suite: `apps/web/src/test/pwa/BundleIntegrity.test.ts` (5/5 passed)
- Uncovered Bug 1 (High): `saveFormDraft` uses `draft:${entity}:${entityId}` without `userId`, causing draft collision and data loss when two users edit the same form on a shared tablet
- Uncovered Bug 2 (Medium): `baseRepository.update` overwrites `SyncQueue` entry of an offline created entity, clobbering the `create` operation and losing creation fields
- Uncovered Bug 3 (Low): `cleanupOldSyncRecords` does not clean up stale drafts from `Drafts` table

## Attack Surface
- **Hypotheses tested**:
  - High-volume offline sync queue accumulation (50 operations) and drainage -> Robust
  - 5-click kiosk emergency unlock sliding window timer reset (>3000ms) -> Robust
  - Screen Wake Lock re-acquisition on visibility change -> Robust
  - PWA bundle asset integrity and zero missing precache references in sw.js -> Robust
  - Multi-user draft isolation when editing the same form route -> VULNERABLE (Draft collision bug)
  - Offline create followed by offline update on same entity -> VULNERABLE (SyncQueue clobbering bug)
- **Vulnerabilities found**:
  - Draft collision on shared tablet when users switch while targeting same entity route
  - Partial update overwriting offline create in SyncQueue
  - Indefinite accumulation of unsubmitted drafts in IndexedDB
- **Untested angles**: Physical mobile device hardware sensors (e.g. physical biometric unlock).

## Loaded Skills
- None required directly at start

## Artifact Index
- DISPATCH.md — Dispatch instructions
- BRIEFING.md — Persistent working memory
- progress.md — Liveness heartbeat and step log
- handoff.md — Final challenge report
