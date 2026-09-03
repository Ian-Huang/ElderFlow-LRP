import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { ResidentCreateSchema, type Resident } from '@lrp/shared';
import { rocToIso, isoToRoc, formatRocDateDisplay, isThreePipe } from '@/utils/rocDate';
import apiClient from '@/api/apiClient';

interface ResidentFormValues {
  name: string;
  gender: 'Male' | 'Female';
  residentId?: string;
  insuranceId: string;
  dateOfBirth: string; // YYYY-MM-DD
  admissionDate: string; // YYYY-MM-DD
  address: string;
  householdAddress?: string;
  phone?: string;
  mobile?: string;
  bedNumber?: string;
  pipes?: string[];
  hasThreePipe?: boolean;
  identityType?: string;
  dependencyLevel?: string;
  diagnosis?: string;
  specialNeeds?: string;
  education?: string;
  religion?: string;
  workHistory?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone?: string;
    mobile?: string;
    address?: string;
    notes?: string;
  };
  disability?: {
    raw?: string;
  };
  catastrophicIllness?: {
    raw?: string;
  };
}

const COMMON_BEDS = [
  '1-1', '1-2', '1-3', '1-5', '1-6', '1-7',
  '2-1', '2-2', '2-3',
  '3-1', '3-2', '3-3', '3-5', '3-6',
  '5-1', '5-2', '5-3',
  '6-1', '6-2', '6-3', '6-5',
  '7-1', '7-2', '7-3', '7-5', '7-6',
];

const COMMON_PIPES = ['鼻胃管', '導尿管', '氣切管', '造廔口', '引流管'];

export function ResidentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formError, setFormError] = useState<string | null>(null);

  // ROC date input states for quick bi-directional editing
  const [dobRoc, setDobRoc] = useState('');
  const [admissionRoc, setAdmissionRoc] = useState('');

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResidentFormValues>({
    resolver: zodResolver(ResidentCreateSchema as never),
    defaultValues: {
      gender: 'Female',
      dateOfBirth: '1950-01-01',
      admissionDate: new Date().toISOString().split('T')[0],
      identityType: '一般戶',
      dependencyLevel: '部分依賴',
      hasThreePipe: false,
      pipes: [],
      address: '',
      insuranceId: '',
      emergencyContact: {
        name: '',
        relationship: '家屬',
      },
    },
  });

  const watchedPipes = watch('pipes') || [];
  const watchedDob = watch('dateOfBirth');
  const watchedAdmission = watch('admissionDate');

  // Load existing resident data if editing
  const { data: existingResident, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['resident', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<Resident>(`/residents/${id}`);
      return res.data || null;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingResident) {
      reset({
        name: existingResident.name,
        gender: existingResident.gender,
        residentId: existingResident.residentId,
        insuranceId: existingResident.insuranceId,
        dateOfBirth: existingResident.dateOfBirth,
        admissionDate: existingResident.admissionDate,
        address: existingResident.address,
        householdAddress: existingResident.householdAddress || '',
        phone: existingResident.phone || '',
        mobile: existingResident.mobile || '',
        bedNumber: existingResident.bedNumber || '',
        pipes: existingResident.pipes || [],
        hasThreePipe: existingResident.hasThreePipe,
        identityType: existingResident.identityType || '一般戶',
        dependencyLevel: existingResident.dependencyLevel || '部分依賴',
        diagnosis: existingResident.diagnosis || '',
        specialNeeds: existingResident.specialNeeds || '',
        education: existingResident.education || '',
        religion: existingResident.religion || '',
        workHistory: existingResident.workHistory || '',
        emergencyContact: existingResident.emergencyContact || { name: '', relationship: '' },
        disability: existingResident.disability || { raw: '' },
        catastrophicIllness: existingResident.catastrophicIllness || { raw: '' },
      });
      setDobRoc(isoToRoc(existingResident.dateOfBirth));
      setAdmissionRoc(isoToRoc(existingResident.admissionDate));
    }
  }, [existingResident, reset]);

  // Keep ROC date and ISO date synced
  const handleDobRocChange = (val: string) => {
    setDobRoc(val);
    const iso = rocToIso(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setValue('dateOfBirth', iso, { shouldValidate: true });
    }
  };

  const handleAdmissionRocChange = (val: string) => {
    setAdmissionRoc(val);
    const iso = rocToIso(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      setValue('admissionDate', iso, { shouldValidate: true });
    }
  };

  // Sync three pipe status when pipes change
  useEffect(() => {
    const hasThree = isThreePipe(watchedPipes);
    setValue('hasThreePipe', hasThree);
  }, [watchedPipes, setValue]);

  // Offline mutation hook
  const mutation = useOfflineMutation<Record<string, unknown>, Resident>({
    entityType: 'Residents',
    table: 'Residents',
    operation: isEdit ? 'update' : 'create',
    queryKey: ['residents'],
    toOptimisticEntity: ({ payload, now, syncStatus }) => ({
      ...payload,
      residentId: (payload.residentId as string) || `RES-${Date.now()}`,
      status: 'Active',
      syncStatus,
      createdAt: now,
      updatedAt: now,
    }),
    mutationFn: async (payload) => {
      if (isEdit && id) {
        const res = await apiClient.patch<Resident>(`/residents/${id}`, payload);
        if (res.success && res.data) return res.data;
        throw new Error(res.error?.message || '更新失敗');
      } else {
        const res = await apiClient.post<Resident>('/residents', payload);
        if (res.success && res.data) return res.data;
        throw new Error(res.error?.message || '新增失敗');
      }
    },
  });

  const onSubmit = async (values: ResidentFormValues) => {
    setFormError(null);
    try {
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        ...values,
        dateOfBirth: rocToIso(values.dateOfBirth),
        admissionDate: rocToIso(values.admissionDate),
        hasThreePipe: isThreePipe(values.pipes),
        status: existingResident?.status || 'Active',
        updatedAt: now,
      };

      await mutation.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['resident', id] });
      }
      navigate('/residents');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : '儲存住民失敗');
    }
  };

  if (isEdit && isLoadingExisting) {
    return (
      <div className="card p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
        <p>載入住民資料中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/residents" className="btn-ghost text-xs mb-2 inline-flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
            返回列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? `編輯住民資料：${existingResident?.name || ''}` : '新增住民基本資料'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            請依序填寫住民個人資料、管路狀況、床位分配及緊急聯絡人
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-danger-50 border border-danger-200 text-danger-700 text-sm rounded-xl" role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: 基本識別 */}
        <div className="card">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">1. 個人基本資料</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">
                  住民姓名 <span className="text-danger-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="input w-full"
                  placeholder="例如：周吳綺緣"
                />
                {errors.name && <p className="text-danger-500 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="gender" className="block text-xs font-semibold text-gray-700 mb-1">
                  性別 <span className="text-danger-500">*</span>
                </label>
                <select id="gender" {...register('gender')} className="input w-full">
                  <option value="Female">女性</option>
                  <option value="Male">男性</option>
                </select>
              </div>

              <div>
                <label htmlFor="residentId" className="block text-xs font-semibold text-gray-700 mb-1">
                  住民編號 {isEdit && '(唯讀)'}
                </label>
                <input
                  id="residentId"
                  type="text"
                  {...register('residentId')}
                  disabled={isEdit}
                  className="input w-full font-mono"
                  placeholder="例如：0040 (留空自動產生)"
                />
              </div>

              <div>
                <label htmlFor="insuranceId" className="block text-xs font-semibold text-gray-700 mb-1">
                  身分證字號 / 保險 ID <span className="text-danger-500">*</span>
                </label>
                <input
                  id="insuranceId"
                  type="text"
                  {...register('insuranceId')}
                  className="input w-full font-mono"
                  placeholder="例如：A201529776"
                />
                {errors.insuranceId && <p className="text-danger-500 text-xs mt-1">{errors.insuranceId.message}</p>}
              </div>

              <div>
                <label htmlFor="dobRoc" className="block text-xs font-semibold text-gray-700 mb-1">
                  出生日期 (民國年)
                </label>
                <input
                  id="dobRoc"
                  type="text"
                  value={dobRoc}
                  onChange={(e) => handleDobRocChange(e.target.value)}
                  className="input w-full font-mono"
                  placeholder="例如：035/01/13"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  西元對照：{watchedDob} ({formatRocDateDisplay(watchedDob)})
                </p>
              </div>

              <div>
                <label htmlFor="admissionRoc" className="block text-xs font-semibold text-gray-700 mb-1">
                  入住日期 (民國年) <span className="text-danger-500">*</span>
                </label>
                <input
                  id="admissionRoc"
                  type="text"
                  value={admissionRoc}
                  onChange={(e) => handleAdmissionRocChange(e.target.value)}
                  className="input w-full font-mono"
                  placeholder="例如：111/01/21"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  西元對照：{watchedAdmission}
                </p>
                {errors.admissionDate && <p className="text-danger-500 text-xs mt-1">{errors.admissionDate.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 床位與管路 */}
        <div className="card">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">2. 床位分配與留置管路</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bedNumber" className="block text-xs font-semibold text-gray-700 mb-1">
                  床位編號
                </label>
                <div className="flex gap-2">
                  <select
                    id="bedNumber"
                    {...register('bedNumber')}
                    className="input w-full font-mono"
                  >
                    <option value="">-- 請選擇或指定床位 --</option>
                    {COMMON_BEDS.map((bed) => (
                      <option key={bed} value={bed}>
                        床位 {bed}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  系統將自動檢查床位衝突，若該床位已有在院中住民將予以阻擋。
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  護理人力配置標準
                </label>
                <div className={`p-3 rounded-lg border ${isThreePipe(watchedPipes) ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                  <span className="font-bold text-sm">
                    {isThreePipe(watchedPipes) ? '⚠️ 三管住民（適用護理比 1:15）' : '一般住民（適用護理比 1:20）'}
                  </span>
                  <p className="text-xs mt-0.5">
                    {isThreePipe(watchedPipes)
                      ? '包含鼻胃管/導尿管/氣切管，將納入合規比例 1:15 即時計算。'
                      : '未留置特殊三管管路。'}
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  留置管路項目 (可多選)
                </label>
                <Controller
                  control={control}
                  name="pipes"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-3">
                      {COMMON_PIPES.map((pipe) => {
                        const isChecked = field.value?.includes(pipe);
                        return (
                          <label
                            key={pipe}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary-50 border-primary-500 text-primary-900 font-bold'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = field.value || [];
                                if (e.target.checked) {
                                  field.onChange([...current, pipe]);
                                } else {
                                  field.onChange(current.filter((p) => p !== pipe));
                                }
                              }}
                              className="rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span>{pipe}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: 身份別、依賴度與醫療 */}
        <div className="card">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">3. 身份別、依賴度與照護資訊</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="identityType" className="block text-xs font-semibold text-gray-700 mb-1">
                  身份別
                </label>
                <select id="identityType" {...register('identityType')} className="input w-full">
                  <option value="一般戶">一般戶</option>
                  <option value="中低收入戶">中低收入戶</option>
                  <option value="低收入戶">低收入戶</option>
                  <option value="緊急安置">緊急安置</option>
                  <option value="榮民/眷">榮民/眷</option>
                  <option value="原住民">原住民</option>
                </select>
              </div>

              <div>
                <label htmlFor="dependencyLevel" className="block text-xs font-semibold text-gray-700 mb-1">
                  依賴程度
                </label>
                <select id="dependencyLevel" {...register('dependencyLevel')} className="input w-full">
                  <option value="完全依賴">完全依賴</option>
                  <option value="部分依賴">部分依賴</option>
                  <option value="可自行活動">可自行活動</option>
                </select>
              </div>

              <div>
                <label htmlFor="education" className="block text-xs font-semibold text-gray-700 mb-1">
                  教育程度
                </label>
                <input
                  id="education"
                  type="text"
                  {...register('education')}
                  className="input w-full"
                  placeholder="例如：高中、大專、國中、不識字"
                />
              </div>

              <div>
                <label htmlFor="religion" className="block text-xs font-semibold text-gray-700 mb-1">
                  宗教信仰
                </label>
                <input
                  id="religion"
                  type="text"
                  {...register('religion')}
                  className="input w-full"
                  placeholder="例如：佛教、基督教、道教、無"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="workHistory" className="block text-xs font-semibold text-gray-700 mb-1">
                  工作經歷
                </label>
                <input
                  id="workHistory"
                  type="text"
                  {...register('workHistory')}
                  className="input w-full"
                  placeholder="例如：教職退休、公務員、自營商"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="diagnosis" className="block text-xs font-semibold text-gray-700 mb-1">
                  主要診斷 / 疾病史
                </label>
                <textarea
                  id="diagnosis"
                  rows={2}
                  {...register('diagnosis')}
                  className="input w-full"
                  placeholder="例如：高血壓、糖尿病、失智症、中風後遺症..."
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="specialNeeds" className="block text-xs font-semibold text-gray-700 mb-1">
                  特殊照護需求
                </label>
                <textarea
                  id="specialNeeds"
                  rows={2}
                  {...register('specialNeeds')}
                  className="input w-full"
                  placeholder="例如：需協助進食、防跌倒警示、左側偏癱..."
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="disabilityRaw" className="block text-xs font-semibold text-gray-700 mb-1">
                  身心障礙證明 (類別/等級/到期日)
                </label>
                <input
                  id="disabilityRaw"
                  type="text"
                  {...register('disability.raw')}
                  className="input w-full"
                  placeholder="例如：第1類，重度，2030/09/30 或 第7類，中度，無需重鑑"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="catastrophicIllnessRaw" className="block text-xs font-semibold text-gray-700 mb-1">
                  重大傷病證明
                </label>
                <input
                  id="catastrophicIllnessRaw"
                  type="text"
                  {...register('catastrophicIllness.raw')}
                  className="input w-full"
                  placeholder="例如：癌症第3期、終身免評估..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: 地址與通訊 */}
        <div className="card">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">4. 地址與聯絡方式</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-xs font-semibold text-gray-700 mb-1">
                  通訊地址 <span className="text-danger-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  {...register('address')}
                  className="input w-full"
                  placeholder="例如：台北市南港區研究院路2段185號"
                />
                {errors.address && <p className="text-danger-500 text-xs mt-1">{errors.address.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="householdAddress" className="block text-xs font-semibold text-gray-700 mb-1">
                  戶籍地址
                </label>
                <input
                  id="householdAddress"
                  type="text"
                  {...register('householdAddress')}
                  className="input w-full"
                  placeholder="例如：台北市南港區研究院路2段185號 (留空同通訊地)"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 mb-1">
                  室內電話
                </label>
                <input
                  id="phone"
                  type="text"
                  {...register('phone')}
                  className="input w-full font-mono"
                  placeholder="例如：02-26546918"
                />
              </div>

              <div>
                <label htmlFor="mobile" className="block text-xs font-semibold text-gray-700 mb-1">
                  行動電話
                </label>
                <input
                  id="mobile"
                  type="text"
                  {...register('mobile')}
                  className="input w-full font-mono"
                  placeholder="例如：0955-034033"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: 第一緊急聯絡人 */}
        <div className="card">
          <div className="card-body p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">5. 第一緊急聯絡人</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="contactName" className="block text-xs font-semibold text-gray-700 mb-1">
                  聯絡人姓名
                </label>
                <input
                  id="contactName"
                  type="text"
                  {...register('emergencyContact.name')}
                  className="input w-full"
                  placeholder="例如：周士剛"
                />
              </div>

              <div>
                <label htmlFor="contactRelationship" className="block text-xs font-semibold text-gray-700 mb-1">
                  關係
                </label>
                <input
                  id="contactRelationship"
                  type="text"
                  {...register('emergencyContact.relationship')}
                  className="input w-full"
                  placeholder="例如：母子、兄妹、主責社工、機構主任"
                />
              </div>

              <div>
                <label htmlFor="contactMobile" className="block text-xs font-semibold text-gray-700 mb-1">
                  手機號碼
                </label>
                <input
                  id="contactMobile"
                  type="text"
                  {...register('emergencyContact.mobile')}
                  className="input w-full font-mono"
                  placeholder="例如：0955034033"
                />
              </div>

              <div>
                <label htmlFor="contactPhone" className="block text-xs font-semibold text-gray-700 mb-1">
                  室內電話
                </label>
                <input
                  id="contactPhone"
                  type="text"
                  {...register('emergencyContact.phone')}
                  className="input w-full font-mono"
                  placeholder="例如：0226546918"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="contactAddress" className="block text-xs font-semibold text-gray-700 mb-1">
                  聯絡地址
                </label>
                <input
                  id="contactAddress"
                  type="text"
                  {...register('emergencyContact.address')}
                  className="input w-full"
                  placeholder="例如：台北市南港區研究院路2段185號"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="contactNotes" className="block text-xs font-semibold text-gray-700 mb-1">
                  備註事項
                </label>
                <input
                  id="contactNotes"
                  type="text"
                  {...register('emergencyContact.notes')}
                  className="input w-full"
                  placeholder="例如：夜間請優先聯繫次要聯絡人"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link to="/residents" className="btn-secondary">
            取消
          </Link>
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={isSubmitting}
          >
            {isSubmitting ? '儲存中...' : isEdit ? '更新住民資料' : '建立住民資料'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
}
