import { useMemo } from 'react';
import { useSandboxCollection, type SandboxItem } from '@/hooks/useSandboxCollection';
import { FrontlineDataGrid, type DataGridColumn } from '../components/FrontlineDataGrid';
import type { VisitorRecord, VisitorType } from './VisitorPublicKioskForm';

export function VisitorDataManagerTable() {
  const { data, isLoading, error, update, remove, removeMany, insertMany, exportCSV } =
    useSandboxCollection<VisitorRecord>('visitors');

  const columns: DataGridColumn<VisitorRecord>[] = useMemo(
    () => [
      {
        key: 'visitDate',
        label: '登記日期',
        width: '110px',
        editable: true,
        type: 'date',
      },
      {
        key: 'visitTime',
        label: '時間',
        width: '80px',
        editable: true,
        type: 'text',
      },
      {
        key: 'visitorType',
        label: '身分類別',
        width: '110px',
        editable: true,
        type: 'select',
        selectOptions: ['志工服務', '住民家屬', '機構洽公'],
        render: (value: VisitorType) => {
          const colorClass =
            value === '志工服務'
              ? 'bg-purple-100 text-purple-800'
              : value === '住民家屬'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800';
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${colorClass}`}>
              {value || '未分類'}
            </span>
          );
        },
      },
      {
        key: 'name',
        label: '訪客姓名',
        width: '120px',
        editable: true,
        type: 'text',
        render: (value: string, item: SandboxItem<VisitorRecord>) => (
          <div className="font-semibold text-slate-900">
            {value || '—'}
            {item.isGroup && (
              <span className="ml-1 text-[11px] text-emerald-600 font-normal">(團體)</span>
            )}
          </div>
        ),
      },
      {
        key: 'phone',
        label: '聯絡電話',
        width: '120px',
        editable: true,
        type: 'text',
        render: (value: string) => <span className="font-mono text-xs text-slate-700">{value || '—'}</span>,
      },
      {
        key: 'temperature',
        label: '體溫(°C)',
        width: '90px',
        editable: true,
        type: 'text',
        render: (value: string) => {
          const tempNum = parseFloat(value);
          const isFever = !isNaN(tempNum) && tempNum >= 37.5;
          return (
            <span className={`font-mono font-semibold ${isFever ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
              {value ? `${value}°C` : '—'}
            </span>
          );
        },
      },
      {
        key: 'residentName',
        label: '探視長輩',
        width: '100px',
        editable: true,
        type: 'text',
      },
      {
        key: 'residentBed',
        label: '床號',
        width: '80px',
        editable: true,
        type: 'text',
      },
      {
        key: 'relationship',
        label: '關係',
        width: '80px',
        editable: true,
        type: 'text',
      },
      {
        key: 'isRegisteredFamily',
        label: '登記家屬',
        width: '90px',
        editable: true,
        type: 'select',
        selectOptions: ['是', '否'],
        defaultVisible: false,
      },
      {
        key: 'serviceUnit',
        label: '志工單位',
        width: '120px',
        editable: true,
        type: 'text',
      },
      {
        key: 'servicePurpose',
        label: '服務事由',
        width: '130px',
        editable: true,
        type: 'text',
      },
      {
        key: 'organization',
        label: '洽公單位',
        width: '120px',
        editable: true,
        type: 'text',
        defaultVisible: false,
      },
      {
        key: 'officialPurpose',
        label: '洽工事由',
        width: '130px',
        editable: true,
        type: 'text',
        defaultVisible: false,
      },
      {
        key: 'tocc',
        label: 'TOCC',
        width: '100px',
        editable: true,
        type: 'text',
        defaultVisible: false,
      },
      {
        key: 'healthMeasures',
        label: '防疫措施',
        width: '110px',
        editable: true,
        type: 'text',
        defaultVisible: false,
      },
      {
        key: 'notes',
        label: '備註',
        width: '140px',
        editable: true,
        type: 'text',
      },
      {
        key: 'estimatedDuration',
        label: '停留時間',
        width: '90px',
        editable: true,
        type: 'text',
        defaultVisible: false,
      },
    ],
    []
  );

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">載入訪客資料庫中...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-rose-500">資料讀取發生錯誤：{error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <FrontlineDataGrid<VisitorRecord>
        title="訪客與志工即時管理資料庫"
        data={data}
        columns={columns}
        onUpdate={async (id, patch) => {
          await update(id, patch);
        }}
        onDelete={async (id, item) => {
          if (window.confirm(`確定要刪除訪客「${item.name || '此筆紀錄'}」嗎？`)) {
            await remove(id);
          }
        }}
        onBatchDelete={async (ids) => {
          await removeMany(ids);
        }}
        onPasteImport={async (records) => {
          await insertMany(records);
        }}
        onExportCSV={() => {
          exportCSV('中山老人養護中心_訪客登記總表.csv');
        }}
        searchFields={['name', 'phone', 'serviceUnit', 'organization', 'residentName', 'residentBed', 'notes']}
        searchPlaceholder="搜尋姓名、電話、長輩、床號、單位、備註..."
        categoryFilter={{
          key: 'visitorType',
          label: '身分篩選',
          options: [
            { label: '全部身分', value: 'ALL' },
            { label: '志工服務', value: '志工服務' },
            { label: '住民家屬', value: '住民家屬' },
            { label: '機構洽公', value: '機構洽公' },
          ],
        }}
        dateFilterKey="visitDate"
      />
    </div>
  );
}
