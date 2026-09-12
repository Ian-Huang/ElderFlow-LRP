# E2E Test Infra: LRP Frontend Subsystems (08-reports, 09-system-admin, 10-pwa-polish)

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests derive directly from `ORIGINAL_REQUEST.md` and user requirements, not implementation internals.
- **Progressive Testability**: Verification mechanisms must not require features more complex than what they verify.
- **Methodology**: Systematic 4-Tier design:
  - **Tier 1 (Feature Coverage)**: >=5 test cases per feature covering happy-path and representative equivalence classes.
  - **Tier 2 (Boundary & Corner Cases)**: >=5 test cases per feature at domain-specific extremes, zero/empty, invalid values, and limits.
  - **Tier 3 (Cross-Feature Combinations)**: Pairwise coverage testing interactions across features sharing state or workflow.
  - **Tier 4 (Real-World Application Scenarios)**: End-to-end user workflows representing realistic day-to-day operations in a long-term care facility.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| F1 | 每日照護完成度儀表板 | ORIGINAL_REQUEST R1, 08-reports-frontend | 5 | 5 | ✓ |
| F2 | 住民狀態概覽儀表板 | ORIGINAL_REQUEST R1, 08-reports-frontend | 5 | 5 | ✓ |
| F3 | 異常事件警示中心 | ORIGINAL_REQUEST R1, 08-reports-frontend | 5 | 5 | ✓ |
| F4 | 稽核軌跡查詢頁 | ORIGINAL_REQUEST R1, 08-reports-frontend, BR007 | 5 | 5 | ✓ |
| F5 | PDF 統一匯出引擎 | ORIGINAL_REQUEST R1, 08-reports-frontend | 5 | 5 | ✓ |
| F6 | 使用者管理清單與過濾 | ORIGINAL_REQUEST R2, 09-system-admin-frontend | 5 | 5 | ✓ |
| F7 | 使用者建立與帳號指派 | ORIGINAL_REQUEST R2, 09-system-admin-frontend | 5 | 5 | ✓ |
| F8 | 使用者角色與狀態切換 | ORIGINAL_REQUEST R2, 09-system-admin-frontend | 5 | 5 | ✓ |
| F9 | 系統健康狀態監控 | ORIGINAL_REQUEST R2, AC1 | 5 | 5 | ✓ |
| F10 | 功能旗標管理中心 | ORIGINAL_REQUEST R2, AC1 | 5 | 5 | ✓ |
| F11 | 系統核心參數設定表單 | ORIGINAL_REQUEST R2, 09-system-admin-frontend | 5 | 5 | ✓ |
| F12 | 角色權限矩陣展示 | ORIGINAL_REQUEST R2, 09-system-admin-frontend | 5 | 5 | ✓ |
| F13 | `/admin/*` 路由保護與 403 導向 | ORIGINAL_REQUEST AC4 | 5 | 5 | ✓ |
| F14 | CSRF Token 自動注入與模擬失敗 | ORIGINAL_REQUEST AC4 | 5 | 5 | ✓ |
| F15 | PWA 安裝提示 ("Add to Home Screen") | ORIGINAL_REQUEST R3, AC3 | 5 | 5 | ✓ |
| F16 | 離線就緒檢查與狀態指示 | ORIGINAL_REQUEST R3, AC3 | 5 | 5 | ✓ |
| F17 | Service Worker 自動更新與通知 | ORIGINAL_REQUEST R3, 10-pwa-polish-frontend | 5 | 5 | ✓ |
| F18 | 離線優先快取與過期清理 | ORIGINAL_REQUEST R3, AC3 | 5 | 5 | ✓ |
| F19 | 行動端 Kiosk 模式與 Wake Lock | ORIGINAL_REQUEST R3, 10-pwa-polish-frontend | 5 | 5 | ✓ |
| F20 | 共用平板快速切換與草稿暫存 | ORIGINAL_REQUEST R3, 10-pwa-polish-frontend | 5 | 5 | ✓ |
| F21 | 虛擬化與分頁資料載入 | ORIGINAL_REQUEST AC5 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**:
  - Unit & Component Integration: Vitest 1.6 + React Testing Library (`npm run test --workspace=apps/web`)
  - End-to-End Test Suite: Playwright 1.62 (`npm run test:e2e`)
- **Pass/Fail Semantics**: All test suites must complete with exit code 0 and 0 failures.
- **Test Directories**:
  - `apps/web/src/test/reports/*.test.tsx`: R1 Unit and component tests.
  - `apps/web/src/test/admin/*.test.tsx`: R2 Unit, component, and RBAC tests.
  - `apps/web/src/test/pwa/*.test.tsx`: R3 Unit and PWA utility tests.
  - `apps/web/src/test/security/*.test.tsx`: AC4 CSRF and RBAC unit test suites.
  - `apps/web/e2e/reports.spec.ts`: R1 E2E user flows.
  - `apps/web/e2e/admin-rbac.spec.ts`: R2 and AC4 E2E security flows.
  - `apps/web/e2e/pwa-install-kiosk.spec.ts`: R3 and AC3 E2E PWA install/kiosk flows.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | 早班交接巡檢流程：督導登入檢視每日完成度與三管統計，篩選異常警示並下載 PDF 交接清單 | F1, F2, F3, F5 | High |
| 2 | 機構評鑑稽核準備：管理員查詢過去半年重大異常與給藥紀錄修訂歷程，分頁導覽並匯出稽核報表 | F4, F5, F13, F21 | High |
| 3 | 新進照護員帳號開立與角色防護：系統管理員新增使用者，驗證無權訪問者被導向 403，測試 CSRF 防護 | F6, F7, F8, F12, F13, F14 | High |
| 4 | 機構平板共用交班情境：照護員 A 填寫記錄未存切換至照護員 B，草稿暫存隔離，切回後復原 | F19, F20, F18 | High |
| 5 | 地下室離線查房與恢復連線：開啟 Kiosk 全螢幕查房，模擬斷網時離線綠燈提示正常，回聯網自動同步並提示 SW 更新 | F15, F16, F17, F18, F19 | High |
| 6 | 系統健康與緊急功能降級：管理員檢測系統指標，透過功能旗標緊急關閉實驗性模組，驗證前端介面即時響應 | F9, F10, F11, F13 | Medium |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: >=5 per feature (21 features × 5 = 105 tests)
- **Tier 2 (Boundary & Corner)**: >=5 per feature (21 features × 5 = 105 tests)
- **Tier 3 (Cross-Feature)**: >=21 pairwise interaction tests
- **Tier 4 (Real-World Scenarios)**: >=6 end-to-end integration scenarios
- **Total Suite**: Minimum ~237 verifiable test cases across Unit, Integration, and E2E suites.
