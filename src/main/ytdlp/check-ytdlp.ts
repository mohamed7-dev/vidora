import { platform } from '@electron-toolkit/utils'
import { execSync, spawn } from 'node:child_process'
import { existsSync, promises } from 'node:fs'
import * as os from 'node:os'
import YTDlpWrapImport from 'yt-dlp-wrap-plus'
import { begin, complete, error, info, progress as sendProgress } from './check-ytlp-status-bus'
import { MAC_OS_BREW_PATHS, MAC_OS_YTDLP_PATHS } from '../constants'
import { downloadYtdlp as internalYtdlpDownload } from './download-ytdlp'
import { DEFAULT_INTERNAL_PATHS } from '../app-config/default-config'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const YTDlpWrap: any = (YTDlpWrapImport as any)?.default ?? YTDlpWrapImport

async function downloadYtdlp(path: string): Promise<void> {
  await internalYtdlpDownload(path, (progress: number) => {
    sendProgress(
      Number((progress * 100).toFixed(2)),
      'Downloading yt-dlp',
      'status.ytdlp.downloading'
    )
  })
}

async function updateYtdlp(ytdlpBinPath: string, isMacOS?: boolean): Promise<void> {
  try {
    if (isMacOS) {
      const macosBrewPath = MAC_OS_BREW_PATHS.find((p) => existsSync(p)) ?? 'brew' // fallback to brew
      const ytdlpHomeBrewUpdate = spawn(macosBrewPath, ['upgrade', 'yt-dlp'])
      ytdlpHomeBrewUpdate.stdout.on('data', () => {
        info({
          message: 'Updating yt-dlp',
          messageKey: 'status.ytdlp.updating',
          scope: 'updating-ytdlp'
        })
      })
      ytdlpHomeBrewUpdate.on('error', (data) => {
        error(data, 'Failed to update yt-dlp', 'status.ytdlp.update_failed')
      })
    } else {
      const ytdlpUpdate = spawn(ytdlpBinPath, ['-U'])
      ytdlpUpdate.on('error', (data) => {
        error(data, 'Failed to update yt-dlp', 'status.ytdlp.update_failed')
      })
      ytdlpUpdate.stdout.on('data', (data) => {
        if (data.toString().toLowerCase().includes('updating to')) {
          info({
            message: 'Updating yt-dlp',
            messageKey: 'status.ytdlp.updating',
            scope: 'updating-ytdlp'
          })
        } else if (data.toString().toLowerCase().includes('updated yt-dlp to')) {
          info({
            message: 'Updated yt-dlp',
            messageKey: 'status.ytdlp.updated',
            scope: 'updating-ytdlp'
          })
        }
      })
    }
  } catch (e) {
    error(e, 'Failed to update yt-dlp', 'status.ytdlp.update_failed')
  }
}

/**
 * Checks if yt-dlp is installed and updates it if necessary
 * @returns path to yt-dlp or null if it fails
 */
export async function checkYtdlp(): Promise<string | null> {
  begin()
  const envPath = process.env.YALLA_DOWNLOAD_YTDLP_PATH
  const ytDlpPath = DEFAULT_INTERNAL_PATHS.ytDlpPath
  let finalYtdlpPath: null | string = null
  // prioritize env variable
  if (envPath) {
    if (existsSync(envPath)) {
      finalYtdlpPath = String(envPath)
    } else {
      // should break the chain
      throw new Error(`${envPath} ENV variable is used, but the file doesn't exist there`)
    }
  }

  // on macos, freebsd we need to check for system-wide yt-dlp binaries
  if (platform.isMacOS) {
    const foundPath = MAC_OS_YTDLP_PATHS.find((p) => existsSync(p))
    if (foundPath) {
      finalYtdlpPath = foundPath
    } else {
      info({
        scope: 'mac-os-homebrew',
        message: 'No yt-dlp found in PATH on macOS. Please install it!',
        messageKey: 'status.ytdlp.mac-os-homebrew'
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
      info({
        scope: 'freebsd',
        message: 'No yt-dlp found in PATH on FreeBSD. Please install it!',
        messageKey: 'status.ytdlp.freebsd'
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
        await downloadYtdlp(ytDlpPath)
        finalYtdlpPath = ytDlpPath
      } catch {
        // last resort, throw to break the chain
        throw new Error('Failed to download yt-dlp')
      }
    }
  }
  if (finalYtdlpPath) {
    updateYtdlp(finalYtdlpPath, platform.isMacOS)
  }

  complete()
  return finalYtdlpPath
}

let ytDlpPathPromise: Promise<string | null> | null = null
/**
 * Memoize the check (run once, reused)
 * @returns Promise that resolves to the path to yt-dlp or null if it fails
 */
export function ensureYtDlpPath(): Promise<string | null> {
  if (!ytDlpPathPromise) ytDlpPathPromise = checkYtdlp()

  return ytDlpPathPromise
}
