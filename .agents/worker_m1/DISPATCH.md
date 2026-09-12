# Task Assignment: Milestone M1 - Reports Frontend (08-reports-frontend)

## Identity
- Role: Reports Frontend Worker
- Type: teamwork_preview_worker
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/worker_m1
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md` (R1, AC1, AC2, AC5)
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md` (Features F1-F5, F21; Interface Contracts)
3. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md` (MSW endpoints and shared DTOs)

## File Ownership (Exclusively Owned)
- `apps/web/src/pages/reports/` (all files: `ReportsLayout.tsx`, `DailyCompletionView.tsx`, `ResidentSummaryView.tsx`, `AlertsView.tsx`, `AuditTrailView.tsx`, `PdfExportModal.tsx`, etc.)
- `apps/web/src/pages/ReportsPage.tsx`
- `apps/web/src/test/reports/` (all report test files)

## Objective & Detailed Requirements
1. **Reports Layout & Navigation (`ReportsLayout.tsx`, `ReportsPage.tsx`)**:
   - Header with title, current date indicator, tab navigation between 4 views:
     - 每日照護完成度 (Daily Completion)
     - 住民狀態概覽 (Resident Summary)
     - 異常事件警示 (Alerts)
     - 稽核軌跡查詢 (Audit Trail)
   - "產生 PDF 報表" button in header opening `PdfExportModal`.
   - Supports tab switching via URL query param (`?tab=daily-completion`, `?tab=resident-summary`, `?tab=alerts`, `?tab=audit-trail`) and tab clicks.

2. **Daily Completion View (`DailyCompletionView.tsx` - Feature F1)**:
   - Date picker to select date (default today).
   - Summary statistics cards: Total residents, Completed records, Average completion rate (%).
   - Recharts Bar Chart: Completion rate per resident.
   - Recharts Pie Chart: Status distribution (Normal, Needs Review, Verification Required).
   - Low score residents table: list residents with completion rate < 80%, bed number, and missing items.
   - "匯出本日報表" button.

3. **Resident Summary View (`ResidentSummaryView.tsx` - Feature F2)**:
   - Three-pipe & tube statistics cards: Total with tubes, Nasogastric tube, Foley catheter, Tracheostomy, Three-pipe count (三管).
   - Bed occupancy map: Grid/table of floors, rooms, beds, resident names, and occupancy status.
   - Recharts charts: Dependency level distribution (輕度, 中度, 重度, 極重度).
   - Quick alerts summary counter (Red & Yellow).

4. **Alerts Center View (`AlertsView.tsx` - Feature F3)**:
   - Filter bar: Filter by severity (`all`, `red`, `yellow`), filter by status (`all`, `open`, `acknowledged`, `resolved`), search keyword.
   - Real-time alerts list: Card/table with severity color badges (Red/Yellow), alert title, description, resident name, bed number, occurred timestamp.
   - Interactive status toggle: Click button to mark alert as acknowledged or resolved.
   - Link/button to navigate to relevant record.

5. **Audit Trail View (`AuditTrailView.tsx` - Feature F4, F21)**:
   - Multi-field filter: Entity type (`Resident`, `CareRecord`, `Medication`, `CarePlan`), Action type (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`), date range, changedBy.
   - Paginated table (20 rows per page): Timestamp, Operator, Action, Entity, Field, Old Value, New Value, Reason.
   - Pagination controls: previous, next, page numbers, jump to page (AC5 requirement).
   - "匯出稽核報表" PDF download button.

6. **Unified PDF Export Modal (`PdfExportModal.tsx` - Feature F5)**:
   - Modal with dropdown to select report type (`resident-list`, `tube-statistics`, `bed-map`, `completion-report`, `audit-trail`).
   - Parameter inputs: date range or date, optional resident filter.
   - Action buttons: "下載 PDF" and "預覽".
   - Calls `POST /api/v1/reports/pdf` with `PdfExportRequest`, handles Blob download via `window.URL.createObjectURL(blob)`.

7. **Unit & Integration Tests (`apps/web/src/test/reports/*.test.tsx` - AC2)**:
   - Write comprehensive tests for all 4 views and the PDF modal using Vitest + React Testing Library.
   - Cover happy paths, date filtering, status updates, pagination, and PDF export trigger.
   - Verify `npm test --workspace=apps/web` passes 100%.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your implementation report to:
`/Users/ian.huang/aiProjects/LRP/.agents/worker_m1/handoff.md`
Notify the parent agent via `send_message` when complete.

## 2026-09-04T04:26:43Z
You are worker_m1 (Reports Frontend Worker).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/worker_m1
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/worker_m1/DISPATCH.md and /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md.
Also read /Users/ian.huang/aiProjects/LRP/PROJECT.md and /Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md.
Implement Milestone M1 (4 sub-dashboards: DailyCompletionView, ResidentSummaryView, AlertsView, AuditTrailView, ReportsLayout, PdfExportModal, Recharts charts, pagination, and Vitest unit tests in apps/web/src/test/reports/).
Verify your code with typecheck and tests.
Write your completion report to /Users/ian.huang/aiProjects/LRP/.agents/worker_m1/handoff.md and notify parent via send_message.
