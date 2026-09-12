import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { offlineDb } from '@/utils/offlineDb';
import { formatDate, formatDateTime, formatRocDateDisplay, calculateAge } from '@/utils/rocDate';
import { ResidentInactiveModal } from '@/components/ResidentInactiveModal';
import apiClient from '@/api/apiClient';
import type { Resident, CareRecord, Medication, CarePlan, PaginatedResponse } from '@lrp/shared';

export function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'basic' | 'care' | 'medication' | 'plan'>('basic');
  const [isInactiveModalOpen, setIsInactiveModalOpen] = useState(false);

  const canManage = hasRole(['admin', 'sysadmin', 'supervisor']);
  const canDeactivate = hasRole(['admin', 'sysadmin']);

  // Fetch resident details
  const { data: resident, isLoading, isError } = useQuery({
    queryKey: ['resident', id],
    queryFn: async () => {
      if (!id) throw new Error('Missing resident ID');
      try {
        const res = await apiClient.get<Resident>(`/residents/${id}`);
        if (res.success && res.data) {
          await offlineDb.Residents.put({
            ...res.data,
            localId: res.data.residentId,
            syncStatus: 'synced',
            version: 1,
            createdAt: res.data.createdAt || new Date().toISOString(),
            updatedAt: res.data.updatedAt || new Date().toISOString(),
          });
          return res.data;
        }
        throw new Error(res.error?.message || '住民不存在');
      } catch (err) {
        const offline = await offlineDb.Residents.get(id);
        if (offline) return offline;
        throw err;
      }
    },
    enabled: Boolean(id),
  });

  // Fetch related care records for tab 2
  const { data: careRecordsData } = useQuery({
    queryKey: ['resident-care-records', id],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiClient.get<PaginatedResponse<CareRecord>>(`/care-records?residentId=${id}&pageSize=5`);
      return res.data?.items || [];
    },
    enabled: Boolean(id) && activeTab === 'care',
  });

  // Fetch related medications for tab 3
  const { data: medicationsData } = useQuery({
    queryKey: ['resident-medications', id],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiClient.get<PaginatedResponse<Medication>>(`/medications?residentId=${id}&pageSize=10`);
      return res.data?.items || [];
    },
    enabled: Boolean(id) && activeTab === 'medication',
  });

  // Fetch related care plans for tab 4
  const { data: carePlansData } = useQuery({
    queryKey: ['resident-care-plans', id],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiClient.get<PaginatedResponse<CarePlan>>(`/care-plans?residentId=${id}&pageSize=5`);
      return res.data?.items || [];
    },
    enabled: Boolean(id) && activeTab === 'plan',
  });

  const tabs = [
    { id: 'basic', label: '基本資料', icon: UserIcon },
    { id: 'care', label: '照護記錄', icon: ClipboardIcon },
    { id: 'medication', label: '藥物管理', icon: PillIcon },
    { id: 'plan', label: '照護計畫', icon: DocumentIcon },
  ];

  if (isLoading) {
    return (
      <div className="card p-12 text-center text-gray-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" aria-label="載入中" />
        <p>載入住民資料中...</p>
      </div>
    );
  }

  if (isError || !resident) {
    return (
      <div className="card p-12 text-center space-y-4">
        <p className="text-danger-600 font-medium">找不到該住民資料，可能已被移除或編號不正確。</p>
        <Link to="/residents" className="btn-secondary inline-block">
          返回住民列表
        </Link>
      </div>
    );
  }

  const handleDeactivateSuccess = (updated: Resident) => {
    queryClient.setQueryData(['resident', id], updated);
    queryClient.invalidateQueries({ queryKey: ['residents'] });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link to="/residents" className="btn-ghost text-xs mb-2 inline-flex items-center text-gray-500 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
            返回住民列表
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{resident.name}</h1>
            <span className="font-mono text-sm px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md font-bold">
              {resident.residentId}
            </span>
            {resident.bedNumber && (
              <span className="text-sm px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-bold">
                床位 {resident.bedNumber}
              </span>
            )}
            {resident.status === 'Active' ? (
              <span className="badge-success text-xs px-2.5 py-0.5 rounded-full">在院中</span>
            ) : (
              <span className="badge-gray text-xs px-2.5 py-0.5 rounded-full">已離院</span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            {resident.gender === 'Male' ? '男性' : '女性'} · {calculateAge(resident.dateOfBirth)} 歲 · 出生日期：{formatRocDateDisplay(resident.dateOfBirth)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Link to={`/residents/${resident.residentId}/edit`} className="btn-primary text-sm">
              <EditIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              編輯資料
            </Link>
          )}
          {canDeactivate && resident.status === 'Active' && (
            <button
              onClick={() => setIsInactiveModalOpen(true)}
              className="btn-ghost text-sm text-danger-600 hover:bg-danger-50"
            >
              辦理離院
            </button>
          )}
        </div>
      </div>

      {/* Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body p-4 space-y-1">
            <p className="text-xs text-gray-500 font-medium">管路狀態與護理比例</p>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold ${resident.hasThreePipe ? 'text-amber-700' : 'text-gray-800'}`}>
                {resident.hasThreePipe ? '三管住民 (1:15)' : '一般住民 (1:20)'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {resident.pipes && resident.pipes.length > 0 ? resident.pipes.join('、') : '目前無留置管路'}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-4 space-y-1">
            <p className="text-xs text-gray-500 font-medium">入住日期</p>
            <p className="text-base font-bold text-gray-900">{formatDate(resident.admissionDate)}</p>
            <p className="text-xs text-gray-500">{formatRocDateDisplay(resident.admissionDate)}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-4 space-y-1">
            <p className="text-xs text-gray-500 font-medium">身份別與補助</p>
            <p className="text-base font-bold text-gray-900">{resident.identityType || '一般戶'}</p>
            <p className="text-xs text-gray-500">依賴程度：{resident.dependencyLevel || '部分依賴'}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-4 space-y-1">
            <p className="text-xs text-gray-500 font-medium">第一緊急聯絡人</p>
            <p className="text-base font-bold text-gray-900">
              {resident.emergencyContact?.name ? `${resident.emergencyContact.name} (${resident.emergencyContact.relationship || '家屬'})` : '未填寫'}
            </p>
            <p className="text-xs font-mono text-primary-600">
              {resident.emergencyContact?.mobile || resident.emergencyContact?.phone || '無聯絡電話'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-1 px-4" aria-label="分頁導覽">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <tab.icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="card-body p-6">
          {activeTab === 'basic' && <BasicInfoTab resident={resident} />}
          {activeTab === 'care' && <CareRecordsTab residentId={resident.residentId} records={careRecordsData} />}
          {activeTab === 'medication' && <MedicationsTab residentId={resident.residentId} medications={medicationsData} />}
          {activeTab === 'plan' && <CarePlansTab residentId={resident.residentId} plans={carePlansData} />}
        </div>
      </div>

      {/* Deactivate Modal */}
      <ResidentInactiveModal
        resident={resident}
        isOpen={isInactiveModalOpen}
        onClose={() => setIsInactiveModalOpen(false)}
        onSuccess={handleDeactivateSuccess}
      />
    </div>
  );
}

function BasicInfoTab({ resident }: { resident: Resident }) {
  return (
    <div className="space-y-8 text-sm">
      {/* 1. Personal & Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary-600" aria-hidden="true" />
            個人基本資料
          </h3>
          <dl className="grid grid-cols-3 gap-y-3">
            <dt className="text-gray-500">姓名</dt>
            <dd className="col-span-2 font-medium text-gray-900">{resident.name}</dd>

            <dt className="text-gray-500">性別</dt>
            <dd className="col-span-2 text-gray-900">{resident.gender === 'Male' ? '男' : '女'}</dd>

            <dt className="text-gray-500">身分證字號</dt>
            <dd className="col-span-2 font-mono text-gray-900">{resident.insuranceId || '—'}</dd>

            <dt className="text-gray-500">出生日期</dt>
            <dd className="col-span-2 text-gray-900">
              {formatRocDateDisplay(resident.dateOfBirth)} ({calculateAge(resident.dateOfBirth)} 歲)
            </dd>

            <dt className="text-gray-500">教育程度</dt>
            <dd className="col-span-2 text-gray-900">{resident.education || '—'}</dd>

            <dt className="text-gray-500">宗教信仰</dt>
            <dd className="col-span-2 text-gray-900">{resident.religion || '—'}</dd>

            <dt className="text-gray-500">工作史/經歷</dt>
            <dd className="col-span-2 text-gray-900">{resident.workHistory || '—'}</dd>
          </dl>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
            <PhoneIcon className="w-5 h-5 text-primary-600" aria-hidden="true" />
            地址與通訊聯絡
          </h3>
          <dl className="grid grid-cols-3 gap-y-3">
            <dt className="text-gray-500">通訊地址</dt>
            <dd className="col-span-2 text-gray-900">{resident.address || '—'}</dd>

            <dt className="text-gray-500">戶籍地址</dt>
            <dd className="col-span-2 text-gray-900">{resident.householdAddress || '—'}</dd>

            <dt className="text-gray-500">聯絡電話</dt>
            <dd className="col-span-2 font-mono text-gray-900">{resident.phone || '—'}</dd>

            <dt className="text-gray-500">行動電話</dt>
            <dd className="col-span-2 font-mono text-gray-900">{resident.mobile || '—'}</dd>
          </dl>
        </div>
      </div>

      {/* 2. Emergency Contact */}
      <div className="space-y-4 bg-gray-50 p-5 rounded-xl">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <HeartIcon className="w-5 h-5 text-danger-500" aria-hidden="true" />
          第一緊急聯絡人資訊
        </h3>
        {resident.emergencyContact?.name ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">聯絡人姓名 / 關係</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {resident.emergencyContact.name} ({resident.emergencyContact.relationship || '家屬'})
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">電話 / 手機</p>
              <p className="font-mono text-primary-700 mt-0.5">
                {resident.emergencyContact.mobile || resident.emergencyContact.phone || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">聯絡地址</p>
              <p className="text-gray-900 mt-0.5">{resident.emergencyContact.address || '同通訊地址'}</p>
            </div>
            {resident.emergencyContact.notes && (
              <div className="sm:col-span-3 pt-2">
                <p className="text-xs text-gray-500">備註說明</p>
                <p className="text-gray-700 mt-0.5">{resident.emergencyContact.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 italic">尚未設定第一緊急聯絡人</p>
        )}
      </div>

      {/* 3. Care, Disability & Health Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
            <ClipboardIcon className="w-5 h-5 text-primary-600" aria-hidden="true" />
            管路與照護需求
          </h3>
          <dl className="grid grid-cols-3 gap-y-3">
            <dt className="text-gray-500">留置管路</dt>
            <dd className="col-span-2">
              {resident.pipes && resident.pipes.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {resident.pipes.map((p, i) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        ['鼻胃管', '胃管', '尿管', '導尿管', '氣切管', '氣切'].some((k) => p.includes(k))
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-500">無管路</span>
              )}
            </dd>

            <dt className="text-gray-500">三管判定</dt>
            <dd className="col-span-2">
              {resident.hasThreePipe ? (
                <span className="badge-warning text-xs">是（適用護理比 1:15）</span>
              ) : (
                <span className="badge-gray text-xs">否（適用護理比 1:20）</span>
              )}
            </dd>

            <dt className="text-gray-500">依賴程度</dt>
            <dd className="col-span-2 font-medium text-gray-900">{resident.dependencyLevel || '部分依賴'}</dd>

            <dt className="text-gray-500">特殊照護需求</dt>
            <dd className="col-span-2 text-gray-900">{resident.specialNeeds || '無'}</dd>
          </dl>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-primary-600" aria-hidden="true" />
            身心障礙與傷病證明
          </h3>
          <dl className="grid grid-cols-3 gap-y-3">
            <dt className="text-gray-500">診斷 / 疾病</dt>
            <dd className="col-span-2 text-gray-900">{resident.diagnosis || '常規照護需求'}</dd>

            <dt className="text-gray-500">身心障礙證明</dt>
            <dd className="col-span-2 text-gray-900">
              {resident.disability?.raw || (resident.disability?.category ? `${resident.disability.category}，${resident.disability.level}` : '無 / 未提供')}
            </dd>

            <dt className="text-gray-500">重大傷病證明</dt>
            <dd className="col-span-2 text-gray-900">
              {resident.catastrophicIllness?.raw || resident.catastrophicIllness?.name || '無'}
            </dd>
          </dl>
        </div>
      </div>

      {/* 4. Metadata */}
      <div className="border-t border-gray-200 pt-4 flex flex-wrap justify-between text-xs text-gray-400">
        <p>建立時間：{formatDateTime(resident.createdAt)}</p>
        <p>最後更新：{formatDateTime(resident.updatedAt)}</p>
      </div>
    </div>
  );
}

function CareRecordsTab({ residentId, records }: { residentId: string; records?: CareRecord[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">最近照護記錄</h3>
        <div className="flex gap-2">
          <Link to={`/care-records/new?residentId=${residentId}`} className="btn-primary text-xs py-1.5 px-3">
            新增此住民記錄
          </Link>
          <Link to={`/care-records?residentId=${residentId}`} className="btn-secondary text-xs py-1.5 px-3">
            檢視所有記錄
          </Link>
        </div>
      </div>

      {!records || records.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500">
          <ClipboardIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" aria-hidden="true" />
          <p>尚無此住民的照護記錄</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border rounded-xl overflow-hidden">
          {records.map((rec) => (
            <div key={rec.recordId} className="p-4 hover:bg-gray-50 flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">{rec.recordId}</span>
                  <span className="text-xs text-gray-500">{formatDateTime(rec.timestamp)}</span>
                  <span className="badge-gray text-xs">{rec.staffName}</span>
                </div>
                <p className="text-gray-600 text-xs">{rec.notes || '照護活動執行完成'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  完整度 {rec.completenessScore}%
                </span>
                <Link to={`/care-records?residentId=${residentId}`} className="text-xs text-primary-600 hover:underline">
                  詳情
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MedicationsTab({ residentId, medications }: { residentId: string; medications?: Medication[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900">處方藥物管理</h3>
        <Link to={`/medications?residentId=${residentId}`} className="btn-secondary text-xs py-1.5 px-3">
          前往藥物管理頁
        </Link>
      </div>

      {!medications || medications.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500">
          <PillIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" aria-hidden="true" />
          <p>目前尚無登記處方藥物</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {medications.map((med) => (
            <div key={med.medicationId} className="p-4 border rounded-xl hover:bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900">{med.name}</h4>
                <span className="text-xs font-mono text-gray-500">{med.dosage}</span>
              </div>
              <p className="text-xs text-gray-600">
                頻率：{med.frequency} · 給藥時段：{med.schedule?.join(', ') || '依指示'}
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <span className="text-gray-500">目前庫存：{med.stockLevel}</span>
                <span className="text-primary-600">下一劑：{formatDateTime(med.nextScheduled)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CarePlansTab({ residentId, plans }: { residentId: string; plans?: CarePlan[] }) {
  const activePlan = plans?.find((p) => p.status === 'Active');
  const otherPlans = plans?.filter((p) => p.planId !== activePlan?.planId) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">個別化照護計畫</h3>
          <p className="text-xs text-gray-500 mt-0.5">跨專業照護目標設定、執行進度量化與排程追蹤</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/care-plans/new?residentId=${residentId}`}
            className="btn-primary text-xs py-1.5 px-3"
          >
            為此住民建立新計畫
          </Link>
          <Link
            to={`/care-plans?residentId=${residentId}`}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            前往計畫列表
          </Link>
        </div>
      </div>

      {/* Embedded Active Care Plan Summary Card */}
      {activePlan ? (
        <div className="card p-5 border-2 border-primary-500/30 bg-gradient-to-br from-primary-50/20 via-white to-white shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                當前啟用中計畫
              </span>
              <span className="font-mono font-bold text-gray-900 text-sm">{activePlan.planId}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">
                複審日期：<span className="font-semibold text-gray-700">{formatDate(activePlan.reviewDate)}</span>
              </span>
              <Link
                to={`/care-plans/${activePlan.planId}`}
                className="btn-primary text-xs py-1 px-3 inline-flex items-center"
              >
                查看完整計畫 →
              </Link>
            </div>
          </div>

          {/* Active Goals with Progress Bars */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              照護目標進度 ({activePlan.goals?.length || 0})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activePlan.goals?.map((goal, idx) => {
                const progress = goal.progress ?? 0;
                return (
                  <div
                    key={goal.goalId || idx}
                    className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">
                        {goal.description}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-primary-700 whitespace-nowrap">
                        {progress}%
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                      <span>目標日：{formatDate(goal.targetDate)}</span>
                      <span>{goal.status === 'Achieved' ? '已達成' : '執行中'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Service Items */}
          {activePlan.serviceItems && activePlan.serviceItems.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                執行中服務項目 ({activePlan.serviceItems.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {activePlan.serviceItems.map((item, idx) => (
                  <div
                    key={item.itemId || idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                  >
                    <span className="font-bold text-gray-900">{item.name}</span>
                    <span className="text-primary-700 font-medium">({item.frequency})</span>
                    {item.responsibleRole && (
                      <span className="text-gray-400 text-[11px]">· {item.responsibleRole}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center bg-gray-50/70 border border-dashed border-gray-300 rounded-2xl space-y-3">
          <DocumentIcon className="w-10 h-10 mx-auto text-gray-300" aria-hidden="true" />
          <p className="font-semibold text-gray-700">目前尚無執行中的個別化照護計畫</p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            建議依住民評估結果，盡速制定照護計畫與服務項目排程。
          </p>
          <Link
            to={`/care-plans/new?residentId=${residentId}`}
            className="btn-primary text-xs inline-block mt-2"
          >
            為此住民建立新計畫
          </Link>
        </div>
      )}

      {/* Historical / Other Plans */}
      {otherPlans.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            其他歷程計畫 ({otherPlans.length})
          </h4>
          <div className="space-y-2.5">
            {otherPlans.map((p) => (
              <div
                key={p.planId}
                className="p-3.5 border rounded-xl bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900">{p.planId}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.status === 'Completed'
                          ? 'bg-blue-50 text-blue-700'
                          : p.status === 'Draft'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {p.status === 'Completed' ? '已完成' : p.status === 'Draft' ? '草稿' : '已封存'}
                    </span>
                  </div>
                  <p className="text-gray-500">
                    評估：{formatDate(p.assessmentDate)} · 複審：{formatDate(p.reviewDate)}
                  </p>
                </div>
                <Link
                  to={`/care-plans/${p.planId}`}
                  className="btn-secondary text-xs py-1 px-2.5 whitespace-nowrap"
                >
                  查看明細
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}

function ClipboardIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
}

function PillIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.734-.988-2.386l-.548-.547z" /></svg>;
}

function DocumentIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
}

function EditIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
}

function PhoneIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
}

function HeartIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
}