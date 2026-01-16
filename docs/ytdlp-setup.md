# yt-dlp setup and IPC

This document explains how the main process checks, initializes, and uses **yt-dlp**, and how it communicates with the renderer.

Related docs:

- [Main process startup](./main-process-startup.md)
- [FFmpeg setup](./ffmpeg-setup.md)
- [JS runtime detection](./js-runtime.md)

---

## 1. Modules involved

- `src/main/ytdlp/index.ts`
  - `setupYtdlp()` – wiring yt-dlp checks + status bus + internal config.
  - `initYtdlp()` – public entry used by `setupApp()`.
- `src/main/ytdlp/check-ytdlp.ts`
  - `checkYtdlp()` – core logic for detecting/downloading/updating yt-dlp.
  - Typically wrapped by `ensureYtDlpPath()` (memoized) used in various flows.
- `src/main/ytdlp/get-media-info.ts`
  - `getMediaInfo()` – spawns yt-dlp to fetch JSON metadata for a URL.
  - `setupMediaInfoIPC()` – IPC handler for media info.
- Status buses (in `src/main/ytdlp`)
  - `check-ytlp-status-bus` – tracks setup/check progress.
  - `get-media-info-status-bus` – tracks per-request media info progress.

---

## 2. Setup sequence in `setupApp`

During application startup (`setupApp()` in `src/main/setup/index.ts`):

1. After directories, config, and i18n are initialized, `setupApp` calls:
   - `await initYtdlp()`.

2. `initYtdlp()` is defined as:
   - `await setupYtdlp()`.
   - `handleYtdlpIPC()` (which calls `setupMediaInfoIPC()`).

This means **yt-dlp binary resolution and IPC wiring** are part of the main setup chain and must run before the renderer can start normal download flows.

---

## 3. Binary detection and download: `checkYtdlp`

`checkYtdlp()` in `src/main/ytdlp/check-ytdlp.ts` performs the following steps:

1. **Emit begin status**
   - If provided with hooks, calls `hooks.onBegin()`.
   - `setupYtdlp()` passes hooks that will publish this over the yt-dlp status bus.

2. **Environment variable override**
   - Reads `process.env.VIDORA_YTDLP_PATH`.
   - If set and exists on disk, this path is used as `finalYtdlpPath`.
   - If set but **does not exist**, emits `onError({ source: 'env' })` and **throws**.
     - This breaks the setup chain and is treated as a serious misconfiguration.

3. **Platform-specific system paths**
   - **macOS**:
     - Tries `MAC_OS_YTDLP_PATHS` for a system-wide binary.
     - If found, uses that as `finalYtdlpPath`.
     - If not found:
       - Calls `onInfo({ scope: 'macos-homebrew' })` to hint that Homebrew installation is needed.
       - Leaves `finalYtdlpPath` as `null` so the renderer can help the user resolve it.

   - **FreeBSD**:
     - Executes `which yt-dlp`.
     - If found and exists, uses the discovered path.
     - If not found:
       - Calls `onInfo({ scope: 'freebsd-bin-notfound' })` and keeps `finalYtdlpPath = null` to avoid breaking app init immediately.

4. **Bundled/internal binary (non-macOS, non-FreeBSD, no env)**
   - Determines default path from `DEFAULT_INTERNAL_PATHS.ytDlpPath`.
   - Attempts `await promises.access(ytDlpPath)`:
     - If accessible, uses that path.
     - If missing:
       - Calls `downloadYtdlp(ytDlpPath, hooks)`:
         - Downloads yt-dlp binary into the user data folder.
         - Emits progress via `onProgress` hook.
       - If download fails:
         - Emits `onError({ source: 'download-failure' })` and **throws**.

5. **Completion and background update**
   - If `finalYtdlpPath` is non-null:
     - Calls `hooks.onComplete({ finalYtdlpPath })`.
     - Kicks off a **background update** via `updateYtdlp(finalYtdlpPath, hooks, platform.isMacOS)`:
       - On macOS, uses Homebrew (`brew upgrade yt-dlp`).
       - On other systems, spawns `yt-dlp -U`.

The entire function resolves with the chosen path or `null` (in tolerated scenarios like macOS/FreeBSD where user action is expected).

---

## 4. High-level wrapper: `setupYtdlp` and `initYtdlp`

`setupYtdlp()` in `src/main/ytdlp/index.ts` wraps `ensureYtDlpPath` with UI-facing hooks:

- **onBegin** → `begin()` on the yt-dlp status bus.
- **onInfo** → `info()` with localized messages for:
  - `macos-homebrew`
  - `freebsd-bin-notfound`
  - `updated-ytdlp`
  - `updating-ytdlp`
- **onProgress** → `progress()` with a normalized 0–100 download percentage.
- **onError** → `error()` with translated error messages for:
  - `env`
  - `download-failure`
  - `update-failure`
- **onComplete** → `complete()` with the resolved path.

After `ensureYtDlpPath` resolves:

- `setupYtdlp()` calls `updateInternalConfig({ ytDlpPath: finalYtdlpPath })` so the value is stored for other parts of the app.

`initYtdlp()` then:

1. `await setupYtdlp()`.
2. Calls `handleYtdlpIPC()` which delegates to `setupMediaInfoIPC()`.

This guarantees that IPC is only registered **after** we’ve attempted to resolve yt-dlp.

---

## 5. Media info IPC: `setupMediaInfoIPC`

`setupMediaInfoIPC()` in `src/main/ytdlp/get-media-info.ts` wires the IPC handler:

- Channel: `MEDIA_INFO_CHANNELS.GET_INFO`.
- Handler flow:
  1. Validate the incoming `url`.
     - If invalid, emits an error via the status bus and returns.
  2. Calls `getMediaInfo(url, hooks)` where hooks:
     - `onBegin` → emits `begin()` on the media info status bus.
     - `onComplete` → emits `complete()` with the `mediaInfo` payload.
  3. Returns the parsed `YtdlpInfo` object to the renderer.

`getMediaInfo` itself:

- Reads configuration from `readConfig()` and `readInternalConfig()`.
- Builds yt-dlp arguments (proxy, cookies, config path, optional `--js-runtime` if `jsRuntimePath` is present).
- Ensures a yt-dlp path by calling `ensureYtDlpPath()` again (memoized; does not redo heavy work).
- Spawns yt-dlp via `YtdlpEngine.exec(...)` and collects stdout/stderr.
- Parses JSON from stdout; on parse errors or non-zero exit codes, rejects with a translated error.

This IPC is the **main ingress** for metadata requests from the renderer.

---

## 6. Impact on startup and UX

- During **startup**, `initYtdlp()` is part of the `setupApp` chain.
  - Hard failures (invalid env path, download failures that throw) propagate and will cause setup to fail and the app to exit.
  - Some platform-specific cases (e.g. missing macOS Homebrew binary) are tolerated, and the renderer is expected to guide the user.

- During **normal usage**, even after setup:
  - `ensureYtDlpPath()` is still used by `getMediaInfo` to ensure there is a valid path before spawning yt-dlp.
  - The media info status bus lets the renderer show per-request progress and errors.

When making changes to yt-dlp integration:

- Be explicit about which failures are **fatal** vs **tolerated**.
- Keep status bus semantics stable to avoid breaking the renderer’s state machine.
- Update [Main process startup](./main-process-startup.md) if you change where in the setup chain yt-dlp is initialized.
