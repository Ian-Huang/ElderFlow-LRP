import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careRecordRepository, type CareRecordListParams } from '@/repositories/careRecordRepository';
import { useSyncStore } from '@/stores/syncStore';
import type { CareRecordCreateInput, CareRecordUpdateInput, SupplementRecordInput } from '@lrp/shared';

export function useCareRecords(params: CareRecordListParams = {}) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['care-records', { ...params, isOnline }],
    queryFn: () => careRecordRepository.list({ ...params, isOnline }),
  });
}

export function useCareRecordDetail(id: string | undefined) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['care-record', id, { isOnline }],
    queryFn: () => (id ? careRecordRepository.getById(id, { isOnline }) : null),
    enabled: Boolean(id),
  });
}

export function useCreateCareRecord() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: (data: CareRecordCreateInput) => careRecordRepository.create(data, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-records'] });
    },
  });
}

export function useUpdateCareRecord() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CareRecordUpdateInput }) =>
      careRecordRepository.update(id, data, { isOnline }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['care-records'] });
      queryClient.invalidateQueries({ queryKey: ['care-record', id] });
    },
  });
}

export function useApplyCareRecordSupplement() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: (payload: SupplementRecordInput) =>
      careRecordRepository.applySupplement(payload, { isOnline }),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['care-records'] });
      queryClient.invalidateQueries({ queryKey: ['care-record', payload.recordId] });
    },
  });
}
