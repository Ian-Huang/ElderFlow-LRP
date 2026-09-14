import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisitorPublicKioskForm } from './VisitorPublicKioskForm';
import { VisitorDataManagerTable } from './VisitorDataManagerTable';
import { VisitorAuditPrintView } from './VisitorAuditPrintView';
import { sandboxDb } from '@/utils/sandboxDb';

describe('訪客與志工線上登記系統 (Nurse Sandbox Triad)', () => {
  beforeEach(async () => {
    await sandboxDb.documents.clear();
  });

  describe('VisitorPublicKioskForm (訪客公開填寫端)', () => {
    it('應能正確渲染三大身分切換按鈕，預設為志工服務', () => {
      render(<VisitorPublicKioskForm />);
      expect(screen.getByText('志工服務')).toBeInTheDocument();
      expect(screen.getByText('住民家屬')).toBeInTheDocument();
      expect(screen.getByText('機構洽公')).toBeInTheDocument();
      expect(screen.getByText('志工代表姓名 *')).toBeInTheDocument();
    });

    it('臨床防呆：未填體溫或體溫超出範圍應予以阻擋', async () => {
      render(<VisitorPublicKioskForm />);
      const nameInput = screen.getByPlaceholderText('請輸入全名');
      const phoneInput = screen.getByPlaceholderText('例如 0912345678');
      const tempInput = screen.getByDisplayValue('36.5');

      await userEvent.type(nameInput, '王志工');
      await userEvent.type(phoneInput, '0912345678');

      // 輸入異常體溫 (45.0°C 超出臨床正常 34~42 範圍)
      fireEvent.change(tempInput, { target: { value: '45.0' } });
      fireEvent.click(screen.getByText('確認送出登記 ✓'));

      expect(await screen.findByText(/請填寫有效的體溫數值/)).toBeInTheDocument();
    });

    it('正常填寫送出後，應能成功寫入資料庫並顯示感謝頁面，且電話保留開頭0', async () => {
      render(<VisitorPublicKioskForm />);
      const nameInput = screen.getByPlaceholderText('請輸入全名');
      const phoneInput = screen.getByPlaceholderText('例如 0912345678');

      await userEvent.type(nameInput, '張愛心');
      await userEvent.type(phoneInput, '0988776655');

      fireEvent.click(screen.getByText('確認送出登記 ✓'));

      expect(await screen.findByText('登記完成！謝謝您的配合')).toBeInTheDocument();

      // 檢查 Dexie 是否有真實寫入
      const records = await sandboxDb.documents.where('collection').equals('visitors').toArray();
      expect(records.length).toBe(1);
      expect(records[0]?.payload.name).toBe('張愛心');
      expect(records[0]?.payload.phone).toBe('0988776655');
      expect(records[0]?.payload.temperature).toBe('36.5');
    });
  });

  describe('VisitorDataManagerTable (護理資料庫清單)', () => {
    it('應能即時列出資料庫中的訪客紀錄', async () => {
      await sandboxDb.documents.put({
        id: 'test_1',
        collection: 'visitors',
        payload: {
          visitorType: '志工服務',
          name: '林義工',
          phone: '0911222333',
          temperature: '36.6',
          symptoms: '無',
          visitDate: '2026-09-14',
          visitTime: '10:30',
          serviceUnit: '約書亞團契',
          servicePurpose: '關懷長者陪伴',
        },
        createdAt: '2026-09-14T10:30:00Z',
        updatedAt: '2026-09-14T10:30:00Z',
      });

      render(<VisitorDataManagerTable />);

      expect(await screen.findByText('林義工')).toBeInTheDocument();
      expect(screen.getByText('0911222333')).toBeInTheDocument();
      expect(screen.getByText('36.6°C')).toBeInTheDocument();
      expect(screen.getByText(/約書亞團契/)).toBeInTheDocument();
    });
  });

  describe('VisitorAuditPrintView (評鑑專用 A4 報表)', () => {
    it('應能正確渲染評鑑專用表頭與留白簽名欄', async () => {
      render(<VisitorAuditPrintView />);

      expect(
        screen.getByText('訪客、家屬暨志工服務出入登記紀錄表')
      ).toBeInTheDocument();
      expect(screen.getByText(/中山老人長期照顧養護中心/)).toBeInTheDocument();
      expect(screen.getByText('列印 A4 評鑑專用報表')).toBeInTheDocument();
    });
  });
});
