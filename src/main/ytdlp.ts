import { platform } from '@electron-toolkit/utils'
import cp from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import YTDlpWrapImport from 'yt-dlp-wrap-plus'
import type { YtdlpInfo } from '../shared/downloads'
import { begin, fail, success } from './status-bus'
import { readConfig } from './app-config/config-api'
import { ipcMain } from 'electron'
import { EVENTS } from '../shared/events'
import { readInternalConfig } from './app-config/internal-config-api'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const YTDlpWrap: any = (YTDlpWrapImport as any)?.default ?? YTDlpWrapImport

async function downloadYtdlp(path: string): Promise<void> {
  if (typeof YTDlpWrap.downloadFromGithub !== 'function') {
    throw new Error('downloadFromGithub is not available on YTDlpWrap export')
  }
  await YTDlpWrap?.downloadFromGithub(path)
}

/**
 * @description
 * Get media info from url.
 */
export async function getMediaInfo(url: string): Promise<YtdlpInfo> {
  return new Promise((resolve, reject) => {
    const {
      downloader: { proxyServerUrl, cookiesFromBrowser, configPath }
    } = readConfig()
    const useCookies = cookiesFromBrowser && cookiesFromBrowser !== 'none'
    const args = [
      '-j',
      '--no-playlist',
      '--no-warnings',
      '--no-download',
      '--force-ipv4',
      proxyServerUrl ? '--proxy' : '',
      proxyServerUrl,
      useCookies ? '--cookies-from-browser' : '',
      useCookies ? cookiesFromBrowser : '',
      configPath ? '--config-locations' : '',
      configPath ? configPath : '',
      url
    ].filter(Boolean) as string[]

    begin('ytdlp', 'status.ytdlp.fetching_info', { url, scope: 'getMediaInfo' })

    ensureYtDlpPath()
      .then((bp) => {
        const ytdlp = (bp ? new YTDlpWrap(bp) : new YTDlpWrap()) as YTDlpWrapImport
        const ytdlpProcess = ytdlp.exec(args, { shell: true })
        let stdout = ''
        let stderr = ''
        ytdlpProcess.ytDlpProcess?.stdout.on('data', (data) => (stdout += data))
        ytdlpProcess.ytDlpProcess?.stderr.on('data', (data) => (stderr += data))
        ytdlpProcess.on('close', () => {
          if (stdout) {
            try {
              const payload = JSON.parse(stdout)
              success('ytdlp', 'status.ytdlp.info_ready', { scope: 'getMediaInfo' })
              resolve(payload)
            } catch (e) {
              const err = new Error(
                'Failed to parse yt-dlp JSON output: ' + (stderr || (e as Error).message)
              )
              fail('ytdlp', err, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
              reject(err)
            }
          } else {
            const err = new Error(stderr || `yt-dlp exited with a non-zero code.`)
            fail('ytdlp', err, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
            reject(err)
          }
        })
        ytdlpProcess.on('error', (err) => {
          fail('ytdlp', err, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
          reject(err)
        })
      })
      .catch((e) => {
        fail('ytdlp', e, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
        reject(e)
      })
  })
}

/**
 * Checks if yt-dlp is installed and updates it if necessary
 * @returns path to yt-dlp or null if it fails
 */
async function checkYtdlp(): Promise<string | null> {
  begin('ytdlp', 'status.ytdlp.checking')
  const ytDlpPath = readInternalConfig().ytDlpPath

  // prioritize env variable
  if (process.env.VIDORA_YTDLP_PATH) {
    if (fs.existsSync(process.env.VIDORA_YTDLP_PATH)) {
      success('ytdlp', 'status.ytdlp.ready')
      return String(process.env.VIDORA_YTDLP_PATH)
    }
    fail(
      'ytdlp',
      "VIDORA_YTDLP_PATH ENV variable is used, but the file doesn't exist there.",
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
  if (ytDlpPath && fs.existsSync(ytDlpPath)) {
    cp.spawn(`"${ytDlpPath}"`, ['-U'], { shell: true })
      .on('error', (err) => {
        // don't fail the process when update goes wrong
        success('ytdlp', 'status.ytdlp.ready')
        console.error('Failed to update yt-dlp:', err)
      })
      .stdout.on('data', (data) => {
        success('ytdlp', 'status.ytdlp.ready')
        console.log('yt-dlp update check:', data.toString())
      })
    return ytDlpPath
  }

  // if binaries are not found in the default path, download it
  try {
    await fs.promises.access(ytDlpPath)
    success('ytdlp', 'status.ytdlp.ready')
    return ytDlpPath
  } catch {
    // if not found, download it into user data folder
    try {
      await downloadYtdlp(ytDlpPath)
      success('ytdlp', 'status.ytdlp.ready')
      return ytDlpPath
    } catch (e) {
      console.error('Failed to download yt-dlp', e)
      fail('ytdlp', 'Failed to download yt-dlp', 'status.ytdlp.download_failed')
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

/**
 * @description
 * This function registers the ipc listeners for downloads.
 * it registers a handler for the get_info event.
 */
export function registerYtdlpIpc(): void {
  ipcMain.handle(EVENTS.DOWNLOADS.GET_INFO, async (_e, url: string) => {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL')
    const info = await getMediaInfo(url)
    return info
  })
}
