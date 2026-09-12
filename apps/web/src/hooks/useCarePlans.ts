import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  carePlanRepository,
  type CarePlanListParams,
} from '@/repositories/carePlanRepository';
import { useSyncStore } from '@/stores/syncStore';
import type {
  CarePlanCreateInput,
  CarePlanUpdateInput,
  CarePlanStatus,
} from '@lrp/shared';

export function useCarePlans(params: CarePlanListParams = {}) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['care-plans', { ...params, isOnline }],
    queryFn: () => carePlanRepository.list({ ...params, isOnline }),
  });
}

export function useCarePlanDetail(id: string | undefined) {
  const isOnline = useSyncStore((state) => state.isOnline);

  return useQuery({
    queryKey: ['care-plan', id, { isOnline }],
    queryFn: () => (id ? carePlanRepository.getById(id, { isOnline }) : null),
    enabled: Boolean(id),
  });
}

export function useCreateCarePlan() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: (data: CarePlanCreateInput) =>
      carePlanRepository.create(data, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['resident-care-plans'] });
    },
  });
}

export function useUpdateCarePlan() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CarePlanUpdateInput }) =>
      carePlanRepository.update(id, data, { isOnline }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['care-plan', id] });
      queryClient.invalidateQueries({ queryKey: ['resident-care-plans'] });
    },
  });
}

export function useTransitionCarePlanStatus() {
  const queryClient = useQueryClient();
  const isOnline = useSyncStore((state) => state.isOnline);

  return useMutation({
    mutationFn: ({
      planId,
      status,
      reason,
    }: {
      planId: string;
      status: CarePlanStatus;
      reason?: string;
    }) => carePlanRepository.transitionStatus(planId, status, reason, { isOnline }),
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['care-plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['resident-care-plans'] });
    },
  });
}
