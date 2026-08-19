import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { Resident } from '@lrp/shared';

const mockResident: Resident = {
  residentId: 'RES-001',
  name: '王大明',
  gender: 'Male',
  dateOfBirth: '1945-03-15',
  address: '台北市大安區仁愛路四段 123 號',
  insuranceId: 'A123456789',
  diagnosis: '高血壓、糖尿病、失智症',
  admissionDate: '2023-06-01',
  specialNeeds: '需協助進食、行動不便',
  status: 'Active',
  hasThreePipe: true,
  createdAt: '2023-06-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

export function ResidentDetailPage() {
  const { hasRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'basic' | 'care' | 'medication' | 'plan'>('basic');

  const canEdit = hasRole(['admin', 'sysadmin']);

  const tabs = [
    { id: 'basic', label: '基本資料', icon: UserIcon },
    { id: 'care', label: '照護記錄', icon: ClipboardIcon },
    { id: 'medication', label: '藥物管理', icon: PillIcon },
    { id: 'plan', label: '照護計畫', icon: DocumentIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link to="/residents" className="btn-ghost text-sm mb-2">
            <ArrowLeftIcon className="w-4 h-4 mr-1" aria-hidden="true" />
            返回列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{mockResident.name}</h1>
          <p className="text-gray-500 mt-1">{mockResident.residentId} · {mockResident.gender === 'Male' ? '男' : '女'} · {calculateAge(mockResident.dateOfBirth)} 歲</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${mockResident.hasThreePipe ? 'bg-warning-100 text-warning-700' : 'bg-gray-100 text-gray-600'}`}>
            {mockResident.hasThreePipe ? '三管住民' : '一般住民'}
          </span>
          {canEdit && (
            <button className="btn-secondary">
              <EditIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              編輯
            </button>
          )}
        </div>
      </div>

      {/* Basic info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">保險 ID</p>
            <p className="font-mono text-gray-900">{mockResident.insuranceId}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">入住日期</p>
            <p className="text-gray-900">{formatDate(mockResident.admissionDate)}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">狀態</p>
            <p className="text-gray-900">{mockResident.status === 'Active' ? '住住中' : '已離院'}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-gray-500">護理比例</p>
            <p className="text-gray-900 font-medium">{mockResident.hasThreePipe ? '1:15' : '1:20'}</p>
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
                    ? 'border-primary-500 text-primary-600'
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

        <div className="card-body">
          {activeTab === 'basic' && <BasicInfoTab resident={mockResident} />}
          {activeTab === 'care' && <CareRecordsTab />}
          {activeTab === 'medication' && <MedicationsTab />}
          {activeTab === 'plan' && <CarePlansTab />}
        </div>
      </div>
    </div>
  );
}

function BasicInfoTab({ resident }: { resident: Resident }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">基本資料</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">姓名</dt>
              <dd className="text-gray-900">{resident.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">性別</dt>
              <dd className="text-gray-900">{resident.gender === 'Male' ? '男' : '女'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">出生日期</dt>
              <dd className="text-gray-900">{formatDate(resident.dateOfBirth)} ({calculateAge(resident.dateOfBirth)} 歲)</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">身分證/保險 ID</dt>
              <dd className="font-mono text-gray-900">{resident.insuranceId}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">地址與診斷</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">地址</dt>
              <dd className="text-gray-900">{resident.address}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">診斷</dt>
              <dd className="text-gray-900">{resident.diagnosis || '無'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">特殊需求</dt>
              <dd className="text-gray-900">{resident.specialNeeds || '無'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">系統資訊</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><dt className="text-gray-500">建立時間</dt><dd className="text-gray-900">{formatDateTime(resident.createdAt)}</dd></div>
          <div><dt className="text-gray-500">最後更新</dt><dd className="text-gray-900">{formatDateTime(resident.updatedAt)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function CareRecordsTab() {
  return (
    <div className="text-center py-8 text-gray-500">
      <ClipboardIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
      <p>照護記錄列表 (待實作)</p>
    </div>
  );
}

function MedicationsTab() {
  return (
    <div className="text-center py-8 text-gray-500">
      <PillIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
      <p>藥物管理列表 (待實作)</p>
    </div>
  );
}

function CarePlansTab() {
  return (
    <div className="text-center py-8 text-gray-500">
      <DocumentIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
      <p>照護計畫列表 (待實作)</p>
    </div>
  );
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
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