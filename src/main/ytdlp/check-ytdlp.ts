import { platform } from '@electron-toolkit/utils'
import { execSync, spawn } from 'node:child_process'
import { existsSync, promises } from 'node:fs'
import * as os from 'node:os'
import YTDlpWrapImport from 'yt-dlp-wrap-plus'
import { readInternalConfig } from '../app-config/internal-config-api'
import { begin, complete, error, progress } from './check-ytlp-status-bus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const YTDlpWrap: any = (YTDlpWrapImport as any)?.default ?? YTDlpWrapImport

async function downloadYtdlp(path: string): Promise<void> {
  if (typeof YTDlpWrap.downloadFromGithub !== 'function') {
    throw new Error('downloadFromGithub is not available on YTDlpWrap export')
  }
  await YTDlpWrap?.downloadFromGithub(path)
}

/**
 * Checks if yt-dlp is installed and updates it if necessary
 * @returns path to yt-dlp or null if it fails
 */
async function checkYtdlp(): Promise<string | null> {
  begin()
  const ytDlpPath = readInternalConfig().ytDlpPath

  // prioritize env variable
  if (process.env.VIDORA_YTDLP_PATH) {
    if (existsSync(process.env.VIDORA_YTDLP_PATH)) {
      complete()
      return String(process.env.VIDORA_YTDLP_PATH)
    }
    error(
      new Error("VIDORA_YTDLP_PATH ENV variable is used, but the file doesn't exist there."),
      undefined,
      'status.ytdlp.env_missing'
    )
    return null
  }

  // on macos, freebsd we need to check for system-wide yt-dlp binaries
  if (platform.isMacOS) {
    const paths = ['/usr/local/bin/yt-dlp', '/opt/homebrew/bin/yt-dlp']
    const foundPath = paths.find((p) => existsSync(p))
    if (foundPath) {
      complete()
      return foundPath
    }
  } else if (os.platform() === 'freebsd') {
    try {
      const foundPath = execSync('which yt-dlp').toString().trim()
      if (existsSync(foundPath)) {
        complete()
        return foundPath
      }
    } catch {
      error(
        new Error('No yt-dlp found in PATH on FreeBSD. Please install it!'),
        undefined,
        'status.ytdlp.not_found_freebsd'
      )
    }
  }

  // update ytdlp binaries if they exist
  if (ytDlpPath && existsSync(ytDlpPath)) {
    spawn(`"${ytDlpPath}"`, ['-U'], { shell: true })
      .on('error', (err) => {
        // don't fail the process when update goes wrong, but notify the user
        error(err, 'Failed to update yt-dlp', 'status.ytdlp.update_failed')
        console.error('Failed to update yt-dlp:', err)
      })
      .stdout.on('data', (data) => {
        const text = data.toString()
        console.log('yt-dlp update check:', text)
        // Look for lines like: [download]  12.3% ...
        const match = text.match(/\[download\]\s+([\d.]+)%/)
        if (match) {
          const pct = Number(match[1])
          if (!Number.isNaN(pct)) {
            progress(pct)
          }
        }
      })
    return ytDlpPath
  }

  // if binaries are not found in the default path, download it
  try {
    await promises.access(ytDlpPath)
    complete()
    return ytDlpPath
  } catch {
    // if not found, download it into user data folder
    try {
      await downloadYtdlp(ytDlpPath)
      complete()
      return ytDlpPath
    } catch (e) {
      console.error('Failed to download yt-dlp', e)
      error(
        new Error('Failed to download yt-dlp'),
        'Failed to download yt-dlp',
        'status.ytdlp.download_failed'
      )
      return null
    }
  }
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
