import { platform } from '@electron-toolkit/utils'
import path from 'node:path'
import cp from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import YTDlpWrapImport from 'yt-dlp-wrap-plus'
import { DEFAULT_INTERNAL_CONFIG } from './app-config/default-config'
import { begin, fail, success } from './status-bus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YTDlpWrap: any = (YTDlpWrapImport as any)?.default ?? YTDlpWrapImport

async function downloadYtdlp(path: string): Promise<void> {
  if (typeof YTDlpWrap.downloadFromGithub !== 'function') {
    throw new Error('downloadFromGithub is not available on YTDlpWrap export')
  }
  await YTDlpWrap?.downloadFromGithub(path)
}

function ensureBinDir(): void {
  if (!fs.existsSync(DEFAULT_INTERNAL_CONFIG.ytDlpPath)) {
    fs.mkdirSync(DEFAULT_INTERNAL_CONFIG.ytDlpPath)
  }
}

/**
 * Checks if yt-dlp is installed and updates it if necessary
 * @returns path to yt-dlp or null if it fails
 */
export async function checkYtdlp(): Promise<string | null> {
  begin('ytdlp', 'status.ytdlp.checking')
  ensureBinDir()

  const defaultYtDlpName = platform.isWindows ? 'ytdlp.exe' : 'ytdlp'
  const defaultYtDlpPath = path.join(DEFAULT_INTERNAL_CONFIG.ytDlpPath, defaultYtDlpName)

  // prioritize env variable
  if (process.env.TANZIL_YTDLP_PATH) {
    if (fs.existsSync(process.env.TANZIL_YTDLP_PATH)) {
      success('ytdlp', 'status.ytdlp.ready')
      return String(process.env.TANZIL_YTDLP_PATH)
    }
    fail(
      'ytdlp',
      "TANZIL_YTDLP_PATH ENV variable is used, but the file doesn't exist there.",
      'status.ytdlp.env_missing'
    )
    return null
  }

  // on macos, freebsd we need to check for system-wide yt-dlp binaries
  if (platform.isMacOS) {
    const paths = ['/usr/local/bin/yt-dlp', '/opt/homebrew/bin/yt-dlp']
    const foundPath = paths.find((p) => fs.existsSync(p))
    if (foundPath) {
      success('ytdlp', 'status.ytdlp.ready')
      return foundPath
    }
  } else if (os.platform() === 'freebsd') {
    try {
      const foundPath = cp.execSync('which yt-dlp').toString().trim()
      if (fs.existsSync(foundPath)) {
        success('ytdlp', 'status.ytdlp.ready')
        return foundPath
      }
    } catch {
      fail(
        'ytdlp',
        'No yt-dlp found in PATH on FreeBSD. Please install it.',
        'status.ytdlp.not_found_freebsd'
      )
    }
  }

  // update ytdlp binaries if they exist
  if (defaultYtDlpName && fs.existsSync(defaultYtDlpPath)) {
    cp.spawn(`"${defaultYtDlpPath}"`, ['-U'], { shell: true })
      .on('error', (err) => {
        // don't fail the process when update goes wrong
        success('ytdlp', 'status.ytdlp.ready')
        console.error('Failed to update yt-dlp:', err)
      })
      .stdout.on('data', (data) => {
        success('ytdlp', 'status.ytdlp.ready')
        console.log('yt-dlp update check:', data.toString())
      })
    return defaultYtDlpPath
  }

  // if binaries are not found in the default path, download it
  try {
    await fs.promises.access(defaultYtDlpPath)
    success('ytdlp', 'status.ytdlp.ready')
    return defaultYtDlpPath
  } catch {
    // if not found, download it into user data folder
    try {
      await downloadYtdlp(defaultYtDlpPath)
      success('ytdlp', 'status.ytdlp.ready')
      return defaultYtDlpPath
    } catch (e) {
      console.error('Failed to download yt-dlp', e)
      fail('ytdlp', 'Failed to download yt-dlp', 'status.ytdlp.download_failed')
      return null
    }
  }
}
