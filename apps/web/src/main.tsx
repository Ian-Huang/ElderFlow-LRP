import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { App } from './App';
import './styles/index.css';
import { registerPWA } from './utils/pwa';
import { initializeSyncEngine } from './utils/syncEngine';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API !== 'false') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      waitUntilReady: true,
    });
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.StrictMode>
  );

  if (import.meta.env.PROD) {
    registerPWA();
  } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/sw-sync.js', { scope: '/' }).catch(() => undefined);
  }

  let cleanupSyncEngine: (() => void) | undefined;

  if (typeof window !== 'undefined') {
    cleanupSyncEngine = await initializeSyncEngine();

    window.addEventListener('beforeunload', () => {
      cleanupSyncEngine?.();
    });
  }
}

void bootstrap();
