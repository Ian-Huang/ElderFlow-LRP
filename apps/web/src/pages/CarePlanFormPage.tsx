import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CarePlanCreateSchema } from '@lrp/shared';
import { useAuthStore } from '@/stores/authStore';
import { useResidents } from '@/hooks/useResidents';
import {
  useCarePlanDetail,
  useCreateCarePlan,
  useUpdateCarePlan,
} from '@/hooks/useCarePlans';
import type { CarePlanCreateInput, ServiceType } from '@lrp/shared';
import { z } from 'zod';

type CarePlanFormInput = z.input<typeof CarePlanCreateSchema>;
type CarePlanFormOutput = z.output<typeof CarePlanCreateSchema>;

const SERVICE_TYPE_OPTIONS: Array<{ value: ServiceType; label: string }> = [
  { value: 'NursingCare', label: '專業護理 (NursingCare)' },
  { value: 'DailyCare', label: '生活照顧 (DailyCare)' },
  { value: 'PhysicalTherapy', label: '物理治療 (PhysicalTherapy)' },
  { value: 'SpeechTherapy', label: '語言治療 (SpeechTherapy)' },
  { value: 'NutritionCounseling', label: '營養諮詢 (NutritionCounseling)' },
  { value: 'Rehabilitation', label: '復健照護 (Rehabilitation)' },
  { value: 'SocialWork', label: '心理社工 (SocialWork)' },
  { value: 'Other', label: '其他服務 (Other)' },
];

const RESPONSIBLE_ROLE_OPTIONS = [
  { value: 'Nurse', label: '護理師 (Nurse)' },
  { value: 'Caregiver', label: '照顧服務員 (Caregiver)' },
  { value: 'Therapist', label: '治療師 (Therapist)' },
  { value: 'SocialWorker', label: '社工師 (SocialWorker)' },
  { value: 'Doctor', label: '醫師 (Doctor)' },
];

const GOAL_STATUS_OPTIONS = [
  { value: 'NotStarted', label: '未開始 (NotStarted)' },
  { value: 'InProgress', label: '進行中 (InProgress)' },
  { value: 'Achieved', label: '已達成 (Achieved)' },
  { value: 'NotAchieved', label: '未達成 (NotAchieved)' },
];

export function CarePlanFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedResidentId = searchParams.get('residentId') || '';

  const { user } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const sixMonthsLater = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0] ?? '';

  // Fetch residents for dropdown
  const { data: residentsData } = useResidents({
    pageSize: 100,
    status: 'Active',
  });
  const residentsList = residentsData?.items || [];

  // Fetch plan if editing
  const { data: existingPlan, isLoading: isPlanLoading } = useCarePlanDetail(id);

  const createMutation = useCreateCarePlan();
  const updateMutation = useUpdateCarePlan();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CarePlanFormInput, unknown, CarePlanFormOutput>({
    resolver: zodResolver(CarePlanCreateSchema),
    defaultValues: {
      residentId: preselectedResidentId,
      assessmentDate: todayStr,
      reviewDate: sixMonthsLater,
      createdBy: user?.name || user?.username || 'supervisor-1',
      goals: [
        {
          description: '',
          targetDate: sixMonthsLater,
          progress: 0,
          status: 'NotStarted',
          progressNotes: '',
        },
      ],
      serviceItems: [
        {
          name: '',
          serviceType: 'Other',
          frequency: '每日一次',
          responsibleRole: 'Caregiver',
          startDate: todayStr,
          endDate: null,
          notes: '',
        },
      ],
    },
  });

  const {
    fields: goalFields,
    append: appendGoal,
    remove: removeGoal,
  } = useFieldArray({
    control,
    name: 'goals',
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control,
    name: 'serviceItems',
  });

  // Prepopulate form in edit mode
  useEffect(() => {
    if (existingPlan) {
      reset({
        residentId: existingPlan.residentId,
        assessmentDate: existingPlan.assessmentDate,
        reviewDate: existingPlan.reviewDate,
        createdBy: existingPlan.createdBy,
        goals: (existingPlan.goals || []).map((g) => ({
          description: g.description,
          targetDate: g.targetDate,
          progress: g.progress ?? 0,
          status: g.status,
          progressNotes: g.progressNotes || '',
        })),
        serviceItems: (existingPlan.serviceItems || []).map((s) => ({
          name: s.name,
          serviceType: s.serviceType || 'Other',
          frequency: s.frequency,
          responsibleRole: s.responsibleRole || 'Caregiver',
          startDate: s.startDate || existingPlan.assessmentDate,
          endDate: s.endDate ?? null,
          notes: s.notes || '',
        })),
      });
    }
  }, [existingPlan, reset]);

  const onSubmit = async (data: CarePlanFormOutput) => {
    setServerError(null);
    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id,
          data: {
            planId: id,
            assessmentDate: data.assessmentDate,
            reviewDate: data.reviewDate,
            goals: data.goals,
            serviceItems: data.serviceItems,
          },
        });
        navigate(`/care-plans/${id}`);
      } else {
        const created = await createMutation.mutateAsync(data as unknown as CarePlanCreateInput);
        navigate(`/care-plans/${created.planId}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '儲存失敗，請檢查資料後重試';
      setServerError(msg);
    }
  };

  if (isEditing && isPlanLoading) {
    return (
      <div className="card p-12 text-center text-gray-500 max-w-4xl mx-auto">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
        <p>載入計畫編輯資料中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <Link
          to={isEditing && id ? `/care-plans/${id}` : '/care-plans'}
          className="btn-ghost text-xs mb-3 inline-flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
          {isEditing ? '返回計畫明細' : '返回照護計畫列表'}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? `編輯照護計畫 (${id})` : '新增個別化照護計畫'}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          設定住民照護期程、量化目標 (0-100%) 與跨專業服務排程
        </p>
      </div>

      {serverError && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Basic Plan Information */}
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900 border-b pb-3">基本計畫資訊</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Resident Select */}
            <div>
              <label htmlFor="residentId" className="block text-xs font-semibold text-gray-700 mb-1">
                服務對象 (住民) <span className="text-danger-500">*</span>
              </label>
              <select
                id="residentId"
                disabled={isEditing}
                {...register('residentId')}
                className="input-field text-sm w-full"
              >
                <option value="">請選擇住民...</option>
                {residentsList.map((r) => (
                  <option key={r.residentId} value={r.residentId}>
                    {r.name} ({r.residentId} · 床位 {r.bedNumber || '未設定'})
                  </option>
                ))}
              </select>
              {errors.residentId && (
                <p className="text-xs text-danger-600 mt-1">{errors.residentId.message}</p>
              )}
            </div>

            {/* Created By */}
            <div>
              <label htmlFor="createdBy" className="block text-xs font-semibold text-gray-700 mb-1">
                主責評估人員 <span className="text-danger-500">*</span>
              </label>
              <input
                id="createdBy"
                type="text"
                {...register('createdBy')}
                className="input-field text-sm w-full"
                placeholder="例如：林督導護理師"
              />
              {errors.createdBy && (
                <p className="text-xs text-danger-600 mt-1">{errors.createdBy.message}</p>
              )}
            </div>

            {/* Assessment Date */}
            <div>
              <label htmlFor="assessmentDate" className="block text-xs font-semibold text-gray-700 mb-1">
                評估日期 <span className="text-danger-500">* (不得為未來日期)</span>
              </label>
              <input
                id="assessmentDate"
                type="date"
                max={todayStr}
                {...register('assessmentDate')}
                className="input-field text-sm w-full"
              />
              {errors.assessmentDate && (
                <p className="text-xs text-danger-600 mt-1">{errors.assessmentDate.message}</p>
              )}
            </div>

            {/* Review Date */}
            <div>
              <label htmlFor="reviewDate" className="block text-xs font-semibold text-gray-700 mb-1">
                預定複審日期 <span className="text-danger-500">*</span>
              </label>
              <input
                id="reviewDate"
                type="date"
                {...register('reviewDate')}
                className="input-field text-sm w-full"
              />
              {errors.reviewDate && (
                <p className="text-xs text-danger-600 mt-1">{errors.reviewDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Goals Dynamic Management */}
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                照護目標設定 <span className="text-danger-500">*</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                可動態新增多項目標，設定達成期程與進度數值 (0-100%)
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                appendGoal({
                  description: '',
                  targetDate: sixMonthsLater,
                  progress: 0,
                  status: 'NotStarted',
                  progressNotes: '',
                })
              }
              className="btn-secondary text-xs inline-flex items-center self-start sm:self-auto"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              新增照護目標
            </button>
          </div>

          {errors.goals?.message && (
            <p className="text-xs text-danger-600">{errors.goals.message}</p>
          )}

          <div className="space-y-4">
            {goalFields.map((field, index) => {
              const goalError = errors.goals?.[index];

              return (
                <div
                  key={field.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-4 relative"
                >
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold text-[11px] flex items-center justify-center">
                        {index + 1}
                      </span>
                      目標 #{index + 1}
                    </span>
                    {goalFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGoal(index)}
                        className="text-xs text-danger-600 hover:text-danger-800 font-medium"
                      >
                        移除此目標
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Goal Description */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        目標具體描述 <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register(`goals.${index}.description`)}
                        placeholder="例如：收縮壓維持於 130-140 mmHg，預防姿態性低血壓"
                        className="input-field text-sm w-full"
                      />
                      {goalError?.description && (
                        <p className="text-xs text-danger-600 mt-1">
                          {goalError.description.message}
                        </p>
                      )}
                    </div>

                    {/* Target Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        目標達成日期 <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="date"
                        {...register(`goals.${index}.targetDate`)}
                        className="input-field text-sm w-full"
                      />
                      {goalError?.targetDate && (
                        <p className="text-xs text-danger-600 mt-1">
                          {goalError.targetDate.message}
                        </p>
                      )}
                    </div>

                    {/* Progress Slider & Number */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        目標執行進度 (0-100%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        {...register(`goals.${index}.progress`, { valueAsNumber: true })}
                        className="input-field text-sm w-full font-mono"
                        placeholder="0"
                      />
                      {goalError?.progress && (
                        <p className="text-xs text-danger-600 mt-1">
                          {goalError.progress.message}
                        </p>
                      )}
                    </div>

                    {/* Goal Status */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        目標狀態
                      </label>
                      <select
                        {...register(`goals.${index}.status`)}
                        className="input-field text-sm w-full"
                      >
                        {GOAL_STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Progress Notes */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        進度備註與評估紀錄 (選填)
                      </label>
                      <input
                        type="text"
                        {...register(`goals.${index}.progressNotes`)}
                        placeholder="例如：晨間量測正常，住民表示無頭暈不適..."
                        className="input-field text-sm w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Service Items Dynamic Management */}
        <div className="card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                服務項目排程 <span className="text-danger-500">*</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                可動態新增跨專業服務項目，設定服務類型、頻率與主責角色
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                appendService({
                  name: '',
                  serviceType: 'Other',
                  frequency: '每日一次',
                  responsibleRole: 'Caregiver',
                  startDate: todayStr,
                  endDate: null,
                  notes: '',
                })
              }
              className="btn-secondary text-xs inline-flex items-center self-start sm:self-auto"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              新增服務項目
            </button>
          </div>

          {errors.serviceItems?.message && (
            <p className="text-xs text-danger-600">{errors.serviceItems.message}</p>
          )}

          <div className="space-y-4">
            {serviceFields.map((field, index) => {
              const serviceError = errors.serviceItems?.[index];

              return (
                <div
                  key={field.id}
                  className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-4 relative"
                >
                  <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center justify-center">
                        {index + 1}
                      </span>
                      服務項目 #{index + 1}
                    </span>
                    {serviceFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="text-xs text-danger-600 hover:text-danger-800 font-medium"
                      >
                        移除此項目
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Service Type Enum */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        服務類型 (枚舉)
                      </label>
                      <select
                        {...register(`serviceItems.${index}.serviceType`)}
                        className="input-field text-sm w-full"
                      >
                        {SERVICE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Service Name */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        服務項目名稱 <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register(`serviceItems.${index}.name`)}
                        placeholder="例如：生命徵象監測、關節活動牽引"
                        className="input-field text-sm w-full"
                      />
                      {serviceError?.name && (
                        <p className="text-xs text-danger-600 mt-1">{serviceError.name.message}</p>
                      )}
                    </div>

                    {/* Frequency */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        執行頻率 <span className="text-danger-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register(`serviceItems.${index}.frequency`)}
                        placeholder="例如：每日兩次、每週三次、必要時"
                        className="input-field text-sm w-full"
                      />
                      {serviceError?.frequency && (
                        <p className="text-xs text-danger-600 mt-1">
                          {serviceError.frequency.message}
                        </p>
                      )}
                    </div>

                    {/* Responsible Role */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        負責專業角色
                      </label>
                      <select
                        {...register(`serviceItems.${index}.responsibleRole`)}
                        className="input-field text-sm w-full"
                      >
                        {RESPONSIBLE_ROLE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        服務開始日期
                      </label>
                      <input
                        type="date"
                        {...register(`serviceItems.${index}.startDate`)}
                        className="input-field text-sm w-full"
                      />
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        服務結束日期 (選填)
                      </label>
                      <input
                        type="date"
                        {...register(`serviceItems.${index}.endDate`)}
                        className="input-field text-sm w-full"
                      />
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        執行注意事項與備註 (選填)
                      </label>
                      <input
                        type="text"
                        {...register(`serviceItems.${index}.notes`)}
                        placeholder="例如：每次 30 分鐘，進食前或早晚執行..."
                        className="input-field text-sm w-full"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(isEditing && id ? `/care-plans/${id}` : '/care-plans')}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary min-w-[120px] flex items-center justify-center gap-1.5"
          >
            {isSubmitting && <SpinnerIcon className="w-4 h-4 animate-spin" />}
            {isEditing ? '儲存修改' : '建立照護計畫'}
          </button>
        </div>
      </form>
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
