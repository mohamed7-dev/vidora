import { platform } from '@electron-toolkit/utils'
import { execSync, spawn } from 'node:child_process'
import { existsSync, promises } from 'node:fs'
import os from 'node:os'
import { MAC_OS_BREW_PATHS, MAC_OS_YTDLP_PATHS } from '../constants'
import { downloadYtdlp as internalYtdlpDownload, ProgressCallbackPayload } from './download-ytdlp'
import { DEFAULT_INTERNAL_PATHS } from '../app-config/default-config'
import { ErrorSources, InfoScopes } from '../../shared/ipc/check-ytdlp'
import { t } from '../../shared/i18n/i18n'

type Hooks = {
  onBegin: () => void
  onInfo: (payload: { scope: InfoScopes }) => void
  onProgress: (payload: { progress: number }) => void
  onComplete: (payload: { finalYtdlpPath: string }) => void
  onError: ({ source, err }: { source: ErrorSources; err: unknown }) => void
}

async function downloadYtdlp(path: string, hooks?: Hooks): Promise<void> {
  await internalYtdlpDownload(path, (payload: ProgressCallbackPayload) => {
    hooks?.onProgress({ progress: Number((payload.progress * 100).toFixed(2)) })
  })
}

async function updateYtdlp(ytdlpBinPath: string, hooks?: Hooks, isMacOS?: boolean): Promise<void> {
  try {
    if (isMacOS) {
      const macosBrewPath = MAC_OS_BREW_PATHS.find((p) => existsSync(p)) ?? 'brew' // fallback to brew
      const ytdlpHomeBrewUpdate = spawn(macosBrewPath, ['upgrade', 'yt-dlp'])
      ytdlpHomeBrewUpdate.stdout.on('data', () => {
        hooks?.onInfo({
          scope: 'updating-ytdlp'
        })
      })
      ytdlpHomeBrewUpdate.on('error', (e) => {
        hooks?.onError({ err: e, source: 'update-failure' })
      })
    } else {
      const ytdlpUpdate = spawn(ytdlpBinPath, ['-U'])
      ytdlpUpdate.on('error', (e) => {
        hooks?.onError({ err: e, source: 'update-failure' })
      })
      ytdlpUpdate.stdout.on('data', (data) => {
        if (data.toString().toLowerCase().includes('updating to')) {
          hooks?.onInfo({
            scope: 'updating-ytdlp'
          })
        } else if (data.toString().toLowerCase().includes('updated yt-dlp to')) {
          hooks?.onInfo({
            scope: 'updated-ytdlp'
          })
        }
      })
    }
  } catch (e) {
    hooks?.onError({ err: e, source: 'update-failure' })
  }
}

/**
 * Checks if yt-dlp is installed and updates it if necessary
 * @returns path to yt-dlp or null if it fails
 */
export async function checkYtdlp(hooks?: Hooks): Promise<string | null> {
  hooks?.onBegin()
  const envPath = process.env.VIDORA_YTDLP_PATH
  const ytDlpPath = DEFAULT_INTERNAL_PATHS.ytDlpPath
  let finalYtdlpPath: null | string = null
  // prioritize env variable
  if (envPath) {
    if (existsSync(envPath)) {
      finalYtdlpPath = String(envPath)
    } else {
      const err = new Error(t`The file path sepcified in VIDORA_YTDLP_PATH doesn't exist`)
      hooks?.onError({ err, source: 'env' })
      // should break the chain
      throw err
    }
  }

  // on macos, freebsd we need to check for system-wide yt-dlp binaries
  if (platform.isMacOS) {
    const foundPath = MAC_OS_YTDLP_PATHS.find((p) => existsSync(p))
    if (foundPath) {
      finalYtdlpPath = foundPath
    } else {
      hooks?.onInfo({
        scope: 'macos-homebrew'
      })
      finalYtdlpPath = null // should give the renderer process the chance to resolve the issue, and continue app init without breaking
    }
  }

  if (os.platform() === 'freebsd') {
    try {
      const foundPath = execSync('which yt-dlp').toString().trim()
      if (existsSync(foundPath)) {
        finalYtdlpPath = foundPath
      }
    } catch {
      hooks?.onInfo({
        scope: 'freebsd-bin-notfound'
      })
      finalYtdlpPath = null // should give the renderer process the chance to resolve the issue, and continue app init without breaking
    }
  }

  // if binaries are not found in the default path, download it
  if (!platform.isMacOS && os.platform() !== 'freebsd' && !envPath) {
    try {
      await promises.access(ytDlpPath)
      finalYtdlpPath = ytDlpPath
    } catch {
      // if not found, download it into user data folder
      try {
        await downloadYtdlp(ytDlpPath, hooks)
        finalYtdlpPath = ytDlpPath
      } catch {
        const err = new Error(t`Failed to download yt-dlp`)
        hooks?.onError({ err, source: 'download-failure' })
        // last resort, throw to break the chain
        throw err
      }
    }
  }
  if (finalYtdlpPath) {
    hooks?.onComplete({ finalYtdlpPath })
    // background process
    updateYtdlp(finalYtdlpPath, hooks, platform.isMacOS)
  }
  return finalYtdlpPath
}

let ytDlpPathPromise: Promise<string | null> | null = null

/**
 * Memoize the check (run once, reused)
 * @returns Promise that resolves to the path to yt-dlp or null if it fails
 */
export function ensureYtDlpPath(hooks?: Hooks): Promise<string | null> {
  if (!ytDlpPathPromise) ytDlpPathPromise = checkYtdlp(hooks)
  return ytDlpPathPromise
}
