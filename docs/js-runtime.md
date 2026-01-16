# JS runtime detection

This document explains how the app detects an optional **JavaScript runtime** (Node.js or Deno) for yt-dlp and how that integrates into startup.

Related docs:

- [Main process startup](./main-process-startup.md)
- [yt-dlp setup](./ytdlp-setup.md)
- [FFmpeg setup](./ffmpeg-setup.md)

---

## 1. Modules involved

- `src/main/js-runtime/check-js-runtime.ts`
  - `checkJsRuntime()` – core detection logic.
  - `ensureJsRuntimePath()` – memoized wrapper.
- `src/main/js-runtime/index.ts`
  - `initJsRuntime()` – public entry used by `setupApp()`.
- Internal config
  - `updateInternalConfig` stores the detected runtime as `jsRuntimePath`.

---

## 2. Role in startup: `initJsRuntime`

During `setupApp()` (see [Main process startup](./main-process-startup.md)), after yt-dlp and ffmpeg are initialized, the app calls:

```ts
await initJsRuntime()
```

`initJsRuntime()` in `src/main/js-runtime/index.ts` simply calls:

```ts
await ensureJsRuntimePath()
```

The detection is **designed to be non-fatal**:

- The docstring of `checkJsRuntime()` explicitly states that the app can still function without a JS runtime.
- If no runtime is found, `jsRuntimePath` is set to `null`, and the rest of setup continues.

---

## 3. Detection strategy: `checkJsRuntime`

`checkJsRuntime()` follows this priority order:

1. **Environment variables**
   - `process.env.VIDORA_NODEJS_PATH`
     - If set and the file exists, sets:
       - `finalJsRuntime = "node:\"<path>\""`.

   - `process.env.VIDORA_DENO_PATH`
     - If set and the file exists, sets:
       - `finalJsRuntime = "deno:\"<path>\""`.

   The second env to match will win if both are set; typically you would only set one.

2. **Platform-specific defaults when env is not set**
   - If **no env variables** are set (`!nodejsEnvPath && !denoEnvPath`):
     - **macOS** (`platform.isMacOS`):
       - Iterates over `MAC_OS_DENO_RUNTIME_PATHS`.
       - If any of these paths exists, sets:
         - `finalJsRuntime = "deno:\"<path>\""`.

     - **Other platforms**:
       - Starts with `DEFAULT_INTERNAL_PATHS.nodejsRuntimePath`.
       - On Windows, uses `DEFAULT_INTERNAL_PATHS.nodejsRuntimePathWin` instead.
       - If the path exists, sets:
         - `finalJsRuntime = "node:\"<path>\""`.

3. **Persist to internal config**
   - After detection finishes, regardless of whether a runtime was found:
     - Calls `updateInternalConfig({ jsRuntimePath: finalJsRuntime })`.
   - The stored value is either a tagged string like `node:"/path/to/node"` or `deno:"/path/to/deno"`, or `null`.

The function resolves with `string | null` (the same value that is stored in internal config).

---

## 4. Usage by yt-dlp

`getMediaInfo()` in `src/main/ytdlp/get-media-info.ts` reads `jsRuntimePath` from internal config:

```ts
const { jsRuntimePath } = readInternalConfig()
...
args = [
  ...,
  jsRuntimePath ? `--no-js-runtimes --js-runtime ${jsRuntimePath}` : '',
  url
].filter(Boolean)
```

Behavior:

- If `jsRuntimePath` is **non-null**:
  - yt-dlp is called with `--no-js-runtimes --js-runtime <tagged-value>`.
  - This gives yt-dlp a specific runtime for executing JS-based logic.

- If `jsRuntimePath` is **null**:
  - No `--js-runtime` argument is passed.
  - yt-dlp falls back to its default runtime behavior (or disables JS features, depending on version and configuration).

Since `ensureJsRuntimePath` is memoized, detection only runs once per process; subsequent uses rely on the stored config.

---

## 5. Failure semantics and UX

- **No explicit errors are thrown** for missing runtimes:
  - If no suitable Node.js or Deno binary is found, the function simply leaves `finalJsRuntime = null`.
  - This allows the app to start cleanly.

- **App behavior without runtime**:
  - Most core functionality (downloading via yt-dlp and ffmpeg) continues to work.
  - Only JS-dependent yt-dlp features may be limited.

- **User configuration hooks**:
  - Advanced users can set `VIDORA_NODEJS_PATH` or `VIDORA_DENO_PATH` to point to custom runtimes.
  - You can expose this in a settings UI by reading/writing the internal config value.

When modifying JS runtime behavior:

- Keep it **optional** unless you have a strong reason to make it mandatory.
- Update both this doc and [yt-dlp setup](./ytdlp-setup.md) if you change how `jsRuntimePath` is passed to yt-dlp or how failures are surfaced.
