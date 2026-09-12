# Task Assignment: Milestone M2 - System Admin Frontend (09-system-admin-frontend)

## Identity
- Role: System Admin Frontend Worker
- Type: teamwork_preview_worker
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/worker_m2
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md` (R2, AC1, AC2, AC4, AC5)
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md` (Features F6-F14, F21; Interface Contracts)
3. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md` (MSW endpoints, shared DTOs, CSRF client)

## File Ownership (Exclusively Owned)
- `apps/web/src/pages/admin/` (all files: `AdminLayout.tsx`, `UserManagementView.tsx`, `SystemSettingsView.tsx`, `SystemHealthView.tsx`, `FeatureFlagsView.tsx`, `RoleMatrixView.tsx`, etc.)
- `apps/web/src/pages/ForbiddenPage.tsx`
- `apps/web/src/hooks/useRequireRole.tsx`
- `apps/web/src/pages/SettingsPage.tsx`
- `apps/web/src/App.tsx`
- `apps/web/src/test/admin/` (all admin unit/integration test files)

## Objective & Detailed Requirements
1. **RBAC Guard & 403 Forbidden Page (`ForbiddenPage.tsx`, `useRequireRole.tsx`, `App.tsx` - Feature F13, AC4)**:
   - Create `ForbiddenPage.tsx`: "403 - 存取被拒絕", friendly explanatory message, button to return to `/dashboard`, log event.
   - Update `useRequireRole.tsx`: when an authenticated user attempts to access a protected route without required roles, redirect to `/403` with `state: { from: location.pathname }` (instead of silently redirecting to `/dashboard`).
   - Update `App.tsx`:
     - Add route `/403` rendering `<ForbiddenPage />`.
     - Add protected route `/admin/*` wrapped in `<PrivateRoute allowedRoles={['admin', 'sysadmin']}>` rendering `<AdminLayout />`.
     - Keep existing `/settings` but add a prominent banner/link "進入系統管理中心 (/admin)" visible for admin/sysadmin users.

2. **Admin Layout & Navigation (`AdminLayout.tsx`)**:
   - Dedicated admin navigation sidebar/tabs:
     - 使用者管理 (`/admin/users`)
     - 系統健康監控 (`/admin/health`)
     - 功能旗標管理 (`/admin/flags`)
     - 核心參數設定 (`/admin/settings`)
     - 角色權限矩陣 (`/admin/matrix`)
   - Breadcrumb navigation and user role badge (Admin / Sysadmin).

3. **User Management View (`UserManagementView.tsx` - Features F6, F7, F8, F21)**:
   - Paginated user list (20 per page): username, name, role badge, isLocalStaff badge, status (Active/Inactive), last login, actions.
   - Search bar and role/status filter.
   - "新增使用者" modal form: username, password, name, role (`caregiver`, `supervisor`, `admin`, `sysadmin`), isLocalStaff checkbox. Zod validation. Calls `POST /api/v1/users`.
   - Role change dropdown: calls `PATCH /api/v1/users/:id/role`. Optimistic update.
   - Status toggle (Active/Inactive): calls `PATCH /api/v1/users/:id/status`. Optimistic update.
   - Sysadmin protection: if API returns 400 (e.g. `CANNOT_REMOVE_LAST_SYSADMIN` or `CANNOT_DEACTIVATE_LAST_SYSADMIN`), display clear toast/alert.

4. **System Health View (`SystemHealthView.tsx` - Feature F9)**:
   - Health status badge: Healthy (Green), Degraded (Yellow), Unhealthy (Red).
   - Services status cards: API Server (status, latency ms), Database (status, latency ms), Service Worker (status, version), IndexedDB (status, estimated size).
   - Metrics cards: Memory usage (MB), CPU load percentage (progress bar), System Uptime.
   - "立即檢測" refresh button calling `GET /api/v1/system/health`.

5. **Feature Flags View (`FeatureFlagsView.tsx` - Feature F10)**:
   - List of feature flags (e.g. `offline_sync_v2`, `three_pipe_early_warning`, `bed_map_heat_overlay`, `night_shift_strict_check`).
   - Switch toggle for enabled/disabled state.
   - Slider / input for rollout percentage (0-100%).
   - Environment badge (`development`, `staging`, `production`, `all`).
   - Calls `PATCH /api/v1/system/feature-flags/:id` with toast confirmation.

6. **System Parameters Settings Form (`SystemSettingsView.tsx` - Feature F11)**:
   - Form fields:
     - 背景同步間隔 (秒): range 10-300.
     - 24hr 記錄鎖定時長 (小時): range 1-72.
     - 低庫存警示閾值 (預設 15): range 1-100.
     - PDF 字體設定 (Noto Sans TC, etc.).
   - Save button with confirmation toast and form validation.

7. **Role Permission Matrix View (`RoleMatrixView.tsx` - Feature F12)**:
   - Visual matrix table comparing 4 roles (`caregiver`, `supervisor`, `admin`, `sysadmin`) across modules (Residents, Care Records, Medications, Care Plans, Reports, Admin, Compliance).

8. **CSRF Simulation Testing Support (`AdminLayout.tsx` or Dev Settings - Feature F14, AC4)**:
   - Add a "模擬 CSRF 驗證失敗" switch toggle in Admin settings or header bar in development mode that sets `localStorage.setItem('SIMULATE_CSRF_ERROR', 'true' / 'false')`.
   - Verify that when toggled ON, any mutating API call receives 403 and triggers the security warning toast.

9. **Unit & Integration Tests (`apps/web/src/test/admin/*.test.tsx` - AC2, AC4)**:
   - Test non-admin redirect to `/403` when accessing `/admin`.
   - Test user CRUD, role editing, and last sysadmin protection.
   - Test system settings form validation and save.
   - Test feature flag toggling.
   - Test CSRF simulation toggle and 403 handling.
   - Verify `npm test --workspace=apps/web` passes 100%.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your implementation report to:
`/Users/ian.huang/aiProjects/LRP/.agents/worker_m2/handoff.md`
Notify the parent agent via `send_message` when complete.

## 2026-09-04T04:26:43Z
You are worker_m2 (System Admin Frontend Worker).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/worker_m2
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/worker_m2/DISPATCH.md and /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md.
Also read /Users/ian.huang/aiProjects/LRP/PROJECT.md and /Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md.
Implement Milestone M2 (AdminLayout, UserManagementView with CRUD and last sysadmin safety, SystemSettingsView, SystemHealthView, FeatureFlagsView, RoleMatrixView, ForbiddenPage 403, useRequireRole 403 redirect, App.tsx routes, and Vitest unit tests in apps/web/src/test/admin/).
Verify your code with typecheck and tests.
Write your completion report to /Users/ian.huang/aiProjects/LRP/.agents/worker_m2/handoff.md and notify parent via send_message.

