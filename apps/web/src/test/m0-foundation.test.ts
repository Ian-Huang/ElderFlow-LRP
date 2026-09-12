import { describe, it, expect, beforeEach } from 'vitest';
import {
  apiClient,
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  setSimulateCsrfError,
} from '@/api/apiClient';
import { handlers, validateCsrf } from '@/mocks/handlers';
import {
  DailyCompletionReportSchema,
  ResidentSummaryReportSchema,
  AlertReportItemSchema,
  SystemSettingsSchema,
  SystemHealthReportSchema,
  FeatureFlagSchema,
} from '@lrp/shared';

describe('Milestone M0: CSRF Interceptor & Token Management', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearCsrfToken();
  });

  it('configures apiClient instance with CSRF interceptor', () => {
    expect(apiClient).toBeDefined();
  });

  it('generates and retrieves a CSRF token', () => {
    const token = getCsrfToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(5);

    // Calling it again returns the same session token
    expect(getCsrfToken()).toBe(token);
  });

  it('allows manually setting and clearing the CSRF token', () => {
    setCsrfToken('custom-csrf-token-123');
    expect(getCsrfToken()).toBe('custom-csrf-token-123');

    clearCsrfToken();
    const freshToken = getCsrfToken();
    expect(freshToken).not.toBe('custom-csrf-token-123');
  });

  it('toggles simulate CSRF error flag in localStorage', () => {
    setSimulateCsrfError(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('SIMULATE_CSRF_ERROR', 'true');

    setSimulateCsrfError(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('SIMULATE_CSRF_ERROR');
  });

  it('validates CSRF protection logic in validateCsrf helper', () => {
    // GET request does not require CSRF token
    const getReq = new Request('http://localhost/api/v1/residents', { method: 'GET' });
    expect(validateCsrf(getReq)).toBeNull();

    // Mutating request without CSRF token returns 403 CSRF_INVALID
    const postReqNoToken = new Request('http://localhost/api/v1/residents', { method: 'POST' });
    const resNoToken = validateCsrf(postReqNoToken);
    expect(resNoToken).not.toBeNull();
    expect(resNoToken?.status).toBe(403);

    // Mutating request with CSRF token is allowed
    const postReqWithToken = new Request('http://localhost/api/v1/residents', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'valid-csrf-token' },
    });
    expect(validateCsrf(postReqWithToken)).toBeNull();

    // Mutating request with simulation flag returns 403 CSRF_INVALID even with token
    const postReqSimulate = new Request('http://localhost/api/v1/residents', {
      method: 'POST',
      headers: {
        'X-CSRF-Token': 'valid-csrf-token',
        'X-Simulate-CSRF-Error': 'true',
      },
    });
    const resSimulate = validateCsrf(postReqSimulate);
    expect(resSimulate?.status).toBe(403);
  });
});

describe('Milestone M0: MSW Reports Mock Endpoints', () => {
  it('GET /api/v1/reports/daily-completion returns schema-valid data', async () => {
    const handler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/reports/daily-completion'
    );
    expect(handler).toBeDefined();

    const request = new Request('http://localhost/api/v1/reports/daily-completion?date=2024-03-01');
    const response = await (handler as any).resolver({ request, params: {}, cookies: {} });
    const json = await response.json();

    expect(json.success).toBe(true);
    const parsed = DailyCompletionReportSchema.safeParse(json.data);
    expect(parsed.success).toBe(true);
    expect(json.data.date).toBe('2024-03-01');
    expect(json.data.totalResidents).toBeGreaterThan(0);
    expect(json.data.statusDistribution.length).toBe(3);
  });

  it('GET /api/v1/reports/resident-summary returns schema-valid tube and bed stats', async () => {
    const handler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/reports/resident-summary'
    );
    expect(handler).toBeDefined();

    const request = new Request('http://localhost/api/v1/reports/resident-summary');
    const response = await (handler as any).resolver({ request, params: {}, cookies: {} });
    const json = await response.json();

    expect(json.success).toBe(true);
    const parsed = ResidentSummaryReportSchema.safeParse(json.data);
    expect(parsed.success).toBe(true);
    expect(json.data.tubeStats.totalWithTubes).toBeGreaterThanOrEqual(0);
    expect(json.data.bedOccupancy.length).toBeGreaterThan(0);
    expect(json.data.alertsSummary).toBeDefined();
  });

  it('GET /api/v1/reports/alerts supports filtering by severity and status', async () => {
    const handler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/reports/alerts'
    );
    expect(handler).toBeDefined();

    // Query red open alerts
    const request = new Request('http://localhost/api/v1/reports/alerts?severity=red&status=open');
    const response = await (handler as any).resolver({ request, params: {}, cookies: {} });
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    for (const item of json.data) {
      expect(AlertReportItemSchema.safeParse(item).success).toBe(true);
      expect(item.severity).toBe('red');
      expect(item.status).toBe('open');
    }
  });

  it('GET /api/v1/reports/audit-trail returns paginated audit entries with filters', async () => {
    const handler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/reports/audit-trail'
    );
    expect(handler).toBeDefined();

    const request = new Request('http://localhost/api/v1/reports/audit-trail?page=1&pageSize=5');
    const response = await (handler as any).resolver({ request, params: {}, cookies: {} });
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.items.length).toBeLessThanOrEqual(5);
    expect(json.data.total).toBeGreaterThan(0);
    expect(json.data.page).toBe(1);
  });

  it('POST /api/v1/reports/pdf produces a mock application/pdf binary', async () => {
    const handler = handlers.find(
      (h: any) => h.info.method === 'POST' && h.info.path === '/api/v1/reports/pdf'
    );
    expect(handler).toBeDefined();

    const request = new Request('http://localhost/api/v1/reports/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'valid-csrf-token',
      },
      body: JSON.stringify({ reportType: 'resident-list' }),
    });

    const response = await (handler as any).resolver({ request, params: {}, cookies: {} });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    const text = await response.text();
    expect(text).toContain('%PDF-1.4');
  });
});

describe('Milestone M0: MSW User Management & Sysadmin Safety', () => {
  it('GET /api/v1/users supports search and role filter', async () => {
    const handler = handlers.find((h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/users');
    expect(handler).toBeDefined();

    const request = new Request('http://localhost/api/v1/users?search=caregiver1&role=caregiver');
    const response = await (handler as any).resolver({ request, params: {}, cookies: {} });
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.items.length).toBe(1);
    expect(json.data.items[0].username).toBe('caregiver1');
  });

  it('POST /api/v1/users prevents duplicate usernames', async () => {
    const handler = handlers.find((h: any) => h.info.method === 'POST' && h.info.path === '/api/v1/users');
    expect(handler).toBeDefined();

    // Attempt duplicate
    const dupRequest = new Request('http://localhost/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
      body: JSON.stringify({
        username: 'caregiver1',
        name: '重複帳號',
        role: 'caregiver',
        isLocalStaff: true,
      }),
    });
    const dupRes = await (handler as any).resolver({ request: dupRequest, params: {}, cookies: {} });
    expect(dupRes.status).toBe(400);
    const dupJson = await dupRes.json();
    expect(dupJson.error.code).toBe('DUPLICATE_USERNAME');

    // Create unique user
    const uniqueUsername = `nurse_${Date.now()}`;
    const newRequest = new Request('http://localhost/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
      body: JSON.stringify({
        username: uniqueUsername,
        name: '新護理人員',
        role: 'caregiver',
        isLocalStaff: true,
      }),
    });
    const newRes = await (handler as any).resolver({ request: newRequest, params: {}, cookies: {} });
    expect(newRes.status).toBe(201);
    const newJson = await newRes.json();
    expect(newJson.data.username).toBe(uniqueUsername);
  });

  it('protects the last sysadmin from demotion, deactivation, and deletion', async () => {
    const roleHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/users/:id/role'
    );
    const statusHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/users/:id/status'
    );
    const deleteHandler = handlers.find(
      (h: any) => h.info.method === 'DELETE' && h.info.path === '/api/v1/users/:id'
    );

    // user-004 is the only sysadmin in seed data
    const demoteReq = new Request('http://localhost/api/v1/users/user-004/role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
      body: JSON.stringify({ role: 'caregiver' }),
    });
    const demoteRes = await (roleHandler as any).resolver({
      request: demoteReq,
      params: { id: 'user-004' },
      cookies: {},
    });
    expect(demoteRes.status).toBe(400);
    const demoteJson = await demoteRes.json();
    expect(demoteJson.error.code).toBe('CANNOT_DEMOTE_LAST_SYSADMIN');

    // Attempt deactivating last sysadmin
    const deactReq = new Request('http://localhost/api/v1/users/user-004/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
      body: JSON.stringify({ status: 'inactive' }),
    });
    const deactRes = await (statusHandler as any).resolver({
      request: deactReq,
      params: { id: 'user-004' },
      cookies: {},
    });
    expect(deactRes.status).toBe(400);
    const deactJson = await deactRes.json();
    expect(deactJson.error.code).toBe('CANNOT_DEACTIVATE_LAST_SYSADMIN');

    // Attempt deleting last sysadmin
    const delReq = new Request('http://localhost/api/v1/users/user-004', {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': 'test-token' },
    });
    const delRes = await (deleteHandler as any).resolver({
      request: delReq,
      params: { id: 'user-004' },
      cookies: {},
    });
    expect(delRes.status).toBe(400);
    const delJson = await delRes.json();
    expect(delJson.error.code).toBe('CANNOT_REMOVE_LAST_SYSADMIN');
  });
});

describe('Milestone M0: MSW System Settings, Health, & Feature Flags', () => {
  it('GET /api/v1/system/settings returns valid settings and supports PATCH', async () => {
    const getHandler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/system/settings'
    );
    const patchHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/system/settings'
    );

    const getRes = await (getHandler as any).resolver({
      request: new Request('http://localhost/api/v1/system/settings'),
      params: {},
      cookies: {},
    });
    const getJson = await getRes.json();
    expect(SystemSettingsSchema.safeParse(getJson.data).success).toBe(true);

    const patchReq = new Request('http://localhost/api/v1/system/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
      body: JSON.stringify({ syncIntervalSeconds: 60 }),
    });
    const patchRes = await (patchHandler as any).resolver({
      request: patchReq,
      params: {},
      cookies: {},
    });
    const patchJson = await patchRes.json();
    expect(patchJson.data.syncIntervalSeconds).toBe(60);
  });

  it('GET /api/v1/system/health returns detailed health metrics', async () => {
    const handler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/system/health'
    );
    const res = await (handler as any).resolver({
      request: new Request('http://localhost/api/v1/system/health'),
      params: {},
      cookies: {},
    });
    const json = await res.json();
    expect(SystemHealthReportSchema.safeParse(json.data).success).toBe(true);
    expect(json.data.services.api.status).toBe('up');
    expect(json.data.services.database.status).toBe('up');
    expect(json.data.services.serviceWorker.status).toBe('active');
    expect(json.data.services.indexedDb.status).toBe('connected');
  });

  it('GET and PATCH /api/v1/system/feature-flags operates on feature flags', async () => {
    const getHandler = handlers.find(
      (h: any) => h.info.method === 'GET' && h.info.path === '/api/v1/system/feature-flags'
    );
    const patchHandler = handlers.find(
      (h: any) => h.info.method === 'PATCH' && h.info.path === '/api/v1/system/feature-flags/:id'
    );

    const getRes = await (getHandler as any).resolver({
      request: new Request('http://localhost/api/v1/system/feature-flags'),
      params: {},
      cookies: {},
    });
    const getJson = await getRes.json();
    expect(Array.isArray(getJson.data)).toBe(true);
    expect(getJson.data.length).toBeGreaterThan(0);
    expect(FeatureFlagSchema.safeParse(getJson.data[0]).success).toBe(true);

    const targetFlagId = getJson.data[0].id;
    const patchReq = new Request(`http://localhost/api/v1/system/feature-flags/${targetFlagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'test-token' },
      body: JSON.stringify({ rolloutPercentage: 50 }),
    });
    const patchRes = await (patchHandler as any).resolver({
      request: patchReq,
      params: { id: targetFlagId },
      cookies: {},
    });
    const patchJson = await patchRes.json();
    expect(patchJson.data.rolloutPercentage).toBe(50);
  });
});
