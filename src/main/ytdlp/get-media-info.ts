import { readConfig } from '../app-config/config-api'
import { ensureYtDlpPath } from './check-ytdlp'
import { complete, begin, error } from './get-media-info-status-bus'
import { ipcMain } from 'electron'
import { MEDIA_INFO_CHANNELS, YtdlpInfo } from '../../shared/ipc/get-media-info'
import { readInternalConfig } from '../app-config/internal-config-api'
import { YtdlpEngine } from './ytdlp-engine'
import { t } from '../../shared/i18n/i18n'

type Hooks = {
  onBegin: () => void
  onProgress: (payload: { progress: number }) => void
  onComplete: (payload: { mediaInfo: YtdlpInfo }) => void
  onError: (payload: { err: unknown }) => void
}

/**
 * @description
 * Get media info from url.
 */
export async function getMediaInfo(url: string, hooks?: Partial<Hooks>): Promise<YtdlpInfo> {
  return new Promise((resolve, reject) => {
    const {
      downloader: { proxyServerUrl, cookiesFromBrowser, configPath }
    } = readConfig()
    const { jsRuntimePath } = readInternalConfig()
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
      jsRuntimePath ? `--no-js-runtimes --js-runtime ${jsRuntimePath}` : '',
      url
    ].filter(Boolean) as string[]

    hooks?.onBegin?.()

    ensureYtDlpPath()
      .then((bp) => {
        const binaryPath = bp || 'yt-dlp'
        const proc = YtdlpEngine.exec(binaryPath, args, { shell: true })
        let stdout = ''
        let stderr = ''
        proc.ytDlpProcess?.stdout?.on('data', (data) => (stdout += data))
        proc.ytDlpProcess?.stderr?.on('data', (data) => (stderr += data))
        proc.on('close', () => {
          if (stdout) {
            try {
              const payload = JSON.parse(stdout)
              hooks?.onComplete?.({ mediaInfo: payload })
              resolve(payload)
            } catch (e) {
              const err = new Error(
                t`Failed to parse yt-dlp JSON output: ` + (stderr || (e as Error).message)
              )
              reject(err)
            }
          } else {
            const err = new Error(stderr || t`yt-dlp exited with a non-zero code`)
            reject(err)
          }
        })
        proc.on('error', (err) => {
          reject(err)
        })
      })
      .catch((e) => {
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
    if (!url || typeof url !== 'string') {
      const err = new Error(t`Invalid media url`)
      error({ message: t`Media URL is invalid `, payload: { cause: err.message } })
    }
    const info = await getMediaInfo(url, {
      onComplete: (payload) => {
        complete({ payload: { mediaInfo: payload.mediaInfo } })
      },
      onBegin: () => {
        begin()
      }
    }).catch((e) => {
      error({ payload: { cause: e instanceof Error ? e.message : String(e) } })
    })
    return info
  })
}
