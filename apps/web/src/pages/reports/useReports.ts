import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, type AuditTrailQueryParams } from './reportsApi';
import type { PdfExportRequest } from '@lrp/shared';

export function useDailyCompletion(date: string) {
  return useQuery({
    queryKey: ['reports', 'daily-completion', date],
    queryFn: () => reportsApi.getDailyCompletion(date),
    staleTime: 60 * 1000,
  });
}

export function useResidentSummary() {
  return useQuery({
    queryKey: ['reports', 'resident-summary'],
    queryFn: () => reportsApi.getResidentSummary(),
    staleTime: 60 * 1000,
  });
}

export function useAlerts(params: { severity?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['reports', 'alerts', params],
    queryFn: () => reportsApi.getAlerts(params),
    staleTime: 30 * 1000,
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'acknowledged' | 'resolved' }) =>
      reportsApi.updateAlertStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'alerts'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'resident-summary'] });
    },
  });
}

export function useAuditTrail(params: AuditTrailQueryParams = {}) {
  return useQuery({
    queryKey: ['reports', 'audit-trail', params],
    queryFn: () => reportsApi.getAuditTrail(params),
    staleTime: 30 * 1000,
  });
}

export function useExportPdf() {
  return useMutation({
    mutationFn: (request: PdfExportRequest) => reportsApi.exportPdf(request),
  });
}
