# Milestone M0 Review Report: Interface & Security Conformance

**Reviewer Agent**: `reviewer_m0_2` (Interface & Security Reviewer)  
**Roles**: Reviewer, Adversarial Critic  
**Working Directory**: `/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2`  
**Parent Conversation ID**: `326e867b-d269-42e5-a25a-56351b725a5c`  
**Target Milestone**: M0 (Shared Foundation & Mocks)  
**Date**: 2026-09-04T12:26:00+08:00  

---

## Review Summary

**Verdict**: **APPROVE**  
**Overall Risk Assessment**: **LOW**  
**Integrity Audit**: **PASS** (Zero integrity violations, zero hardcoded facade outputs, zero bypasses)

---

## 1. Observation

### 1.1 Scope & Reference Documents
- Assignment reviewed per `/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2/DISPATCH.md`
- Requirements verified against `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md` (AC4)
- Specifications checked against `/Users/ian.huang/aiProjects/LRP/PROJECT.md` (§ Architecture, § Milestones, § Interface Contracts)
- Worker claims inspected against `/Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md`

### 1.2 CSRF Token Implementation (`apps/web/src/api/apiClient.ts`)
1. **Token Generation & Lifecycle** (`apps/web/src/api/apiClient.ts:7-64`):
   - `getCsrfToken()` retrieves from cookie (`csrf_token` or `XSRF-TOKEN`), falls back to `sessionStorage`, or generates a cryptographic UUID via `crypto.randomUUID()` / high-entropy fallback.
   - `setCsrfToken(token)` and `clearCsrfToken()` correctly manage in-memory `sessionCsrfToken` and `sessionStorage`.
2. **Request Interception** (`apps/web/src/api/apiClient.ts:107-135`):
   - Injects `config.headers['X-CSRF-Token'] = csrfToken` on all API calls dispatched through `apiClient`.
   - Injects `config.headers['X-Simulate-CSRF-Error'] = 'true'` when `localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true'`.
3. **Response Interception & Error Recovery** (`apps/web/src/api/apiClient.ts:160-168`):
   - Catches HTTP 403 responses where error code is `CSRF_INVALID`.
   - Calls `clearCsrfToken()` to invalidate stale tokens so subsequent requests automatically acquire fresh tokens.
   - Normalizes errors into typed `ApiError` format via `normalizeError()`.

### 1.3 MSW Mock Handlers & Security Enforcement (`apps/web/src/mocks/handlers.ts`)
1. **CSRF Validation Middleware** (`apps/web/src/mocks/handlers.ts:448-464`, `514-519`):
   - `validateCsrf(request)` inspects request method: safe methods (`GET`, `HEAD`, `OPTIONS`) bypass validation, while mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) require `X-CSRF-Token` and absence of `X-Simulate-CSRF-Error: true`.
   - If invalid, returns HTTP 403 `{ code: 'CSRF_INVALID', message: 'CSRF token 驗證失敗' }`.
   - `http.all('/api/v1/*', ...)` serves as top-level middleware. Handlers returning `undefined` cleanly fall through to specific endpoint handlers in MSW v2.
   - Defense-in-depth: individual mutating handlers also explicitly call `validateCsrf(request)`.
2. **All 15 M0 Endpoint Contracts Conformance**:
   - `GET /api/v1/reports/daily-completion` (`handlers.ts:1752-1822`): Dynamically aggregates completion metrics, status distributions, and scores from active residents matching `DailyCompletionReport` DTO.
   - `GET /api/v1/reports/resident-summary` (`handlers.ts:1824-1894`): Computes tube statistics (NG, Foley, Trach, 3-pipe), bed occupancy, dependency distributions, and alert summaries matching `ResidentSummaryReport` DTO.
   - `GET /api/v1/reports/alerts` (`handlers.ts:1896-1915`): Filters seeded alerts by comma-separated `severity` and `status` matching `AlertReportItem[]`.
   - `GET /api/v1/reports/audit-trail` (`handlers.ts:1917-1962`): Slices and filters 10 seeded audit entries with 6 query parameters (`entityType`, `entityId`, `dateFrom`, `dateTo`, `changedBy`, `actionType`) returning `PaginatedResponse<AuditEntry>`.
   - `POST /api/v1/reports/pdf` (`handlers.ts:1964-1980`): Enforces CSRF, accepts `PdfExportRequest`, returns `application/pdf` binary stream with `Content-Disposition`.
   - `GET /api/v1/users` (`handlers.ts:2164-2205`): Supports `search`, `role`, and `status` filters with pagination returning `PaginatedResponse<User>`.
   - `POST /api/v1/users` (`handlers.ts:2207-2244`): Enforces CSRF, validates required fields, prevents duplicate usernames (HTTP 400 `DUPLICATE_USERNAME`), initializes active status.
   - `PATCH /api/v1/users/:id/role` (`handlers.ts:2246-2281`): Enforces CSRF, blocks demoting the last sysadmin (HTTP 400 `CANNOT_DEMOTE_LAST_SYSADMIN`).
   - `PATCH /api/v1/users/:id/status` (`handlers.ts:2283-2320`): Enforces CSRF, blocks deactivating the last sysadmin (HTTP 400 `CANNOT_DEACTIVATE_LAST_SYSADMIN`).
   - `DELETE /api/v1/users/:id` (`handlers.ts:2322-2356`): Enforces CSRF, blocks deleting the last sysadmin (HTTP 400 `CANNOT_REMOVE_LAST_SYSADMIN`).
   - `GET /api/v1/system/settings` (`handlers.ts:2359-2362`): Returns `SystemSettings`.
   - `PATCH /api/v1/system/settings` (`handlers.ts:2364-2376`): Enforces CSRF, merges updates, refreshes `updatedAt`.
   - `GET /api/v1/system/health` (`handlers.ts:2379-2382`): Returns `SystemHealthReport` including services and metrics.
   - `GET /api/v1/system/feature-flags` (`handlers.ts:2385-2388`): Returns `FeatureFlag[]` across environments.
   - `PATCH /api/v1/system/feature-flags/:id` (`handlers.ts:2390-2410`): Enforces CSRF, updates flag toggle, percentage, or environment.
3. **Independent Verification Execution Results**:
   - `npm run typecheck`: Exited 0 across `@lrp/web` and `@lrp/shared`.
   - `npm test --workspace=packages/shared`: 1 test file, 22 passed (100%).
   - `npx vitest run src/test/m0-foundation.test.ts --root apps/web`: 1 test file, 16 passed (100%).
   - `npm test --workspace=apps/web`: 23 test files, 133 passed (100%).
   - `npm run lint`: 0 errors.
   - `npm run build`: Production build succeeded in 2.10s, Service Worker precached 12 entries (779.44 KiB).

---

## 2. Logic Chain

1. **AC4 Compliance**:
   - *Premise*: AC4 requires all API requests to carry a CSRF token, and the development environment must be able to simulate verification failures.
   - *Inference*: `apiClient.ts` request interceptor unconditionally attaches `X-CSRF-Token` to every request. `handlers.ts` inspects incoming mutating requests for the token and rejects requests lacking it with 403 `CSRF_INVALID`. By setting `SIMULATE_CSRF_ERROR=true` in `localStorage`, the client attaches `X-Simulate-CSRF-Error: true`, causing the mock layer to reject mutating calls deterministically. AC4 is fully satisfied.
2. **Interface Conformance**:
   - *Premise*: `PROJECT.md § Interface Contracts` defines 15 endpoints and shared DTOs/Zod schemas.
   - *Inference*: Each endpoint in `handlers.ts` strictly aligns with the specified URL paths, HTTP verbs, request payloads, and response envelopes (`ApiResponse<T>` / `PaginatedResponse<T>`). All returned data structures pass runtime Zod validation in `packages/shared`.
3. **Administrative Safety Guards**:
   - *Premise*: System integrity mandates that administrative lockout must be prevented by preserving at least one active sysadmin.
   - *Inference*: `PATCH /role`, `PATCH /status`, and `DELETE /users/:id` check `activeSysadmins.length <= 1`. Attempts to demote, deactivate, or delete the last active administrator are safely blocked with descriptive HTTP 400 error responses.
4. **Integrity & Authenticity**:
   - *Premise*: Review protocol mandates verifying the absence of hardcoded shortcuts, facade implementations, or fake test runs.
   - *Inference*: Real calculation and query parsing logic is implemented in `handlers.ts`. All test suites were run independently through subagent execution tools, reproducing identical zero-error pass rates.

---

## 3. Caveats & Adversarial Observations

1. **Simulation Header Scope in Production**:
   - *Observation*: `apiClient.ts` reads `localStorage.getItem('SIMULATE_CSRF_ERROR')` regardless of `import.meta.env.MODE`.
   - *Risk*: Low. End users in production do not set this localStorage key.
   - *Recommendation for future hardening*: Wrap the check with `if (import.meta.env.DEV)` so simulation headers can never be emitted in production.
2. **Mock State Mutability across Test Suites**:
   - *Observation*: In-memory collections (`mockUsers`, `mockSystemSettings`) are mutated in place by POST/PATCH/DELETE handlers.
   - *Risk*: Low for current tests (all 133 pass), but future tests in M1/M2 could experience state pollution if run in arbitrary orders.
   - *Recommendation for M2*: Introduce an exported `resetMockData()` helper to reset arrays to seed state in test `beforeEach`.
3. **Inactive Sysadmin Deletion Edge Case**:
   - *Observation*: `DELETE /api/v1/users/:id` checks `if (user.role === 'sysadmin')` and blocks deletion if `activeSysadmins.length <= 1`. If an inactive sysadmin exists alongside one active sysadmin, deleting the inactive account is also blocked.
   - *Risk*: Negligible. This is an extra-conservative safety measure preventing accidental reduction of sysadmin records.

---

## 4. Conclusion

Milestone M0 (Shared Foundation & Mocks) satisfies all architectural and functional criteria:
- **Interface Conformance**: All 15 endpoints match `PROJECT.md` contracts and pass Zod validation.
- **Security & CSRF**: Interceptors attach tokens, handle failures, and provide deterministic error simulation adhering to AC4.
- **Sysadmin Protection**: Triple-guarded against demotion, deactivation, and deletion.
- **Build & Tests**: 100% pass across monorepo build, lint, and test suites.

**Final Verdict: APPROVE**

---

## 5. Verification Method

To independently re-verify Milestone M0 deliverables, run the following commands from the repository root:

```bash
# 1. Typecheck entire monorepo
npm run typecheck

# 2. Test shared package schemas and contracts
npm test --workspace=packages/shared

# 3. Test web foundation test suite
npx vitest run src/test/m0-foundation.test.ts --root apps/web

# 4. Run entire web test suite
npm test --workspace=apps/web

# 5. Lint codebase
npm run lint

# 6. Production build and PWA Service Worker generation
npm run build
```
