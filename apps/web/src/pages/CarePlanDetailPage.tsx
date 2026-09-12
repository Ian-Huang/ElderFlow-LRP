import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCarePlanDetail, useTransitionCarePlanStatus } from '@/hooks/useCarePlans';
import { useResidents } from '@/hooks/useResidents';
import { formatDate, formatDateTime } from '@/utils/rocDate';
import { CarePlanStatusModal } from '@/components/CarePlanStatusModal';
import { StatusBadge } from './CarePlansPage';
import type { CarePlanStatus, ServiceType } from '@lrp/shared';

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  PhysicalTherapy: '物理治療',
  SpeechTherapy: '語言治療',
  NutritionCounseling: '營養諮詢',
  Rehabilitation: '復健照護',
  NursingCare: '專業護理',
  DailyCare: '生活照顧',
  SocialWork: '心理社工',
  Other: '其他服務',
};

const RESPONSIBLE_ROLE_LABELS: Record<string, string> = {
  Nurse: '護理師',
  Caregiver: '照顧服務員',
  Therapist: '物理/職能治療師',
  SocialWorker: '社工師',
  Doctor: '專科醫師',
};

const GOAL_STATUS_LABELS: Record<string, { label: string; badgeClass: string }> = {
  NotStarted: { label: '未開始', badgeClass: 'bg-gray-100 text-gray-700' },
  InProgress: { label: '進行中', badgeClass: 'bg-blue-100 text-blue-800' },
  Achieved: { label: '已達成', badgeClass: 'bg-emerald-100 text-emerald-800' },
  NotAchieved: { label: '未達成', badgeClass: 'bg-rose-100 text-rose-800' },
};

export function CarePlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();
  const canManage = hasRole(['supervisor', 'admin', 'sysadmin']);

  const { data: plan, isLoading, isError } = useCarePlanDetail(id);
  const transitionMutation = useTransitionCarePlanStatus();

  // Fetch resident full info if available
  const { data: residentsData } = useResidents({
    pageSize: 100,
  });
  const resident = residentsData?.items.find((r) => r.residentId === plan?.residentId);

  // Status transition modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<CarePlanStatus>('Active');

  const handleOpenStatusModal = (status: CarePlanStatus) => {
    setTargetStatus(status);
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusTransition = async (status: CarePlanStatus, reason?: string) => {
    if (!plan) return;
    await transitionMutation.mutateAsync({
      planId: plan.planId,
      status,
      reason,
    });
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center text-gray-500 max-w-5xl mx-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
        <p>載入照護計畫明細中...</p>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="card p-12 text-center text-gray-500 space-y-4 max-w-5xl mx-auto">
        <p className="font-semibold text-gray-700">查無此照護計畫資料或已被移除</p>
        <Link to="/care-plans" className="btn-primary text-xs inline-block">
          返回照護計畫列表
        </Link>
      </div>
    );
  }

  const goals = plan.goals || [];
  const serviceItems = plan.serviceItems || [];

  // Review date alert
  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const isReviewOverdue = plan.reviewDate < todayStr && plan.status === 'Active';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top navigation */}
      <div>
        <Link
          to="/care-plans"
          className="btn-ghost text-xs mb-3 inline-flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          返回照護計畫列表
        </Link>

        {/* Header card with Plan ID and status actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <DocumentTextIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-gray-900">{plan.planId}</h1>
                <StatusBadge status={plan.status} />
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                建立於 {formatDateTime(plan.createdAt)} · 最後更新 {formatDateTime(plan.updatedAt)}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <>
                <Link to={`/care-plans/${plan.planId}/edit`} className="btn-secondary text-xs py-1.5 px-3">
                  <PencilIcon className="w-4 h-4 mr-1" />
                  編輯計畫
                </Link>

                {/* Status Transition buttons according to current status */}
                {plan.status === 'Draft' && (
                  <button
                    onClick={() => handleOpenStatusModal('Active')}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    啟用計畫
                  </button>
                )}

                {plan.status === 'Active' && (
                  <>
                    <button
                      onClick={() => handleOpenStatusModal('Completed')}
                      className="btn-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      完成計畫
                    </button>
                    <button
                      onClick={() => handleOpenStatusModal('Archived')}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      封存計畫
                    </button>
                  </>
                )}

                {(plan.status === 'Completed' || plan.status === 'Archived') && (
                  <button
                    onClick={() => handleOpenStatusModal('Active')}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    重新啟用
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resident & Dates Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Resident Card */}
        <div className="card p-5 space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <UserIcon className="w-4 h-4 text-primary-600" />
              服務對象基本資料
            </h2>
            <Link
              to={`/residents/${plan.residentId}`}
              className="text-xs text-primary-600 hover:underline font-medium"
            >
              檢視完整個案檔案 →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100 text-sm">
            <div>
              <span className="text-xs text-gray-400 block">住民姓名</span>
              <span className="font-bold text-gray-900">{plan.residentName || resident?.name || '未知'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">住民編號</span>
              <span className="font-mono text-gray-700">{plan.residentId}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">床位編號</span>
              <span className="font-bold text-primary-700">{plan.bedNumber || resident?.bedNumber || '未分配'}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">性別 / 身分</span>
              <span className="text-gray-700">
                {resident?.gender === 'Male' ? '男性' : resident?.gender === 'Female' ? '女性' : '—'}
                {resident?.identityType ? ` · ${resident.identityType}` : ''}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">三管狀態</span>
              {resident?.hasThreePipe ? (
                <span className="inline-flex items-center text-xs font-semibold text-danger-700 bg-danger-50 px-2 py-0.5 rounded">
                  具三管 (1:15 護理比)
                </span>
              ) : (
                <span className="text-xs text-gray-600">無管路留置 (一般 1:20)</span>
              )}
            </div>
            <div>
              <span className="text-xs text-gray-400 block">照護計畫建立者</span>
              <span className="text-gray-700">{plan.createdBy || '系統管理員'}</span>
            </div>
          </div>
        </div>

        {/* Evaluation Dates Card */}
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-primary-600" />
            評估與複審週期
          </h2>

          <div className="space-y-3 pt-2 border-t border-gray-100 text-sm">
            <div>
              <span className="text-xs text-gray-400 block">評估日期</span>
              <span className="font-semibold text-gray-900">{formatDate(plan.assessmentDate)}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">預定複審日期</span>
              <span className="font-semibold text-gray-900">{formatDate(plan.reviewDate)}</span>
            </div>
            <div>
              {isReviewOverdue ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  ⚠️ 複審日期已逾期，請專業團隊盡速召開照護討論會議進行再評估。
                </div>
              ) : plan.status === 'Active' ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  ✓ 照護計畫執行中，定期複審追蹤。
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Section: Goals list with 0-100% progress bars */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TargetIcon className="w-5 h-5 text-primary-600" />
              照護目標清單 ({goals.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              依據評估設定之短期與長期目標，包含執行進度量化指標與歷程備註
            </p>
          </div>
        </div>

        {goals.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
            此照護計畫尚未設定具體目標
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal, index) => {
              const progressVal = goal.progress ?? 0;
              const statusCfg = GOAL_STATUS_LABELS[goal.status] || {
                label: goal.status,
                badgeClass: 'bg-gray-100 text-gray-700',
              };

              return (
                <div
                  key={goal.goalId || index}
                  className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-snug">
                          {goal.description}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-mono">
                          預定達成日期：{formatDate(goal.targetDate)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold self-start ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Progress bar (0-100%) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">執行進度</span>
                      <span className="font-mono font-bold text-gray-900">{progressVal}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          progressVal >= 100
                            ? 'bg-emerald-500'
                            : progressVal >= 50
                            ? 'bg-primary-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressVal}%` }}
                      />
                    </div>
                  </div>

                  {/* Progress notes */}
                  {goal.progressNotes && (
                    <div className="text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200/70">
                      <span className="font-semibold text-gray-700 mr-1">進度追蹤記錄：</span>
                      {goal.progressNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section: Service Items Timeline / Schedule */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ClipboardListIcon className="w-5 h-5 text-primary-600" />
              服務項目時間表 ({serviceItems.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              各專業角色分工、服務內容、實施頻率與起訖週期
            </p>
          </div>
        </div>

        {serviceItems.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
            此照護計畫尚未設定服務項目
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs border-b">
                  <th className="py-3 px-3 font-semibold">服務類型</th>
                  <th className="py-3 px-3 font-semibold">服務項目名稱</th>
                  <th className="py-3 px-3 font-semibold">執行頻率</th>
                  <th className="py-3 px-3 font-semibold">負責角色</th>
                  <th className="py-3 px-3 font-semibold">實施期程</th>
                  <th className="py-3 px-3 font-semibold">注意事項與備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {serviceItems.map((item, idx) => {
                  const typeLabel = item.serviceType
                    ? SERVICE_TYPE_LABELS[item.serviceType] || item.serviceType
                    : '一般照護';
                  const roleLabel = item.responsibleRole
                    ? RESPONSIBLE_ROLE_LABELS[item.responsibleRole] || item.responsibleRole
                    : '照顧人員';

                  return (
                    <tr key={item.itemId || idx} className="hover:bg-gray-50/70">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 font-semibold text-primary-700 whitespace-nowrap">
                        {item.frequency}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap font-mono">
                        {item.startDate ? formatDate(item.startDate) : '開始日未指定'} ~{' '}
                        {item.endDate ? formatDate(item.endDate) : '長期持續'}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 max-w-xs">
                        {item.notes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status modal */}
      <CarePlanStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusTransition}
        currentStatus={plan.status}
        targetStatus={targetStatus}
        planId={plan.planId}
      />
    </div>
  );
}

// Icons
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  );
}
