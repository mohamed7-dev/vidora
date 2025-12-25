import { existsSync, promises } from 'node:fs'
import * as os from 'node:os'
import { execSync } from 'node:child_process'
import { begin, complete, error, progress } from './check-ffmpeg-status-bus'
import { FfmpegDownloader } from './ffmpeg-downloader'
import { DEFAULT_INTERNAL_PATHS } from '../app-config/default-config'

type Hooks = {
  onBegin: () => void
  onProgress: ({ progress }: { progress: number }) => void
  onComplete: () => void
  onError: ({ source }: { source: 'freebsd-not-found' | 'download-failed' }) => void
}

let activeDownloadPromise: Promise<string> | null = null

function downloadFFmpeg(ffmpegPath: string, onProgress: Hooks['onProgress']): Promise<string> {
  if (!activeDownloadPromise) {
    activeDownloadPromise = FfmpegDownloader.downloadFfmpeg(ffmpegPath, (downloaded, total) => {
      const percent = Math.round((downloaded / total) * 100)
      onProgress({
        progress: percent
      })
    }).finally(() => {
      activeDownloadPromise = null
    })
  }
  return activeDownloadPromise
}

/**
 * @description
 * Checks if ffmpeg is installed
 * @returns path to ffmpeg or null if it fails
 */
async function checkFFmpeg(hooks: Hooks): Promise<string | null> {
  const envPath = process.env.YALLA_DOWNLOAD_FFMPEG_PATH
  const ffmpegPath = DEFAULT_INTERNAL_PATHS.ffmpegPath
  let finalFFmpegPath: null | string = null
  hooks.onBegin()

  // if env variable exist, prioritize it
  if (envPath) {
    if (existsSync(envPath)) {
      finalFFmpegPath = String(envPath)
    } else {
      // Should break the app initialization
      throw new Error(`${envPath} ENV variable is used, but the file doesn't exist there`)
    }
  }

  // if platform is bsd, then use ffmpeg from the system
  if (os.platform() === 'freebsd') {
    try {
      const ffmpegPath = execSync('which ffmpeg').toString().trim()
      if (existsSync(ffmpegPath)) {
        finalFFmpegPath = ffmpegPath
      }
    } catch {
      hooks.onError({
        source: 'freebsd-not-found'
      })
      finalFFmpegPath = null // should give the renderer the chance to resolve the issue
    }
  }

  // check if already downloaded in user data directory
  if (!envPath && os.platform() !== 'freebsd') {
    try {
      await promises.access(ffmpegPath)
      finalFFmpegPath = ffmpegPath
    } catch {
      try {
        // run the download and wait for it to complete
        // this will reuse any in-progress download via activeDownloadPromise
        const downloadedPath = await downloadFFmpeg(ffmpegPath, hooks.onProgress)
        finalFFmpegPath = downloadedPath
      } catch {
        hooks.onError({
          source: 'download-failed'
        })
        finalFFmpegPath = null
      }
    }
  }
  hooks.onComplete()
  return finalFFmpegPath
}

let ffmpegPathPromise: Promise<string | null> | null = null
/**
 * Memoize the check (run once per process, reused)
 * @returns Promise that resolves to the path to ffmpeg or null if it fails
 */
export function ensureFfmpegPath(hooks: Hooks): Promise<string | null> {
  if (!ffmpegPathPromise) ffmpegPathPromise = checkFFmpeg(hooks)
  return ffmpegPathPromise
}

/**
 * Fire-and-forget prefetch used during app startup.
 * Triggers the same underlying ensureFfmpegPath check but does not
 * block initialization.
 */
export function prefetchFfmpegInBackground(): void {
  void ensureFfmpegPath({
    onBegin: () => {
      begin()
    },
    onProgress: (payload) => {
      progress({
        progress: payload.progress,
        message: 'Downloading ffmpeg',
        messageKey: 'status.ffmpeg.downloading'
      })
    },
    onComplete: () => {
      complete()
    },
    onError: (payload) => {
      error({
        cause:
          payload.source === 'download-failed'
            ? 'Failed to download ffmpeg'
            : 'Ffmpeg is not found on freebsd, the app may not work properly',
        message:
          payload.source === 'download-failed'
            ? 'Failed to download ffmpeg'
            : 'Ffmpeg is not found on freebsd',
        messageKey:
          payload.source === 'download-failed'
            ? 'status.ffmpeg.download_failed'
            : 'status.ffmpeg.not_found_freebsd' // TODO: change
      })
    }
  })
}

/* this example should be used whenever ffmpeg is needed
async function doSomethingThatNeedsFfmpeg() {
  // tell renderer “ffmpeg not found, downloading / verifying” *before* waiting
  sendStatusToRenderer({
    type: 'ffmpeg-check',
    state: 'checking_or_downloading'
  })

  const ffmpegPath = await ensureFfmpegPath()  // this will WAIT

  if (!ffmpegPath) {
    // download failed or not available
    sendStatusToRenderer({
      type: 'ffmpeg-check',
      state: 'failed'
    })
    throw new Error('ffmpeg is not available')
  }

  sendStatusToRenderer({
    type: 'ffmpeg-check',
    state: 'ready',
    path: ffmpegPath
  })

  // now safely use ffmpegPath
}
*/
