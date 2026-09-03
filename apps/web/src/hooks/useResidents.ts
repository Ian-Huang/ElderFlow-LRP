import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { residentRepository, type ResidentListParams } from '@/repositories/residentRepository';
import { useSyncStore } from '@/stores/syncStore';
import type { ResidentCreateInput, ResidentUpdateInput } from '@lrp/shared';

export function useResidents(params: ResidentListParams = {}) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['residents', { ...params, isOnline }],
    queryFn: () => residentRepository.list({ ...params, isOnline }),
  });
}

export function useResidentDetail(id: string | undefined) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['resident', id, { isOnline }],
    queryFn: () => (id ? residentRepository.getById(id, { isOnline }) : null),
    enabled: Boolean(id),
  });
}

export function useCreateResident() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: (data: ResidentCreateInput) => residentRepository.create(data, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useUpdateResident() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResidentUpdateInput }) =>
      residentRepository.update(id, data, { isOnline }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
    },
  });
}

export function useSetResidentInactive() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      residentRepository.setInactive(id, reason, { isOnline }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['resident', id] });
    },
  });
}
