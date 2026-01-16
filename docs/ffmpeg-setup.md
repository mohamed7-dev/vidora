# FFmpeg setup

This document describes how **ffmpeg** is detected and enforced during main process startup.

Related docs:

- [Main process startup](./main-process-startup.md)
- [yt-dlp setup](./ytdlp-setup.md)
- [JS runtime detection](./js-runtime.md)

---

## 1. Modules involved

- `src/main/ffmpeg/check-ffmpeg.ts`
  - `checkFFmpeg()` – resolves ffmpeg path from env, system, or bundled location.
  - `ensureFfmpegPath()` – memoized wrapper used elsewhere.
- `src/main/ffmpeg/index.ts`
  - `initFFmpeg()` – public entry used by `setupApp()`.
- FFmpeg status bus (in `src/main/ffmpeg/check-ffmpeg-status-bus.ts`)
  - Publishes begin, info, complete, error events to the renderer.

---

## 2. Role in startup: `initFFmpeg` and `setupApp`

During `setupApp()` (see [Main process startup](./main-process-startup.md)) the ffmpeg step is:

```ts
await initFFmpeg()
```

`initFFmpeg()` in `src/main/ffmpeg/index.ts` does the following:

1. Calls `ensureFfmpegPath()` with hooks to the status bus:
   - `onBegin` → `begin()`
   - `onInfo` → `info()` (for informational scopes like missing FreeBSD binary).
   - `onComplete` → `complete()` with `finalFfmpegPath`.
   - `onError` → `error()` with localized message and structured payload.
2. After `ensureFfmpegPath` resolves, calls:
   - `updateInternalConfig({ ffmpegPath: finalFfmpegPath })`.

If `ensureFfmpegPath` throws, the error bubbles up into the async part of `setupApp()`, which then:

- Reports an app setup error via `setup-status-bus`.
- Exits the app with `app.exit(0)`.

So **ffmpeg is a hard requirement** for a successful startup (except in explicitly tolerated paths on some platforms).

---

## 3. Path resolution: `checkFFmpeg`

`checkFFmpeg()` in `src/main/ffmpeg/check-ffmpeg.ts` follows this strategy:

1. **Env variable override**
   - Reads `process.env.VIDORA_FFMPEG_PATH`.
   - If set and exists on disk:
     - Uses that as `finalFFmpegPath`.
   - If set but path is missing:
     - Creates an error: `The file path specified in VIDORA_FFMPEG_PATH doesn't exist`.
     - Calls `hooks.onError({ source: 'env', err })`.
     - **Throws** to break app initialization.

2. **FreeBSD system binary**
   - When `platform() === 'freebsd'`:
     - Runs `which ffmpeg` via `execSync`.
     - If the discovered path exists, uses it.
     - Otherwise:
       - Calls `onInfo({ scope: 'freebsd-bin-notfound' })`.
       - Leaves `finalFFmpegPath = null` (allowing renderer to handle remediation).

3. **Bundled ffmpeg (default case)**
   - For non-FreeBSD or when no env variable is present:
     - Uses `DEFAULT_INTERNAL_PATHS.ffmpegPath`.
     - Attempts `await promises.access(ffmpegPath)`:
       - If this succeeds, uses the bundled path.
       - If it fails:
         - Throws `Ffmpeg is not found`.
         - Calls `onError({ source: 'ffmpeg-notfound', err })`.

4. **Completion callback**
   - If `finalFFmpegPath` is non-null, calls:
     - `hooks.onComplete({ finalFfmpegPath })`.

The function resolves with `string | null`, but from the perspective of `setupApp()` the **error paths are treated as fatal**.

---

## 4. Memoization: `ensureFfmpegPath`

`ensureFfmpegPath(hooks?)` ensures that the expensive detection logic only runs once per process:

- Internally stores a single `ffmpegPathPromise`.
- On first call, assigns `ffmpegPathPromise = checkFFmpeg(hooks)`.
- Subsequent calls reuse the same promise, optionally without hooks.

This prevents redundant filesystem scans or `which` calls when multiple components need ffmpeg.

---

## 5. Interaction with other components

- **Downloads / workers**
  - Any main-process component that needs ffmpeg should read the path from internal config (populated by `initFFmpeg`).

- **Status and UX**
  - The ffmpeg status bus surfaces three main states to the renderer:
    - `pending` (during check).
    - `success` (path resolved).
    - `error` (env path invalid, bundled ffmpeg missing, etc.).
  - The renderer can show actionable messages or settings UI based on these states.

- **Platform coverage**
  - Env override is always honored first.
  - FreeBSD prefers system binary.
  - Other platforms rely on a bundled ffmpeg binary.

When changing ffmpeg behavior:

- Keep `checkFFmpeg` as the **single source of truth** for how paths are resolved.
- Make sure changes are reflected here and in [Main process startup](./main-process-startup.md) if they affect error semantics or startup ordering.
