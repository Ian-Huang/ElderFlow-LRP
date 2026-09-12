import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import React, { ReactElement } from 'react';
import { setupServer } from 'msw/node';
import { handlers } from '@/mocks/handlers';

export const testServer = setupServer(...handlers);

export function setupReportTestServer() {
  if (typeof window !== 'undefined' && typeof globalThis.Blob !== 'undefined') {
    window.Blob = globalThis.Blob;
  }

  beforeAll(() => {
    testServer.listen({ onUnhandledRequest: 'bypass' });
  });
  afterEach(() => {
    testServer.resetHandlers();
  });
  afterAll(() => {
    testServer.close();
  });
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: MemoryRouterProps['initialEntries'];
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    initialEntries = ['/'],
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}
