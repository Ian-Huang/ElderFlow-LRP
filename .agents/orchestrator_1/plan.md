# Project Plan: LRP Frontend Subsystems (R1, R2, R3)

## Objective
Implement and verify three frontend subsystems in the LRP MVP:
1. R1: Reports Frontend (08-reports-frontend) - Data visualization, export, filter, Ant Design & RTK Query.
2. R2: System Admin Frontend (09-system-admin-frontend) - User management, system health, feature flags, audit/logs, RBAC.
3. R3: PWA Polish (10-pwa-polish-frontend) - Offline caching, Web App Manifest, Service Worker, installability.
Complying with AC1 (functional completeness), AC2 (unit & e2e test coverage passing), AC3 (PWA compliance), AC4 (security RBAC & CSRF), and AC5 (performance).

## Phases

### Phase 0: Survey & Requirements Mining
- Spawn 3 parallel survey agents:
  - Explorer 1: Inspect repository architecture, package manager, workspace layout, existing frontend code, dependencies, router, and build/test configuration.
  - Explorer 2: Inspect existing backend/mock APIs, data models, RTK Query endpoints, auth/RBAC patterns, CSRF handling, and report/admin data schemas.
  - Spec Miner: Extract detailed acceptance requirements, test setups (Jest, RTL, Cypress), PWA criteria, and performance budgets from repo specs and ORIGINAL_REQUEST.md.
- Synthesize survey findings into `PROJECT.md` (Feature Inventory, Architecture, Interface Contracts, Milestones) and `TEST_INFRA.md`.

### Phase 1: Dual Track Decomposition & Setup
- Track A: Implementation Track
  - Milestone 1 (M1): R1 Reports Frontend (08-reports-frontend)
  - Milestone 2 (M2): R2 System Admin Frontend (09-system-admin-frontend)
  - Milestone 3 (M3): R3 PWA Polish (10-pwa-polish-frontend)
- Track B: E2E & Quality Assurance Track
  - Sub-orchestrator for test infrastructure, test cases (Tiers 1-4: Category-Partition, BVA, Pairwise, Real-world), and publishing `TEST_READY.md`.

### Phase 2: Milestone Execution
- For each milestone: Subagent iteration loop:
  - Explorer analysis
  - Worker implementation (clean, genuine code, no facade/hardcoding)
  - Reviewer verification (correctness, standards, completeness)
  - Challenger testing (adversarial cases, edge cases)
  - Forensic Auditor (integrity check, zero tolerance for hardcoded tests)
  - Gate validation (all pass required)

### Phase 3: Integration & E2E Acceptance
- Final milestone: Pass 100% of E2E test suite (Tiers 1-4).
- Phase 2 coverage hardening (Tier 5 white-box adversarial verification).
- Performance (Lighthouse >= 90, <2s load, virtualization/pagination) and Security (RBAC 403, CSRF simulation) audits.

### Phase 4: Final Synthesis & Human Reporting
- Generate project summary, audit reports, and final completion handoff.
