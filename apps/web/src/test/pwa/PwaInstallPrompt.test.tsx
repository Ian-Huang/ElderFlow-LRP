import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PwaInstallPrompt,
  isIosSafari,
  isStandaloneDisplay,
} from '@/components/pwa/PwaInstallPrompt';

describe('PwaInstallPrompt', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalUserAgent: PropertyDescriptor | undefined;
  let localStore: Record<string, string> = {};

  beforeEach(() => {
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

    originalMatchMedia = window.matchMedia;
    originalUserAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    if (originalUserAgent) {
      Object.defineProperty(navigator, 'userAgent', originalUserAgent);
    }
    vi.restoreAllMocks();
  });

  it('renders nothing by default if beforeinstallprompt has not fired and not iOS', () => {
    const { container } = render(<PwaInstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing if already in standalone display mode', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<PwaInstallPrompt />);
    expect(container.firstChild).toBeNull();
    expect(isStandaloneDisplay()).toBe(true);
  });

  it('renders install button when beforeinstallprompt event is dispatched', async () => {
    render(<PwaInstallPrompt />);

    const beforeInstallEvent = new Event('beforeinstallprompt') as any;
    beforeInstallEvent.prompt = vi.fn().mockResolvedValue(undefined);
    beforeInstallEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    fireEvent(window, beforeInstallEvent);

    const installButton = await screen.findByRole('button', { name: /安裝應用程式/i });
    expect(installButton).toBeInTheDocument();
  });

  it('invokes prompt() and marks installed on acceptance', async () => {
    render(<PwaInstallPrompt />);

    const promptMock = vi.fn().mockResolvedValue(undefined);
    const beforeInstallEvent = new Event('beforeinstallprompt') as any;
    beforeInstallEvent.prompt = promptMock;
    beforeInstallEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    fireEvent(window, beforeInstallEvent);

    const installButton = await screen.findByRole('button', { name: /安裝應用程式/i });
    fireEvent.click(installButton);

    expect(promptMock).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(localStorage.getItem('pwa-installed')).toBe('true');
      expect(screen.queryByRole('button', { name: /安裝應用程式/i })).toBeNull();
    });
  });

  it('hides install button when appinstalled event fires', async () => {
    render(<PwaInstallPrompt />);

    const beforeInstallEvent = new Event('beforeinstallprompt') as any;
    beforeInstallEvent.prompt = vi.fn();
    beforeInstallEvent.userChoice = new Promise(() => {});

    fireEvent(window, beforeInstallEvent);

    expect(await screen.findByRole('button', { name: /安裝應用程式/i })).toBeInTheDocument();

    // Trigger appinstalled
    fireEvent(window, new Event('appinstalled'));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /安裝應用程式/i })).toBeNull();
      expect(localStorage.getItem('pwa-installed')).toBe('true');
    });
  });

  it('shows iOS installation guide modal for iOS Safari users', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      configurable: true,
    });

    expect(isIosSafari()).toBe(true);

    render(<PwaInstallPrompt />);

    const installButton = await screen.findByRole('button', { name: /安裝應用程式/i });
    expect(installButton).toBeInTheDocument();

    fireEvent.click(installButton);

    // Modal dialog should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/在 iOS 安裝 LRP 應用程式/i)).toBeInTheDocument();
    expect(screen.getByText(/點擊 Safari 底部工具列的/i)).toBeInTheDocument();
    expect(screen.getAllByText(/加入主畫面/i).length).toBeGreaterThanOrEqual(1);

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /我知道了/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
