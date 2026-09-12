import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoleMatrixView } from '../../pages/admin/RoleMatrixView';

describe('RoleMatrixView', () => {
  it('renders the header and role hierarchy description', () => {
    render(<RoleMatrixView />);

    expect(screen.getByText('角色與功能權限矩陣 (RBAC Matrix)')).toBeInTheDocument();
    expect(screen.getByText(/本機構系統依循長照法規與最小權限原則/)).toBeInTheDocument();

    // Check role hierarchy items
    expect(screen.getByText(/1\. 照護員/)).toBeInTheDocument();
    expect(screen.getByText(/2\. 主管/)).toBeInTheDocument();
    expect(screen.getByText(/3\. 管理員/)).toBeInTheDocument();
    expect(screen.getByText(/4\. 系統管理員/)).toBeInTheDocument();
  });

  it('renders table headers for all 4 roles and modules column', () => {
    render(<RoleMatrixView />);

    expect(screen.getByText('功能模組')).toBeInTheDocument();
    expect(screen.getByText('照護員 (Caregiver)')).toBeInTheDocument();
    expect(screen.getByText('主管 (Supervisor)')).toBeInTheDocument();
    expect(screen.getByText('管理員 (Admin)')).toBeInTheDocument();
    expect(screen.getByText('系統管理員 (Sysadmin)')).toBeInTheDocument();
  });

  it('renders all 9 business and system modules in the matrix', () => {
    render(<RoleMatrixView />);

    const modules = [
      '住民管理 (Residents)',
      '照護記錄 (Care Records)',
      '用藥管理 (Medications)',
      '照護計畫 (Care Plans)',
      '報表中心 (Reports)',
      '稽核軌跡 (Audit Trail)',
      '系統管理中心 (Admin)',
      '系統健康監控 (System Health)',
      '功能旗標發布 (Feature Flags)',
    ];

    modules.forEach((mod) => {
      expect(screen.getByText(mod)).toBeInTheDocument();
    });
  });

  it('renders permission legend with explanation of permission levels', () => {
    render(<RoleMatrixView />);

    expect(screen.getByText('圖例說明：')).toBeInTheDocument();
    expect(screen.getByText(/完整權限 \(增修查刪與審批\)/)).toBeInTheDocument();
    expect(screen.getByText(/部分權限 \(限受指派住民或限時\)/)).toBeInTheDocument();
    expect(screen.getByText(/僅供檢視 \(唯讀存取\)/)).toBeInTheDocument();
    expect(screen.getByText(/無權限 \(禁止訪問，嘗試將觸發 403\)/)).toBeInTheDocument();
  });
});
