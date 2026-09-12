import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OfflineReadyBadge, checkOfflineReadiness } from '@/components/pwa/OfflineReadyBadge';
import { offlineDb } from '@/utils/offlineDb';
import { triggerPwaOfflineReady } from '@/utils/pwa';

describe('OfflineReadyBadge', () => {
  let localStore: Record<string, string> = {};

  beforeEach(async () => {
    localStore = {};
    vi.mocked(localStorage.getItem).mockImplementation((key) => localStore[key] ?? null);
    vi.mocked(localStorage.setItem).mockImplementation((key, val) => {
      localStore[key] = String(val);
    });
    vi.mocked(localStorage.removeItem).mockImplementation((key) => {
      delete localStore[key];
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      localStore = {};
    });

    await offlineDb.open();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('evaluates offline readiness successfully when SW, cache, and IndexedDB are ready', async () => {
    // Mock caches
    Object.defineProperty(window, 'caches', {
      writable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['static-cache-v1', 'workbox-precache']),
      },
    });

    // Mock SW controller
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        controller: { state: 'activated' },
        ready: Promise.resolve({ active: { state: 'activated' } }),
      },
    });

    const result = await checkOfflineReadiness();
    expect(result.swActive).toBe(true);
    expect(result.cacheReady).toBe(true);
    expect(result.idbReady).toBe(true);
    expect(result.isReady).toBe(true);
  });

  it('renders green "離線就緒" badge when fully ready and online', async () => {
    Object.defineProperty(window, 'caches', {
      writable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['static-cache-v1']),
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        controller: { state: 'activated' },
        ready: Promise.resolve({ active: { state: 'activated' } }),
      },
    });

    render(<OfflineReadyBadge />);

    await waitFor(() => {
      const badge = screen.getByRole('status', { name: /離線就緒/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('離線就緒');
    });
  });

  it('renders "離線模式中 (可正常作業)" when device goes offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(<OfflineReadyBadge />);

    const badge = screen.getByRole('status', { name: /離線模式中/i });
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('離線模式中 (可正常作業)');
  });

  it('dynamically switches badge when online and offline window events fire', async () => {
    Object.defineProperty(window, 'caches', {
      writable: true,
      value: {
        keys: vi.fn().mockResolvedValue(['static-cache-v1']),
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        controller: { state: 'activated' },
        ready: Promise.resolve({ active: { state: 'activated' } }),
      },
    });

    render(<OfflineReadyBadge />);

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /離線就緒/i })).toBeInTheDocument();
    });

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByRole('status', { name: /離線模式中/i })).toBeInTheDocument();

    // Simulate returning online
    act(() => {
      Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByRole('status', { name: /離線就緒/i })).toBeInTheDocument();
    });
  });

  it('updates readiness when triggerPwaOfflineReady is called', async () => {
    render(<OfflineReadyBadge />);

    act(() => {
      triggerPwaOfflineReady();
    });

    await waitFor(() => {
      expect(localStorage.getItem('pwa-offline-ready')).toBe('true');
    });
  });
});
