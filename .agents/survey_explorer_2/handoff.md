# Handoff Report: API & State Architecture Survey

**Explorer**: survey_explorer_2 (API & State Explorer)  
**Target Subsystems**: R1 (08-reports-frontend), R2 (09-system-admin-frontend), Security/RBAC/CSRF (AC4)  
**Date**: 2026-09-04T04:10:00Z  

---

## 1. Observation

### 1.1 Redux & RTK Query vs. Actual Codebase State Management
- **Grep for Redux / RTK**:
  - Command: `grep -i "redux" -r .`
  - Output: Found matches ONLY in `.agents/survey_explorer_2` files (DISPATCH.md, BRIEFING.md, progress.md). Zero matches in application code.
  - Command: `grep -i "rtk" -r .`
  - Output: Matches found only in `ORIGINAL_REQUEST.md:19` (`- 使用現有的 UI 框架（如 Ant Design）與資料抓取層（RTK Query）`), `.agents/orchestrator_1/DISPATCH.md`, and `package-lock.json` hash substrings.
- **Root and Web package.json Dependencies**:
  - `/Users/ian.huang/aiProjects/LRP/apps/web/package.json` (lines 16–29):
    ```json
    "dependencies": {
      "@hookform/resolvers": "^5.9.1",
      "@lrp/shared": "*",
      "@tanstack/react-query": "^5.28.0",
      "@tanstack/react-query-devtools": "^5.101.4",
      "axios": "^1.6.8",
      "dexie": "^4.4.5",
      "react": "^18.3.0",
      "react-dom": "^18.3.0",
      "react-hook-form": "^7.85.0",
      "react-router-dom": "^6.23.0",
      "zod": "^3.25.76",
      "zustand": "^4.5.2"
    }
    ```
  - `/Users/ian.huang/aiProjects/LRP/apps/web/src/main.tsx` (lines 11–20, 33–42):
    ```tsx
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5,
          gcTime: 1000 * 60 * 60 * 24,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
    // ...
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
    ```
  - State management in `apps/web/src/stores/`:
    - `authStore.ts`: `create<AuthState>()((set, get) => ...)` (Zustand)
    - `syncStore.ts`: Zustand store for offline sync and conflicts
    - `uiStore.ts`: Zustand store for sidebar, theme, and kiosk mode
  - Domain Data Fetching / Repository Pattern in `apps/web/src/repositories/baseRepository.ts` & `residentRepository.ts`:
    - Uses `apiClient` (Axios) + Dexie.js (`offlineDb`) + TanStack Query hooks (`useResidents`, `useCareRecords`, `useMedications`, `useCarePlans`).

### 1.2 Existing Mock Server (MSW) & Endpoints
- **MSW Registration & Activation**:
  - `apps/web/src/main.tsx` (lines 23–31):
    ```tsx
    if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API !== 'false') {
      const { worker } = await import('./mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js',
        },
      });
    }
    ```
  - `apps/web/src/mocks/browser.ts`: `export const worker = setupWorker(...handlers);`
- **Existing Endpoints in `apps/web/src/mocks/handlers.ts`**:
  - **Auth**:
    - `POST /api/v1/auth/login` (lines 189–221): Validates credentials against `mockUsers`, returns `tokens` (`accessToken`, `refreshToken`), `user`, and `switchableUsers`.
    - `POST /api/v1/auth/refresh` (lines 223–234): Generates new `accessToken`.
    - `POST /api/v1/auth/logout` (lines 236–239): Returns `{ success: true }`.
    - `GET /api/v1/users/me` (lines 241–251): Validates Bearer token, returns `mockUsers[0]`.
    - `GET /api/v1/users/switchable` (lines 253–256): Returns `mockSwitchableUsers`.
    - `POST /api/v1/auth/switch` (lines 258–294): Validates `targetUserId`, returns new tokens and reordered list.
  - **Residents**:
    - `GET /api/v1/residents` (lines 297–362): Supports pagination (`page`, `pageSize`), keyword search (`name`, `insuranceId`, `bedNumber`), filters (`status`, `hasThreePipe`, `identityType`, `dependencyLevel`).
    - `GET /api/v1/residents/:id` (lines 364–374)
    - `POST /api/v1/residents` (lines 376–445): Validates 26 resident capacity limit, duplicate insuranceId, Bed collision.
    - `PATCH /api/v1/residents/:id` (lines 447–494), `PUT /api/v1/residents/:id` (lines 496–521), `DELETE /api/v1/residents/:id` (lines 523–549)
    - `POST /api/v1/residents/import` (lines 551–661): CSV/JSON batch import.
  - **Care Records**:
    - `GET /api/v1/care-records`, `GET /api/v1/care-records/:id`, `POST /api/v1/care-records`, `PATCH /api/v1/care-records/:id`, `POST /api/v1/care-records/:id/status`, `POST /api/v1/care-records/:id/supplement`, `POST /api/v1/care-records/sync` (lines 663–861).
  - **Medications**:
    - `GET /api/v1/medications/alerts/low-stock` (lines 863–892): Threshold <= 15.
    - `GET /api/v1/medications`, `GET /api/v1/medications/:id`, `POST /api/v1/medications`, `PATCH /api/v1/medications/:id`, `PUT /api/v1/medications/:id`, `DELETE /api/v1/medications/:id`, `POST /api/v1/medications/:id/administer`, `POST /api/v1/medications/sync` (lines 894–1218).
  - **Care Plans**:
    - `GET /api/v1/care-plans`, `GET /api/v1/care-plans/:id`, `POST /api/v1/care-plans`, `PATCH /api/v1/care-plans/:id`, `PUT /api/v1/care-plans/:id`, `POST /api/v1/care-plans/:id/status` (lines 1220–1416).
  - **Reports (Stub only)**:
    - `GET /api/v1/reports` (lines 1419–1432): Generic report list, filtered by `type`.
    - `POST /api/v1/reports/generate` (lines 1434–1448): Returns a dummy report object.
  - **Compliance & Sync**:
    - `GET /api/v1/compliance/checks`, `POST /api/v1/compliance/check`, `POST /api/v1/sync`, `GET /api/v1/sync/conflicts`, `POST /api/v1/sync/conflicts/:id/resolve` (lines 1451–1596).
  - **Health**:
    - `GET /api/v1/health` (lines 1598–1600): Returns `{ status: 'ok', timestamp: ... }`.
- **Missing Mock Endpoints**:
  - Reports:
    - `GET /api/v1/reports/daily-completion`
    - `GET /api/v1/reports/resident-summary`
    - `GET /api/v1/reports/alerts`
    - `GET /api/v1/reports/audit-trail`
    - `POST /api/v1/reports/pdf`
  - System Admin:
    - `GET /api/v1/users` (paginated, role/search filter)
    - `POST /api/v1/users` (create user)
    - `PATCH /api/v1/users/:id/role`
    - `PATCH /api/v1/users/:id/status`
    - `DELETE /api/v1/users/:id`
    - `GET /api/v1/system/settings`
    - `PATCH /api/v1/system/settings`
    - `GET /api/v1/system/health` (detailed services and metrics)
    - `GET /api/v1/system/feature-flags`
    - `PATCH /api/v1/system/feature-flags/:id`

### 1.3 Auth & RBAC Handling
- **Roles Defined**:
  - `packages/shared/src/index.ts:351`: `export type UserRole = 'caregiver' | 'supervisor' | 'admin' | 'sysadmin';`
  - `apps/web/src/utils/roles.ts:33–38`:
    ```ts
    export const ROLE_HIERARCHY: Record<UserRole, number> = {
      caregiver: 1,
      supervisor: 2,
      admin: 3,
      sysadmin: 4,
    };
    ```
- **Storage & State**:
  - `apps/web/src/stores/authStore.ts`:
    - `user: User | null`, `accessToken: string | null`, `refreshToken: string | null`, `userRole: UserRole | null`, `isAuthenticated: boolean`.
    - Persisted via Dexie table `authData` in `LRPAuthDB` (`apps/web/src/utils/authDb.ts`).
    - Cross-tab sync via `window.addEventListener('storage')`.
- **Routing & Guarding Behavior**:
  - `apps/web/src/App.tsx:25–41`:
    ```tsx
    function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
      const { isAllowed, isLoading } = useRequireRole(allowedRoles || ['caregiver', 'supervisor', 'admin', 'sysadmin']);
      // ...
      if (!isAllowed) return null;
      return <>{children}</>;
    }
    ```
  - `apps/web/src/hooks/useRequireRole.tsx:26–28`:
    ```tsx
    if (userRole && !hasRole(allowedRoles)) {
      navigate(redirectTo, { replace: true });
    }
    ```
    Where default `redirectTo = '/dashboard'`.
  - **Critical Deficiency**:
    - There is NO `/admin` route or `/admin/*` route in `App.tsx`.
    - There is NO 403 route (`/403`) and NO `ForbiddenPage` component in `apps/web/src/pages/`.
    - Unauthorized users are silently redirected to `/dashboard`, violating AC4 ("非 admin 用戶訪問 `/admin/*` 會被導向 403/登入頁").

### 1.4 CSRF Protection
- **Grep for CSRF**:
  - Zero matches across `apps/web/src/` or `packages/shared/src/`.
- **`apps/web/src/api/apiClient.ts`**:
  - Lines 34–43: Request interceptor only attaches `Authorization: Bearer ${accessToken}`.
  - No `X-CSRF-Token` header, no cookie extraction, no CSRF token refresh or verification mechanism.
- **`apps/web/src/mocks/handlers.ts`**:
  - No CSRF token checking on mutating requests (POST / PUT / PATCH / DELETE).
  - No mechanism to simulate CSRF verification failure.

### 1.5 Data Models & Schemas
- **Existing in `packages/shared/src/index.ts`**:
  - `Resident` (lines 26–54), `CareRecord` (lines 116–134), `Medication` (lines 178–198), `CarePlan` (lines 270–284), `AuditEntry` (lines 302–315), `User` (lines 353–363), `Report` (lines 382–391), `ApiResponse<T>` (lines 415–423), `PaginatedResponse<T>` (lines 431–437).
- **Missing Models in `packages/shared`**:
  - Reports:
    - Detailed breakdown structures for `DailyCompletionReport`, `ResidentSummaryReport`, `AlertItem`, `PdfExportRequest`.
  - System Admin:
    - `UserCreateInput`, `UserUpdateRoleInput`, `UserUpdateStatusInput`, `SystemSettings`, `SystemHealthReport`, `FeatureFlag`.
    - `User` interface is currently missing `isActive: boolean`.

---

## 2. Logic Chain

1. **State Management & Querying**:
   - *Observation 1.1*: `package.json` contains `@tanstack/react-query: ^5.28.0`, `zustand: ^4.5.2`, `axios: ^1.6.8`, `dexie: ^4.4.5`. All existing domain modules (`useResidents`, `useCareRecords`, etc.) follow `TanStack Query + Repository + Dexie + Zustand`.
   - *Logic*: Introducing Redux/RTK Query for reports and system admin would create dual, incompatible data-fetching stacks, disrupt the offline-first Dexie cache integration in `baseRepository.ts`, and increase complexity without benefit.
   - *Inference*: The mention of "RTK Query" in `ORIGINAL_REQUEST.md` was an architectural suggestion/example from the elicitation prompt, while the actual implementation in Phase 1 MVP standardizes on TanStack Query + Zustand + Axios. The reports and admin subsystems must conform to TanStack Query + Zustand.

2. **API & Mock Server Gaps**:
   - *Observation 1.2*: Issue `08-reports-frontend.md` specifies 5 endpoints (`/api/v1/reports/daily-completion`, `/resident-summary`, `/alerts`, `/audit-trail`, `/pdf`), and issue `09-system-admin-frontend.md` specifies 6 endpoints (`/api/v1/users`, `/users/:id/role`, `/users/:id/status`, `/system/settings`). None of these exist in `handlers.ts`.
   - *Logic*: MSW is the single source of truth for frontend development and testing in Phase 1. Without these mock handlers returning typed responses, frontend pages cannot fetch live data or pass integration tests.
   - *Inference*: MSW handlers must be added to `apps/web/src/mocks/handlers.ts` along with realistic seed data before or alongside UI page development.

3. **RBAC & 403 Enforcement**:
   - *Observation 1.3*: `App.tsx` lacks an `/admin` route; `useRequireRole` redirects to `/dashboard` when unauthorized; no 403 page exists; AC4 requires `/admin/*` to redirect non-admin users to 403 or login.
   - *Logic*: A caregiver accessing `/admin` currently gets redirected to `/dashboard` (or 404/login if path doesn't match). This fails AC4 criteria.
   - *Inference*: We must:
     (a) Add a dedicated `/403` route and `ForbiddenPage` component.
     (b) Update `useRequireRole` or `PrivateRoute` so that when an authenticated user lacks required permissions, they are redirected to `/403`.
     (c) Mount `/admin/*` routes protected by `allowedRoles={['admin', 'sysadmin']}`.

4. **CSRF Token Handling**:
   - *Observation 1.4*: No CSRF implementation exists in `apiClient.ts` or `handlers.ts`. AC4 requires: "所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。"
   - *Logic*: To satisfy AC4, both client-side token attachment and server/MSW-side token verification and error simulation must be implemented.
   - *Inference*:
     (a) Client: Generate/fetch a CSRF token upon app initialization (`GET /api/v1/auth/csrf-token` or during login), store in auth store/session, and attach `X-CSRF-Token: <token>` in `apiClient.ts` request interceptor for mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`).
     (b) MSW: Add an interceptor/handler validating `X-CSRF-Token`. If missing or invalid, return HTTP 403 `{ code: 'CSRF_INVALID', message: 'CSRF 驗證失敗' }`.
     (c) Simulation: Allow setting a debug header (e.g. `X-Simulate-CSRF-Error: true`) or localStorage flag to simulate verification failure in dev/test.

5. **Shared Schemas**:
   - *Observation 1.5*: Shared types in `packages/shared/src/index.ts` lack the detailed DTOs for Reports, System Settings, Feature Flags, and User CRUD.
   - *Logic*: Frontend components, TanStack Query hooks, repositories, and MSW handlers all rely on `@lrp/shared` as the contractual boundary.
   - *Inference*: `@lrp/shared` must be expanded with Zod schemas and TypeScript interfaces for reports and system admin to guarantee type safety across the monorepo.

---

## 3. Caveats

1. **RTK Query Consideration**: If there is a strict external mandate to demonstrate RTK Query specifically, an isolated RTK Query API slice could be constructed for reports (`reportsApi.ts`). However, doing so will introduce duplicate dependencies (`@reduxjs/toolkit`, `react-redux`) and run counter to all other 5 modules in the codebase.
2. **Offline-First for Reports & Admin**: Unlike `Residents` and `CareRecords`, Reports and System Admin are typically online-dominant features. However, offline fallbacks (e.g., caching the last generated report or displaying an offline warning) should be considered.
3. **PDF Generation**: Issue `08` and `17` specify server-side PDF generation returning a Blob/URL. In mock mode, MSW can return a mock Blob or base64 PDF representation.

---

## 4. Conclusion

1. **State & Fetching Architecture**: Do NOT use Redux/RTK Query. Use the established **TanStack Query (v5.28) + Axios `apiClient` + Zustand (v4.5)** architecture.
2. **Missing Endpoints**: 11 new MSW endpoints must be implemented across Reports (5 endpoints) and System Admin (6 endpoints).
3. **RBAC Security Fix**: Create a `/403` `ForbiddenPage`, update `useRequireRole` to redirect unauthorized users to `/403`, and wrap `/admin/*` in `PrivateRoute` with roles `['admin', 'sysadmin']`.
4. **CSRF Security Fix**: Implement `X-CSRF-Token` in `apiClient.ts`, add verification in MSW, and provide a test switch (`X-Simulate-CSRF-Error: true`) to satisfy AC4.
5. **Data Schemas**: Add schemas for Daily Completion, Resident Summary, Alerts, PDF Export, User CRUD, System Settings, System Health, and Feature Flags into `packages/shared/src/index.ts`.

---

## 5. Verification Method

### 5.1 Code Inspections
- Inspect `apps/web/package.json` to confirm current dependencies:
  `cat apps/web/package.json | grep -E "react-query|zustand|axios|redux"`
- Inspect `apps/web/src/api/apiClient.ts` to confirm Axios interceptor behavior:
  `grep -n "Authorization" apps/web/src/api/apiClient.ts`
- Inspect `apps/web/src/hooks/useRequireRole.tsx` to confirm redirect logic:
  `grep -n "redirectTo" apps/web/src/hooks/useRequireRole.tsx`
- Inspect `apps/web/src/mocks/handlers.ts` to confirm absence of reports/admin handlers:
  `grep -n "/api/v1/reports" apps/web/src/mocks/handlers.ts`
  `grep -n "/api/v1/users" apps/web/src/mocks/handlers.ts`

### 5.2 Test & Execution Commands
Once implemented:
- Run Vitest for shared package schemas:
  `npm run test --workspace=packages/shared`
- Run Vitest for frontend units and integration tests:
  `npm run test --workspace=apps/web`
- Run RBAC & CSRF security verification tests:
  `npx vitest run src/test/rbac-csrf.test.tsx`
- Verify AC4 in browser/E2E:
  - Log in as `caregiver1` -> navigate to `/admin` -> expect URL is `/403` with "403 無權存取" screen.
  - Send POST request without `X-CSRF-Token` or with `X-Simulate-CSRF-Error: true` -> expect 403 response with `CSRF_INVALID`.

### 5.3 Invalidation Conditions
- If the project team insists on replacing the entire application's data layer with Redux Toolkit and RTK Query across all modules, this report's state management recommendation would be superseded by a full refactoring plan.
