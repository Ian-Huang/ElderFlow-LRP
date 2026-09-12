# Task Assignment: Milestone M3 - PWA Polish Frontend (10-pwa-polish-frontend)

## Identity
- Role: PWA Polish Frontend Worker
- Type: teamwork_preview_worker
- Working Directory: /Users/ian.huang/aiProjects/LRP/.agents/worker_m3
- Parent Conversation ID: 326e867b-d269-42e5-a25a-56351b725a5c

## Mandatory References
1. `/Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md` (R3, AC1, AC2, AC3, AC5)
2. `/Users/ian.huang/aiProjects/LRP/PROJECT.md` (Features F15-F20; Interface Contracts)
3. `.scratch/lrp-mvp/issues/10-pwa-polish-frontend.md`

## File Ownership (Exclusively Owned)
- `apps/web/src/components/pwa/` (all files: `PwaInstallPrompt.tsx`, `OfflineReadyBadge.tsx`, `PwaUpdateToast.tsx`, etc.)
- `apps/web/src/utils/pwa.ts`
- `apps/web/src/stores/uiStore.ts`
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/components/UserSwitcher.tsx`
- `apps/web/src/utils/offlineDb.ts` (drafts table addition if needed)
- `apps/web/public/` (`favicon.svg`, `pwa-192x192.png`, `pwa-512x512.png`, `manifest.webmanifest`)
- `apps/web/src/test/pwa/` (all PWA test files)

## Objective & Detailed Requirements
1. **Static PWA Assets (`apps/web/public/` - Feature F15, AC3)**:
   - Ensure standard valid PWA icons exist in `apps/web/public/`:
     - `pwa-192x192.png` (192x192 valid PNG)
     - `pwa-512x512.png` (512x512 valid PNG)
     - `favicon.svg` (SVG icon)
   - Ensure `manifest.webmanifest` or VitePWA manifest configuration matches AC3 installability requirements (name, short_name, icons, theme_color, background_color, display: standalone, orientation: landscape).

2. **PWA Install Prompt ("Add to Home Screen" - Feature F15, AC3)**:
   - Implement `PwaInstallPrompt.tsx`:
     - Capture and hold `beforeinstallprompt` event.
     - Provide an "安裝應用程式" button in top navigation bar and/or settings.
     - When clicked, invoke `prompt()` and track `userChoice`.
     - Listen for `appinstalled` event, save installed status, and hide install button.
     - For standalone display mode (`display-mode: standalone`), hide button automatically.
     - For iOS Safari users (where `beforeinstallprompt` is not supported), show a friendly guide modal: "點擊 Safari 分享按鈕 ➔ 加入主畫面".

3. **Offline Readiness Indicator (`OfflineReadyBadge.tsx` - Feature F16, AC3)**:
   - Implement check for:
     - Service Worker active (`navigator.serviceWorker.controller !== null` or registration active).
     - Static assets cache initialized.
     - IndexedDB (`offlineDb`) initialized and accessible.
   - Display a green dot badge "離線就緒" (Offline Ready) in header bar.
   - When offline (`!navigator.onLine`), change badge to "離線模式中 (可正常作業)".

4. **Service Worker Non-blocking Update Toast (`PwaUpdateToast.tsx` - Feature F17)**:
   - Upgrade `apps/web/src/utils/pwa.ts`: replace browser native `confirm()` with a custom non-blocking UI Toast.
   - Display notification: "新版本已就緒，點擊重新整理即可套用最新功能".
   - When user clicks "重新整理", call `registration.update()` / `skipWaiting()` and reload.
   - Prevent disruptive reloads while user is actively editing forms.

5. **Kiosk Mode & Screen Wake Lock (`uiStore.ts`, `Layout.tsx` - Feature F19)**:
   - Support URL query param `?kiosk=1`: automatically activate Kiosk mode on load.
   - In Kiosk mode:
     - Hide navigation bars or provide locked layout.
     - Request fullscreen mode (`document.documentElement.requestFullscreen()`).
     - Enable Screen Wake Lock API (`navigator.wakeLock.request('screen')`) to prevent tablet screen sleep.
     - Intercept `beforeunload` to prevent accidental exit.
     - Provide an emergency admin unlock gesture (e.g. 5-click header logo or PIN prompt).

6. **Shared Tablet Fast User Switching & Draft Preservation (`UserSwitcher.tsx`, `offlineDb.ts` - Feature F20)**:
   - Smooth 200ms transition dropdown showing recent 5 logged-in users with roles.
   - Draft preservation: before switching accounts, save active form draft into IndexedDB `draft:{entity}:{id}`.
   - When switching back, restore pending draft if available.

7. **Unit & Integration Tests (`apps/web/src/test/pwa/*.test.tsx` - AC2, AC3)**:
   - Test `beforeinstallprompt` handling and installation button visibility.
   - Test offline ready check logic.
   - Test SW update toast lifecycle.
   - Test Kiosk mode trigger, wake lock request, and `beforeunload` guard.
   - Test draft preservation across user switching.
   - Verify `npm test --workspace=apps/web` passes 100%.

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Deliverable
Write your implementation report to:
`/Users/ian.huang/aiProjects/LRP/.agents/worker_m3/handoff.md`
Notify the parent agent via `send_message` when complete.

## 2026-09-04T04:26:43Z
You are worker_m3 (PWA Polish Frontend Worker).
Your working directory is: /Users/ian.huang/aiProjects/LRP/.agents/worker_m3
Your parent conversation ID is: 326e867b-d269-42e5-a25a-56351b725a5c

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please read your task assignment in /Users/ian.huang/aiProjects/LRP/.agents/worker_m3/DISPATCH.md and /Users/ian.huang/aiProjects/LRP/.agents/ORIGINAL_REQUEST.md.
Also read /Users/ian.huang/aiProjects/LRP/PROJECT.md.
Implement Milestone M3 (PwaInstallPrompt, OfflineReadyBadge, PwaUpdateToast, Kiosk mode & Screen Wake Lock in uiStore/Layout, draft preservation in UserSwitcher/offlineDb, public icon assets, and Vitest unit tests in apps/web/src/test/pwa/).
Verify your code with typecheck and tests.
Write your completion report to /Users/ian.huang/aiProjects/LRP/.agents/worker_m3/handoff.md and notify parent via send_message.
