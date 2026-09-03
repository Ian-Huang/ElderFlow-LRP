import { useState } from 'react';
import type { Resident } from '@lrp/shared';
import apiClient from '@/api/apiClient';

interface ResidentInactiveModalProps {
  resident: Resident | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Resident) => void;
}

export function ResidentInactiveModal({
  resident,
  isOpen,
  onClose,
  onSuccess,
}: ResidentInactiveModalProps) {
  const [reasonCategory, setReasonCategory] = useState('已結案');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !resident) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const fullReason = notes ? `${reasonCategory}：${notes}` : reasonCategory;

    try {
      const response = await apiClient.delete<{ success: boolean; resident?: Resident }>(
        `/residents/${resident.residentId}`,
        { data: { reason: fullReason } }
      );

      if (response.success) {
        const updated: Resident = response.data?.resident || {
          ...resident,
          status: 'Inactive',
          inactiveReason: fullReason,
          updatedAt: new Date().toISOString(),
        };
        onSuccess(updated);
        onClose();
      } else {
        setError(response.error?.message || '停用住民失敗');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '發生未預期錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactive-dialog-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3 text-danger-600">
          <div className="p-2 bg-danger-50 rounded-full">
            <AlertTriangleIcon className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="inactive-dialog-title" className="text-lg font-bold text-gray-900">
              確認停用 / 住民離院
            </h2>
            <p className="text-xs text-gray-500">
              {resident.name} ({resident.residentId})
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          停用後該住民狀態將變更為「已離院」，其床位 ({resident.bedNumber || '無'}) 將釋出，但過去所有照護記錄與歷史資料仍會完整保留。
        </p>

        {error && (
          <div className="p-3 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-lg" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reasonCategory" className="block text-sm font-medium text-gray-700 mb-1">
              離院 / 停用原因 <span className="text-danger-500">*</span>
            </label>
            <select
              id="reasonCategory"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="input w-full"
              required
            >
              <option value="已結案">已結案</option>
              <option value="轉院">轉至其他醫療/照護機構</option>
              <option value="返家自行照護">返家自行照護</option>
              <option value="死亡">死亡 / 歿</option>
              <option value="其他">其他原因</option>
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              補充說明備註
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              placeholder="請輸入詳細離院備註說明..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary bg-danger-600 hover:bg-danger-700 focus:ring-danger-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? '處理中...' : '確認停用'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}
