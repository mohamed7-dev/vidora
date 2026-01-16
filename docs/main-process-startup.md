# Main process startup

This document describes how the Electron **main process** starts up, which modules are involved, and how the core tooling checks (yt-dlp, ffmpeg, JS runtime) fit into that flow.

Related docs:

- [yt-dlp setup](./ytdlp-setup.md)
- [FFmpeg setup](./ffmpeg-setup.md)
- [JS runtime detection](./js-runtime.md)
- [Branches and Git workflow](./branches.md)

---

## 1. Entry point: `src/main/index.ts`

The main process entry is `src/main/index.ts`. Its core responsibilities are:

- **App lifecycle wiring**
  - Requests a **single-instance lock** via `app.requestSingleInstanceLock()`.
  - Handles `second-instance` to focus or create a window.
  - Handles `window-all-closed` and `before-quit` to quit the app (except on macOS) and pause incomplete jobs.

- **Window creation** (`createWindow`)
  - Reads user config via `readConfig()` to decide whether to use a native toolbar.
  - Creates the main `BrowserWindow` with proper icon, preload script, and dev/prod URL.
  - Handles external links via `setWindowOpenHandler`.

- **Startup hook**
  - On `app.whenReady()`, it:
    1. Sets Windows app user model id.
    2. Hooks `browser-window-created` to set up keyboard shortcuts via `optimizer.watchWindowShortcuts`.
    3. If there is **no existing window**:
       - Calls `setupApp()` (see below).
       - Calls `createWindow()`.
    4. Otherwise just shows/focuses the existing window.

The **high-level rule**: `index.ts` delegates all environment/tooling validation and IPC setup to `setupApp()`.

---

## 2. Application setup: `setupApp()`

`setupApp` lives in `src/main/setup/index.ts` and orchestrates **all main-process initialization**.

High-level sequence:

1. **Emit setup begin status**
   - Calls `begin()` from `setup-status-bus.ts`.
   - Broadcasts a `pending` status over `APP_SETUP_CHANNELS.STATUS` so the renderer can show a “preparing tools” UI.

2. **Init directories (sync, must succeed)**
   - Calls `initDirectories()`.
   - This sets up directories that later steps depend on.

3. **Init config (sync, must succeed)**
   - Calls `initConfig()` to create/read config files.
   - If `config` exists, moves on; otherwise, setup is effectively aborted.

4. **Init i18n**
   - Calls `initI18n(config.general.language)`.
   - This returns a promise; after it resolves, the rest of the setup chain runs.

5. **Async setup chain (tools, prefs, UI, IPC)**
   Inside the `then` of `initI18n`:
   - **yt-dlp init**: `await initYtdlp()`
     - Verifies/discovers yt-dlp binary.
     - Updates internal config with its path.
     - Registers yt-dlp related IPC (e.g. media info).
     - See [yt-dlp setup](./ytdlp-setup.md).

   - **FFmpeg init**: `await initFFmpeg()`
     - Verifies ffmpeg binary and ensures it’s present.
     - Updates internal config with its path.
     - **Failure is considered fatal for setup**.
     - See [FFmpeg setup](./ffmpeg-setup.md).

   - **JS runtime init**: `await initJsRuntime()`
     - Detects Node.js/Deno runtime for yt-dlp JS features.
     - Updates internal config with a `jsRuntimePath` (or `null`).
     - **Failure is non-fatal**; app can still function without this.
     - See [JS runtime detection](./js-runtime.md).

   - **User preferences**: `await initUserPref(config)`
     - Initializes preferences (e.g. download paths, yt-dlp config path, etc.).

   - **App update**: `initAppUpdate()` (conditional)
     - Only called if `config.general.autoUpdate` is true.

   - **Window controls / app controls / navigation / menus**
     - `initWindowControls()`
     - `initAppControls()`
     - `initNavigation()`
     - `initMenus()`

   - **Jobs system / IPC**
     - `initJobs()` wires up the download jobs subsystem and its IPC handlers.

6. **Emit setup complete status**
   - On success, logs `setup complete` and calls `complete()` from `setup-status-bus.ts`.
   - Broadcasts a `success` status so the renderer can hide the setup UI and enable downloads.

7. **Error handling**
   - Any error in the async chain (i18n, yt-dlp, ffmpeg, js runtime, user prefs, etc.):
     - Logs `async setup failed` or `i18n init failed`.
     - Calls `error(...)` on the setup status bus with a user-friendly message.
     - **Calls `app.exit(0)`**, aborting startup.

---

## 3. Tooling checks and their impact on startup

### 3.1 yt-dlp

- Determined by the `initYtdlp()` flow in `src/main/ytdlp/index.ts`.
- Uses `ensureYtDlpPath` to resolve or download a yt-dlp binary.
- Emits user-facing messages via the yt-dlp status bus (download progress, update info, errors).
- Updates internal config with the resolved `ytDlpPath`.
- Registers IPC for getting media info via `setupMediaInfoIPC()`.
- See [yt-dlp setup](./ytdlp-setup.md) for details.

**Impact on startup**

- Certain failures (e.g. invalid env path, unrecoverable download failures) bubble up and can cause `setupApp` to fail and exit.
- On some platforms, the app may continue but let renderer guide the user to fix the issue.

### 3.2 FFmpeg

- Managed by `initFFmpeg()` in `src/main/ffmpeg/index.ts`.
- Uses `ensureFfmpegPath` (memoized) to check env variable, system, or bundled ffmpeg.
- On success, updates internal config with `ffmpegPath`.
- Emits progress/info/error events over the ffmpeg status bus.
- See [FFmpeg setup](./ffmpeg-setup.md).

**Impact on startup**

- Missing or invalid ffmpeg in non-tolerated scenarios is treated as **fatal** to setup: errors lead to the setup error status and app exit.

### 3.3 JS runtime

- Managed by `initJsRuntime()` in `src/main/js-runtime/index.ts`.
- Uses `ensureJsRuntimePath` to detect Node.js or Deno paths and updates `jsRuntimePath` in internal config.
- Used by yt-dlp for JS-based features when available.
- See [JS runtime detection](./js-runtime.md).

**Impact on startup**

- Failures are **non-fatal** by design:
  - The docstring explicitly says the app can still work without a JS runtime.
  - If no runtime is detected, `jsRuntimePath` remains `null` and yt-dlp is called without `--js-runtime`.

---

## 4. IPC surfaces involved in setup

Main process setup communicates with the renderer via several IPC surfaces:

- **App setup status bus** (`src/main/setup/setup-status-bus.ts`)
  - `APP_SETUP_CHANNELS.STATUS` is broadcast via `broadcastToAllWindows`.
  - `APP_SETUP_CHANNELS.GET_STATUS` is handled by `ipcMain.handle` to let the renderer query the latest status (useful on reload or new windows).

- **yt-dlp media info IPC** (`src/main/ytdlp/get-media-info.ts`)
  - `MEDIA_INFO_CHANNELS.GET_INFO` handler:
    - Validates the URL.
    - Calls `getMediaInfo` which in turn resolves yt-dlp path (`ensureYtDlpPath`), reads config and `jsRuntimePath`, and spawns yt-dlp via `YtdlpEngine`.
    - Uses a dedicated status bus (`get-media-info-status-bus`) to push progress/errors.

- **Download jobs IPC** (`src/main/download-jobs/download-jobs.ts`)
  - Several handlers under `DOWNLOAD_JOBS_CHANNELS.*` for adding, listing, updating, removing jobs.
  - Tightly coupled with initialized tools (yt-dlp, ffmpeg) via the download engine.

These IPC channels depend on `setupApp()` completing successfully before the renderer tries to use them in normal flows.

---

## 5. Relation to branching strategy

The startup and tooling checks are sensitive areas where regressions can **prevent the app from launching**.

- Changes here should typically go through:
  - A `feature/*` branch for new behavior (e.g. new platform support, new tool checks).
  - A `hotfix/*` branch when fixing production startup issues.
- See [Branches](./branches.md) for details on how features and hotfixes are merged into `develop`, `release/*`, and `main`.

When modifying startup logic or tool checks:

- Prefer small, focused branches.
- Add logs and, if possible, renderer-facing messages via the relevant status buses.
- Test on all supported platforms / architectures described in the tooling docs.
