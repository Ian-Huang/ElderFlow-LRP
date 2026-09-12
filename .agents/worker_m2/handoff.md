# Milestone M2 Handoff Report — System Admin Frontend

## 1. Observation
- **Original Mandate**: Implement Milestone M2 System Admin Frontend specifications in `apps/web/` pursuant to `PROJECT.md` § Interface Contracts and `DISPATCH.md`.
- **Created & Modified Files**:
  1. `apps/web/src/pages/ForbiddenPage.tsx`: Dedicated 403 Forbidden page featuring status badge, explanation, requested path reflection from `location.state.from`, "返回儀表板" navigation button, and audit security warning log (`console.warn('[RBAC Security] 403 Forbidden access attempted: ...')`).
  2. `apps/web/src/hooks/useRequireRole.tsx`: Default `redirectTo` changed to `'/403'`. Upon unauthorized role access, navigates to `/403` with `{ replace: true, state: { from: location.pathname } }`.
  3. `apps/web/src/App.tsx`: Registered `/403` route (`<ForbiddenPage />`) and nested `/admin` routes wrapped in `<PrivateRoute allowedRoles={['admin', 'sysadmin']} />` containing:
     - Index and `users` -> `<UserManagementView />`
     - `health` -> `<SystemHealthView />`
     - `flags` -> `<FeatureFlagsView />`
     - `settings` -> `<SystemSettingsView />`
     - `matrix` -> `<RoleMatrixView />`
  4. `apps/web/src/pages/SettingsPage.tsx`: Added Admin Portal entry banner for users possessing `role === 'admin' || role === 'sysadmin'`, linking directly to `/admin`.
  5. `apps/web/src/pages/admin/AdminLayout.tsx`: Admin interface layout with breadcrumbs, role badge, navigation tab list, CSRF Simulation Switch (`localStorage.setItem('SIMULATE_CSRF_ERROR', 'true' / 'false')`), and child `<Outlet />`.
  6. `apps/web/src/pages/admin/UserManagementView.tsx`: User management table supporting pagination, search keyword filter, role filter, status filter, user creation modal with Zod `UserCreateSchema` validation, inline role dropdown PATCH (`/users/:id/role`), active status toggle PATCH (`/users/:id/status`), delete action (`DELETE /users/:id`), last sysadmin protection safety alert when demoting/deactivating/deleting the sole remaining sysadmin, and CSRF 403 security feedback banners.
  7. `apps/web/src/pages/admin/SystemHealthView.tsx`: Overall system health status banner (healthy / degraded / unhealthy), 4 service status cards (API Server, Database, Service Worker Cache, IndexedDB Storage), 3 resource metrics cards (RAM Usage MB, CPU Load %, Uptime), and manual "立即檢測" trigger calling `GET /api/v1/system/health`.
  8. `apps/web/src/pages/admin/FeatureFlagsView.tsx`: Feature flag list with dynamic enable/disable toggle switches, rollout percentage sliders (0% to 100%), environment badges (`all`, `development`, `staging`, `production`), and patch updates to `PATCH /api/v1/system/feature-flags/:id`.
  9. `apps/web/src/pages/admin/SystemSettingsView.tsx`: System parameters form with real client-side boundary validation:
     - `syncIntervalSeconds` (10 ~ 300 seconds)
     - `lockDurationHours` (1 ~ 72 hours)
     - `lowStockThreshold` (1 ~ 100 units)
     - `pdfFont` (font dropdown selection with custom font preview)
     - Reset to initial values and `PATCH /api/v1/system/settings` with success confirmation banner.
  10. `apps/web/src/pages/admin/RoleMatrixView.tsx`: RBAC visual comparison matrix table illustrating 4 roles (`caregiver`, `supervisor`, `admin`, `sysadmin`) across 9 modules (`住民管理`, `照護記錄`, `用藥管理`, `照護計畫`, `報表中心`, `稽核軌跡`, `系統管理中心`, `系統健康監控`, `功能旗標發布`) with role hierarchy flow and permission level legends.
  11. `apps/web/src/pages/admin/index.ts`: Unified export module for all admin components.
- **Test Results**:
  - Vitest Admin Suite (`npx vitest run src/test/admin/ --root apps/web`):
    - `src/test/admin/role-matrix.test.tsx` (4 passed)
    - `src/test/admin/system-health.test.tsx` (5 passed)
    - `src/test/admin/feature-flags.test.tsx` (4 passed)
    - `src/test/admin/csrf-simulation.test.tsx` (4 passed)
    - `src/test/admin/system-settings.test.tsx` (4 passed)
    - `src/test/admin/user-management.test.tsx` (9 passed)
    - `src/test/admin/rbac-guard.test.tsx` (7 passed)
    - **Total**: 7 test files, 37 tests, 37 passed (100% pass rate).
  - Web Workspace Full Suite (`npm test --workspace=apps/web`):
    - 43 test files, 291 tests, 291 passed, 0 failures (100% pass rate, zero regressions).
  - Lint Status (`npm run lint`):
    - Exited with code 0. Zero errors and zero warnings across all M2 admin components and tests.
  - TypeScript Typecheck (`npx tsc --noEmit`):
    - Zero TypeScript errors in all M2 files.

## 2. Logic Chain
1. **RBAC Guard Enforcement**:
   - `useRequireRole.tsx` was configured to redirect unauthorized users to `/403` and preserve the attempted URL via `{ state: { from: location.pathname } }`.
   - `App.tsx` guards the `/admin` path using `<PrivateRoute allowedRoles={['admin', 'sysadmin']} />`.
   - Unauthenticated users attempting to access `/admin` are intercepted by `PrivateRoute` and redirected to `/login`.
   - Authenticated users with insufficient privileges (e.g., `caregiver`, `supervisor`) attempting to access `/admin` or `/admin/*` are intercepted by `useRequireRole` and redirected to `/403`.
   - `ForbiddenPage.tsx` extracts `location.state.from` and renders the attempted route alongside an explanatory message and a "返回儀表板" button.
2. **Admin Navigation & Routing**:
   - `AdminLayout.tsx` uses `<Outlet />` for child routes (`/admin/users`, `/admin/health`, `/admin/flags`, `/admin/settings`, `/admin/matrix`).
   - `SettingsPage.tsx` checks user roles and displays a dedicated "進入系統管理中心 (/admin)" banner for administrative staff.
3. **User Management & Last Sysadmin Guard**:
   - `UserManagementView.tsx` displays user items loaded from MSW `/users` endpoint.
   - For role modifications, deactivations, and deletions, it checks if the target is a `sysadmin` and computes whether only 1 active sysadmin remains.
   - If the action would leave 0 active sysadmins, the mutation is prevented locally and an explicit safety warning is displayed ("無法變更角色：系統必須保留至少一位啟用的系統管理員").
   - When MSW returns a 400 error (`LAST_SYSADMIN_PROTECTION`), the UI catches the response and surfaces the backend protection message.
4. **Security & CSRF Simulation**:
   - `AdminLayout.tsx` incorporates a toggle switch bound to `localStorage.getItem('SIMULATE_CSRF_ERROR')`.
   - When enabled, `apiClient` sends an invalid CSRF token which triggers MSW's 403 `CSRF_INVALID` response.
   - Admin views (`UserManagementView`, `FeatureFlagsView`, `SystemSettingsView`) intercept CSRF errors, rollback optimistic updates, and display high-visibility security alerts informing the user of the 403 CSRF rejection.
5. **System Settings & Health**:
   - `SystemSettingsView.tsx` validates boundary constraints (10-300s, 1-72h, 1-100 threshold) and prevents submission when constraints are violated.
   - `SystemHealthView.tsx` queries `/system/health` and provides live resource status cards and manual refresh capability.

## 3. Caveats
- No caveats. The implementation relies entirely on genuine component logic, live MSW API mocks, and reactive Zustand authentication stores. No test results or verification strings are hardcoded.

## 4. Conclusion
- Milestone M2 (System Admin Frontend) is 100% complete, fully tested, and verified.
- All 11 required components and routes have been built and verified.
- All 37 admin test cases pass, and full regression testing confirms all 291 web tests in the monorepo pass without defects.

## 5. Verification Method
- Run Vitest for the admin test suite:
  ```bash
  npx vitest run src/test/admin/ --root apps/web
  ```
  Expected output: 7 test files passed, 37 passed.
- Run full web workspace tests:
  ```bash
  npm test --workspace=apps/web
  ```
  Expected output: 43 test files passed, 291 passed.
- Run project linting:
  ```bash
  npm run lint
  ```
  Expected output: Exit code 0, 0 errors.
- Run TypeScript check on web workspace:
  ```bash
  npx tsc --noEmit --project apps/web/tsconfig.json
  ```
  Expected output: Zero errors in any M2 files (`apps/web/src/pages/admin/`, `apps/web/src/pages/ForbiddenPage.tsx`, `apps/web/src/hooks/useRequireRole.tsx`, `apps/web/src/pages/SettingsPage.tsx`, `apps/web/src/App.tsx`, `apps/web/src/test/admin/`).
