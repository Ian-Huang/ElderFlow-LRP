import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationRepository, type MedicationListParams } from '@/repositories/medicationRepository';
import { useSyncStore } from '@/stores/syncStore';
import type {
  MedicationCreateInput,
  MedicationUpdateInput,
  MedicationAdministrationCreateInput,
} from '@lrp/shared';

export function useMedications(params: MedicationListParams = {}) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['medications', { ...params, isOnline }],
    queryFn: () => medicationRepository.list({ ...params, isOnline }),
  });
}

export function useMedicationDetail(id: string | undefined) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['medication', id, { isOnline }],
    queryFn: () => (id ? medicationRepository.getById(id, { isOnline }) : null),
    enabled: Boolean(id),
  });
}

export function useCreateMedication() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: (data: MedicationCreateInput) => medicationRepository.create(data, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-alerts'] });
    },
  });
}

export function useUpdateMedication() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MedicationUpdateInput }) =>
      medicationRepository.update(id, data, { isOnline }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication', id] });
      queryClient.invalidateQueries({ queryKey: ['medication-alerts'] });
    },
  });
}

export function useAdministerMedication() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: (payload: MedicationAdministrationCreateInput) =>
      medicationRepository.administer(payload, { isOnline }),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication', payload.medicationId] });
      queryClient.invalidateQueries({ queryKey: ['medication-alerts'] });
    },
  });
}
