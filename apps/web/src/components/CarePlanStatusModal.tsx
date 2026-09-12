import { useState } from 'react';
import type { CarePlanStatus } from '@lrp/shared';

interface CarePlanStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetStatus: CarePlanStatus, reason?: string) => Promise<void>;
  currentStatus: CarePlanStatus;
  targetStatus: CarePlanStatus;
  planId: string;
}

const STATUS_LABELS: Record<CarePlanStatus, string> = {
  Draft: '草稿',
  Active: '執行中',
  Completed: '已完成',
  Archived: '已封存',
};

const ACTION_DESCRIPTIONS: Record<CarePlanStatus, { title: string; desc: string; buttonText: string; buttonClass: string }> = {
  Draft: {
    title: '轉為草稿',
    desc: '將計畫退回草稿狀態。',
    buttonText: '確認轉為草稿',
    buttonClass: 'btn-secondary',
  },
  Active: {
    title: '啟用照護計畫',
    desc: '啟用後此照護計畫將正式生效，相關目標與服務項目將納入機構日常照護排程與住民追蹤指標中。',
    buttonText: '確認啟用計畫',
    buttonClass: 'btn-primary',
  },
  Completed: {
    title: '完成照護計畫',
    desc: '將此照護計畫標記為「已完成」。代表此階段設定之照護目標與服務項目已達預期成效或週期結束。',
    buttonText: '確認完成計畫',
    buttonClass: 'btn-primary',
  },
  Archived: {
    title: '封存照護計畫',
    desc: '將此照護計畫歸檔封存。封存後計畫將轉為歷史存查記錄。',
    buttonText: '確認封存計畫',
    buttonClass: 'btn-danger',
  },
};

export function CarePlanStatusModal({
  isOpen,
  onClose,
  onConfirm,
  currentStatus,
  targetStatus,
  planId,
}: CarePlanStatusModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const actionInfo = ACTION_DESCRIPTIONS[targetStatus] || {
    title: `變更狀態為 ${STATUS_LABELS[targetStatus]}`,
    desc: `確定要將此照護計畫狀態變更為「${STATUS_LABELS[targetStatus]}」嗎？`,
    buttonText: '確認變更',
    buttonClass: 'btn-primary',
  };

  const isReactivating = (currentStatus === 'Completed' || currentStatus === 'Archived') && targetStatus === 'Active';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(targetStatus, reason.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '狀態變更失敗，請稍後再試';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-gray-100">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <RefreshIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 id="status-modal-title" className="text-lg font-bold text-gray-900">
                {isReactivating ? '重新啟用照護計畫' : actionInfo.title}
              </h3>
              <p className="text-xs text-gray-500 font-mono">計畫編號：{planId}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-xl space-y-1 text-sm">
            <div className="flex items-center justify-between text-gray-600">
              <span>目前狀態：</span>
              <span className="font-semibold text-gray-900">{STATUS_LABELS[currentStatus]}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span>目標狀態：</span>
              <span className="font-semibold text-primary-700">{STATUS_LABELS[targetStatus]}</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {isReactivating
              ? '此計畫將重新恢復為「執行中」狀態，目標進度與服務排程將再次啟動。'
              : actionInfo.desc}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="transition-reason" className="block text-xs font-semibold text-gray-700 mb-1">
                變更原因或註記 (選填)
              </label>
              <textarea
                id="transition-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="例如：經個別化照護團隊會議評估通過、住民週期目標達成..."
                className="input-field text-sm w-full"
              />
            </div>

            {error && (
              <div className="p-3 bg-danger-50 text-danger-700 text-xs rounded-xl border border-danger-200">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`${actionInfo.buttonClass} text-sm flex items-center gap-1.5`}
              >
                {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                {isReactivating ? '確認重新啟用' : actionInfo.buttonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
