
interface PermissionDetail {
  level: 'full' | 'partial' | 'readonly' | 'none';
  label: string;
}

interface ModuleRow {
  name: string;
  category: string;
  description: string;
  caregiver: PermissionDetail;
  supervisor: PermissionDetail;
  admin: PermissionDetail;
  sysadmin: PermissionDetail;
}

export function RoleMatrixView() {
  const matrixData: ModuleRow[] = [
    {
      name: '住民管理 (Residents)',
      category: '照護業務',
      description: '住民基本資料、病歷摘要、管路設定與床位配置檢視',
      caregiver: { level: 'partial', label: '負責床位檢視與編輯' },
      supervisor: { level: 'full', label: '全機構住民增修與移床' },
      admin: { level: 'full', label: '住民增修與批次匯入' },
      sysadmin: { level: 'full', label: '所有資料維護與封存' },
    },
    {
      name: '照護記錄 (Care Records)',
      category: '照護業務',
      description: '生命徵象、排泄、飲食、管路照護記錄填寫與 24hr 鎖定管控',
      caregiver: { level: 'partial', label: '填寫與 24hr 內修改' },
      supervisor: { level: 'full', label: '審核與解鎖過期記錄' },
      admin: { level: 'full', label: '完整增修與解鎖' },
      sysadmin: { level: 'full', label: '完整增修與日誌檢視' },
    },
    {
      name: '用藥管理 (Medications)',
      category: '照護業務',
      description: '處方排程、給藥執行記錄、庫存扣減與三讀五對驗證',
      caregiver: { level: 'partial', label: '執行給藥與漏給標記' },
      supervisor: { level: 'full', label: '處方排程與補庫存審核' },
      admin: { level: 'full', label: '藥品主檔與庫存盤點' },
      sysadmin: { level: 'full', label: '主檔管理與藥物字典' },
    },
    {
      name: '照護計畫 (Care Plans)',
      category: '專業照護',
      description: '評估量表、跨專業照護目標設定、成效追蹤與定期審閱評估',
      caregiver: { level: 'readonly', label: '僅檢視評估與計畫內容' },
      supervisor: { level: 'full', label: '評估量表擬定、審批與修訂' },
      admin: { level: 'full', label: '計畫審閱與品質評核' },
      sysadmin: { level: 'full', label: '評估範本與欄位配置' },
    },
    {
      name: '報表中心 (Reports)',
      category: '營運管理',
      description: '每日完成度儀表板、異常事件統計、住民現況與 PDF 統一匯出',
      caregiver: { level: 'none', label: '無存取權限' },
      supervisor: { level: 'full', label: '產出報表與 PDF 下載' },
      admin: { level: 'full', label: '完整統計與各類匯出' },
      sysadmin: { level: 'full', label: '歷史報表與效能分析' },
    },
    {
      name: '稽核軌跡 (Audit Trail)',
      category: '法規合規',
      description: '5 年不可竄改之資料異動軌跡、前值/新值比對與事件追蹤',
      caregiver: { level: 'none', label: '無存取權限' },
      supervisor: { level: 'readonly', label: '所屬班別稽核軌跡檢視' },
      admin: { level: 'full', label: '全機構稽核日誌與 PDF 匯出' },
      sysadmin: { level: 'full', label: '原始日誌導出與安全性稽核' },
    },
    {
      name: '系統管理中心 (Admin)',
      category: '系統核心',
      description: '使用者名冊、角色指派、停用控制、最後管理員防線保護',
      caregiver: { level: 'none', label: '無存取權限' },
      supervisor: { level: 'none', label: '無存取權限' },
      admin: { level: 'full', label: '使用者 CRUD 與參數配置' },
      sysadmin: { level: 'full', label: '管理員指派與系統防線' },
    },
    {
      name: '系統健康監控 (System Health)',
      category: '系統核心',
      description: 'API Server、資料庫、Service Worker 快取、IndexedDB 狀態與 CPU/RAM 負載',
      caregiver: { level: 'none', label: '無存取權限' },
      supervisor: { level: 'none', label: '無存取權限' },
      admin: { level: 'full', label: '即時監測與手動健康檢測' },
      sysadmin: { level: 'full', label: '詳細日誌與指標重置' },
    },
    {
      name: '功能旗標發布 (Feature Flags)',
      category: '系統核心',
      description: '動態模組開關切換、環境隔離控制與 0-100% 灰度分流發布',
      caregiver: { level: 'none', label: '無存取權限' },
      supervisor: { level: 'none', label: '無存取權限' },
      admin: { level: 'readonly', label: '檢視功能旗標狀態' },
      sysadmin: { level: 'full', label: '切換啟用與調整發布百分比' },
    },
  ];

  const renderBadge = (perm: PermissionDetail) => {
    switch (perm.level) {
      case 'full':
        return (
          <div className="flex items-start gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success-50 text-success-700 border border-success-200 whitespace-nowrap">
              ✓ 完整權限
            </span>
            <span className="text-xs text-gray-500 hidden xl:inline">{perm.label}</span>
          </div>
        );
      case 'partial':
        return (
          <div className="flex items-start gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200 whitespace-nowrap">
              ◈ 部分權限
            </span>
            <span className="text-xs text-gray-500 hidden xl:inline">{perm.label}</span>
          </div>
        );
      case 'readonly':
        return (
          <div className="flex items-start gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-warning-50 text-warning-700 border border-warning-200 whitespace-nowrap">
              ◉ 僅供檢視
            </span>
            <span className="text-xs text-gray-500 hidden xl:inline">{perm.label}</span>
          </div>
        );
      case 'none':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">
            ✕ 無權限
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Card */}
      <div className="card">
        <div className="card-body">
          <h2 className="text-lg font-bold text-gray-900">角色與功能權限矩陣 (RBAC Matrix)</h2>
          <p className="text-sm text-gray-600 mt-1">
            本機構系統依循長照法規與最小權限原則 (Principle of Least Privilege)，定義 4 種角色在各子系統的存取階層與責任分界。
          </p>

          {/* Role hierarchy flowchart */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-gray-500 font-semibold">角色權限繼承層級：</span>
            <span className="px-2.5 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-md font-medium">
              1. 照護員 (Caregiver)
            </span>
            <span className="text-gray-400">＜</span>
            <span className="px-2.5 py-1 bg-warning-50 text-warning-700 border border-warning-200 rounded-md font-medium">
              2. 主管 (Supervisor)
            </span>
            <span className="text-gray-400">＜</span>
            <span className="px-2.5 py-1 bg-danger-50 text-danger-700 border border-danger-200 rounded-md font-medium">
              3. 管理員 (Admin)
            </span>
            <span className="text-gray-400">＜</span>
            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded-md font-bold">
              4. 系統管理員 (Sysadmin)
            </span>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">模組授權對照表</h3>
          <span className="text-xs text-gray-500">共 9 項業務與核心模組</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="px-4 py-3.5 w-1/4">功能模組</th>
                <th className="px-3 py-3.5 text-center bg-primary-50/50">照護員 (Caregiver)</th>
                <th className="px-3 py-3.5 text-center bg-warning-50/50">主管 (Supervisor)</th>
                <th className="px-3 py-3.5 text-center bg-danger-50/50">管理員 (Admin)</th>
                <th className="px-3 py-3.5 text-center bg-gray-100/50">系統管理員 (Sysadmin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {matrixData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-bold text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{row.description}</div>
                  </td>
                  <td className="px-3 py-4 text-center">{renderBadge(row.caregiver)}</td>
                  <td className="px-3 py-4 text-center">{renderBadge(row.supervisor)}</td>
                  <td className="px-3 py-4 text-center">{renderBadge(row.admin)}</td>
                  <td className="px-3 py-4 text-center">{renderBadge(row.sysadmin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="card-footer justify-between text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium text-gray-700">圖例說明：</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-success-500" />
              完整權限 (增修查刪與審批)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
              部分權限 (限受指派住民或限時)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-warning-500" />
              僅供檢視 (唯讀存取)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              無權限 (禁止訪問，嘗試將觸發 403)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
