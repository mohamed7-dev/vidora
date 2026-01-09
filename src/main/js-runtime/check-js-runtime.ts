import { existsSync } from 'node:fs'
import { DEFAULT_INTERNAL_PATHS } from '../app-config/default-config'
import { platform } from '@electron-toolkit/utils'
import { MAC_OS_DENO_RUNTIME_PATHS } from '../constants'
import { updateInternalConfig } from '../app-config/internal-config-api'

/**
 * @description
 * Checks the JavaScript runtime path for yt-dlp.
 * This shouldn't cause the setup flow to break since this app
 * can still function without it
 */
async function checkJsRuntime(): Promise<string | null> {
  const nodejsEnvPath = process.env.VIDORA_NODEJS_PATH
  const denoEnvPath = process.env.VIDORA_DENO_PATH

  let finalJsRuntime: null | string = null

  if (nodejsEnvPath) {
    if (existsSync(nodejsEnvPath)) {
      finalJsRuntime = `node:"${nodejsEnvPath}"`
    }
  }

  if (denoEnvPath) {
    if (existsSync(denoEnvPath)) {
      finalJsRuntime = `deno:"${denoEnvPath}"`
    }
  }

  if (!nodejsEnvPath && !denoEnvPath) {
    if (platform.isMacOS) {
      for (const p of MAC_OS_DENO_RUNTIME_PATHS) {
        if (existsSync(p)) {
          finalJsRuntime = `deno:"${p}"`
        }
      }
    } else {
      let jsRuntimePath = DEFAULT_INTERNAL_PATHS.nodejsRuntimePath

      if (platform.isWindows) {
        jsRuntimePath = DEFAULT_INTERNAL_PATHS.nodejsRuntimePathWin
      }

      if (existsSync(jsRuntimePath)) {
        finalJsRuntime = `node:"${jsRuntimePath}"`
      }
    }
  }
  updateInternalConfig({ jsRuntimePath: finalJsRuntime })
  return finalJsRuntime
}

let jsRuntimePathPromise: Promise<string | null> | null = null
/**
 * Memoize the check (run once per process, reused)
 * @returns Promise that resolves to the path to ffmpeg or null if it fails
 */
export function ensureJsRuntimePath(): Promise<string | null> {
  if (!jsRuntimePathPromise) jsRuntimePathPromise = checkJsRuntime()
  return jsRuntimePathPromise
}
