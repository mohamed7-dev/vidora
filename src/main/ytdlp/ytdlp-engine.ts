import https from 'https'
import * as os from 'os'
import * as fs from 'fs'
import { IncomingMessage } from 'http'
import EventEmitter from 'events'
import {
  ChildProcess,
  ChildProcessWithoutNullStreams,
  execSync,
  spawn,
  type ExecFileException,
  type SpawnOptionsWithoutStdio
} from 'child_process'

const BASE_RELEASES_URL = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases?page='
const BASE_DOWNLOAD_URL = 'https://github.com/yt-dlp/yt-dlp/releases/download/'
const EXEC_NAME = 'yt-dlp'

const YTDLP_PROGRESS_REGEX =
  /\[download\][ ]+ *(.*)[ ]+of[~ ]+([^ ]*)(:? *at *([^ ]*))?(:? *ETA *([^ ]*))?/

export interface DownloadProgressPayload {
  progress: number
  downloaded: number
  total: number
}

export interface YtdlpExecProgress {
  percent?: number
  totalSize?: string
  currentSpeed?: string
  eta?: string
}

export interface YtdlpExecOptions extends SpawnOptionsWithoutStdio {
  maxBuffer?: number
}

export interface YtdlpEventEmitter extends EventEmitter {
  ytDlpProcess?: ChildProcessWithoutNullStreams
}

export class YtdlpEngine {
  static getReleases(options: { page: number; perPage: number }): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const apiURL = BASE_RELEASES_URL + options.page + '&per_page=' + options.perPage
      https.get(apiURL, { headers: { 'User-Agent': 'node' } }, (response) => {
        let res = ''
        response.setEncoding('utf8')
        response.on('data', (body) => (res += body))
        response.on('error', (e) => reject(e))
        response.on('end', () =>
          response.statusCode == 200 ? resolve(JSON.parse(res)) : reject(response)
        )
      })
    })
  }

  static async download(
    destPath: string,
    options: {
      platform?: NodeJS.Platform
      onProgress?: (payload: DownloadProgressPayload) => void
    }
  ): Promise<void> {
    const defaultPlatform = options.platform ?? os.platform()
    const isLinux = defaultPlatform === 'linux'
    const isMac = defaultPlatform === 'darwin'
    const isWin = defaultPlatform === 'win32'

    let fileName = EXEC_NAME

    if (isLinux) {
      if (os.arch() === 'arm64') {
        fileName += '_linux_aarch64'
      } else if (os.arch() === 'arm') {
        fileName += '_linux_armv7l'
      } else {
        fileName += '_linux'
      }
    } else if (isMac) {
      fileName += '_macos'
    } else if (isWin) {
      if (os.arch() === 'ia32') {
        fileName += '_x86.exe'
      } else if (os.arch() === 'arm64') {
        fileName += '_arm64.exe'
      } else {
        fileName += '.exe'
      }
    }
    const releases = (await YtdlpEngine.getReleases({ page: 1, perPage: 1 })) as Promise<
      Array<{ tag_name: string }>
    >
    const version = releases[0].tag_name

    if (!destPath) destPath = './' + fileName

    const fileURL = BASE_DOWNLOAD_URL + version + '/' + fileName
    await YtdlpEngine.downloadYtdlp(fileURL, destPath, { onProgress: options.onProgress })

    if (!isWin) {
      fs.chmodSync(destPath, '777')
    }
  }

  private static async downloadYtdlp(
    url: string,
    destPath: string,
    options: { onProgress?: (payload: DownloadProgressPayload) => void }
  ): Promise<IncomingMessage | undefined> {
    let currentUrl: string | null = url
    const maxRedirects = 10
    let redirectCount = 0

    while (currentUrl && redirectCount <= maxRedirects) {
      const message: IncomingMessage = await new Promise<IncomingMessage>((resolve, reject) => {
        https.get(currentUrl as string, (httpResponse) => {
          httpResponse.on('error', (e) => reject(e))
          resolve(httpResponse)
        })
      })

      if (message.headers.location) {
        const redirectLocation = message.headers.location
        try {
          const resolved = new URL(redirectLocation, currentUrl)
          currentUrl = resolved.toString()
        } catch {
          currentUrl = redirectLocation
        }
        redirectCount += 1
      } else {
        return await YtdlpEngine._processHttpMessage(message, destPath, {
          onProgress: options.onProgress
        })
      }
    }

    return undefined
  }

  private static async _processHttpMessage(
    httpMessage: IncomingMessage,
    destPath: string,
    options: { onProgress?: (payload: DownloadProgressPayload) => void }
  ): Promise<IncomingMessage> {
    const defaultTimeout = 15000
    return new Promise<IncomingMessage>((resolve, reject) => {
      let cleanedUp = false

      const total = Number(httpMessage.headers['content-length'] ?? 0)
      let downloaded = 0
      const fileStream = fs.createWriteStream(destPath)
      let timeoutId: NodeJS.Timeout | null = null

      const cleanup = (error?: Error): IncomingMessage | undefined => {
        if (cleanedUp) {
          return
        }
        cleanedUp = true

        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        httpMessage.removeAllListeners('data')
        httpMessage.removeAllListeners('end')
        httpMessage.removeAllListeners('error')
        httpMessage.socket?.removeAllListeners('timeout')
        fileStream.removeAllListeners('error')
        fileStream.removeAllListeners('finish')

        httpMessage.destroy()
        fileStream.close()

        if (error) {
          // If an error occurred, attempt to delete the partial file.
          fs.unlink(destPath, () => {
            reject(error)
          })
        } else if (httpMessage.statusCode !== 200) {
          fs.unlink(destPath, () => {
            reject(new Error(`HTTP Status ${httpMessage.statusCode}`))
          })
        } else {
          resolve(httpMessage)
        }

        return undefined
      }

      timeoutId = setTimeout(() => {
        cleanup(new Error(`Download timed out after ${defaultTimeout}ms`))
      }, defaultTimeout)

      httpMessage.on('data', (chunk) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => {
            cleanup(new Error(`Download timed out after ${defaultTimeout}ms of inactivity`))
          }, defaultTimeout)
        }

        downloaded += chunk.length
        if (total > 0 && options.onProgress) {
          options.onProgress({ progress: downloaded / total, downloaded, total })
        }
      })

      httpMessage.on('error', (err) => cleanup(err))
      fileStream.on('error', (err) => cleanup(err))

      fileStream.on('finish', () => {
        cleanup()
      })

      httpMessage.pipe(fileStream)
    })
  }

  static exec(
    binaryPath: string,
    ytDlpArguments: string[] = [],
    options: YtdlpExecOptions = {},
    abortSignal: AbortSignal | null = null
  ): YtdlpEventEmitter {
    const normalizedOptions = YtdlpEngine.setDefaultExecOptions(options)
    const execEventEmitter = new EventEmitter() as YtdlpEventEmitter
    const ytDlpProcess = spawn(binaryPath, ytDlpArguments, normalizedOptions)
    execEventEmitter.ytDlpProcess = ytDlpProcess
    YtdlpEngine.bindAbortSignal(abortSignal, ytDlpProcess)

    let stderrData = ''
    let processError: Error | undefined

    ytDlpProcess.stdout.on('data', (data) => {
      YtdlpEngine.emitYoutubeDlEvents(data.toString(), execEventEmitter)
    })

    ytDlpProcess.stderr.on('data', (data) => {
      stderrData += data.toString()
    })

    ytDlpProcess.on('error', (error) => {
      processError = error
    })

    ytDlpProcess.on('close', (code) => {
      if (code === 0 || ytDlpProcess.killed) {
        execEventEmitter.emit('close', code)
      } else {
        execEventEmitter.emit(
          'error',
          YtdlpEngine.createExecError(code, processError ?? null, stderrData)
        )
      }
    })

    return execEventEmitter
  }

  private static bindAbortSignal(signal: AbortSignal | null, process: ChildProcess): void {
    signal?.addEventListener('abort', () => {
      try {
        if (os.platform() === 'win32') {
          execSync(`taskkill /pid ${process.pid} /T /F`)
        } else {
          execSync(`pgrep -P ${process.pid} | xargs -L 1 kill`)
        }
      } catch {
        // best-effort only
      } finally {
        process.kill()
      }
    })
  }

  private static setDefaultExecOptions(options: YtdlpExecOptions): YtdlpExecOptions {
    if (!options.maxBuffer) options.maxBuffer = 1024 * 1024 * 1024
    return options
  }

  private static createExecError(
    code: number | ExecFileException | null,
    processError: Error | null,
    stderrData: string
  ): Error {
    let errorMessage = '\nError code: ' + code
    if (processError) errorMessage += '\n\nProcess error:\n' + processError
    if (stderrData) errorMessage += '\n\nStderr:\n' + stderrData
    return new Error(errorMessage)
  }

  private static emitYoutubeDlEvents(output: string, emitter: YtdlpEventEmitter): void {
    const outputLines = output.split(/\r|\n/g).filter(Boolean)

    for (const line of outputLines) {
      if (line[0] !== '[') continue

      const progressMatch = line.match(YTDLP_PROGRESS_REGEX)
      if (progressMatch) {
        const progress: YtdlpExecProgress = {
          percent: parseFloat(progressMatch[1].replace('%', '')),
          totalSize: progressMatch[2].replace('~', ''),
          currentSpeed: progressMatch[4],
          eta: progressMatch[6]
        }

        emitter.emit('progress', progress)
      }

      const eventType = line.split(' ')[0].replace('[', '').replace(']', '')
      const eventData = line.substring(line.indexOf(' '))
      emitter.emit('ytDlpEvent', eventType, eventData)
    }
  }
}
