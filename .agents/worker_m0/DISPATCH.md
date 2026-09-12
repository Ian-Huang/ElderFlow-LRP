# Task Assignment: Milestone M0 - Shared Foundation & Mocks

## Identity
- Role: Shared Foundation & Mocks Worker
- Type: teamwork_preview_worker
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/worker_m0
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References (Must Read First)
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md`
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
3. `/Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_1/handoff.md`
4. `/Users/ian.huang/aiProjects/LRP/.agents/survey_explorer_2/handoff.md`
5. `/Users/ian.huang/aiProjects/LRP/.agents/survey_spec_miner/handoff.md`

## File Ownership (Exclusively Owned)
- `/Users/ian.huang/aiProjects/LRP/packages/shared/src/index.ts`
- `/Users/ian.huang/aiProjects/LRP/apps/web/src/api/apiClient.ts`
- `/Users/ian.huang/aiProjects/LRP/apps/web/src/mocks/handlers.ts`
- `/Users/ian.huang/aiProjects/LRP/apps/web/package.json` (install recharts: ^2.12.0)

## Objective & Detailed Requirements
1. **Shared DTOs & Schemas (`packages/shared/src/index.ts`)**:
   - Implement all DTOs and Zod schemas defined in `PROJECT.md § Interface Contracts`:
     - `DailyCompletionReport` (and nested `statusDistribution`, `residentScores`, `lowScoreResidents`)
     - `ResidentSummaryReport` (and nested `tubeStats`, `bedOccupancy`, `dependencyDistribution`, `alertsSummary`)
     - `AlertReportItem` (type: `medication_error` | `vital_abnormal` | `fall` | `missed_care`, severity: `red` | `yellow`, status: `open` | `acknowledged` | `resolved`)
     - `PdfExportRequest` (reportType: `resident-list` | `tube-statistics` | `bed-map` | `completion-report` | `audit-trail`)
     - `UserCreateInput`, `UserUpdateRoleInput`, `UserUpdateStatusInput`
     - `SystemSettings` (syncIntervalSeconds, lockDurationHours, lowStockThreshold, pdfFont, updatedAt, updatedBy)
     - `SystemHealthReport` (status, uptimeSeconds, services: api, database, serviceWorker, indexedDb, metrics: memoryUsageMb, cpuLoadPercentage)
     - `FeatureFlag` (id, name, description, enabled, rolloutPercentage, environment)
   - Ensure `User` model includes `isActive?: boolean` or `status: 'active' | 'inactive'`.
   - Ensure `npm run build:shared` or `npm run typecheck --workspace=packages/shared` compiles cleanly.

2. **CSRF Protection in Axios Client (`apps/web/src/api/apiClient.ts`)**:
   - Satisfy AC4: "所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。"
   - Request Interceptor:
     - For mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`), attach header `X-CSRF-Token`.
     - Token can be retrieved from cookie (`csrf_token`), a stored state/session token, or fallback to a standard session UUID if not yet set by server.
     - Support development error simulation: if `localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true'` or custom config is enabled, attach `X-Simulate-CSRF-Error: true` or tamper with the token so the mock server simulates a 403 CSRF error.
     - Response Interceptor: handle 403 `CSRF_INVALID` gracefully.

3. **MSW Mock Handlers Expansion (`apps/web/src/mocks/handlers.ts`)**:
   - Implement all missing endpoints specified in `PROJECT.md`:
     - `GET /api/v1/reports/daily-completion`: Supports `date` query param (default today), returns realistic `DailyCompletionReport` data with resident completion rates, status counts, and low score resident list.
     - `GET /api/v1/reports/resident-summary`: Returns `ResidentSummaryReport` including tube stats (NG tube, Foley, Tracheostomy, 3-pipe count), bed occupancy by floor/room, dependency breakdown, alert counts.
     - `GET /api/v1/reports/alerts`: Supports query filtering by `severity` and `status`, returns list of `AlertReportItem`.
     - `GET /api/v1/reports/audit-trail`: Supports pagination (`page`, `pageSize`), filters by `entityType`, `entityId`, `dateFrom`, `dateTo`, `changedBy`, `actionType`, returns `PaginatedResponse<AuditEntry>`.
     - `POST /api/v1/reports/pdf`: Accepts `PdfExportRequest`, returns a mock application/pdf Blob or simulated download response.
     - `GET /api/v1/users`: Returns paginated list of users, supports keyword search and role filter.
     - `POST /api/v1/users`: Validates input, creates new user, prevents duplicate username.
     - `PATCH /api/v1/users/:id/role`: Updates user role.
     - `PATCH /api/v1/users/:id/status`: Updates user active/inactive status (must protect the last active sysadmin from being deactivated).
     - `DELETE /api/v1/users/:id`: Removes user (protect last active sysadmin).
     - `GET /api/v1/system/settings`: Returns current `SystemSettings`.
     - `PATCH /api/v1/system/settings`: Updates `SystemSettings`.
     - `GET /api/v1/system/health`: Returns `SystemHealthReport` with realistic metrics and service statuses.
     - `GET /api/v1/system/feature-flags`: Returns list of `FeatureFlag`.
     - `PATCH /api/v1/system/feature-flags/:id`: Updates feature flag toggle or rollout.
     - **CSRF Middleware/Validation**: In MSW for mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`), if `request.headers.get('X-Simulate-CSRF-Error') === 'true'` or `!request.headers.get('X-CSRF-Token')`, return `HttpResponse.json({ code: 'CSRF_INVALID', message: 'CSRF token 驗證失敗' }, { status: 403 })`.

4. **Dependencies**:
   - Install `recharts: ^2.12.0` in `apps/web/package.json` (or verify installation).

5. **Verification**:
   - Run `npm run typecheck` across workspaces.
   - Run `npm test --workspace=packages/shared`.
   - Run `npm test --workspace=apps/web`.
   - Ensure all existing tests pass and TypeScript compiles cleanly.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your implementation report to:
`/Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md`
Notify the parent agent via `send_message` when complete.

## 2026-09-04T04:09:56Z
<USER_REQUEST>
You are worker_m0 (Foundation & Mocks Worker).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/worker_m0
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/worker_m0/DISPATCH.md and the user's original request in /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md.
Also read /Users/ian.huang/aiProjects/LRP/PROJECT.md and the explorer survey reports.
Implement Milestone M0 (Shared DTOs in packages/shared, CSRF interceptor in apiClient.ts, MSW mock handlers for reports/admin/health/flags/CSRF, and recharts dependency).
Run typecheck and tests to verify.
Write your completion report to /Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md and send_message to parent when complete.
</USER_REQUEST>
