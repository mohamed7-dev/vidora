import { YtdlpInfo } from '../../shared/downloads'
import { readConfig } from '../app-config/config-api'
import { ensureYtDlpPath } from './check-ytdlp'
import YTDlpWrapImport from 'yt-dlp-wrap-plus'

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

    // begin('ytdlp', 'status.ytdlp.fetching_info', { url, scope: 'getMediaInfo' })

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
              //   success('ytdlp', 'status.ytdlp.info_ready', { scope: 'getMediaInfo' })
              resolve(payload)
            } catch (e) {
              const err = new Error(
                'Failed to parse yt-dlp JSON output: ' + (stderr || (e as Error).message)
              )
              //   fail('ytdlp', err, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
              reject(err)
            }
          } else {
            const err = new Error(stderr || `yt-dlp exited with a non-zero code.`)
            // fail('ytdlp', err, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
            reject(err)
          }
        })
        ytdlpProcess.on('error', (err) => {
          //   fail('ytdlp', err, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
          reject(err)
        })
      })
      .catch((e) => {
        // fail('ytdlp', e, 'status.ytdlp.info_failed', { scope: 'getMediaInfo' })
        reject(e)
      })
  })
}
