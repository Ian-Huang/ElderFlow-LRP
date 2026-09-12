import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PwaUpdateToast } from '@/components/pwa/PwaUpdateToast';
import { triggerPwaUpdate, registerFormEditing } from '@/utils/pwa';

describe('PwaUpdateToast', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no update is available', () => {
    const { container } = render(<PwaUpdateToast />);
    expect(container.firstChild).toBeNull();
  });

  it('displays non-blocking toast when update is triggered', () => {
    render(<PwaUpdateToast />);

    const reloadMock = vi.fn().mockResolvedValue(undefined);
    act(() => {
      triggerPwaUpdate(reloadMock);
    });

    expect(screen.getByRole('status', { name: /系統更新提示/i })).toBeInTheDocument();
    expect(
      screen.getByText('新版本已就緒，點擊重新整理即可套用最新功能')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重新整理/i })).toBeInTheDocument();
  });

  it('executes reload callback when user clicks "重新整理" and form is not editing', async () => {
    render(<PwaUpdateToast />);

    const reloadMock = vi.fn().mockResolvedValue(undefined);
    act(() => {
      triggerPwaUpdate(reloadMock);
    });

    const refreshButton = screen.getByRole('button', { name: /重新整理/i });
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('dismisses the toast non-blockingly when user clicks "稍後" or close', () => {
    render(<PwaUpdateToast />);

    const reloadMock = vi.fn();
    act(() => {
      triggerPwaUpdate(reloadMock);
    });

    const laterButton = screen.getByRole('button', { name: /稍後/i });
    fireEvent.click(laterButton);

    expect(screen.queryByRole('status', { name: /系統更新提示/i })).toBeNull();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('warns user and prevents disruptive reload when a form is actively being edited', async () => {
    render(<PwaUpdateToast />);

    // Register active form dirty checker
    const unregister = registerFormEditing('test-form', () => true);

    const reloadMock = vi.fn().mockResolvedValue(undefined);
    act(() => {
      triggerPwaUpdate(reloadMock);
    });

    const refreshButton = screen.getByRole('button', { name: /重新整理/i });
    fireEvent.click(refreshButton);

    // Should NOT immediately reload; should display warning
    expect(reloadMock).not.toHaveBeenCalled();
    expect(screen.getByText(/偵測到您目前正在編輯表單/i)).toBeInTheDocument();
    expect(
      screen.getByText(/立即重新整理可能遺失未儲存的輸入內容/i)
    ).toBeInTheDocument();

    // Clicking "先去儲存" cancels the update attempt
    const cancelBtn = screen.getByRole('button', { name: /先去儲存/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText(/偵測到您目前正在編輯表單/i)).toBeNull();

    // Clicking "仍要更新" bypasses and executes reload
    fireEvent.click(screen.getByRole('button', { name: /重新整理/i }));
    const forceUpdateBtn = screen.getByRole('button', { name: /仍要更新/i });
    await act(async () => {
      fireEvent.click(forceUpdateBtn);
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
    unregister();
  });
});
