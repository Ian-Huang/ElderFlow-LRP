# Task Assignment: Milestone M0 Review (Interface & Security Conformance)

## Identity
- Role: Interface & Security Reviewer
- Type: teamwork_preview_reviewer
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md`
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
3. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md`

## Objective & Scope
Review interface conformance and security in Milestone M0:
1. CSRF implementation in `apps/web/src/api/apiClient.ts` and `apps/web/src/mocks/handlers.ts`:
   - Does it satisfy AC4 ("所有 API 請求皆帶有 CSRF token，且在開發環境中模擬驗證失敗情形")?
   - Is error simulation deterministic and safe?
2. MSW mock handlers in `apps/web/src/mocks/handlers.ts`:
   - Do all 15 endpoints match `PROJECT.md § Interface Contracts`?
   - Are sysadmin protections correctly enforced (cannot delete or deactivate last sysadmin)?
3. Run test suites and build independently.

## Deliverables
Write your review report with clear verdict (APPROVE or REQUEST_CHANGES) to:
`/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2/handoff.md`
Notify the parent agent via `send_message`.

## 2026-09-04T04:20:29Z
You are reviewer_m0_2 (Interface & Security Reviewer).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c
Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2/DISPATCH.md, /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md, /Users/ian.huang/aiProjects/LRP/PROJECT.md, and /Users/ian.huang/aiProjects/LRP/.agents/worker_m0/handoff.md.
Review interface conformance, CSRF token handling, and MSW handlers for Milestone M0.
Write your handoff report with verdict (APPROVE or REQUEST_CHANGES) to /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m0_2/handoff.md.
Notify parent via send_message when complete.
