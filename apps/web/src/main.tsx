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

// Initialize MSW in development
if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API !== 'false') {
  import('./mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass',
      waitUntilReady: true,
    });
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
}

let cleanupSyncEngine: (() => void) | undefined;

if (typeof window !== 'undefined') {
  void initializeSyncEngine().then((cleanup) => {
    cleanupSyncEngine = cleanup;
  });

  window.addEventListener('beforeunload', () => {
    cleanupSyncEngine?.();
  });
}