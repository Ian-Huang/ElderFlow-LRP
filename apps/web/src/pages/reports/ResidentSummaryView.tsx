import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useResidentSummary } from './useReports';

export interface ResidentSummaryViewProps {
  onNavigateToAlerts?: (severity?: 'red' | 'yellow') => void;
}

const DEPENDENCY_COLORS: Record<string, string> = {
  輕度: '#10B981', // green
  中度: '#3B82F6', // blue
  重度: '#F59E0B', // amber
  極重度: '#EF4444', // red
};

export function ResidentSummaryView({ onNavigateToAlerts }: ResidentSummaryViewProps) {
  const { data: summary, isLoading, isError, error, refetch } = useResidentSummary();
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [bedStatusFilter, setBedStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'maintenance'>('all');

  // Filtered beds
  const filteredBeds = useMemo(() => {
    if (!summary?.bedOccupancy) return [];
    return summary.bedOccupancy.filter((b) => {
      const matchFloor = selectedFloor === 'all' || b.floor === selectedFloor;
      const matchStatus = bedStatusFilter === 'all' || b.status === bedStatusFilter;
      return matchFloor && matchStatus;
    });
  }, [summary?.bedOccupancy, selectedFloor, bedStatusFilter]);

  // Group beds by room
  const bedsByRoom = useMemo(() => {
    const map = new Map<string, typeof filteredBeds>();
    filteredBeds.forEach((bed) => {
      const roomKey = `${bed.floor} - ${bed.room} 房`;
      if (!map.has(roomKey)) {
        map.set(roomKey, []);
      }
      map.get(roomKey)!.push(bed);
    });
    return map;
  }, [filteredBeds]);

  // Dependency chart data
  const dependencyData = useMemo(() => {
    if (!summary?.dependencyDistribution) return [];
    return Object.entries(summary.dependencyDistribution).map(([level, count]) => ({
      level,
      count,
      percentage:
        summary.totalResidents > 0 ? Math.round((count / summary.totalResidents) * 1000) / 10 : 0,
    }));
  }, [summary?.dependencyDistribution, summary?.totalResidents]);

  // Tube statistics chart data
  const tubeChartData = useMemo(() => {
    if (!summary?.tubeStats) return [];
    return [
      { name: '鼻胃管 (NG)', count: summary.tubeStats.nasogastric, fill: '#3B82F6' },
      { name: '導尿管 (Foley)', count: summary.tubeStats.urinaryCatheter, fill: '#10B981' },
      { name: '氣切管 (Trach)', count: summary.tubeStats.tracheostomy, fill: '#F59E0B' },
      { name: '三管住民', count: summary.tubeStats.threePipeCount, fill: '#EF4444' },
    ];
  }, [summary?.tubeStats]);

  // Bed statistics
  const bedStats = useMemo(() => {
    if (!summary?.bedOccupancy) return { total: 0, occupied: 0, vacant: 0, maintenance: 0 };
    const total = summary.bedOccupancy.length;
    const occupied = summary.bedOccupancy.filter((b) => b.status === 'occupied').length;
    const vacant = summary.bedOccupancy.filter((b) => b.status === 'vacant').length;
    const maintenance = summary.bedOccupancy.filter((b) => b.status === 'maintenance').length;
    return { total, occupied, vacant, maintenance };
  }, [summary?.bedOccupancy]);

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="flex items-center justify-center p-12 bg-white rounded-xl border border-gray-200" data-testid="loading-indicator">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm text-gray-500">正在統計全院住民健康狀態、管路與床位數據...</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
          <p className="text-sm">{error instanceof Error ? error.message : '載入住民概況失敗'}</p>
          <button onClick={() => refetch()} className="btn btn-secondary text-xs">
            重新載入
          </button>
        </div>
      )}

      {summary && (
        <>
          {/* Quick Alerts Summary Banner */}
          {(summary.alertsSummary.red > 0 || summary.alertsSummary.yellow > 0) && (
            <div className="p-4 bg-gradient-to-r from-red-50 via-amber-50 to-white rounded-xl border border-red-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    即時異常事件監控提醒
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    目前共有{' '}
                    <span className="font-semibold text-red-600">{summary.alertsSummary.red} 項紅標重大警示</span>
                    、{' '}
                    <span className="font-semibold text-amber-600">{summary.alertsSummary.yellow} 項黃標注意事件</span>
                    待值班人員處理。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {summary.alertsSummary.red > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigateToAlerts?.('red')}
                    className="btn btn-danger py-1.5 px-3 text-xs flex items-center gap-1 shadow-sm"
                  >
                    紅標警示 ({summary.alertsSummary.red})
                  </button>
                )}
                {summary.alertsSummary.yellow > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigateToAlerts?.('yellow')}
                    className="btn bg-amber-500 hover:bg-amber-600 text-white py-1.5 px-3 text-xs flex items-center gap-1 shadow-sm"
                  >
                    黃標警示 ({summary.alertsSummary.yellow})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateToAlerts?.()}
                  className="btn btn-secondary py-1.5 px-3 text-xs"
                >
                  查看警示中心 →
                </button>
              </div>
            </div>
          )}

          {/* Three-pipe & Tube Statistics Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                管路與三管照護統計
              </h3>
              <span className="text-xs text-gray-500">全院在籍住民共 {summary.totalResidents} 人</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="card p-4 bg-gradient-to-br from-blue-50 to-white">
                <p className="text-xs font-medium text-gray-500">帶管總人數</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-blue-600">{summary.tubeStats.totalWithTubes}</span>
                  <span className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                    {summary.totalResidents > 0
                      ? `${Math.round((summary.tubeStats.totalWithTubes / summary.totalResidents) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">任一管路在身者</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-indigo-50 to-white">
                <p className="text-xs font-medium text-gray-500">鼻胃管 (NG)</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-indigo-600">{summary.tubeStats.nasogastric}</span>
                  <span className="text-xs text-gray-500">人</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">定期灌食與翻身</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-teal-50 to-white">
                <p className="text-xs font-medium text-gray-500">導尿管 (Foley)</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-teal-600">{summary.tubeStats.urinaryCatheter}</span>
                  <span className="text-xs text-gray-500">人</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">每日尿袋清潔排空</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-amber-50 to-white">
                <p className="text-xs font-medium text-gray-500">氣切管 (Trach)</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-amber-600">{summary.tubeStats.tracheostomy}</span>
                  <span className="text-xs text-gray-500">人</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">呼吸道抽痰照護</p>
              </div>

              <div className="card p-4 bg-gradient-to-br from-rose-50 to-white border-rose-200">
                <p className="text-xs font-medium text-rose-700">三管照護住民 (三管)</p>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-rose-600">{summary.tubeStats.threePipeCount}</span>
                  <span className="badge badge-danger text-[10px] py-0.5">高照護負荷</span>
                </div>
                <p className="mt-1 text-xs text-rose-500">鼻胃管+導尿管+氣切</p>
              </div>
            </div>
          </div>

          {/* Recharts Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dependency Level Distribution */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">住民失能程度分佈</h4>
                  <p className="text-xs text-gray-500 mt-0.5">輕度、中度、重度與極重度等級人數</p>
                </div>
              </div>
              <div className="card-body">
                <div className="w-full h-64" data-testid="dependency-chart-container">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={dependencyData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="level" tick={{ fontSize: 12, fill: '#4B5563' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#4B5563' }} allowDecimals={false} unit="人" />
                      <Tooltip
                        formatter={(
                          value: number,
                          _: string,
                          item: { payload?: { percentage?: number } }
                        ) => [`${value} 人 (${item?.payload?.percentage || 0}%)`, '住民人數']}
                        labelFormatter={(label) => `失能程度：${label}`}
                      />
                      <Bar dataKey="count" name="住民人數" radius={[4, 4, 0, 0]}>
                        {dependencyData.map((entry) => (
                          <Cell
                            key={entry.level}
                            fill={DEPENDENCY_COLORS[entry.level] || '#3B82F6'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Tube Distribution */}
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">各類管路分佈對照</h4>
                  <p className="text-xs text-gray-500 mt-0.5">醫療照護管路配置統計</p>
                </div>
              </div>
              <div className="card-body">
                <div className="w-full h-64" data-testid="tube-chart-container">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={tubeChartData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} unit="人" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={90} />
                      <Tooltip formatter={(value: number) => [`${value} 人`, '人數']} />
                      <Bar dataKey="count" name="管路人數" radius={[0, 4, 4, 0]}>
                        {tubeChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Bed Occupancy Map */}
          <div className="card">
            <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  全院床位即時佔用配置圖
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  總床數 {bedStats.total} 床 | 佔床 {bedStats.occupied} 床 ({bedStats.total > 0 ? Math.round((bedStats.occupied / bedStats.total) * 100) : 0}%) | 空床 {bedStats.vacant} 床 | 維護 {bedStats.maintenance} 床
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedFloor('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedFloor === 'all' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    全部樓層
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFloor('1F')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedFloor === '1F' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    1 樓 (1F)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFloor('2F')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedFloor === '2F' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    2 樓 (2F)
                  </button>
                </div>

                <select
                  value={bedStatusFilter}
                  onChange={(e) =>
                    setBedStatusFilter(
                      e.target.value as 'all' | 'occupied' | 'vacant' | 'maintenance'
                    )
                  }
                  className="input py-1 px-2 text-xs w-28"
                  aria-label="床位狀態篩選"
                >
                  <option value="all">全部狀態</option>
                  <option value="occupied">僅佔床</option>
                  <option value="vacant">僅空床</option>
                  <option value="maintenance">僅維護</option>
                </select>
              </div>
            </div>

            <div className="card-body">
              {bedsByRoom.size === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>查無符合篩選條件的床位項目</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="bed-map-grid">
                  {Array.from(bedsByRoom.entries()).map(([roomTitle, beds]) => (
                    <div
                      key={roomTitle}
                      className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                        <span className="text-xs font-bold text-gray-800">{roomTitle}</span>
                        <span className="text-[11px] text-gray-500">{beds.length} 床</span>
                      </div>

                      <div className="space-y-2">
                        {beds.map((bed) => {
                          const isOccupied = bed.status === 'occupied';
                          const isVacant = bed.status === 'vacant';

                          return (
                            <div
                              key={bed.bedNumber}
                              className={`p-2.5 rounded-lg border text-xs transition-all ${
                                isOccupied
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : isVacant
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-gray-100 border-gray-300 text-gray-700'
                              }`}
                              data-testid={`bed-card-${bed.bedNumber}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-sm">
                                  {bed.bedNumber}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    isOccupied
                                      ? 'bg-blue-200 text-blue-800'
                                      : isVacant
                                      ? 'bg-emerald-200 text-emerald-800'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {isOccupied ? '佔床' : isVacant ? '空床' : '維護'}
                                </span>
                              </div>

                              <div className="mt-1.5 flex items-center justify-between">
                                {isOccupied ? (
                                  <span className="font-semibold text-gray-900">
                                    👤 {bed.residentName || '住民入住'}
                                  </span>
                                ) : isVacant ? (
                                  <span className="text-emerald-700 font-medium">✨ 可安排入住</span>
                                ) : (
                                  <span className="text-gray-500">🛠️ 暫停使用</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Map Legend */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-end gap-4 text-xs text-gray-500 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                  <span>佔床 (已入住)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
                  <span>空床 (可安排)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
                  <span>維護中 (暫停使用)</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
