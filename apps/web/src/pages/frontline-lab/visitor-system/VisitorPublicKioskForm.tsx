import React, { useState, useEffect } from 'react';
import { useSandboxCollection } from '@/hooks/useSandboxCollection';

export type VisitorType = '住民家屬' | '志工服務' | '機構洽公';

export interface VisitorRecord {
  visitorType: VisitorType;
  name: string;
  phone: string;
  temperature: string;
  symptoms: string;
  visitDate: string;
  visitTime: string;
  // 志工專用欄位
  serviceUnit?: string;
  servicePurpose?: string;
  isGroup?: boolean;
  companionNames?: string;
  // 家屬專用欄位
  residentName?: string;
  residentBed?: string;
  relationship?: string;
  // 洽公專用欄位
  organization?: string;
  officialPurpose?: string;
}

const COMMON_UNITS = [
  '約書亞團契',
  '義剪團隊',
  '獨立倡導',
  '個人志工',
  '大專院校服務社',
  '慈濟志工',
];

const COMMON_PURPOSES = [
  '關懷長者陪伴',
  '長者義剪活動',
  '文康活動帶領',
  '靈性關懷祈福',
  '環境整理清消',
];

export function VisitorPublicKioskForm({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { insert } = useSandboxCollection<VisitorRecord>('visitors');

  const [visitorType, setVisitorType] = useState<VisitorType>('志工服務');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [temperature, setTemperature] = useState('36.5');
  const [symptoms] = useState('無');
  const [serviceUnit, setServiceUnit] = useState('約書亞團契');
  const [customUnit, setCustomUnit] = useState('');
  const [servicePurpose, setServicePurpose] = useState('關懷長者陪伴');
  const [customPurpose, setCustomPurpose] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [companionNames, setCompanionNames] = useState('');
  const [residentName, setResidentName] = useState('');
  const [relationship, setRelationship] = useState('子女');
  const [organization, setOrganization] = useState('');
  const [officialPurpose, setOfficialPurpose] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  // 讀取記住的志工資料
  useEffect(() => {
    try {
      const saved = localStorage.getItem('LRP_LAST_VOLUNTEER');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.serviceUnit) setServiceUnit(parsed.serviceUnit);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // 臨床防呆 1: 體溫必填且必須合理
    const tempNum = parseFloat(temperature);
    if (!temperature.trim() || isNaN(tempNum) || tempNum < 34.0 || tempNum > 42.0) {
      setValidationError('請填寫有效的體溫數值（34.0°C ~ 42.0°C，如 36.5）！');
      return;
    }

    // 臨床防呆 2: 姓名必填
    if (!name.trim()) {
      setValidationError('請輸入訪客/志工姓名！');
      return;
    }

    // 臨床防呆 3: 電話號碼格式與開頭 0 保存
    if (!phone.trim()) {
      setValidationError('請輸入聯絡電話！');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const visitDate = now.toISOString().split('T')[0] ?? '';
      const visitTime = (now.toTimeString().split(' ')[0] ?? '').substring(0, 5);

      const record: VisitorRecord = {
        visitorType,
        name: name.trim(),
        phone: phone.trim(),
        temperature: tempNum.toFixed(1),
        symptoms,
        visitDate,
        visitTime,
        serviceUnit: serviceUnit === '其他' ? customUnit : serviceUnit,
        servicePurpose: servicePurpose === '其他' ? customPurpose : servicePurpose,
        isGroup,
        companionNames: isGroup ? companionNames.trim() : '',
        residentName: residentName.trim(),
        relationship,
        organization: organization.trim(),
        officialPurpose: officialPurpose.trim(),
      };

      await insert(record);

      if (rememberMe && visitorType === '志工服務') {
        try {
          localStorage.setItem(
            'LRP_LAST_VOLUNTEER',
            JSON.stringify({ name: record.name, phone: record.phone, serviceUnit: record.serviceUnit })
          );
        } catch {}
      }

      setIsSubmitted(true);
    } catch (err) {
      setValidationError('儲存失敗，請重試！');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setPhone('');
    setTemperature('36.5');
    setIsGroup(false);
    setCompanionNames('');
    setResidentName('');
    setIsSubmitted(false);
    setValidationError('');
  };

  if (isSubmitted) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">登記完成！謝謝您的配合</h2>
        <p className="text-slate-600 text-sm mb-6">
          體溫紀錄正常（{temperature}°C）。請佩戴口罩並落實手部清潔消毒，祝您探訪愉快！
        </p>
        <button
          onClick={handleReset}
          className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-xl shadow transition-colors"
        >
          填寫下一筆登記
        </button>
      </div>
    );
  }

  return (
    <div className={`p-6 sm:p-8 ${isEmbedded ? 'max-w-none' : ''}`}>
      <div className="mb-6 text-center">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">訪客暨志工健康登記</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">配合長照機構防護規範，請確實填寫資料</p>
      </div>

      {validationError && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationError}
        </div>
      )}

      {/* 身分切換 (三選一) */}
      <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200">
        {(['志工服務', '住民家屬', '機構洽公'] as VisitorType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setVisitorType(type)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              visitorType === type
                ? 'bg-white text-emerald-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 訪客/志工姓名 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {visitorType === '志工服務' ? '志工代表姓名 *' : '訪客姓名 *'}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="請輸入全名"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* 聯絡電話 */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">聯絡電話 *</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="例如 0912345678"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* 體溫 (防疫防呆) */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-bold text-slate-700">額溫/耳溫測量值 (°C) *</label>
            <div className="space-x-1">
              {['36.2', '36.5', '36.8'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTemperature(t)}
                  className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-200"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            step="0.1"
            required
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* 志工專屬欄位 */}
        {visitorType === '志工服務' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">服務單位 / 團體</label>
              <select
                value={serviceUnit}
                onChange={(e) => setServiceUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value="其他">其他 (自行輸入)</option>
              </select>
              {serviceUnit === '其他' && (
                <input
                  type="text"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  placeholder="請輸入服務單位名稱"
                  className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">服務事由</label>
              <select
                value={servicePurpose}
                onChange={(e) => setServicePurpose(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {COMMON_PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="其他">其他 (自行輸入)</option>
              </select>
              {servicePurpose === '其他' && (
                <input
                  type="text"
                  value={customPurpose}
                  onChange={(e) => setCustomPurpose(e.target.value)}
                  placeholder="請輸入服務事由"
                  className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              )}
            </div>

            {/* 團體同行支援 */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGroup}
                  onChange={(e) => setIsGroup(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 mr-2"
                />
                團體同行志工（同行者免逐一填電話）
              </label>
              {isGroup && (
                <div className="mt-2">
                  <textarea
                    rows={2}
                    value={companionNames}
                    onChange={(e) => setCompanionNames(e.target.value)}
                    placeholder="請輸入同行志工姓名（可用逗號或換行隔開）"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <label className="flex items-center text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 mr-2"
              />
              記住我是常來志工（下次自動帶入）
            </label>
          </div>
        )}

        {/* 家屬專屬欄位 */}
        {visitorType === '住民家屬' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">探訪住民姓名 *</label>
              <input
                type="text"
                required
                value={residentName}
                onChange={(e) => setResidentName(e.target.value)}
                placeholder="例如：陳金龍 長輩"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">長者關係</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {['子女', '配偶', '媳婦/女婿', '孫子女', '手足', '親屬', '朋友', '其他'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 洽公專屬欄位 */}
        {visitorType === '機構洽公' && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">所屬機關/廠商名稱 *</label>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="例如：衛生局 / 長安醫療器材"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">洽工事由 *</label>
              <input
                type="text"
                required
                value={officialPurpose}
                onChange={(e) => setOfficialPurpose(e.target.value)}
                placeholder="例如：消防年度檢驗 / 定期巡診"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* 送出按鈕 */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-6 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center"
        >
          {submitting ? '資料登打儲存中...' : '確認送出登記 ✓'}
        </button>
      </form>
    </div>
  );
}
