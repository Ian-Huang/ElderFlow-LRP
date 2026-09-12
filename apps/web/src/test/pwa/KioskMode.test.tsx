import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useUIStore, checkUrlKioskParam } from '@/stores/uiStore';
import { Layout } from '@/components/Layout';
import { useAuthStore } from '@/stores/authStore';

describe('Kiosk Mode & Screen Wake Lock', () => {
  let originalWakeLock: PropertyDescriptor | undefined;
  let originalFullscreen: typeof document.documentElement.requestFullscreen;
  let originalExitFullscreen: typeof document.exitFullscreen;

  beforeEach(() => {
    useUIStore.setState({ kioskMode: false, wakeLockActive: false });
    useAuthStore.setState({
      user: {
        userId: 'admin-1',
        username: 'admin',
        name: '管理員',
        role: 'admin',
        isLocalStaff: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    });

    originalFullscreen = document.documentElement.requestFullscreen;
    originalExitFullscreen = document.exitFullscreen;

    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

    originalWakeLock = Object.getOwnPropertyDescriptor(navigator, 'wakeLock');
  });

  afterEach(() => {
    document.documentElement.requestFullscreen = originalFullscreen;
    document.exitFullscreen = originalExitFullscreen;
    if (originalWakeLock) {
      Object.defineProperty(navigator, 'wakeLock', originalWakeLock);
    }
    vi.restoreAllMocks();
  });

  it('correctly detects kiosk query parameter from URL', () => {
    const originalLocation = window.location;

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        ...originalLocation,
        search: '?kiosk=1',
      },
    });
    expect(checkUrlKioskParam()).toBe(true);

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        ...originalLocation,
        search: '?kiosk=true',
      },
    });
    expect(checkUrlKioskParam()).toBe(true);

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: {
        ...originalLocation,
        search: '',
      },
    });
    expect(checkUrlKioskParam()).toBe(false);

    Object.defineProperty(window, 'location', {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it('requests fullscreen and wake lock when kioskMode is activated', async () => {
    const releaseMock = vi.fn().mockResolvedValue(undefined);
    const sentinelMock = {
      release: releaseMock,
      addEventListener: vi.fn(),
    };
    const requestWakeLockMock = vi.fn().mockResolvedValue(sentinelMock);

    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: requestWakeLockMock },
      configurable: true,
    });

    await act(async () => {
      useUIStore.getState().setKioskMode(true);
    });

    expect(useUIStore.getState().kioskMode).toBe(true);
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(requestWakeLockMock).toHaveBeenCalledWith('screen');
    expect(useUIStore.getState().wakeLockActive).toBe(true);

    // Disable kiosk mode
    await act(async () => {
      useUIStore.getState().setKioskMode(false);
    });

    expect(useUIStore.getState().kioskMode).toBe(false);
    expect(releaseMock).toHaveBeenCalled();
    expect(useUIStore.getState().wakeLockActive).toBe(false);
  });

  it('intercepts beforeunload event to prevent accidental exit in kiosk mode', () => {
    useUIStore.setState({ kioskMode: true });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const beforeUnloadEvent = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    Object.defineProperty(beforeUnloadEvent, 'returnValue', {
      writable: true,
      value: false,
    });
    window.dispatchEvent(beforeUnloadEvent);

    expect(beforeUnloadEvent.defaultPrevented).toBe(true);
    expect(beforeUnloadEvent.returnValue).toBe('系統正處於 Kiosk 鎖定模式，確定要離開嗎？');
  });

  it('provides 5-click emergency admin unlock gesture to exit kiosk mode', () => {
    useUIStore.setState({ kioskMode: true });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByTestId('kiosk-layout')).toBeInTheDocument();
    expect(screen.queryByLabelText('主導覽選單')).toBeNull(); // Standard sidebar hidden

    const logoBtn = screen.getByTestId('kiosk-logo-btn');

    // Click 1
    fireEvent.click(logoBtn);
    expect(useUIStore.getState().kioskMode).toBe(true);
    expect(screen.getByTestId('unlock-click-hint')).toHaveTextContent('再點擊 4 次解除鎖定');

    // Click 2, 3, 4
    fireEvent.click(logoBtn);
    fireEvent.click(logoBtn);
    fireEvent.click(logoBtn);
    expect(screen.getByTestId('unlock-click-hint')).toHaveTextContent('再點擊 1 次解除鎖定');
    expect(useUIStore.getState().kioskMode).toBe(true);

    // 5th click: triggers unlock!
    fireEvent.click(logoBtn);
    expect(useUIStore.getState().kioskMode).toBe(false);
  });

  it('re-requests wake lock when document becomes visible again', async () => {
    const requestWakeLockMock = vi.fn().mockResolvedValue({
      release: vi.fn(),
      addEventListener: vi.fn(),
    });

    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: requestWakeLockMock },
      configurable: true,
    });

    useUIStore.setState({ kioskMode: true });

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    document.dispatchEvent(new Event('visibilitychange'));

    expect(requestWakeLockMock).toHaveBeenCalled();
  });
});
