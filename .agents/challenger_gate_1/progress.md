# Progress Log - challenger_gate_1

- **Last visited**: 2026-09-04T10:15:20Z
- **Current Step**: Running Playwright E2E suite and evaluating empirical findings
- **Status**:
  1. Implemented empirical adversarial challenge suite in `apps/web/src/test/adversarial-gate1.test.tsx` (32 tests, all passing).
  2. Verified Challenge 1.1: RBAC protection on all deep-links (`/admin/users`, `/admin/settings`, `/admin/health`, `/admin/flags`, `/admin/matrix`, arbitrary 404 subpath) properly redirects unauthenticated to `/login` and caregiver/supervisor to `/403`.
  3. Verified Challenge 1.2: Sysadmin lockout guards strictly prevent demoting, deactivating, and deleting the last active sysadmin with HTTP 400 (`CANNOT_DEMOTE_LAST_SYSADMIN`, `CANNOT_DEACTIVATE_LAST_SYSADMIN`, `CANNOT_REMOVE_LAST_SYSADMIN`).
  4. Verified Challenge 1.3: Mutating state with CSRF simulation enabled strictly rejects with HTTP 403 `CSRF_INVALID`, and safe GET requests remain unaffected.
  5. Uncovered Challenge 2.1 Bug/Edge Cases:
     - RangeError uncaught exception when date is cleared (`new Date("").toISOString()` throws in `DailyCompletionView.tsx`).
     - ROC 115 date format (`115/09/04`) is not parsed/adapted by `DailyCompletionView`, getting rejected by `<input type="date">` and misparsed by standard JS Date as year 115 AD.
     - Potential timezone off-by-one risk when manipulating UTC date strings with local `d.getDate()` / `d.setDate()`.
  6. Verified Challenge 2.2: AlertsView handles empty alert queries gracefully with no crash. Rapid tab switching operates stably.
  7. Background Playwright E2E test launched for `e2e/admin-rbac.spec.ts`.
