import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { CareRecord, CareRecordStatus, PaginatedResponse, Resident } from '@lrp/shared';
import apiClient from '@/api/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useSyncStore } from '@/stores/syncStore';
import { useOfflineMutation } from '@/hooks/useOfflineMutation';
import { calculateCareRecordCompleteness, type CareRecordActivityDraft } from '@/utils/careRecordScore';

const ACTIVITY_OPTIONS: Array<{ value: CareRecord['activities'][number]['type']; label: string }> = [
  { value: 'Meal', label: '進食' },
  { value: 'Bathing', label: '沐浴' },
  { value: 'Turning', label: '翻身' },
  { value: 'Repositioning', label: '姿勢調整' },
  { value: 'Medication', label: '給藥' },
  { value: 'VitalSigns', label: '生命徵象' },
  { value: 'Other', label: '其他' },
];

const ASSISTANCE_OPTIONS: Array<{ value: NonNullable<CareRecordActivityDraft['assistanceLevel']>; label: string }> = [
  { value: 'Independent', label: 'Level 1 - 可獨立' },
  { value: 'Supervision', label: 'Level 2 - 需督導' },
  { value: 'PartialAssist', label: 'Level 3 - 部分協助' },
  { value: 'TotalAssist', label: 'Level 4 - 全程協助' },
];

const STATUS_OPTIONS: Array<{ value: CareRecordStatus; label: string }> = [
  { value: 'Normal', label: '正常' },
  { value: 'NeedsReview', label: '需複核' },
  { value: 'VerificationRequired', label: '需驗證' },
];

const EVIDENCE_SIZE_LIMIT = 10 * 1024 * 1024;

interface ActivityFormState {
  activityId: string;
  type: CareRecord['activities'][number]['type'];
  assistanceLevel: CareRecordActivityDraft['assistanceLevel'];
  durationMinutes: number | '';
  notes: string;
  timestamp: string;
  vitals?: {
    systolic?: number | '';
    diastolic?: number | '';
    pulse?: number | '';
    temperature?: number | '';
  };
}

interface EvidenceItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

function makeDefaultActivity(): ActivityFormState {
  return {
    activityId: crypto.randomUUID(),
    type: 'Meal',
    assistanceLevel: 'PartialAssist',
    durationMinutes: 15,
    notes: '',
    timestamp: new Date().toISOString(),
    vitals: undefined,
  };
}

function getStatusMeta(status: CareRecordStatus) {
  if (status === 'Normal') {
    return { dot: 'bg-success-500', label: '正常', badge: 'badge-success' };
  }
  if (status === 'NeedsReview') {
    return { dot: 'bg-warning-500', label: '需複核', badge: 'badge-warning' };
  }
  return { dot: 'bg-danger-500', label: '需驗證', badge: 'badge-danger' };
}

function calculateLockCountdown(submittedAt: string) {
  const submitted = new Date(submittedAt).getTime();
  const lockAt = submitted + 24 * 60 * 60 * 1000;
  const remainingMs = lockAt - Date.now();
  if (remainingMs <= 0) {
    return { locked: true, text: '已鎖定' };
  }

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return {
    locked: false,
    text: `${hours} 小時 ${minutes} 分後鎖定`,
  };
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CareRecordsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const { hasRole, user } = useAuthStore();
  const isOnline = useSyncStore((state) => state.isOnline);

  const canCreate = hasRole(['caregiver', 'supervisor', 'admin', 'sysadmin']);

  const isCreateMode = location.pathname.includes('/care-records/new');
  const isEditMode = location.pathname.includes('/care-records/') && location.pathname.endsWith('/edit');
  const isListMode = !isCreateMode && !isEditMode;

  const [records, setRecords] = useState<PaginatedResponse<CareRecord> | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    residentId: '',
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
    pageSize: 10,
  });

  const [form, setForm] = useState({
    recordId: '',
    residentId: new URLSearchParams(location.search).get('residentId') || '',
    timestamp: new Date().toISOString(),
    notes: '',
    status: 'Normal' as CareRecordStatus,
    submittedAt: new Date().toISOString(),
    lockType: 'Editable' as 'Editable' | 'Locked',
    activities: [makeDefaultActivity()] as ActivityFormState[],
    evidence: [] as EvidenceItem[],
  });

  const [supplement, setSupplement] = useState({ content: '', reason: '' });

  const scoreResult = useMemo(
    () =>
      calculateCareRecordCompleteness({
        residentId: form.residentId,
        activities: form.activities.map((activity) => ({
          type: activity.type,
          assistanceLevel: activity.assistanceLevel,
          notes: activity.notes,
          durationMinutes: activity.durationMinutes,
          vitals: activity.vitals,
        })),
        evidenceCount: form.evidence.length,
      }),
    [form]
  );

  const lockInfo = useMemo(() => calculateLockCountdown(form.submittedAt), [form.submittedAt]);
  const isLocked = form.lockType === 'Locked' || lockInfo.locked;

  useEffect(() => {
    return () => {
      form.evidence.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [form.evidence]);

  const loadResidents = async () => {
    const response = await apiClient.get<PaginatedResponse<Resident>>('/residents', { page: 1, pageSize: 200 });
    if (response.success && response.data) {
      setResidents(response.data.items);
    }
  };

  const loadCareRecords = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const response = await apiClient.get<PaginatedResponse<CareRecord>>('/care-records', {
        page: filters.page,
        pageSize: filters.pageSize,
        residentId: filters.residentId || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '讀取照護記錄失敗');
      }
      setRecords(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取照護記錄失敗');
    } finally {
      setLoadingList(false);
    }
  };

  const loadCareRecordDetail = async (recordId: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const response = await apiClient.get<CareRecord>(`/care-records/${recordId}`);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '讀取照護記錄失敗');
      }
      const record = response.data;
      setForm({
        recordId: record.recordId,
        residentId: record.residentId,
        timestamp: record.timestamp,
        notes: record.notes,
        status: record.status,
        submittedAt: record.submittedAt,
        lockType: record.lockType || 'Editable',
        activities: record.activities.map((activity) => ({
          activityId: activity.activityId,
          type: activity.type,
          assistanceLevel: activity.assistanceLevel,
          durationMinutes: 15,
          notes: activity.notes,
          timestamp: activity.timestamp,
          vitals: activity.type === 'VitalSigns' ? { systolic: '', diastolic: '', pulse: '', temperature: '' } : undefined,
        })),
        evidence: record.evidence.map((item) => ({
          id: item.evidenceId,
          name: item.type,
          type: item.type,
          size: 0,
          url: item.url,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '讀取照護記錄失敗');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    void loadResidents();
  }, []);

  useEffect(() => {
    if (isListMode) {
      void loadCareRecords();
    }
  }, [isListMode, filters.page, filters.pageSize, filters.residentId, filters.status, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (isEditMode && params.id) {
      void loadCareRecordDetail(params.id);
    }
  }, [isEditMode, params.id]);

  const createMutation = useOfflineMutation<
    {
      residentId: string;
      timestamp: string;
      activities: CareRecord['activities'];
      staffId: string;
      staffName: string;
      notes: string;
      evidence: CareRecord['evidence'];
    },
    CareRecord
  >({
    entityType: 'CareRecords',
    table: 'CareRecords',
    operation: 'create',
    queryKey: ['care-records'],
    toOptimisticEntity: ({ payload, localId, now, syncStatus }) => ({
      recordId: `LOCAL-${localId}`,
      residentId: payload.residentId,
      timestamp: payload.timestamp,
      activities: payload.activities,
      staffId: payload.staffId,
      staffName: payload.staffName,
      completenessScore: scoreResult.score,
      status: form.status,
      evidence: payload.evidence,
      notes: payload.notes,
      submittedAt: now,
      lockType: 'Editable',
      modificationHistory: [],
      createdAt: now,
      updatedAt: now,
      syncStatus,
      version: 1,
    }),
    mergeQueryData: (current, optimisticEntity) => {
      const data = current as PaginatedResponse<CareRecord> | undefined;
      if (!data) return current;
      return {
        ...data,
        items: [optimisticEntity as unknown as CareRecord, ...data.items],
        total: data.total + 1,
      };
    },
    mutationFn: async (payload) => {
      if (!navigator.onLine) {
        return {
          recordId: `LOCAL-${crypto.randomUUID()}`,
          residentId: payload.residentId,
          timestamp: payload.timestamp,
          activities: payload.activities,
          staffId: payload.staffId,
          staffName: payload.staffName,
          completenessScore: scoreResult.score,
          status: form.status,
          evidence: payload.evidence,
          notes: payload.notes,
          submittedAt: new Date().toISOString(),
          lockType: 'Editable',
          modificationHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const response = await apiClient.post<CareRecord>('/care-records', payload);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '建立照護記錄失敗');
      }
      return response.data;
    },
  });

  const updateMutation = useOfflineMutation<
    {
      recordId: string;
      timestamp: string;
      activities: CareRecord['activities'];
      notes: string;
      status: CareRecordStatus;
      evidence: CareRecord['evidence'];
    },
    CareRecord
  >({
    entityType: 'CareRecords',
    table: 'CareRecords',
    operation: 'update',
    queryKey: ['care-records'],
    toOptimisticEntity: ({ payload, now, syncStatus }) => ({
      recordId: payload.recordId,
      residentId: form.residentId,
      timestamp: payload.timestamp,
      activities: payload.activities,
      staffId: user?.userId || 'unknown',
      staffName: user?.name || '未知使用者',
      completenessScore: scoreResult.score,
      status: payload.status,
      evidence: payload.evidence,
      notes: payload.notes,
      submittedAt: form.submittedAt,
      lockType: form.lockType,
      modificationHistory: [],
      createdAt: now,
      updatedAt: now,
      syncStatus,
      version: 1,
    }),
    mutationFn: async (payload) => {
      if (!navigator.onLine) {
        return {
          recordId: payload.recordId,
          residentId: form.residentId,
          timestamp: payload.timestamp,
          activities: payload.activities,
          staffId: user?.userId || 'unknown',
          staffName: user?.name || '未知使用者',
          completenessScore: scoreResult.score,
          status: payload.status,
          evidence: payload.evidence,
          notes: payload.notes,
          submittedAt: form.submittedAt,
          lockType: form.lockType,
          modificationHistory: [],
          createdAt: form.submittedAt,
          updatedAt: new Date().toISOString(),
        };
      }

      const response = await apiClient.patch<CareRecord>(`/care-records/${payload.recordId}`, payload);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '更新照護記錄失敗');
      }
      return response.data;
    },
  });

  const handleCreateActivity = () => {
    setForm((prev) => ({
      ...prev,
      activities: [...prev.activities, makeDefaultActivity()],
    }));
  };

  const handleRemoveActivity = (activityId: string) => {
    setForm((prev) => {
      if (prev.activities.length === 1) return prev;
      return {
        ...prev,
        activities: prev.activities.filter((activity) => activity.activityId !== activityId),
      };
    });
  };

  const handleActivityChange = <K extends keyof ActivityFormState>(activityId: string, field: K, value: ActivityFormState[K]) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) => {
        if (activity.activityId !== activityId) return activity;
        if (field === 'type' && value !== 'VitalSigns') {
          return { ...activity, [field]: value, vitals: undefined };
        }
        if (field === 'type' && value === 'VitalSigns') {
          return {
            ...activity,
            [field]: value,
            vitals: activity.vitals || { systolic: '', diastolic: '', pulse: '', temperature: '' },
          };
        }
        return { ...activity, [field]: value };
      }),
    }));
  };

  const handleVitalChange = (
    activityId: string,
    field: 'systolic' | 'diastolic' | 'pulse' | 'temperature',
    value: number | ''
  ) => {
    setForm((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) => {
        if (activity.activityId !== activityId) return activity;
        return {
          ...activity,
          vitals: {
            systolic: activity.vitals?.systolic ?? '',
            diastolic: activity.vitals?.diastolic ?? '',
            pulse: activity.vitals?.pulse ?? '',
            temperature: activity.vitals?.temperature ?? '',
            [field]: value,
          },
        };
      }),
    }));
  };

  const handleEvidenceUpload = (files: FileList | null) => {
    if (!files) return;

    const accepted: EvidenceItem[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > EVIDENCE_SIZE_LIMIT) {
        rejected.push(`${file.name} 超過 10MB`);
        return;
      }
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    });

    if (rejected.length > 0) {
      setError(rejected.join('；'));
    }

    if (accepted.length > 0) {
      setForm((prev) => ({
        ...prev,
        evidence: [...prev.evidence, ...accepted],
      }));
    }
  };

  const removeEvidence = (id: string) => {
    setForm((prev) => {
      const target = prev.evidence.find((item) => item.id === id);
      if (target && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return {
        ...prev,
        evidence: prev.evidence.filter((item) => item.id !== id),
      };
    });
  };

  const buildActivitiesPayload = (): CareRecord['activities'] =>
    form.activities.map((activity) => ({
      activityId: activity.activityId,
      type: activity.type,
      assistanceLevel: activity.assistanceLevel || 'PartialAssist',
      timestamp: activity.timestamp,
      notes:
        activity.type === 'VitalSigns' && activity.vitals
          ? `${activity.notes} (BP ${activity.vitals.systolic || '-'} / ${activity.vitals.diastolic || '-'}, P ${activity.vitals.pulse || '-'}, T ${activity.vitals.temperature || '-'})`
          : activity.notes,
      evidence: [],
    }));

  const buildEvidencePayload = (): CareRecord['evidence'] =>
    form.evidence.map((item) => ({
      evidenceId: item.id,
      type: item.type.startsWith('video/') ? 'Video' : 'Photo',
      url: item.url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user?.userId || 'unknown',
    }));

  const handleSubmit = async () => {
    setError(null);
    setFeedback(null);

    if (!form.residentId) {
      setError('請先選擇住民');
      return;
    }

    if (form.activities.length === 0) {
      setError('至少需要一項照護活動');
      return;
    }

    const activities = buildActivitiesPayload();
    const evidence = buildEvidencePayload();

    try {
      if (isCreateMode) {
        await createMutation.mutateAsync({
          residentId: form.residentId,
          timestamp: form.timestamp,
          activities,
          staffId: user?.userId || 'unknown',
          staffName: user?.name || '未知使用者',
          notes: form.notes,
          evidence,
        });
        setFeedback(isOnline ? '照護記錄已建立' : '離線建立完成，已加入待同步佇列');
      } else if (isEditMode) {
        if (isLocked) {
          setError('記錄已鎖定，僅能送出補充修正');
          return;
        }

        await updateMutation.mutateAsync({
          recordId: form.recordId,
          timestamp: form.timestamp,
          activities,
          notes: form.notes,
          status: form.status,
          evidence,
        });
        setFeedback(isOnline ? '照護記錄已更新' : '離線編輯完成，已加入待同步佇列');
      }

      setTimeout(() => {
        navigate('/care-records');
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送出失敗');
    }
  };

  const handleStatusChange = async (recordId: string, status: CareRecordStatus) => {
    setError(null);
    try {
      const response = await apiClient.post<CareRecord>(`/care-records/${recordId}/status`, { status });
      if (!response.success) {
        throw new Error(response.error?.message || '狀態更新失敗');
      }
      await loadCareRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : '狀態更新失敗');
    }
  };

  const handleSupplementSubmit = async () => {
    if (!params.id) return;
    if (!supplement.content.trim() || !supplement.reason.trim()) {
      setError('補充內容與原因皆為必填');
      return;
    }

    setError(null);
    setFeedback(null);
    try {
      const response = await apiClient.post<CareRecord>(`/care-records/${params.id}/supplement`, {
        supplementContent: supplement.content,
        reason: supplement.reason,
        staffId: user?.userId || 'unknown',
        staffName: user?.name || '未知使用者',
      });

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || '建立補充修正失敗');
      }

      setFeedback(`補充修正已建立：${response.data.recordId}`);
      setSupplement({ content: '', reason: '' });
      navigate(`/care-records/${response.data.recordId}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '建立補充修正失敗');
    }
  };

  if (!canCreate) {
    return (
      <div className="card">
        <div className="card-body text-center py-10">
          <h1 className="text-xl font-semibold text-gray-900">權限不足</h1>
          <p className="text-gray-500 mt-2">你沒有操作照護記錄的權限。</p>
        </div>
      </div>
    );
  }

  if (isListMode) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">日常照護記錄</h1>
            <p className="text-gray-500 mt-1">列表、篩選、狀態管理</p>
          </div>
          <Link to="/care-records/new" className="btn-primary">新增記錄</Link>
        </div>

        <div className="card">
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select
              aria-label="住民篩選"
              className="input"
              value={filters.residentId}
              onChange={(event) => setFilters((prev) => ({ ...prev, residentId: event.target.value, page: 1 }))}
            >
              <option value="">全部住民</option>
              {residents.map((resident) => (
                <option key={resident.residentId} value={resident.residentId}>{resident.name} ({resident.residentId})</option>
              ))}
            </select>

            <select
              aria-label="狀態篩選"
              className="input"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value, page: 1 }))}
            >
              <option value="">全部狀態</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <input
              aria-label="起始日期"
              type="date"
              className="input"
              value={filters.startDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value, page: 1 }))}
            />

            <input
              aria-label="結束日期"
              type="date"
              className="input"
              value={filters.endDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value, page: 1 }))}
            />

            <button
              className="btn-secondary"
              onClick={() => setFilters({ residentId: '', status: '', startDate: '', endDate: '', page: 1, pageSize: 10 })}
            >
              清除篩選
            </button>
          </div>
        </div>

        {error && <div className="badge-danger">{error}</div>}

        <div className="card overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">記錄編號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">住民</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">時間</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">記錄人</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">完整性</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingList && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">載入中...</td>
                </tr>
              )}
              {!loadingList && records?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">目前沒有符合條件的照護記錄</td>
                </tr>
              )}
              {!loadingList && records?.items.map((record) => {
                const status = getStatusMeta(record.status);
                return (
                  <tr key={record.recordId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.dot}`} aria-hidden="true" />
                      <span className="sr-only">{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{record.recordId}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.residentId}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(record.timestamp)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.staffName}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={record.completenessScore >= 80 ? 'badge-success' : record.completenessScore >= 60 ? 'badge-warning' : 'badge-danger'}>
                        {record.completenessScore} 分
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          aria-label={`變更狀態-${record.recordId}`}
                          className="input w-auto py-1.5 text-xs"
                          value={record.status}
                          onChange={(event) => void handleStatusChange(record.recordId, event.target.value as CareRecordStatus)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <Link to={`/care-records/${record.recordId}/edit`} className="btn-ghost text-xs py-1.5 px-3">編輯</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {records && records.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">第 {records.page} / {records.totalPages} 頁，共 {records.total} 筆</p>
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost"
                disabled={records.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              >
                上一頁
              </button>
              <button
                className="btn-ghost"
                disabled={records.page >= records.totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                下一頁
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/care-records" className="btn-ghost text-sm mb-2">返回列表</Link>
          <h1 className="text-2xl font-bold text-gray-900">{isCreateMode ? '新增照護記錄' : `編輯照護記錄 ${form.recordId}`}</h1>
          <p className="text-gray-500 mt-1">住民照護活動、完整性評分、離線同步</p>
        </div>
        {!isCreateMode && (
          <div className={`badge ${isLocked ? 'badge-danger' : 'badge-warning'}`}>
            {isLocked ? '已鎖定，僅能補充修正' : `編輯窗口：${lockInfo.text}`}
          </div>
        )}
      </div>

      {(loadingDetail || createMutation.isPending || updateMutation.isPending) && (
        <div className="badge-primary">處理中...</div>
      )}
      {feedback && <div className="badge-success">{feedback}</div>}
      {error && <div className="badge-danger">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="residentId">住民</label>
                <select
                  id="residentId"
                  className="input"
                  disabled={isEditMode}
                  value={form.residentId}
                  onChange={(event) => setForm((prev) => ({ ...prev, residentId: event.target.value }))}
                >
                  <option value="">請選擇住民</option>
                  {residents.map((resident) => (
                    <option key={resident.residentId} value={resident.residentId}>
                      {resident.name} ({resident.residentId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="recordTimestamp">記錄時間</label>
                <input
                  id="recordTimestamp"
                  className="input"
                  type="datetime-local"
                  value={new Date(form.timestamp).toISOString().slice(0, 16)}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, timestamp: new Date(event.target.value).toISOString() }));
                  }}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="label" htmlFor="recordNotes">整體備註</label>
                <textarea
                  id="recordNotes"
                  className="input min-h-24"
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="輸入照護記錄摘要"
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">照護活動</h2>
              <button type="button" className="btn-secondary" onClick={handleCreateActivity} disabled={isLocked}>新增活動</button>
            </div>
            <div className="card-body space-y-4">
              {form.activities.map((activity, index) => (
                <div key={activity.activityId} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">活動 #{index + 1}</h3>
                    <button
                      type="button"
                      className="btn-ghost text-danger-600"
                      disabled={form.activities.length === 1 || isLocked}
                      onClick={() => handleRemoveActivity(activity.activityId)}
                    >
                      刪除
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="label">活動類型</label>
                      <select
                        className="input"
                        value={activity.type}
                        disabled={isLocked}
                        onChange={(event) =>
                          handleActivityChange(activity.activityId, 'type', event.target.value as ActivityFormState['type'])
                        }
                      >
                        {ACTIVITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">協助等級</label>
                      <select
                        className="input"
                        value={activity.assistanceLevel}
                        disabled={isLocked}
                        onChange={(event) =>
                          handleActivityChange(activity.activityId, 'assistanceLevel', event.target.value as ActivityFormState['assistanceLevel'])
                        }
                      >
                        {ASSISTANCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">持續分鐘</label>
                      <input
                        className="input"
                        type="number"
                        min={1}
                        max={600}
                        disabled={isLocked}
                        value={activity.durationMinutes}
                        onChange={(event) =>
                          handleActivityChange(
                            activity.activityId,
                            'durationMinutes',
                            event.target.value ? Number(event.target.value) : ''
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="label">活動時間</label>
                      <input
                        className="input"
                        type="datetime-local"
                        disabled={isLocked}
                        value={new Date(activity.timestamp).toISOString().slice(0, 16)}
                        onChange={(event) =>
                          handleActivityChange(activity.activityId, 'timestamp', new Date(event.target.value).toISOString())
                        }
                      />
                    </div>
                  </div>

                  {activity.type === 'VitalSigns' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label">收縮壓</label>
                        <input
                          className="input"
                          type="number"
                          disabled={isLocked}
                          value={activity.vitals?.systolic ?? ''}
                          onChange={(event) => handleVitalChange(activity.activityId, 'systolic', event.target.value ? Number(event.target.value) : '')}
                        />
                      </div>
                      <div>
                        <label className="label">舒張壓</label>
                        <input
                          className="input"
                          type="number"
                          disabled={isLocked}
                          value={activity.vitals?.diastolic ?? ''}
                          onChange={(event) => handleVitalChange(activity.activityId, 'diastolic', event.target.value ? Number(event.target.value) : '')}
                        />
                      </div>
                      <div>
                        <label className="label">脈搏</label>
                        <input
                          className="input"
                          type="number"
                          disabled={isLocked}
                          value={activity.vitals?.pulse ?? ''}
                          onChange={(event) => handleVitalChange(activity.activityId, 'pulse', event.target.value ? Number(event.target.value) : '')}
                        />
                      </div>
                      <div>
                        <label className="label">體溫</label>
                        <input
                          className="input"
                          type="number"
                          step="0.1"
                          disabled={isLocked}
                          value={activity.vitals?.temperature ?? ''}
                          onChange={(event) => handleVitalChange(activity.activityId, 'temperature', event.target.value ? Number(event.target.value) : '')}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label">活動備註</label>
                    <textarea
                      className="input min-h-20"
                      disabled={isLocked}
                      value={activity.notes}
                      onChange={(event) => handleActivityChange(activity.activityId, 'notes', event.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">照片 / 影片上傳</h2>
            </div>
            <div className="card-body space-y-4">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={isLocked}
                onChange={(event) => handleEvidenceUpload(event.target.files)}
              />
              <p className="text-xs text-gray-500">單檔上限 10MB。離線時先暫存，恢復連線後同步。</p>

              {form.evidence.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {form.evidence.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{Math.round(item.size / 1024)} KB</p>
                      <div className="mt-2 flex items-center gap-2">
                        <a className="btn-ghost text-xs" href={item.url} target="_blank" rel="noreferrer">預覽</a>
                        <button type="button" className="btn-ghost text-xs text-danger-600" onClick={() => removeEvidence(item.id)}>
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!isCreateMode && isLocked && (
            <div className="card border-warning-200">
              <div className="card-header bg-warning-50">
                <h2 className="font-semibold text-warning-800">補充修正案</h2>
              </div>
              <div className="card-body space-y-3">
                <textarea
                  className="input min-h-20"
                  placeholder="補充修正內容"
                  value={supplement.content}
                  onChange={(event) => setSupplement((prev) => ({ ...prev, content: event.target.value }))}
                />
                <input
                  className="input"
                  placeholder="修正原因"
                  value={supplement.reason}
                  onChange={(event) => setSupplement((prev) => ({ ...prev, reason: event.target.value }))}
                />
                <button className="btn-primary" type="button" onClick={() => void handleSupplementSubmit()}>
                  送出補充修正
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">完整性評分</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-gray-900">{scoreResult.score}</span>
                <span className="text-gray-500">/ 100</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${scoreResult.score >= 80 ? 'bg-success-500' : scoreResult.score >= 60 ? 'bg-warning-500' : 'bg-danger-500'}`}
                  style={{ width: `${scoreResult.score}%` }}
                />
              </div>
              {scoreResult.missing.length > 0 ? (
                <ul className="text-sm text-warning-700 list-disc list-inside space-y-1">
                  {scoreResult.missing.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-success-700">欄位完整，可送出。</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">狀態</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${getStatusMeta(form.status).dot}`} />
                <span>{getStatusMeta(form.status).label}</span>
              </div>

              <select
                className="input"
                disabled={isLocked}
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as CareRecordStatus }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-gray-900">同步狀態</h2>
            </div>
            <div className="card-body">
              <p className={`text-sm ${isOnline ? 'text-success-700' : 'text-warning-700'}`}>
                {isOnline ? '目前線上，送出後將同步至伺服器。' : '目前離線，送出後先存本機待同步。'}
              </p>
            </div>
          </div>

          <button
            className="btn-primary w-full"
            disabled={loadingDetail || createMutation.isPending || updateMutation.isPending}
            type="button"
            onClick={() => void handleSubmit()}
          >
            {isCreateMode ? '建立照護記錄' : '儲存變更'}
          </button>

          {!isCreateMode && (
            <p className="text-xs text-gray-500">最後送出時間：{formatDateTime(form.submittedAt)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
