import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MedicationCreateSchema } from '@lrp/shared';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import {
  DEFAULT_SCHEDULES,
  FREQUENCY_LABELS,
  calculateNextScheduled,
  getMedicationStockStatus,
} from '@/utils/medicationScheduler';
import apiClient from '@/api/apiClient';
import type { Medication, MedicationFrequency, Resident, PaginatedResponse } from '@lrp/shared';
import { z } from 'zod';

type MedicationFormInput = z.input<typeof MedicationCreateSchema>;
type MedicationFormOutput = z.output<typeof MedicationCreateSchema>;

export function MedicationFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scheduleList, setScheduleList] = useState<string[]>(['08:00']);
  const [newTimeSlot, setNewTimeSlot] = useState('12:00');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch residents for dropdown
  const { data: residentsData } = useQuery({
    queryKey: ['residents-select'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Resident>>('/residents', {
        pageSize: 100,
        status: 'Active',
      });
      return res.data?.items || [];
    },
  });

  // Fetch existing medication if editing
  const { data: existingMed, isLoading: isMedLoading } = useQuery({
    queryKey: ['medications', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<Medication>(`/medications/${id}`);
      return res.data || null;
    },
    enabled: isEditing,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MedicationFormInput, unknown, MedicationFormOutput>({
    resolver: zodResolver(MedicationCreateSchema),
    defaultValues: {
      residentId: '',
      name: '',
      dosage: '',
      frequency: 'OnceDaily',
      schedule: ['08:00'],
      stockLevel: 30,
      reorderThreshold: 15,
      status: 'Active',
      notes: '',
    },
  });

  const selectedFrequency = watch('frequency') as MedicationFrequency;

  // Populate data in edit mode
  useEffect(() => {
    if (existingMed) {
      reset({
        residentId: existingMed.residentId,
        name: existingMed.name,
        dosage: existingMed.dosage,
        frequency: existingMed.frequency,
        schedule: existingMed.schedule,
        stockLevel: existingMed.stockLevel,
        reorderThreshold: existingMed.reorderThreshold,
        status: existingMed.status,
        notes: existingMed.notes || '',
      });
      setScheduleList(existingMed.schedule || []);
    }
  }, [existingMed, reset]);

  // Handle frequency change default schedules
  const handleFrequencyChange = (freq: MedicationFrequency) => {
    setValue('frequency', freq);
    const defaults = DEFAULT_SCHEDULES[freq] || [];
    setScheduleList(defaults);
    setValue('schedule', defaults);
  };

  const handleAddScheduleSlot = () => {
    if (!newTimeSlot) return;
    if (scheduleList.includes(newTimeSlot)) return;
    const updated = [...scheduleList, newTimeSlot].sort();
    setScheduleList(updated);
    setValue('schedule', updated);
  };

  const handleRemoveScheduleSlot = (slot: string) => {
    const updated = scheduleList.filter((s) => s !== slot);
    setScheduleList(updated);
    setValue('schedule', updated);
  };

  const mutation = useOfflineMutation<Record<string, unknown>, Medication>({
    entityType: 'Medications',
    table: 'Medications',
    operation: isEditing ? 'update' : 'create',
    queryKey: ['medications'],
    toOptimisticEntity: ({ payload, localId, now, syncStatus }) => {
      const resident = (residentsData || []).find((r) => r.residentId === payload.residentId);
      const nextScheduled = calculateNextScheduled((payload.schedule as string[]) || []);
      const stockLevel = Number(payload.stockLevel ?? 0);
      const reorderThreshold = Number(payload.reorderThreshold ?? 15);
      const stockStatus = getMedicationStockStatus(stockLevel, reorderThreshold);

      return {
        ...payload,
        medicationId: id || localId,
        residentName: resident?.name || '未知住民',
        bedNumber: resident?.bedNumber || '未排床',
        nextScheduled,
        stockStatus,
        status: (payload.status as string) || 'Active',
        syncStatus,
        createdAt: existingMed?.createdAt || now,
        updatedAt: now,
      };
    },
    mutationFn: async (payload) => {
      if (isEditing && id) {
        const res = await apiClient.patch<Medication>(`/medications/${id}`, payload);
        if (res.success && res.data) return res.data;
        throw new Error(res.error?.message || '更新藥物失敗');
      } else {
        const res = await apiClient.post<Medication>('/medications', payload);
        if (res.success && res.data) return res.data;
        throw new Error(res.error?.message || '新增藥物失敗');
      }
    },
  });

  const onSubmit = async (values: MedicationFormOutput) => {
    setErrorMessage(null);
    try {
      await mutation.mutateAsync(values as unknown as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-alerts'] });
      navigate('/medications');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '儲存失敗，請檢查輸入內容');
    }
  };

  if (isEditing && isMedLoading) {
    return (
      <div className="card p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
        <p>載入藥物資料中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link to="/medications" className="btn-ghost text-xs mb-2 inline-flex items-center text-gray-500 hover:text-gray-900">
          <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          返回藥物列表
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? '編輯藥物主檔' : '新增住民藥物'}</h1>
        <p className="text-gray-500 text-sm mt-1">設定藥物名稱、劑量、給藥頻率、時間表及安全庫存警戒水位</p>
      </div>

      {errorMessage && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <div className="card-body p-6 space-y-6">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2">1. 住民與藥品基本資料</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="residentId" className="block text-xs font-semibold text-gray-700 mb-1">
                  所屬住民 <span className="text-danger-500">*</span>
                </label>
                <select
                  id="residentId"
                  {...register('residentId')}
                  disabled={isEditing}
                  className={`input w-full text-xs ${errors.residentId ? 'border-danger-500' : ''}`}
                >
                  <option value="">請選擇住民</option>
                  {(residentsData || []).map((r) => (
                    <option key={r.residentId} value={r.residentId}>
                      {r.bedNumber ? `[床位 ${r.bedNumber}] ` : ''}
                      {r.name} ({r.residentId})
                    </option>
                  ))}
                </select>
                {errors.residentId && <p className="text-danger-500 text-xs mt-1">{errors.residentId.message}</p>}
              </div>

              <div>
                <label htmlFor="status" className="block text-xs font-semibold text-gray-700 mb-1">
                  藥物狀態 <span className="text-danger-500">*</span>
                </label>
                <select id="status" {...register('status')} className="input w-full text-xs">
                  <option value="Active">使用中 (Active)</option>
                  <option value="OnHold">暫停使用 (OnHold)</option>
                  <option value="Discontinued">已停用/結案 (Discontinued)</option>
                </select>
              </div>

              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">
                  藥品名稱 (商品名/學名) <span className="text-danger-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="例如：Norvasc 脈優錠 (Amlodipine)"
                  {...register('name')}
                  className={`input w-full text-xs ${errors.name ? 'border-danger-500' : ''}`}
                />
                {errors.name && <p className="text-danger-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="dosage" className="block text-xs font-semibold text-gray-700 mb-1">
                  劑量與規格 <span className="text-danger-500">*</span>
                </label>
                <input
                  id="dosage"
                  type="text"
                  placeholder="例如：5mg / 顆、100U / 瓶"
                  {...register('dosage')}
                  className={`input w-full text-xs ${errors.dosage ? 'border-danger-500' : ''}`}
                />
                {errors.dosage && <p className="text-danger-500 text-xs mt-1">{errors.dosage.message}</p>}
              </div>
            </div>

            <h2 className="text-base font-bold text-gray-900 border-b pb-2 pt-2">2. 給藥頻率與時間表</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="frequency" className="block text-xs font-semibold text-gray-700 mb-1">
                  給藥頻率 <span className="text-danger-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {(Object.keys(FREQUENCY_LABELS) as MedicationFrequency[]).map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => handleFrequencyChange(freq)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-colors ${
                        selectedFrequency === freq
                          ? 'border-primary-600 bg-primary-50 text-primary-800 ring-2 ring-primary-500/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {FREQUENCY_LABELS[freq]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Schedule editor */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  每日給藥時間點 ({scheduleList.length} 個時段)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {scheduleList.map((slot) => (
                    <span
                      key={slot}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-100 text-primary-800 font-mono text-xs rounded-lg font-bold"
                    >
                      {slot}
                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleSlot(slot)}
                        className="hover:text-danger-600 rounded-full p-0.5"
                        title="移除時段"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {scheduleList.length === 0 && (
                    <span className="text-xs text-gray-400 italic">無特定排程時段 (PRN 需要時)</span>
                  )}
                </div>

                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="time"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    className="input text-xs font-mono py-1 px-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddScheduleSlot}
                    className="btn-secondary text-xs py-1.5 px-3 whitespace-nowrap"
                  >
                    + 加入時段
                  </button>
                </div>
              </div>
            </div>

            <h2 className="text-base font-bold text-gray-900 border-b pb-2 pt-2">3. 庫存管理與警示</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="stockLevel" className="block text-xs font-semibold text-gray-700 mb-1">
                  目前現有庫存數量 <span className="text-danger-500">*</span>
                </label>
                <input
                  id="stockLevel"
                  type="number"
                  min={0}
                  {...register('stockLevel', { valueAsNumber: true })}
                  className={`input w-full text-xs font-mono ${errors.stockLevel ? 'border-danger-500' : ''}`}
                />
                {errors.stockLevel && <p className="text-danger-500 text-xs mt-1">{errors.stockLevel.message}</p>}
              </div>

              <div>
                <label htmlFor="reorderThreshold" className="block text-xs font-semibold text-gray-700 mb-1">
                  安全補貨警示水位 (預設 15) <span className="text-danger-500">*</span>
                </label>
                <input
                  id="reorderThreshold"
                  type="number"
                  min={0}
                  {...register('reorderThreshold', { valueAsNumber: true })}
                  className={`input w-full text-xs font-mono ${errors.reorderThreshold ? 'border-danger-500' : ''}`}
                />
                <p className="text-[11px] text-gray-500 mt-1">當庫存低於或等於此數量時，系統將觸發低庫存警告</p>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-semibold text-gray-700 mb-1">
                醫囑備註 / 特殊注意事項
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="例如：飯前 30 分鐘服用、需量測血壓收縮壓 > 100 mmHg 方可給藥、整顆吞服勿咬碎"
                {...register('notes')}
                className="input w-full text-xs"
              />
            </div>
          </div>

          <div className="card-footer p-6 bg-gray-50 border-t flex items-center justify-between">
            <Link to="/medications" className="btn-ghost text-xs">
              取消
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="btn-primary text-xs py-2 px-6 font-bold"
            >
              {mutation.isPending ? '儲存中...' : isEditing ? '儲存藥物變更' : '建立藥物主檔'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}
