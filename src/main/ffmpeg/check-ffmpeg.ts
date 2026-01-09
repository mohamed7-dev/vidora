import { existsSync, promises } from 'node:fs'
import { DEFAULT_INTERNAL_PATHS } from '../app-config/default-config'
import { ErrorSources, InfoScopes } from '../../shared/ipc/check-ffmpeg'
import { platform } from 'node:os'
import { execSync } from 'node:child_process'
import { t } from '../../shared/i18n/i18n'

type Hooks = {
  onBegin: () => void
  onInfo: (payload: { scope: InfoScopes }) => void
  onComplete: (payload: { finalFfmpegPath: string }) => void
  onError: ({ source, err }: { source: ErrorSources; err: unknown }) => void
}

/**
 * @description
 * Checks if ffmpeg is installed
 * @returns path to ffmpeg or null if it fails
 */
async function checkFFmpeg(hooks?: Hooks): Promise<string | null> {
  const envPath = process.env.VIDORA_FFMPEG_PATH
  const ffmpegPath = DEFAULT_INTERNAL_PATHS.ffmpegPath
  let finalFFmpegPath: null | string = null
  hooks?.onBegin()

  // if env variable exist, prioritize it
  if (envPath) {
    if (existsSync(envPath)) {
      finalFFmpegPath = String(envPath)
    } else {
      const err = new Error(t`The file path sepcified in VIDORA_FFMPEG_PATH doesn't exist`)
      hooks?.onError({ source: 'env', err })
      // Should break the app initialization
      throw err
    }
  }

  // if platform is bsd, then use ffmpeg from the system
  if (platform() === 'freebsd') {
    try {
      const ffmpegPath = execSync('which ffmpeg').toString().trim()
      if (existsSync(ffmpegPath)) {
        finalFFmpegPath = ffmpegPath
      }
    } catch {
      hooks?.onInfo({
        scope: 'freebsd-bin-notfound'
      })
      finalFFmpegPath = null // should give the renderer the chance to resolve the issue
    }
  }

  // check bundled version
  if (!envPath && platform() !== 'freebsd') {
    finalFFmpegPath = ffmpegPath
    try {
      await promises.access(ffmpegPath)
      finalFFmpegPath = ffmpegPath
    } catch {
      const err = new Error(t`Ffmpeg is not found`)
      hooks?.onError({ source: 'ffmpeg-notfound', err })
      // Should break the app initialization
      throw err
    }
  }
  if (finalFFmpegPath) {
    hooks?.onComplete({ finalFfmpegPath: finalFFmpegPath })
  }
  return finalFFmpegPath
}

let ffmpegPathPromise: Promise<string | null> | null = null

/**
 * Memoize the check (run once per process, reused)
 * @returns Promise that resolves to the path to ffmpeg or null if it fails
 */
export function ensureFfmpegPath(hooks?: Hooks): Promise<string | null> {
  if (!ffmpegPathPromise) ffmpegPathPromise = checkFFmpeg(hooks)
  return ffmpegPathPromise
}
