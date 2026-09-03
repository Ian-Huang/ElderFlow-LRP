import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/apiClient';
import type { Medication, MedicationAdministration } from '@lrp/shared';

interface MedicationAdministerModalProps {
  medication: Medication | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MedicationAdministerModal({
  medication,
  isOpen,
  onClose,
  onSuccess,
}: MedicationAdministerModalProps) {
  const { user } = useAuthStore();
  const { isOnline } = useSyncStore();
  const queryClient = useQueryClient();

  const [actualTime, setActualTime] = useState<string>(() => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [administeredBy, setAdministeredBy] = useState<string>(user?.name || '護理人員');
  const [status, setStatus] = useState<'Administered' | 'Missed' | 'Refused' | 'Held'>('Administered');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const administerMutation = useOfflineMutation<
    Record<string, unknown>,
    { medication: Medication; administration: MedicationAdministration }
  >({
    entityType: 'Medications',
    table: 'Medications',
    operation: 'update',
    queryKey: ['medications'],
    toOptimisticEntity: ({ payload, now, syncStatus }) => {
      if (!medication) return { syncStatus, createdAt: now, updatedAt: now };
      const newStock =
        payload.status === 'Administered' ? Math.max(0, medication.stockLevel - 1) : medication.stockLevel;
      return {
        ...medication,
        stockLevel: newStock,
        lastAdministered:
          payload.status === 'Administered'
            ? new Date(payload.actualTime as string).toISOString()
            : medication.lastAdministered,
        syncStatus,
        updatedAt: now,
      };
    },
    mutationFn: async (payload) => {
      if (!medication) throw new Error('未指定藥物');
      const res = await apiClient.post<{ medication: Medication; administration: MedicationAdministration }>(
        `/medications/${medication.medicationId}/administer`,
        {
          ...payload,
          actualTime: new Date(payload.actualTime as string).toISOString(),
        }
      );
      if (!res.success || !res.data) {
        throw new Error(res.error?.message || '給藥失敗');
      }
      return res.data;
    },
  });

  if (!isOpen || !medication) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!administeredBy.trim()) {
      setErrorMessage('請輸入執行人員姓名');
      return;
    }

    if (status === 'Administered' && medication.stockLevel <= 0) {
      if (!confirm('此藥品目前庫存為 0，確定仍要執行給藥並記錄嗎？')) {
        return;
      }
    }

    try {
      await administerMutation.mutateAsync({
        administeredBy: administeredBy.trim(),
        actualTime,
        status,
        notes: notes.trim() || undefined,
      });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      queryClient.invalidateQueries({ queryKey: ['medication-alerts'] });
      if (medication) {
        queryClient.invalidateQueries({ queryKey: ['medications', medication.medicationId] });
      }
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : '給藥失敗');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <PillIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-gray-900">
                執行給藥記錄
              </h2>
              <p className="text-xs text-gray-500">
                {medication.residentName} · 床位 {medication.bedNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            aria-label="關閉對話框"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Medication Summary Card */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-900">{medication.name}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  劑量：<span className="font-semibold">{medication.dosage}</span> · 頻率：
                  <span className="font-semibold">{medication.frequency}</span>
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    medication.stockLevel <= 0
                      ? 'bg-danger-100 text-danger-700'
                      : medication.stockLevel <= medication.reorderThreshold
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  庫存: {medication.stockLevel}
                </span>
              </div>
            </div>
            {medication.notes && (
              <p className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-100">
                醫囑備註：{medication.notes}
              </p>
            )}
          </div>

          {!isOnline && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>目前為離線模式，給藥記錄將暫存至本機 IndexedDB，連線後自動同步。</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="adminStatus" className="block text-xs font-semibold text-gray-700 mb-1">
                給藥狀態 <span className="text-danger-500">*</span>
              </label>
              <select
                id="adminStatus"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Administered' | 'Missed' | 'Refused' | 'Held')}
                className="input w-full text-xs"
              >
                <option value="Administered">已完成給藥 (Administered)</option>
                <option value="Refused">住民拒絕 (Refused)</option>
                <option value="Held">暫緩/醫師指示停藥 (Held)</option>
                <option value="Missed">錯過/外出 (Missed)</option>
              </select>
            </div>

            <div>
              <label htmlFor="actualTime" className="block text-xs font-semibold text-gray-700 mb-1">
                給藥時間 <span className="text-danger-500">*</span>
              </label>
              <input
                id="actualTime"
                type="datetime-local"
                value={actualTime}
                onChange={(e) => setActualTime(e.target.value)}
                className="input w-full text-xs font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="administeredBy" className="block text-xs font-semibold text-gray-700 mb-1">
              執行人員 <span className="text-danger-500">*</span>
            </label>
            <input
              id="administeredBy"
              type="text"
              value={administeredBy}
              onChange={(e) => setAdministeredBy(e.target.value)}
              placeholder="例如：護理師 林淑惠"
              className="input w-full text-xs"
              required
            />
          </div>

          <div>
            <label htmlFor="adminNotes" className="block text-xs font-semibold text-gray-700 mb-1">
              給藥反應與備註說明
            </label>
            <textarea
              id="adminNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例如：住民吞嚥正常、飯後服藥無不適、或記錄量測之血壓血糖數值"
              rows={2}
              className="input w-full text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={administerMutation.isPending}
              className="btn-secondary text-xs py-2 px-4"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={administerMutation.isPending}
              className="btn-primary text-xs py-2 px-5 font-bold"
            >
              {administerMutation.isPending ? '處理中...' : status === 'Administered' ? '確認完成給藥 (扣庫存 1)' : '確認記錄'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
