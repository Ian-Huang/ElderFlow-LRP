/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  apiClient,
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  setSimulateCsrfError,
} from '@/api/apiClient';
import { handlers, validateCsrf } from '@/mocks/handlers';

describe('CSRF & Security Adversarial Challenge Suite', () => {
  // Setup in-memory mock storage for localStorage and sessionStorage
  let localStore: Record<string, string> = {};
  let sessionStore: Record<string, string> = {};

  beforeEach(() => {
    localStore = {};
    sessionStore = {};

    vi.mocked(localStorage.getItem).mockImplementation((key: string) => localStore[key] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key: string, val: string) => {
      localStore[key] = String(val);
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key: string) => {
      delete localStore[key];
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      localStore = {};
    });

    vi.mocked(sessionStorage.getItem).mockImplementation((key: string) => sessionStore[key] ?? null);
    vi.mocked(sessionStorage.setItem).mockImplementation((key: string, val: string) => {
      sessionStore[key] = String(val);
    });
    vi.mocked(sessionStorage.removeItem).mockImplementation((key: string) => {
      delete sessionStore[key];
    });
    vi.mocked(sessionStorage.clear).mockImplementation(() => {
      sessionStore = {};
    });

    clearCsrfToken();
  });

  describe('Dimension 1: CSRF Token Enforcement on Mutating Operations', () => {
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    it.each(mutatingMethods)('rejects %s requests when X-CSRF-Token is missing', (method) => {
      const request = new Request('http://localhost/api/v1/users', { method });
      const response = validateCsrf(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });

    it.each(mutatingMethods)('rejects %s requests when X-CSRF-Token is empty string', (method) => {
      const request = new Request('http://localhost/api/v1/users', {
        method,
        headers: { 'X-CSRF-Token': '' },
      });
      const response = validateCsrf(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
    });

    it.each(safeMethods)('allows safe %s requests without X-CSRF-Token', (method) => {
      const request = new Request('http://localhost/api/v1/users', { method });
      const response = validateCsrf(request);

      expect(response).toBeNull();
    });

    it('returns standard 403 CSRF_INVALID error payload format', async () => {
      const request = new Request('http://localhost/api/v1/reports/pdf', {
        method: 'POST',
      });
      const response = validateCsrf(request);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
      const data = await response?.json();
      expect(data).toEqual({
        code: 'CSRF_INVALID',
        message: 'CSRF token 驗證失敗',
      });
    });

    it('top-level middleware interceptor catches mutating requests to /api/v1/*', async () => {
      const topMiddleware = handlers[0];
      expect(topMiddleware).toBeDefined();

      // Mutating request without CSRF token is blocked by top middleware
      const blockedReq = new Request('http://localhost/api/v1/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncIntervalSeconds: 30 }),
      });
      const blockedRes = await (topMiddleware as any).resolver({
        request: blockedReq,
        params: {},
        cookies: {},
      });
      expect(blockedRes).toBeDefined();
      expect(blockedRes.status).toBe(403);

      // Mutating request WITH CSRF token passes top middleware (returns undefined so MSW continues)
      const allowedReq = new Request('http://localhost/api/v1/system/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-test-csrf-token',
        },
        body: JSON.stringify({ syncIntervalSeconds: 30 }),
      });
      const allowedRes = await (topMiddleware as any).resolver({
        request: allowedReq,
        params: {},
        cookies: {},
      });
      expect(allowedRes).toBeUndefined();
    });

    it('enforces defense-in-depth CSRF checks on all individual mutating endpoints', async () => {
      const endpointChecks = [
        {
          method: 'POST',
          path: '/api/v1/users',
          body: { username: 'csrf_test_user', name: 'Test', role: 'caregiver', isLocalStaff: true },
          params: {},
        },
        {
          method: 'PATCH',
          path: '/api/v1/users/:id/role',
          body: { role: 'admin' },
          params: { id: 'user-001' },
        },
        {
          method: 'PATCH',
          path: '/api/v1/users/:id/status',
          body: { status: 'inactive' },
          params: { id: 'user-001' },
        },
        {
          method: 'DELETE',
          path: '/api/v1/users/:id',
          body: undefined,
          params: { id: 'user-001' },
        },
        {
          method: 'PATCH',
          path: '/api/v1/system/settings',
          body: { lowStockThreshold: 15 },
          params: {},
        },
        {
          method: 'PATCH',
          path: '/api/v1/system/feature-flags/:id',
          body: { enabled: true },
          params: { id: 'flag-001' },
        },
        {
          method: 'POST',
          path: '/api/v1/reports/pdf',
          body: { reportType: 'resident-list' },
          params: {},
        },
      ];

      for (const check of endpointChecks) {
        const handler = handlers.find(
          (h: any) => h.info.method === check.method && h.info.path === check.path
        );
        expect(handler, `Handler for ${check.method} ${check.path} should exist`).toBeDefined();

        // Call handler directly WITHOUT CSRF token
        const request = new Request(`http://localhost${check.path}`, {
          method: check.method,
          headers: check.body ? { 'Content-Type': 'application/json' } : {},
          body: check.body ? JSON.stringify(check.body) : undefined,
        });

        const response = await (handler as any).resolver({
          request,
          params: check.params,
          cookies: {},
        });

        expect(response.status, `${check.method} ${check.path} should return 403 without CSRF token`).toBe(403);
        const json = await response.json();
        expect(json.code).toBe('CSRF_INVALID');
      }
    });
  });

  describe('Dimension 2: Error Simulation Flag (SIMULATE_CSRF_ERROR)', () => {
    it('rejects mutating requests when X-Simulate-CSRF-Error is true even with valid CSRF token', async () => {
      const request = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
          'X-Simulate-CSRF-Error': 'true',
        },
        body: JSON.stringify({
          username: 'simulate_user',
          name: 'Simulated User',
          role: 'caregiver',
        }),
      });

      const response = validateCsrf(request);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(403);
      const json = await response?.json();
      expect(json.code).toBe('CSRF_INVALID');
    });

    it('does NOT reject mutating requests when X-Simulate-CSRF-Error is false and CSRF token is present', () => {
      const request = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'valid-csrf-token',
          'X-Simulate-CSRF-Error': 'false',
        },
      });

      const response = validateCsrf(request);
      expect(response).toBeNull();
    });

    it('does NOT reject GET requests even when X-Simulate-CSRF-Error is true', () => {
      const request = new Request('http://localhost/api/v1/system/settings', {
        method: 'GET',
        headers: {
          'X-Simulate-CSRF-Error': 'true',
        },
      });

      const response = validateCsrf(request);
      expect(response).toBeNull();
    });

    it('integrates setSimulateCsrfError with apiClient request interceptor', async () => {
      // With simulation disabled:
      setSimulateCsrfError(false);
      expect(localStore['SIMULATE_CSRF_ERROR']).toBeUndefined();

      // Retrieve apiClient internal interceptors
      const interceptors = (apiClient as any).client.interceptors.request.handlers;
      expect(interceptors.length).toBeGreaterThan(0);

      const requestInterceptor = interceptors[0].fulfilled;

      // Test config without error simulation
      const baseConfig = { headers: {} as Record<string, string> };
      const configAfterNormal = await requestInterceptor({ ...baseConfig });
      expect(configAfterNormal.headers['X-CSRF-Token']).toBeDefined();
      expect(configAfterNormal.headers['X-Simulate-CSRF-Error']).toBeUndefined();

      // With simulation enabled:
      setSimulateCsrfError(true);
      expect(localStore['SIMULATE_CSRF_ERROR']).toBe('true');

      const configAfterSimulate = await requestInterceptor({ headers: {} as Record<string, string> });
      expect(configAfterSimulate.headers['X-CSRF-Token']).toBeDefined();
      expect(configAfterSimulate.headers['X-Simulate-CSRF-Error']).toBe('true');
    });

    it('clears cached CSRF token upon receiving 403 CSRF_INVALID response', async () => {
      setCsrfToken('session-token-to-be-invalidated');
      expect(getCsrfToken()).toBe('session-token-to-be-invalidated');

      const responseInterceptors = (apiClient as any).client.interceptors.response.handlers;
      expect(responseInterceptors.length).toBeGreaterThan(0);

      const responseErrorInterceptor = responseInterceptors[0].rejected;

      const mockError = {
        config: { headers: {} },
        response: {
          status: 403,
          data: {
            code: 'CSRF_INVALID',
            message: 'CSRF token 驗證失敗',
          },
        },
      };

      await expect(responseErrorInterceptor(mockError)).rejects.toMatchObject({
        code: 'CSRF_INVALID',
      });

      // Verification: cached CSRF token was cleared and fresh one is generated
      const tokenAfterError = getCsrfToken();
      expect(tokenAfterError).not.toBe('session-token-to-be-invalidated');
    });
  });

  describe('Dimension 3: Adversarial Sysadmin Safety Guards', () => {
    const roleHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/users/:id/role'
    );
    const statusHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/users/:id/status'
    );
    const deleteHandler = handlers.find(
      (h: any) => h.info.method === 'DELETE' && h.info.path === '/api/v1/users/:id'
    );
    const userCreateHandler = handlers.find(
      (h: any) => h.info.method === 'POST' && h.info.path === '/api/v1/users'
    );

    it('Attack Scenario 1: Demoting the last active sysadmin is blocked under all roles', async () => {
      const targetRoles = ['caregiver', 'supervisor', 'admin'];

      for (const targetRole of targetRoles) {
        const demoteReq = new Request('http://localhost/api/v1/users/user-004/role', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
          body: JSON.stringify({ role: targetRole }),
        });

        const res = await (roleHandler as any).resolver({
          request: demoteReq,
          params: { id: 'user-004' },
          cookies: {},
        });

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('CANNOT_DEMOTE_LAST_SYSADMIN');
      }

      // Re-assigning sysadmin role to sysadmin is permitted (idempotent no-op)
      const noopReq = new Request('http://localhost/api/v1/users/user-004/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ role: 'sysadmin' }),
      });
      const noopRes = await (roleHandler as any).resolver({
        request: noopReq,
        params: { id: 'user-004' },
        cookies: {},
      });
      expect(noopRes.status).toBe(200);
      const noopJson = await noopRes.json();
      expect(noopJson.data.role).toBe('sysadmin');
    });

    it('Attack Scenario 2: Deactivating the last active sysadmin is blocked across all input variations', async () => {
      const deactivationPayloads = [
        { status: 'inactive' },
        { isActive: false },
        { status: 'inactive', isActive: true }, // status precedence check
        {}, // empty body defaults to inactive
      ];

      for (const payload of deactivationPayloads) {
        const deactReq = new Request('http://localhost/api/v1/users/user-004/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
          body: JSON.stringify(payload),
        });

        const res = await (statusHandler as any).resolver({
          request: deactReq,
          params: { id: 'user-004' },
          cookies: {},
        });

        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error.code).toBe('CANNOT_DEACTIVATE_LAST_SYSADMIN');
      }

      // Keeping or setting active is permitted
      const activateReq = new Request('http://localhost/api/v1/users/user-004/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ status: 'active' }),
      });
      const actRes = await (statusHandler as any).resolver({
        request: activateReq,
        params: { id: 'user-004' },
        cookies: {},
      });
      expect(actRes.status).toBe(200);
      const actJson = await actRes.json();
      expect(actJson.data.status).toBe('active');
    });

    it('Attack Scenario 3: Deleting the last active sysadmin is strictly blocked', async () => {
      const delReq = new Request('http://localhost/api/v1/users/user-004', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'test-token' },
      });

      const res = await (deleteHandler as any).resolver({
        request: delReq,
        params: { id: 'user-004' },
        cookies: {},
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('CANNOT_REMOVE_LAST_SYSADMIN');
    });

    it('Attack Scenario 4: Multi-sysadmin lifecycle transition test', async () => {
      // Step A: Create second sysadmin
      const secondSysadminUsername = `sec_admin_${Date.now()}`;
      const createReq = new Request('http://localhost/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({
          username: secondSysadminUsername,
          name: '第二系統管理員',
          role: 'sysadmin',
          isLocalStaff: true,
        }),
      });

      const createRes = await (userCreateHandler as any).resolver({
        request: createReq,
        params: {},
        cookies: {},
      });
      expect(createRes.status).toBe(201);
      const createdUser = (await createRes.json()).data;
      const secondId = createdUser.userId;

      // Step B: Now that there are 2 active sysadmins, demoting second sysadmin should SUCCEED
      const demoteReq = new Request(`http://localhost/api/v1/users/${secondId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ role: 'admin' }),
      });
      const demoteRes = await (roleHandler as any).resolver({
        request: demoteReq,
        params: { id: secondId },
        cookies: {},
      });
      expect(demoteRes.status).toBe(200);

      // Step C: Now active sysadmins count is 1 again (user-004). Demoting user-004 must now FAIL
      const demotePrimaryReq = new Request('http://localhost/api/v1/users/user-004/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ role: 'admin' }),
      });
      const demotePrimaryRes = await (roleHandler as any).resolver({
        request: demotePrimaryReq,
        params: { id: 'user-004' },
        cookies: {},
      });
      expect(demotePrimaryRes.status).toBe(400);
      expect((await demotePrimaryRes.json()).error.code).toBe('CANNOT_DEMOTE_LAST_SYSADMIN');

      // Step D: Re-promote second admin back to sysadmin
      const promoteBackReq = new Request(`http://localhost/api/v1/users/${secondId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ role: 'sysadmin' }),
      });
      const promoteBackRes = await (roleHandler as any).resolver({
        request: promoteBackReq,
        params: { id: secondId },
        cookies: {},
      });
      expect(promoteBackRes.status).toBe(200);

      // Step E: Now that 2 are active, deactivating the second should SUCCEED
      const deactSecondReq = new Request(`http://localhost/api/v1/users/${secondId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ status: 'inactive' }),
      });
      const deactSecondRes = await (statusHandler as any).resolver({
        request: deactSecondReq,
        params: { id: secondId },
        cookies: {},
      });
      expect(deactSecondRes.status).toBe(200);

      // Step F: With second sysadmin inactive, active count is 1. Deactivating user-004 must FAIL
      const deactPrimaryReq = new Request('http://localhost/api/v1/users/user-004/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ status: 'inactive' }),
      });
      const deactPrimaryRes = await (statusHandler as any).resolver({
        request: deactPrimaryReq,
        params: { id: 'user-004' },
        cookies: {},
      });
      expect(deactPrimaryRes.status).toBe(400);
      expect((await deactPrimaryRes.json()).error.code).toBe('CANNOT_DEACTIVATE_LAST_SYSADMIN');

      // Step G: Reactivate second sysadmin, then delete second sysadmin (should SUCCEED)
      const reactivateReq = new Request(`http://localhost/api/v1/users/${secondId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ status: 'active' }),
      });
      await (statusHandler as any).resolver({
        request: reactivateReq,
        params: { id: secondId },
        cookies: {},
      });

      const deleteSecondReq = new Request(`http://localhost/api/v1/users/${secondId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'test-token' },
      });
      const deleteSecondRes = await (deleteHandler as any).resolver({
        request: deleteSecondReq,
        params: { id: secondId },
        cookies: {},
      });
      expect(deleteSecondRes.status).toBe(200);

      // Step H: Second sysadmin is deleted. Attempting to delete user-004 must FAIL
      const deleteLastReq = new Request('http://localhost/api/v1/users/user-004', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'test-token' },
      });
      const deleteLastRes = await (deleteHandler as any).resolver({
        request: deleteLastReq,
        params: { id: 'user-004' },
        cookies: {},
      });
      expect(deleteLastRes.status).toBe(400);
      expect((await deleteLastRes.json()).error.code).toBe('CANNOT_REMOVE_LAST_SYSADMIN');
    });

    it('Scenario 5: Non-sysadmin user modifications proceed without restriction', async () => {
      // user-001 is a caregiver
      // Can demote/change role
      const changeRoleReq = new Request('http://localhost/api/v1/users/user-001/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ role: 'supervisor' }),
      });
      const roleRes = await (roleHandler as any).resolver({
        request: changeRoleReq,
        params: { id: 'user-001' },
        cookies: {},
      });
      expect(roleRes.status).toBe(200);

      // Can deactivate
      const deactReq = new Request('http://localhost/api/v1/users/user-001/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ status: 'inactive' }),
      });
      const deactRes = await (statusHandler as any).resolver({
        request: deactReq,
        params: { id: 'user-001' },
        cookies: {},
      });
      expect(deactRes.status).toBe(200);
    });

    it('Scenario 6: Non-existent user mutations return 404 NOT_FOUND', async () => {
      const nonExistentId = 'user-ghost-999';

      const roleReq = new Request(`http://localhost/api/v1/users/${nonExistentId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ role: 'admin' }),
      });
      const roleRes = await (roleHandler as any).resolver({
        request: roleReq,
        params: { id: nonExistentId },
        cookies: {},
      });
      expect(roleRes.status).toBe(404);

      const statusReq = new Request(`http://localhost/api/v1/users/${nonExistentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
        body: JSON.stringify({ status: 'inactive' }),
      });
      const statusRes = await (statusHandler as any).resolver({
        request: statusReq,
        params: { id: nonExistentId },
        cookies: {},
      });
      expect(statusRes.status).toBe(404);

      const delReq = new Request(`http://localhost/api/v1/users/${nonExistentId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': 'test-token' },
      });
      const delRes = await (deleteHandler as any).resolver({
        request: delReq,
        params: { id: nonExistentId },
        cookies: {},
      });
      expect(delRes.status).toBe(404);
    });
  });
});
