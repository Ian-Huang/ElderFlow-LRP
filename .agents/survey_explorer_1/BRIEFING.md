# BRIEFING — 2026-09-04T04:08:00Z

## Mission
Investigate codebase architecture, tooling, test setup, and existing code for 08-reports-frontend, 09-system-admin-frontend, and 10-pwa-polish-frontend in /Users/ian.huang/aiProjects/LRP.

## 🔒 My Identity
- Archetype: explorer
- Roles: Codebase Architecture Explorer
- Working directory: /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_1
- Original parent: 326e867b-d269-42e5-a25a-56351b725a5c
- Milestone: Preliminary Survey / Discovery Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Files for content delivery, Messages for coordination
- Self-contained 5-component handoff report to handoff.md

## Current Parent
- Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c
- Updated: not yet

## Investigation State
- **Explored paths**:
  - Root: `package.json`, `CLAUDE.md`, `CONTEXT.md`, `lrp-spec.md`
  - Workspace: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/playwright.config.ts`, `packages/shared/package.json`
  - Frontend source: `apps/web/src/App.tsx`, `main.tsx`, `pages/ReportsPage.tsx`, `pages/SettingsPage.tsx`, `components/UserSwitcher.tsx`, `components/Layout.tsx`, `utils/pwa.ts`, `utils/syncEngine.ts`, `utils/offlineDb.ts`, `mocks/handlers.ts`, `styles/index.css`
  - Tickets: `.scratch/lrp-mvp/issues/08-reports-frontend.md`, `09-system-admin-frontend.md`, `10-pwa-polish-frontend.md`, `00-TICKET-SUMMARY.md`
- **Key findings**:
  1. Monorepo with npm workspaces: `apps/web` (@lrp/web) and `packages/shared` (@lrp/shared).
  2. Tech Stack: React 18.3.0, Vite 5.2.11, React Router 6.23.0, TypeScript 5.4.5.
  3. UI Framework: Tailwind CSS 3.4.19 (NOT Ant Design). Recharts is planned in ticket 08 but not yet installed.
  4. State/Data fetching: TanStack Query 5.28 + Axios + Zustand 4.5.2 + Dexie 4.4.5 (NOT RTK Query).
  5. Test runner: Vitest 1.6 + RTL + jsdom for unit/integration tests (NOT Jest). Playwright 1.62.1 for E2E (NOT Cypress).
  6. Module 08 (Reports): Currently only has an 87-line static stub page. Missing all subroutes, Recharts, PDF export, MSW handlers.
  7. Module 09 (Admin): SettingsPage has hardcoded users and system info. Missing dedicated `/admin` route, user CRUD modal/table, system settings form, permission matrix, MSW handlers.
  8. Module 10 (PWA): VitePWA manifest and basic SW exist. Missing install prompt (`beforeinstallprompt`), offline readiness badge, URL `?kiosk=1` lock, screen wake lock, draft retention across user switch, SW update toast, periodic cache cleanup.
- **Unexplored areas**: None within the scope of architecture and module status survey.

## Key Decisions Made
- Reconciled prompt wording vs codebase reality: Prompt mentioned "如 Ant Design", "RTK Query", "Jest", "Cypress" as examples, but codebase standard is strictly Tailwind CSS, TanStack Query, Vitest, and Playwright. The implementation must align with the actual codebase stack to avoid introducing breaking architectural divergences.

## Artifact Index
- /Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_1/handoff.md — Comprehensive survey report
