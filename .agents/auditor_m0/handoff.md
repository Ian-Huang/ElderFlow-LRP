# Milestone M0 Forensic Audit Report

**Auditor Role**: Foundation Forensic Auditor (`auditor_m0`)  
**Working Directory**: `/Users/ian.huang/aiProjects/LRP/.agents/auditor_m0`  
**Parent Conversation ID**: `326e867b-d269-42e5-a25a-56351b725a5c`  
**Date**: 2026-09-04T04:23:30Z  
**Audit Target**: Milestone M0 (Shared Foundation & Mocks)  
**Verdict**: **CLEAN**

---

## Forensic Audit Summary

**Work Product**: Milestone M0 (`packages/shared/src/index.ts`, `apps/web/src/api/apiClient.ts`, `apps/web/src/mocks/handlers.ts`, `apps/web/src/test/m0-foundation.test.ts`, `apps/web/package.json`)  
**Profile**: General Project  
**Integrity Mode**: Development Mode (inferred from `ORIGINAL_REQUEST.md`)  
**Verdict**: **CLEAN**

### Phase Results
- [Hardcoded Output Detection]: **PASS** — No fabricated PASS/FAIL strings or static shortcuts in source logic.
- [Facade Detection]: **PASS** — No dummy implementations or empty constant returns; real computation, filtering, and state updates are present.
- [Pre-populated Artifact Detection]: **PASS** — No stale or pre-generated test logs or verification files.
- [Test Suite Execution & Authenticity]: **PASS** — Independently executed 155 tests (22 shared + 133 web), 100% passed without mocking circumvention.
- [Sysadmin Guard & CSRF Authenticity]: **PASS** — Real CSRF header injection/interception, error simulation, and last sysadmin protection rules enforced.

---

## 1. Observation

### 1.1 Source Code Analysis
1. **`packages/shared/src/index.ts:350-480, 720-832`**:
   - Implements TypeScript interfaces and corresponding Zod schemas for all Milestone M0/M1/M2 data transfer contracts:
     - `DailyCompletionReport` & `DailyCompletionReportSchema`
     - `ResidentSummaryReport` & `ResidentSummaryReportSchema`
     - `AlertReportItem` & `AlertReportItemSchema`
     - `PdfExportRequest` & `PdfExportRequestSchema`
     - `UserCreateInput` / `UserCreateSchema`, `UserUpdateRoleSchema`, `UserUpdateStatusSchema`
     - `SystemSettings` & `SystemSettingsSchema`
     - `SystemHealthReport` & `SystemHealthReportSchema`
     - `FeatureFlag` & `FeatureFlagSchema`
   - Real runtime schema constraints verified:
     - `DailyCompletionReportSchema`: `averageCompletionRate` constrained to `.min(0).max(100)`, `date` validated by regex `/^\d{4}-\d{2}-\d{2}$/`.
     - `SystemSettingsSchema`: `syncIntervalSeconds` constrained to `.min(5).max(3600)`, `lockDurationHours` to `.min(1).max(72)`.
     - `UserCreateSchema`: `username` constrained to `.min(3).max(50)`, `role` constrained to `UserRoleSchema`.

2. **`apps/web/src/api/apiClient.ts:7-99, 114-170, 203-230`**:
   - CSRF token management functions: `getCsrfToken()`, `setCsrfToken(token)`, `clearCsrfToken()`, and `setSimulateCsrfError(simulate)`.
   - `getCsrfToken()` reads cookie `csrf_token` or `XSRF-TOKEN`, falls back to `sessionStorage`, and generates standard UUID tokens when empty.
   - Axios request interceptor attaches `X-CSRF-Token: <token>` to outbound requests and attaches `X-Simulate-CSRF-Error: 'true'` when `localStorage.getItem('SIMULATE_CSRF_ERROR') === 'true'`.
   - Axios response interceptor inspects 403 responses for error code `CSRF_INVALID`; upon match, invokes `clearCsrfToken()` and rejects with normalized `ApiError`.

3. **`apps/web/src/mocks/handlers.ts:448-464, 513-520, 1752-2415`**:
   - Helper `validateCsrf(request)` checks mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`):
     ```ts
     const simulateError = request.headers.get('X-Simulate-CSRF-Error') === 'true';
     const csrfToken = request.headers.get('X-CSRF-Token');
     if (simulateError || !csrfToken) {
       return HttpResponse.json({ code: 'CSRF_INVALID', message: 'CSRF token 驗證失敗' }, { status: 403 });
     }
     ```
   - Top-level `http.all('/api/v1/*', ...)` middleware intercepts mutating requests, and defense-in-depth calls to `validateCsrf(request)` are embedded at the head of every mutating route handler (`/reports/pdf`, `/reports/generate`, `/users`, `/users/:id/role`, `/users/:id/status`, `/users/:id`, `/system/settings`, `/system/feature-flags/:id`).
   - Dynamic computation in `GET /api/v1/reports/daily-completion`: computes status distribution, average completion rate, and low-score resident list dynamically based on active resident records rather than static constants.
   - Sysadmin protection logic:
     - `PATCH /api/v1/users/:id/role`: verifies `activeSysadmins.length <= 1`, returning HTTP 400 `CANNOT_DEMOTE_LAST_SYSADMIN`.
     - `PATCH /api/v1/users/:id/status`: verifies `activeSysadmins.length <= 1`, returning HTTP 400 `CANNOT_DEACTIVATE_LAST_SYSADMIN`.
     - `DELETE /api/v1/users/:id`: verifies `activeSysadmins.length <= 1`, returning HTTP 400 `CANNOT_REMOVE_LAST_SYSADMIN`.
     - `POST /api/v1/users`: checks duplicate username case-insensitively, returning HTTP 400 `DUPLICATE_USERNAME`.

4. **`apps/web/package.json:28`**:
   - `"recharts": "^2.12.0"` installed under dependencies.

### 1.2 Independent Tool Execution Results
- **TypeScript Compilation (`npm run typecheck`)**:
  - Command: `npm run typecheck`
  - Output: `@lrp/web` and `@lrp/shared` compiled with exit code 0.
- **Shared Schema Unit Tests (`npm test --workspace=packages/shared`)**:
  - Command: `npm test --workspace=packages/shared`
  - Output: 1 test file, 22 tests passed in 256ms. Exit code 0.
- **Web Foundation Unit Tests (`npx vitest run src/test/m0-foundation.test.ts --root apps/web`)**:
  - Command: `npx vitest run src/test/m0-foundation.test.ts --root apps/web`
  - Output: 1 test file, 16 tests passed in 5.22s. Exit code 0.
- **Complete Web Test Suite (`npm test --workspace=apps/web`)**:
  - Command: `npm test --workspace=apps/web`
  - Output: 23 test files, 133 tests passed in 11.53s. Exit code 0.
- **ESLint (`npm run lint`)**:
  - Command: `npm run lint`
  - Output: 0 errors, 52 non-blocking warnings. Exit code 0.
- **Production Build (`npm run build`)**:
  - Command: `npm run build`
  - Output: Web bundle built in 2.11s, Workbox PWA service worker precaching 12 entries generated cleanly. Exit code 0.
- **Pre-populated Artifact Scan**:
  - Command: `find . -name '*.log' -o -name '*result*' -o -name '*output*'`
  - Result: Only standard internal node_modules and vitest cache files found. No fabricated outputs.
- **Monorepo Layout Scan**:
  - Command: `find .agents/ -type f`
  - Result: Only metadata files (`BRIEFING.md`, `progress.md`, `DISPATCH.md`, `handoff.md`, skills) in `.agents/`. Zero source, test, or data files in `.agents/`.

---

## 2. Logic Chain

1. **Detection of Hardcoded / Cheating Patterns**:
   - *Observation*: Source code inspection of `packages/shared/src/index.ts`, `apps/web/src/api/apiClient.ts`, and `apps/web/src/mocks/handlers.ts` demonstrates that functions contain algorithmic computations (e.g. resident score calculations, alert filtering by query parameters, sysadmin counter validation, token generation, and regex/range parsing).
   - *Logic*: The codebase does not rely on hardcoded test outputs or string pattern matching cheating.
2. **Detection of Facade / Stub Implementations**:
   - *Observation*: Handlers in `handlers.ts` manage stateful in-memory collections (`mockUsers`, `mockSystemSettings`, `mockFeatureFlags`). Modifications (`POST`, `PATCH`, `DELETE`) alter the in-memory array or object and return the updated entity.
   - *Logic*: The endpoints are authentic functional mocks suitable for full development and integration testing, not empty stubs or dummy constants.
3. **Detection of Test Circumvention**:
   - *Observation*: `m0-foundation.test.ts` executes live assertions against both positive paths and negative paths (e.g., duplicate usernames, unauthorized mutating requests without CSRF token, simulated CSRF errors, demoting last sysadmin, deactivating last sysadmin, deleting last sysadmin). Adversarial stress tests (`node -e`) confirmed that schemas reject values out of range.
   - *Logic*: Tests genuinely exercise and validate failure branches rather than suppressing errors or hardcoding trivial assertions.
4. **Authenticity of AC4 Requirements**:
   - *Observation*: `ORIGINAL_REQUEST.md` requires: "所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形。"
   - *Logic*: The implementation in `apiClient.ts` attaches `X-CSRF-Token` to every request and conditionally attaches `X-Simulate-CSRF-Error: 'true'`. Handlers reject mutating requests lacking the token or having the simulate header with HTTP 403 `CSRF_INVALID`. This directly and authentically satisfies AC4.
5. **Mode Alignment**:
   - *Observation*: Inferred Integrity Mode is Development Mode.
   - *Logic*: All permitted libraries (Zod, Axios, MSW, Recharts) are within bounds and properly installed. No prohibited patterns are present.

---

## 3. Caveats

1. **MSW Path-to-Regexp Wildcard Matching**:
   - `http.all('/api/v1/*', ...)` matches single path segment mutations under `/api/v1/`. For deeply nested routes, the worker proactively placed explicit `validateCsrf(request)` calls within every specific mutating endpoint. This defense-in-depth ensures complete protection regardless of path nesting.
2. **Mock PDF Generation**:
   - `POST /api/v1/reports/pdf` produces a mock `%PDF-1.4` text stream with `Content-Type: application/pdf`. This satisfies frontend blob download and preview workflows; real binary rendering will be handled by the production backend.

---

## 4. Conclusion

Milestone M0 implementation has been subjected to complete forensic integrity auditing and adversarial verification. No hardcoded test cheating, facade implementations, test circumventions, or repository layout violations were detected. All contracts, CSRF mechanisms, and MSW handlers operate genuinely.

**Audit Verdict**: **CLEAN**

---

## 5. Verification Method

To independently reproduce the forensic audit results from the repository root:

1. **Verify Monorepo Typecheck**:
   ```bash
   npm run typecheck
   ```
   *Expected*: Zero TypeScript compilation errors across `@lrp/web` and `@lrp/shared`.

2. **Verify Shared Schemas**:
   ```bash
   npm test --workspace=packages/shared
   ```
   *Expected*: 1 test file, 22 tests pass.

3. **Verify M0 Foundation Suite**:
   ```bash
   npx vitest run src/test/m0-foundation.test.ts --root apps/web
   ```
   *Expected*: 1 test file, 16 tests pass.

4. **Verify Full Web Test Suite**:
   ```bash
   npm test --workspace=apps/web
   ```
   *Expected*: 23 test files, 133 tests pass.

5. **Verify Monorepo Build**:
   ```bash
   npm run build
   ```
   *Expected*: Production bundle and PWA service worker build cleanly.
