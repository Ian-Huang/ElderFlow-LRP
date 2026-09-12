# BRIEFING — 2026-09-04T04:03:45Z

## Mission
Survey Redux/RTK Query setup, API endpoints/mocks, auth/RBAC handling, CSRF tokens, and data models for reports and system admin in LRP.

## 🔒 My Identity
- Archetype: explorer
- Roles: API & State Explorer
- Working directory: /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2
- Original parent: 326e867b-d269-42e5-a25a-56351b725a5c
- Milestone: Survey & Architecture Discovery

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Write only to /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2
- Follow 5-component handoff protocol
- Notify parent via send_message when complete

## Current Parent
- Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c
- Updated: not yet

## Investigation State
- **Explored paths**:
  - Root: `package.json`, `CONTEXT.md`, `lrp-spec.md`
  - Web: `apps/web/package.json`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/api/apiClient.ts`
  - Stores & Utils: `apps/web/src/stores/authStore.ts`, `apps/web/src/utils/authDb.ts`, `apps/web/src/utils/roles.ts`, `apps/web/src/hooks/useRequireRole.tsx`
  - Mocks: `apps/web/src/mocks/browser.ts`, `apps/web/src/mocks/handlers.ts`, `seedData`
  - Shared: `packages/shared/src/index.ts`
  - Tickets: `.scratch/lrp-mvp/issues/00-TICKET-SUMMARY.md`, `08-reports-frontend.md`, `09-system-admin-frontend.md`, `17-reports-backend.md`
- **Key findings**:
  1. No Redux or RTK Query exists in codebase. Standard is TanStack Query 5.28 + Zustand 4.5 + Axios + Dexie 4.4.
  2. MSW handlers currently lack all specific reports endpoints (`/reports/daily-completion`, `/resident-summary`, `/alerts`, `/audit-trail`, `/pdf`) and admin endpoints (`/users`, `/users/:id/role`, `/system/settings`).
  3. RBAC checks exist via `useRequireRole` and `ROLE_HIERARCHY`, but unauthorized redirects default to `/dashboard` instead of `/403`, no `/admin` route exists, and no 403 page exists.
  4. CSRF protection is completely absent from `apiClient.ts` and `handlers.ts`; token attachment, verification, and simulated failure must be implemented to fulfill AC4.
  5. Detailed DTO schemas for Reports and System Admin must be added to `@lrp/shared`.
- **Unexplored areas**: None. Comprehensive survey completed.

## Key Decisions Made
- Reconciled prompt vs reality: Advise sticking with TanStack Query + Zustand + Axios to preserve consistency with existing completed modules (02, 04, 05, 06, 07).
- Auth/RBAC design: Create dedicated `/403` route and page; configure `PrivateRoute` for `/admin/*` to redirect unauthorized users to `/403`.
- CSRF design: Add `X-CSRF-Token` header to `apiClient.ts`, add verification in MSW, and provide dev error simulation toggle.

## Artifact Index
- /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2/DISPATCH.md — Task assignment
- /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2/BRIEFING.md — Persistent memory & briefing
- /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2/progress.md — Progress and liveness tracker
- /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2/handoff.md — Final survey report
