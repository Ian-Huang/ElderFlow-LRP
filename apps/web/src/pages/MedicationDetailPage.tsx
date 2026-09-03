import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime, formatDate } from '@/utils/rocDate';
import { FREQUENCY_LABELS } from '@/utils/medicationScheduler';
import { MedicationAdministerModal } from '@/components/MedicationAdministerModal';
import apiClient from '@/api/apiClient';
import type { Medication, MedicationAdministration } from '@lrp/shared';

export function MedicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();
  const canManage = hasRole(['caregiver', 'supervisor', 'admin', 'sysadmin']);

  const [isAdministerModalOpen, setIsAdministerModalOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockAmount, setRestockAmount] = useState(30);
  const [isRestocking, setIsRestocking] = useState(false);

  const { data: medication, isLoading } = useQuery({
    queryKey: ['medications', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<Medication>(`/medications/${id}`);
      return res.data || null;
    },
  });

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medication) return;
    setIsRestocking(true);
    try {
      const newStock = medication.stockLevel + Number(restockAmount);
      const res = await apiClient.patch<Medication>(`/medications/${medication.medicationId}`, {
        stockLevel: newStock,
      });
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['medications', id] });
        queryClient.invalidateQueries({ queryKey: ['medications'] });
        queryClient.invalidateQueries({ queryKey: ['medication-alerts'] });
        setIsRestockOpen(false);
      }
    } finally {
      setIsRestocking(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!medication) return;
    const newStatus = medication.status === 'Active' ? 'OnHold' : 'Active';
    const confirmMsg =
      newStatus === 'OnHold'
        ? '確定要將此藥物設為暫停使用 (OnHold) 嗎？'
        : '確定要重新啟用此藥物嗎？';
    if (!confirm(confirmMsg)) return;

    const res = await apiClient.patch<Medication>(`/medications/${medication.medicationId}`, {
      status: newStatus,
    });
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['medications', id] });
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    }
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
        <p>載入藥物詳細資訊中...</p>
      </div>
    );
  }

  if (!medication) {
    return (
      <div className="card p-12 text-center text-gray-500 space-y-4">
        <p>查無此藥物資料或已被移除</p>
        <Link to="/medications" className="btn-primary text-xs">
          返回藥物列表
        </Link>
      </div>
    );
  }

  const stockPercentage = Math.min(
    100,
    Math.round((medication.stockLevel / Math.max(medication.reorderThreshold * 2, 30)) * 100)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <Link to="/medications" className="btn-ghost text-xs mb-2 inline-flex items-center text-gray-500 hover:text-gray-900">
          <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          返回藥物列表
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{medication.name}</h1>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  medication.status === 'Active'
                    ? 'badge-success'
                    : medication.status === 'OnHold'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {medication.status === 'Active' ? '使用中' : medication.status === 'OnHold' ? '暫停中' : '已停用'}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  medication.stockLevel <= 0
                    ? 'badge-danger'
                    : medication.stockLevel <= medication.reorderThreshold
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {medication.stockLevel <= 0
                  ? '缺藥 (0)'
                  : medication.stockLevel <= medication.reorderThreshold
                  ? `庫存偏低 (${medication.stockLevel})`
                  : `庫存正常 (${medication.stockLevel})`}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              劑量：<span className="font-semibold text-gray-800">{medication.dosage}</span> · 給藥對象：
              <Link
                to={`/residents/${medication.residentId}`}
                className="text-primary-700 font-bold hover:underline ml-1"
              >
                {medication.residentName} (床位 {medication.bedNumber})
              </Link>
            </p>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsAdministerModalOpen(true)}
                className="btn-primary text-xs py-2 px-4 font-bold shadow-sm"
              >
                <PillIcon className="w-4 h-4 mr-1.5" />
                執行給藥記錄
              </button>
              <Link to={`/medications/${medication.medicationId}/edit`} className="btn-secondary text-xs py-2 px-3">
                編輯主檔
              </Link>
              <button
                onClick={handleToggleStatus}
                className="btn-ghost text-xs text-gray-600 hover:text-gray-900"
              >
                {medication.status === 'Active' ? '暫停藥物' : '恢復使用'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Schedule card */}
        <div className="card">
          <div className="card-body p-5 space-y-3">
            <h2 className="text-xs font-bold text-gray-500 tracking-wider">給藥頻率與時間表</h2>
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-gray-900">
                {FREQUENCY_LABELS[medication.frequency] || medication.frequency}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {medication.schedule && medication.schedule.length > 0 ? (
                medication.schedule.map((slot) => (
                  <span
                    key={slot}
                    className="px-2.5 py-1 bg-primary-50 text-primary-800 text-xs font-mono font-bold rounded-lg"
                  >
                    {slot}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">需要時給藥 (PRN)</span>
              )}
            </div>
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
              <p className="text-gray-400 text-[11px]">下一劑預定時間</p>
              <p className="font-bold text-primary-800 mt-0.5 font-mono">
                {formatDateTime(medication.nextScheduled)}
              </p>
            </div>
          </div>
        </div>

        {/* Stock management card */}
        <div className="card">
          <div className="card-body p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold text-gray-500 tracking-wider">庫存狀態與水位</h2>
              <button
                onClick={() => setIsRestockOpen(true)}
                className="text-xs text-primary-700 font-bold hover:underline"
              >
                + 補充庫存
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-gray-900">{medication.stockLevel}</span>
              <span className="text-xs text-gray-500">
                / 警戒水位 ≤ {medication.reorderThreshold}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  medication.stockLevel <= 0
                    ? 'bg-danger-500 w-0'
                    : medication.stockLevel <= medication.reorderThreshold
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${stockPercentage}%` }}
              />
            </div>

            <div className="pt-1 text-[11px] text-gray-500 flex justify-between">
              <span>最後給藥：{medication.lastAdministered ? formatDateTime(medication.lastAdministered) : '尚無紀錄'}</span>
            </div>
          </div>
        </div>

        {/* Notes & Medical order card */}
        <div className="card">
          <div className="card-body p-5 space-y-2">
            <h2 className="text-xs font-bold text-gray-500 tracking-wider">醫囑備註與注意事項</h2>
            <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 min-h-[72px]">
              {medication.notes || '無特殊醫囑備註。'}
            </p>
            <p className="text-[11px] text-gray-400">
              建檔日期：{formatDate(medication.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" role="dialog">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">補充藥品庫存</h3>
            <p className="text-xs text-gray-500">
              {medication.name} (目前現有庫存：{medication.stockLevel})
            </p>
            <form onSubmit={handleRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  補充數量 (顆 / 瓶)
                </label>
                <input
                  type="number"
                  min={1}
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="input w-full text-xs font-mono"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isRestocking}
                  className="btn-primary text-xs py-1.5 px-4 font-bold"
                >
                  {isRestocking ? '更新中...' : '確認入庫'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Administration History Timeline */}
      <div className="card">
        <div className="card-body p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">給藥執行歷程時間軸</h2>
              <p className="text-xs text-gray-500">依時間順序記錄每次給藥、請假或拒絕之詳細情況</p>
            </div>
            <button
              onClick={() => setIsAdministerModalOpen(true)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              + 新增給藥紀錄
            </button>
          </div>

          {medication.administrationHistory && medication.administrationHistory.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {medication.administrationHistory.map((adm: MedicationAdministration) => (
                <div key={adm.administrationId} className="relative group">
                  <div
                    className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
                      adm.status === 'Administered'
                        ? 'bg-emerald-500 ring-emerald-200'
                        : adm.status === 'Refused'
                        ? 'bg-danger-500 ring-danger-200'
                        : 'bg-amber-500 ring-amber-200'
                    }`}
                  />
                  <div className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold ${
                            adm.status === 'Administered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : adm.status === 'Refused'
                              ? 'bg-danger-100 text-danger-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {adm.status === 'Administered'
                            ? '已完成給藥'
                            : adm.status === 'Refused'
                            ? '住民拒絕'
                            : adm.status === 'Held'
                            ? '暫緩給藥'
                            : '錯過給藥'}
                        </span>
                        <span className="text-xs font-mono text-gray-700 font-bold">
                          {formatDateTime(adm.actualTime)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        執行人員：<span className="text-gray-800 font-medium">{adm.administeredBy}</span>
                      </span>
                    </div>
                    {adm.notes && (
                      <p className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border border-gray-100">
                        備註：{adm.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs">
              尚無給藥執行歷程紀錄，點擊「執行給藥記錄」開始記錄第一筆給藥
            </div>
          )}
        </div>
      </div>

      {/* Administer Modal */}
      <MedicationAdministerModal
        medication={medication}
        isOpen={isAdministerModalOpen}
        onClose={() => setIsAdministerModalOpen(false)}
      />
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
