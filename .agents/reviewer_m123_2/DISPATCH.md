# Task Assignment: Security (AC4) & PWA Compliance (AC3) Review (M1, M2, M3)

## Identity
- Role: Security & PWA Compliance Reviewer
- Type: teamwork_preview_reviewer
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_2
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md` (AC3, AC4)
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md`
3. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m1/handoff.md`
4. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m2/handoff.md`
5. `/Users/ian.huang/aiProjects/LRP/.agents/worker_m3/handoff.md`

## Objective & Scope
Review AC3 (PWA Compliance) and AC4 (Security RBAC & CSRF):
1. AC3 (PWA Compliance):
   - Check presence of valid PNG icons (`pwa-192x192.png`, `pwa-512x512.png`), `favicon.svg`, `manifest.webmanifest`.
   - Verify `beforeinstallprompt` handling, "安裝應用程式" button, standalone auto-hide, iOS Safari guide.
   - Verify offline readiness green dot badge and offline fallback state.
   - Verify non-blocking SW update toast and dirty form protection.
   - Verify Kiosk mode (?kiosk=1) and Screen Wake Lock API.
   - Verify user switching draft preservation in IndexedDB.
2. AC4 (Security RBAC & CSRF):
   - Verify `/admin/*` protected route blocks non-admin users (caregiver, supervisor) and redirects to `/403` with ForbiddenPage.
   - Verify all mutating API requests include `X-CSRF-Token`.
   - Verify development CSRF simulation switch triggers 403 `CSRF_INVALID` rejection and security alert.
   - Verify last sysadmin lockout protection.
3. Run tests and verify independently.

## Deliverables
Write your review report with verdict (APPROVE or REQUEST_CHANGES) to:
`/Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_2/handoff.md`
Notify the parent agent via `send_message`.

## 2026-09-04T04:43:58Z
You are reviewer_m123_2 (Security & PWA Compliance Reviewer).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_2
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c
Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_2/DISPATCH.md, /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md, /Users/ian.huang/aiProjects/LRP/PROJECT.md, and the worker handoffs in worker_m1, worker_m2, and worker_m3.
Review AC3 PWA compliance and AC4 Security (RBAC 403 & CSRF token simulation).
Write your handoff report with verdict (APPROVE or REQUEST_CHANGES) to /Users/ian.huang/aiProjects/LRP/.agents/reviewer_m123_2/handoff.md.
Notify parent via send_message when complete.

