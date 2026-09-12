# Milestone M0 Handoff Report: Shared Foundation & Mocks

**Agent Role**: Shared Foundation & Mocks Worker (`worker_m0`)  
**Working Directory**: `/Users/ian.huang/aiProjects/LRP/.agents/worker_m0`  
**Parent Conversation ID**: `326e867b-d269-42e5-a25a-56351b725a5c`  
**Date**: 2026-09-04T04:20:00Z  

---

## 1. Observation

### 1.1 Pre-existing Codebase Deficiencies
1. **Shared DTOs & Schemas (`packages/shared/src/index.ts`)**:
   - `packages/shared/src/index.ts:353-363` defined `User` without `isActive` or `status` flags:
     ```ts
     export interface User {
       userId: string;
       username: string;
       name: string;
       role: UserRole;
       isLocalStaff: boolean;
       avatarUrl?: string;
       lastLoginAt?: string;
       createdAt: string;
     }
     ```
   - Prior to Milestone M0, `packages/shared/src/index.ts` lacked DTO interfaces and Zod schemas for `DailyCompletionReport`, `ResidentSummaryReport`, `AlertReportItem`, `PdfExportRequest`, `UserCreateInput`, `UserUpdateRoleInput`, `UserUpdateStatusInput`, `SystemSettings`, `SystemHealthReport`, and `FeatureFlag`.
2. **CSRF Protection in Axios Client (`apps/web/src/api/apiClient.ts`)**:
   - `apps/web/src/api/apiClient.ts:34-43` only injected Bearer authentication tokens:
     ```ts
     this.client.interceptors.request.use(
       (config: InternalAxiosRequestConfig) => {
         const accessToken = this.getAccessToken();
         if (accessToken && config.headers) {
           config.headers.Authorization = `Bearer ${accessToken}`;
         }
         return config;
       },
       (error) => Promise.reject(error)
     );
     ```
   - No `X-CSRF-Token` header was attached, no simulation flag (`SIMULATE_CSRF_ERROR`) was checked, and 403 `CSRF_INVALID` errors were not handled.
3. **MSW Mock Handlers (`apps/web/src/mocks/handlers.ts`)**:
   - `apps/web/src/mocks/handlers.ts:1419-1448` provided only basic stubs for generic `/reports` and `/reports/generate`.
   - The codebase was missing mock endpoints for:
     - `GET /api/v1/reports/daily-completion`
     - `GET /api/v1/reports/resident-summary`
     - `GET /api/v1/reports/alerts`
     - `GET /api/v1/reports/audit-trail`
     - `POST /api/v1/reports/pdf`
     - `GET /api/v1/users`
     - `POST /api/v1/users`
     - `PATCH /api/v1/users/:id/role`
     - `PATCH /api/v1/users/:id/status`
     - `DELETE /api/v1/users/:id`
     - `GET /api/v1/system/settings`
     - `PATCH /api/v1/system/settings`
     - `GET /api/v1/system/health`
     - `GET /api/v1/system/feature-flags`
     - `PATCH /api/v1/system/feature-flags/:id`
   - No CSRF validation middleware was active on mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`).
4. **Dependencies (`apps/web/package.json`)**:
   - `recharts` was missing from `apps/web/package.json:20-30`.

### 1.2 Implemented Changes & Verified Outputs
1. **`packages/shared/src/index.ts`**:
   - Added `isActive?: boolean` and `status?: 'active' | 'inactive'` to `User` interface.
   - Added interfaces:
     - `DailyCompletionReport`
     - `ResidentSummaryReport`
     - `AlertReportItem`
     - `PdfExportRequest`
     - `UserCreateInput`, `UserUpdateRoleInput`, `UserUpdateStatusInput`
     - `SystemSettings`
     - `SystemHealthReport`
     - `FeatureFlag`
   - Added Zod schemas:
     - `DailyCompletionReportSchema`
     - `ResidentSummaryReportSchema`
     - `AlertReportItemSchema`
     - `PdfExportRequestSchema`
     - `UserRoleSchema`, `UserCreateSchema`, `UserUpdateRoleSchema`, `UserUpdateStatusSchema`
     - `SystemSettingsSchema`
     - `SystemHealthReportSchema`
     - `FeatureFlagSchema`
2. **`packages/shared/src/index.test.ts`**:
   - Added 12 unit tests validating all newly created Zod schemas against valid payloads and edge cases (negative values, out-of-range thresholds, invalid dates, missing required fields).
   - Execution result: `npm test --workspace=packages/shared` -> 22 passed (100%).
3. **`apps/web/package.json`**:
   - Added `"recharts": "^2.12.0"`.
   - Ran `npm install --workspace=apps/web`. Recharts 2.15.4 installed and verified (`Recharts loaded: object`).
4. **`apps/web/src/api/apiClient.ts`**:
   - Implemented CSRF token extraction (`getCookie`, `sessionStorage`, fallback UUID generation).
   - Implemented `getCsrfToken()`, `setCsrfToken(token)`, `clearCsrfToken()`, and `setSimulateCsrfError(simulate)`.
   - Request interceptor automatically attaches `X-CSRF-Token: <token>` to requests.
   - If `localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true'`, attaches `X-Simulate-CSRF-Error: 'true'`.
   - Response interceptor catches HTTP 403 `CSRF_INVALID`, clears cached CSRF token, and normalizes the error.
5. **`apps/web/src/mocks/handlers.ts`**:
   - Added `validateCsrf(request)` helper verifying `X-CSRF-Token` and `X-Simulate-CSRF-Error: true`.
   - Added top-level `http.all('/api/v1/*', ...)` middleware intercepting mutating calls.
   - Added defense-in-depth `validateCsrf(request)` checks within all mutating endpoints.
   - Added `mockAuditEntries` (10 seeded audit entries across entities, users, and dates).
   - Added `mockAlerts` (5 red and yellow alert items covering abnormal vitals, medication errors, falls, and missed care).
   - Added `mockSystemSettings`, `mockSystemHealth`, and `mockFeatureFlags`.
   - Implemented all 15 endpoints with realistic data generation, query parameter parsing, pagination, and sysadmin protections:
     - `PATCH /api/v1/users/:id/role`: prevents demoting the last sysadmin.
     - `PATCH /api/v1/users/:id/status`: prevents deactivating the last sysadmin.
     - `DELETE /api/v1/users/:id`: prevents removing the last sysadmin.
     - `POST /api/v1/users`: rejects duplicate usernames with 400 `DUPLICATE_USERNAME`.
     - `POST /api/v1/reports/pdf`: returns application/pdf mock binary stream.
6. **`apps/web/src/test/m0-foundation.test.ts`**:
   - Added 15 comprehensive unit & integration tests covering CSRF token lifecycle, error simulation, MSW endpoints, schema conformance, and sysadmin safety guards.

---

## 2. Logic Chain

1. **Schema & Model Consistency**:
   - *Observation 1.1*: Downstream milestones M1 (Reports) and M2 (Admin) depend on typed contracts for state management, TanStack Query hooks, forms, and MSW responses.
   - *Logic*: Defining TypeScript interfaces alongside runtime Zod schemas in `packages/shared` establishes a single source of truth that is shared without duplication across client components, repositories, and mock handlers.
2. **AC4 Security Compliance (CSRF & Error Simulation)**:
   - *Observation 1.1 (Item 2) & AC4 requirement*: "所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。"
   - *Logic*: By injecting `X-CSRF-Token` in `apiClient.ts` request interceptor and verifying it in MSW for all mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`), every mutating operation is secured. By inspecting `localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true'` and conditionally appending `X-Simulate-CSRF-Error: true`, developers and automated test suites can deterministically simulate 403 CSRF verification failures without modifying source code.
3. **Safety Guards in User Administration**:
   - *Observation 1.1 (Item 3)*: Issue `09-system-admin-frontend.md` and `PROJECT.md` require protecting the last active sysadmin from accidental removal or deactivation.
   - *Logic*: Checking active sysadmin count in role update, status update, and deletion handlers prevents administrative lockout and enforces business rule compliance in both development and testing.
4. **Tooling & Dependency Alignment**:
   - *Observation 1.1 (Item 4)*: Issue `08-reports-frontend.md` specifies Recharts for visualizations, but `apps/web/package.json` lacked the dependency.
   - *Logic*: Installing `recharts: ^2.12.0` in M0 unblocks M1 worker to immediately implement chart components (`DailyCompletionView`, `ResidentSummaryView`) without dependency resolution delays.

---

## 3. Caveats

1. **Cookie vs. Local Session CSRF Token**:
   - In browser development with MSW Service Worker, HttpOnly cookies cannot be set by client-side JavaScript. `apiClient.ts` therefore falls back to in-memory/session storage tokens if the cookie `csrf_token` is not present, ensuring full functionality in both mock and real backend environments.
2. **PDF Export Mock Content**:
   - `POST /api/v1/reports/pdf` returns a lightweight mock PDF binary header (`%PDF-1.4`) with `Content-Type: application/pdf` and `Content-Disposition` header. Full graphical PDF compilation is deferred to server-side PDF engines in production.

---

## 4. Conclusion

Milestone M0 (Shared Foundation & Mocks) is 100% complete and fully verified:
1. **Shared Contracts**: All DTOs and Zod schemas specified in `PROJECT.md § Interface Contracts` are implemented and validated in `packages/shared/src/index.ts`.
2. **CSRF Interceptor**: `apps/web/src/api/apiClient.ts` automatically injects `X-CSRF-Token`, supports development error simulation (`X-Simulate-CSRF-Error`), and recovers from 403 `CSRF_INVALID`.
3. **MSW Mock Layer**: All 15 endpoints for Reports, User CRUD, System Settings, Health, Feature Flags, and CSRF validation are operational in `apps/web/src/mocks/handlers.ts` with rich seed data.
4. **Recharts Dependency**: Installed and operational in `apps/web/package.json`.
5. **Quality Gate**: Monorepo typecheck, lint, and all 154 unit/integration tests pass with 0 errors.

---

## 5. Verification Method

To independently reproduce and verify Milestone M0 deliverables, run the following commands from the repository root:

1. **Verify TypeScript Typecheck across Monorepo**:
   ```bash
   npm run typecheck
   ```
   *Expected Output*: `@lrp/web` and `@lrp/shared` compile with 0 errors.

2. **Verify Shared Package Schemas & Unit Tests**:
   ```bash
   npm test --workspace=packages/shared
   ```
   *Expected Output*: 1 test file, 22 tests passed.

3. **Verify Web Unit & Integration Tests (including M0 Foundation Suite)**:
   ```bash
   npx vitest run src/test/m0-foundation.test.ts --root apps/web
   npm test --workspace=apps/web
   ```
   *Expected Output*: 23 test files, 132 tests passed (including 15 in `m0-foundation.test.ts`).

4. **Verify ESLint Compliance**:
   ```bash
   npm run lint
   ```
   *Expected Output*: 0 errors.

5. **Verify Monorepo Production Build**:
   ```bash
   npm run build
   ```
   *Expected Output*: Vite production build and PWA Service Worker generation complete successfully.
