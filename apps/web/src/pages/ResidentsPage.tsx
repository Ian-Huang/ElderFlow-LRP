import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { Resident } from '@lrp/shared';

const mockResidents: Resident[] = [
  {
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
  },
  {
    residentId: 'RES-002',
    name: '李美華',
    gender: 'Female',
    dateOfBirth: '1950-07-22',
    address: '新北市板橋區文化路 456 號',
    insuranceId: 'B987654321',
    diagnosis: '中風後遺症、骨質疏鬆',
    admissionDate: '2023-08-15',
    specialNeeds: '左側癱瘓、需輪椅',
    status: 'Active',
    hasThreePipe: false,
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    residentId: 'RES-003',
    name: '陳志明',
    gender: 'Male',
    dateOfBirth: '1938-11-05',
    address: '桃園市中壢區環中路 789 號',
    insuranceId: 'C456789123',
    diagnosis: '帕金森氏症、憂鬱症',
    admissionDate: '2023-10-01',
    specialNeeds: '震顫、需心理支持',
    status: 'Active',
    hasThreePipe: false,
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

export function ResidentsPage() {
  const { hasRole } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredResidents = mockResidents.filter((r) => {
    const matchesSearch =
      r.name.includes(search) ||
      r.residentId.includes(search) ||
      r.insuranceId.includes(search);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const canManage = hasRole(['admin', 'sysadmin']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">住民管理</h1>
          <p className="text-gray-500 mt-1">管理住民基本資料與狀態</p>
        </div>
        {canManage && (
          <Link to="/residents/new" className="btn-primary">
            <PlusIcon className="w-5 h-5" aria-hidden="true" />
            新增住民
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">搜尋住民</label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                placeholder="搜尋姓名、住民編號、保險 ID..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">所有狀態</option>
              <option value="Active">住住中</option>
              <option value="Inactive">已離院</option>
            </select>
          </div>
        </div>
      </div>

      {/* Residents table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">住民編號</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">性別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">年齡</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">三管</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">入住日期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResidents.map((resident) => (
                <tr key={resident.residentId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">{resident.residentId}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{resident.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{resident.gender === 'Male' ? '男' : '女'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {calculateAge(resident.dateOfBirth)} 歲
                  </td>
                  <td className="px-4 py-3">
                    {resident.hasThreePipe ? (
                      <span className="badge-warning">是</span>
                    ) : (
                      <span className="badge-gray">否</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {resident.status === 'Active' ? (
                      <span className="badge-success">住住中</span>
                    ) : (
                      <span className="badge-gray">已離院</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(resident.admissionDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/residents/${resident.residentId}`}
                        className="btn-ghost text-xs py-1.5 px-3"
                      >
                        詳情
                      </Link>
                      {canManage && (
                        <button className="btn-ghost text-xs py-1.5 px-3 text-danger-600 hover:bg-danger-50">
                          編輯
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredResidents.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
                    <p>找不到符合條件的住民</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}