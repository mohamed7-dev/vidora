import { readConfig } from '../app-config/config-api'
import { ensureYtDlpPath } from './check-ytdlp'
import YTDlpWrapImport from 'yt-dlp-wrap-plus'
import { complete, begin, error } from './get-media-info-status-bus'
import { ipcMain } from 'electron'
import { MEDIA_INFO_CHANNELS, YtdlpInfo } from '../../shared/ipc/get-media-info'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const YTDlpWrap: any = (YTDlpWrapImport as any)?.default ?? YTDlpWrapImport

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
    let args: string[] = []
    args = [
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

    begin()

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
              complete()
              resolve(payload)
            } catch (e) {
              const err = new Error(
                'Failed to parse yt-dlp JSON output: ' + (stderr || (e as Error).message)
              )
              error(err)
              reject(err)
            }
          } else {
            const err = new Error(stderr || `yt-dlp exited with a non-zero code.`)
            error(err)
            reject(err)
          }
        })
        ytdlpProcess.on('error', (err) => {
          error(err)
          reject(err)
        })
      })
      .catch((e) => {
        error(e)
        reject(e)
      })
  })
}

// Journey
//  1. renderer sends url via (GET_INFO channel), and subscribes the the (status bus channel)
//  2. main calls getMediaInfo -> getMediaInfo calls yt-dlp (status shared via bus)
//  3. main returns info via (GET_INFO channel)
//  4. renderer displays info

export function setupMediaInfoIPC(): void {
  ipcMain.handle(MEDIA_INFO_CHANNELS.GET_INFO, async (_e, url: string) => {
    if (!url || typeof url !== 'string')
      error(new Error('Invalid media url'), 'Invalid media url', 'url') // TODO: change
    const info = await getMediaInfo(url)
    return info
  })
}
