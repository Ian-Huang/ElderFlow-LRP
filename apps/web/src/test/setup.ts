import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
if (typeof window !== 'undefined') {
  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

// In beforeEach, also re-ensure ResizeObserver is attached in case any test overwrites it
beforeEach(() => {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  if (typeof window !== 'undefined') {
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  }
});

// Polyfill Blob.prototype.stream for jsdom environment compatibility with Undici & MSW
if (typeof window !== 'undefined' && typeof window.Blob !== 'undefined') {
  if (typeof window.Blob.prototype.stream !== 'function') {
    window.Blob.prototype.stream = function () {
      return new ReadableStream({
        start: async (controller) => {
          const buf = await this.arrayBuffer();
          controller.enqueue(new Uint8Array(buf));
          controller.close();
        },
      });
    };
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

Object.defineProperty(window, 'SyncManager', {
  writable: true,
  value: class SyncManagerMock {
    register() {
      return Promise.resolve();
    }
  },
});

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    ready: Promise.resolve({
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
      },
    }),
    addEventListener: vi.fn(),
  },
});

// Suppress console.error in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});