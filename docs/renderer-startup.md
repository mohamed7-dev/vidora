# Renderer startup and setup integration

This document explains what happens on the **renderer side** while the main process is setting up the app, how the `app-scrim` component coordinates with main-process setup, and how background tasks like app updates and yt-dlp updates surface as non-blocking notifications.

Related docs:

- [Main process startup](./main-process-startup.md)
- [yt-dlp setup](./ytdlp-setup.md)
- [FFmpeg setup](./ffmpeg-setup.md)
- [JS runtime detection](./js-runtime.md)
- [Notification center](./notification-center.md)

---

## 1. Renderer entry point: `src/renderer/src/renderer.ts`

The renderer bootstraps from `src/renderer/src/renderer.ts`, which defines an `App` class. On `init()`, it:

- Syncs `<html>` language and direction from config.
- Syncs toolbar header state (native vs custom toolbar).
- Initializes the **app-scrim bootstrap**.
- Sets up a watcher that starts the app shell when setup is complete.
- Registers listeners for:
  - Pasted download links.
  - Network online/offline state.
  - App-update events from the main process.
  - yt-dlp update status from the main process.

The key idea: **routing and main UI are deferred until the main setup finishes**, but update checks and other background events are still allowed to flow and are surfaced via notifications.

---

## 2. First-run behavior and `app-scrim`

### 2.1 First-run detection

The app uses a flag in `localStorage` to determine whether to show the initial blocking scrim:

- Key: `FIRST_RUN_KEY` (e.g. `"<AppName>:firstRunCompleted"`).
- On renderer init:
  - If `firstRunCompleted` is **false**:
    - `document.body.append(document.createElement('app-scrim'))`.
    - Sets `APP_SCRIM_ACTIVE_ATTR` on `<html>` to lock the UI behind the scrim.
  - If `firstRunCompleted` is **true**:
    - Skips scrim and **immediately starts the router**.

### 2.2 `app-scrim` component responsibilities

`app-scrim` is defined in `src/renderer/src/components/app-scrim/index.ts` and is responsible for:

- Visually blocking the app (scrim overlay) during the **first run** until main setup + yt-dlp checks complete.
- Reflecting two status buses from the main process:
  - **App setup status** (`APP_SETUP_CHANNELS`): mirrors `setupApp()` progress and final success/error.
  - **yt-dlp check/update status** (`CheckYtdlpChannelPayload`): shows yt-dlp download/progress/info.
- Emitting an internal event when everything is ready:
  - `APP_SCRIM_EVENTS.APP_READY`.
- Persisting a flag so the scrim never blocks again:
  - Sets `FIRST_RUN_KEY` to `true` in `localStorage` after successful completion.

### 2.3 Status subscription flow

On connection:

1. **Initialization**
   - If `FIRST_RUN_KEY` is already true, the component disables itself, removes the active attribute from `<html>`, and removes itself from the DOM.
   - Otherwise:
     - Clears `APP_SCRIM_ACTIVE_ATTR` initially (scrim stays hidden until a status is received).

2. **Listening to app-setup status**
   - Calls `window.api.setup.getStatus()` once to hydrate from the latest known status.
   - Subscribes to `window.api.setup.onStatusUpdate(...)` which is wired to the main `APP_SETUP_CHANNELS.STATUS` bus.
   - Each status update is normalized and rendered as a row in the scrim task list.

3. **Listening to yt-dlp status**
   - Subscribes to `window.api.ytdlp.onCheckingStatus(...)`.
   - Normalizes messages from the yt-dlp status bus (pending, info, progress, complete, error), including:
     - Progress percentage.
     - Special scopes like `macos-homebrew` to show platform-specific remediation guidance.

4. **Visibility and completion**
   - When any status snapshot arrives:
     - Shows the scrim (`data-visible="true"`) and marks `<html>` with `APP_SCRIM_ACTIVE_ATTR`.
   - Tracks booleans:
     - `setupCompleted` when app-setup status transitions to `success`.
     - `ytdlpReady` when yt-dlp status transitions to `complete`.
   - When **both** flags are true:
     - Schedules `_onAllComplete()` with a small delay (currently 3 seconds) to:
       - Dispatch `APP_SCRIM_EVENTS.APP_READY`.
       - Set `FIRST_RUN_KEY = true` in `localStorage`.
       - Hide the scrim and remove `APP_SCRIM_ACTIVE_ATTR`.
       - Unsubscribe from buses and remove the element from the DOM.

This design keeps the scrim as a **visual gate** that is driven entirely by the main-process status buses.

---

## 3. Starting the app shell and router

The renderer doesn’t start the full app shell until the scrim signals readiness.

### 3.1 `initSetupWatcher`

In `renderer.ts`:

- `initSetupWatcher()` attaches a listener to `APP_SCRIM_EVENTS.APP_READY`:
  - When fired (from `app-scrim`), it calls `startAppShell()`.

### 3.2 `startAppShell`

`startAppShell()` is idempotent:

- Guards with `shellStarted` so it only runs once.
- Calls `initRouter()` to:
  - Initialize the SPA router.
  - Register a listener for navigation events coming from the preload (via `NAVIGATION_CHANNELS.TO`).

As a result, **the main views (home, history, jobs, etc.) and navigation only become active after setup is complete** on first run.
On subsequent runs (where `FIRST_RUN_KEY` is set), the router is started immediately without waiting for setup (since tools are already configured and persisted).

---

## 4. Non-blocking background events: app update & yt-dlp updates

While app setup is initially blocking the UI via `app-scrim` (on first run), other long-running or background tasks are deliberately **non-blocking** and are surfaced via the **notification center** instead of another scrim.

### 4.1 App update notifications

`initAppUpdateNotifications()` in `renderer.ts`:

- Registers **notification actions** mapped to app-update IPC:
  - `app-update-download-now` → sends `download-approval: 1` to main.
  - `app-update-download-later` → sends `download-approval: 0`.
  - `app-update-install-now` → sends `install-approval: 1`.
  - `app-update-install-later` → sends `install-approval: 0`.
  - `app-update-restart-now` → calls `window.api.app.relaunch()`.

- Subscribes to `window.api.appUpdate.mainToRenderer(...)` (the main→renderer app-update bus) and forwards events to `_handleAppUpdateEvent`.

`_handleAppUpdateEvent` converts main-process events into **persistent notifications** using `upsertNotification`:

- `download-available`
  - Creates/updates a notification with id `app-update-notification`.
  - Title: “Update available”.
  - Message: provided by main.
  - Actions: `Download now` / `Later` mapped to the registered actions above.

- `download-progress`
  - If progress info is present, updates the same notification with a progress percent embedded in the message.

- `downloaded-successfully`
  - Updates notification to “Update downloaded” with actions `Install now` / `Later`.

- `error`
  - Shows a persistent “Update error” notification.

These notifications:

- Are written to IndexedDB.
- Trigger a `notifications-changed` event.
- Are rendered by the notification center component.

**Importantly:** none of this blocks the main UI; the user can continue to browse and manage downloads while updates happen.

### 4.2 yt-dlp background updates

`initYtdlpUpdateNotifications()` in `renderer.ts`:

- Subscribes to `window.api.ytdlp.onCheckingStatus`.
- For each `CheckYtdlpChannelPayload`, `_handleYtdlpStatusEvent`:
  - Only reacts to events with `status === 'info'`.
  - If `payload.scope === 'updating-ytdlp'`:
    - Creates/updates a notification with id `ytdlp-update-notification` saying “Updating yt-dlp”.
  - If `payload.scope === 'updated-ytdlp'`:
    - Updates the same notification to “yt-dlp updated”.

Again, this is non-blocking; the user is simply informed via the notification center that background tooling is being updated.

For the initial **first-run installation** of yt-dlp, progress and potential errors are surfaced through `app-scrim` (see above). Later **background updates** are surfaced through notifications instead.

---

## 5. Notification center integration

Renderer startup and background flows rely on a declarative notifications system:

- High-level API in `src/renderer/src/lib/notifications/api.ts`:
  - `addNotification`, `upsertNotification`, `removeNotification`, `removeAllNotifications`, `markNotificationAsRead`, `listAllNotifications`.
  - Each mutation dispatches a global `notifications-changed` event.
- Storage backed by IndexedDB in `src/renderer/src/lib/notifications/db.ts`.
- UI rendered by `notification-center` web component in `src/renderer/src/components/notification-center/notification-center.ts`.

For details on the data model, persistence, and UI behavior, see [Notification center](./notification-center.md).

---

## 6. Summary of renderer roles during main setup

- Blocks main UI only on **first run**, via `app-scrim`, until:
  - App setup status is `success`, and
  - yt-dlp initial check/download reports `complete`.
- Starts the SPA shell only when `APP_SCRIM_EVENTS.APP_READY` is fired.
- On subsequent runs, starts the router immediately and never shows the blocking scrim again.
- Treats long-running tasks like **app updates** and **yt-dlp background updates** as **non-blocking**, surfacing them via the notification center instead of a full-screen scrim.
