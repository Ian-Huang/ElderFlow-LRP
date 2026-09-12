import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useDailyCompletion } from './useReports';

export interface DailyCompletionViewProps {
  onOpenExportModal?: (params: { reportType: 'completion-report'; date: string }) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
  Normal: {
    label: '正常完成 (≥80%)',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
  },
  NeedsReview: {
    label: '待覆核 (60-79%)',
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  VerificationRequired: {
    label: '需複查 (<60%)',
    color: '#EF4444',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
  },
};

export function DailyCompletionView({ onOpenExportModal }: DailyCompletionViewProps) {
  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const { data: report, isLoading, isError, error, refetch } = useDailyCompletion(selectedDate);

  const stepDate = (current: string, deltaDays: number): string => {
    const base = current && !isNaN(new Date(current).getTime()) ? new Date(current) : new Date();
    base.setDate(base.getDate() + deltaDays);
    return base.toISOString().split('T')[0] ?? '';
  };

  const handlePrevDay = () => {
    setSelectedDate(stepDate(selectedDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(stepDate(selectedDate, 1));
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  return (
    <div className="space-y-6">
      {/* Date filter bar & Export trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="daily-date-picker" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            照護日期：
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
              title="前一天"
              aria-label="前一天"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              id="daily-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input py-1.5 px-3 w-40 text-sm font-medium"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
              title="後一天"
              aria-label="後一天"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="btn btn-secondary py-1.5 px-3 text-xs"
            >
              今天
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onOpenExportModal?.({
                reportType: 'completion-report',
                date: selectedDate,
              })
            }
            className="btn btn-primary py-2 px-4 text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            匯出本日報表
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200" data-testid="loading-indicator">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm text-gray-500">正在計算與載入每日照護完成數據...</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error instanceof Error ? error.message : '載入每日照護報表失敗'}</p>
          <button onClick={() => refetch()} className="btn btn-secondary text-xs">
            重新載入
          </button>
        </div>
      )}

      {report && (
        <>
          {/* Summary Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 bg-gradient-to-br from-blue-50 to-white">
              <p className="text-sm font-medium text-gray-500">住民總人數</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-gray-900">{report.totalResidents}</span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">在住</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">機構全體在籍住民數</p>
            </div>

            <div className="card p-5 bg-gradient-to-br from-emerald-50 to-white">
              <p className="text-sm font-medium text-gray-500">照護達標住民</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-emerald-600">{report.completedRecords}</span>
                <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">≥80% 達標</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">完成本日表定必做項目</p>
            </div>

            <div className="card p-5 bg-gradient-to-br from-amber-50 to-white">
              <p className="text-sm font-medium text-gray-500">全院平均完成度</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-amber-600">{report.averageCompletionRate}%</span>
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">整體指標</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, report.averageCompletionRate)}%` }}
                />
              </div>
            </div>

            <div className="card p-5 bg-gradient-to-br from-indigo-50 to-white">
              <p className="text-sm font-medium text-gray-500">達標比例</p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-bold text-indigo-600">
                  {report.totalResidents > 0
                    ? Math.round((report.completedRecords / report.totalResidents) * 100)
                    : 0}
                  %
                </span>
                <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  {report.completedRecords}/{report.totalResidents}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-400">達標人數佔總人數比例</p>
            </div>
          </div>

          {/* Visualizations: Bar Chart & Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart: Completion score per resident */}
            <div className="card lg:col-span-2">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">個別住民照護完成率長條圖</h3>
                  <p className="text-xs text-gray-500 mt-0.5">以 80% 為照護品質標準達標門檻</p>
                </div>
              </div>
              <div className="card-body">
                <div className="w-full h-72" data-testid="bar-chart-container">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart
                      data={report.residentScores}
                      margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="residentName"
                        tick={{ fontSize: 12, fill: '#4B5563' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fill: '#4B5563' }}
                        unit="%"
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, '照護完成率']}
                        labelFormatter={(label) => `住民：${label}`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine
                        y={80}
                        label={{ value: '達標線 80%', fill: '#EF4444', fontSize: 11, position: 'top' }}
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                      />
                      <Bar
                        dataKey="completionRate"
                        name="照護完成率 (%)"
                        fill="#3B82F6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Pie Chart: Status Distribution */}
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900">照護狀態分佈</h3>
                <p className="text-xs text-gray-500 mt-0.5">全院住民完成率層級分佈</p>
              </div>
              <div className="card-body flex flex-col items-center justify-center">
                <div className="w-full h-56" data-testid="pie-chart-container">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={report.statusDistribution}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={40}
                        paddingAngle={4}
                      >
                        {report.statusDistribution.map((entry) => {
                          const config = STATUS_CONFIG[entry.status] || { color: '#9CA3AF' };
                          return <Cell key={entry.status} fill={config.color} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          const cfg = STATUS_CONFIG[name];
                          return [`${value} 人`, cfg ? cfg.label : name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="w-full mt-2 space-y-1.5 text-xs">
                  {report.statusDistribution.map((item) => {
                    const cfg = STATUS_CONFIG[item.status] || {
                      label: item.status,
                      color: '#9CA3AF',
                      bgColor: 'bg-gray-50',
                      textColor: 'text-gray-700',
                    };
                    return (
                      <div
                        key={item.status}
                        className="flex items-center justify-between p-1.5 rounded bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cfg.color }}
                          />
                          <span className="font-medium text-gray-700">{cfg.label}</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {item.count} 人 ({item.percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Low Score Residents Table */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500" />
                  照護未達標住民名單 (完成度 &lt; 80%)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">需值班照服員與護理師優先補登或追蹤之項目</p>
              </div>
              <span className="badge badge-danger">
                共 {report.lowScoreResidents.length} 位待加強
              </span>
            </div>
            <div className="card-body p-0">
              {report.lowScoreResidents.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-base font-medium text-gray-800">全院住民今日照護全數達標！</p>
                  <p className="text-xs text-gray-400 mt-1">目前無完成度低於 80% 之未完成項目</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" data-testid="low-score-table">
                    <thead className="bg-gray-50 text-gray-600 text-xs border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold">住民姓名</th>
                        <th className="py-3 px-4 font-semibold">床號</th>
                        <th className="py-3 px-4 font-semibold">今日完成度</th>
                        <th className="py-3 px-4 font-semibold">未完成缺漏項目</th>
                        <th className="py-3 px-4 font-semibold text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {report.lowScoreResidents.map((resident) => (
                        <tr key={resident.residentId} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-gray-900">
                            {resident.residentName}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">
                              {resident.bedNumber}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`badge ${
                                resident.completionRate < 60 ? 'badge-danger' : 'badge-warning'
                              }`}
                            >
                              {resident.completionRate}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {resident.missingItems && resident.missingItems.length > 0 ? (
                                resident.missingItems.map((item, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 border border-rose-200"
                                  >
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400">無記錄缺漏項目</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Link
                              to={`/care-records?residentId=${resident.residentId}`}
                              className="btn btn-secondary py-1 px-3 text-xs inline-flex items-center gap-1"
                            >
                              查看紀錄
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
