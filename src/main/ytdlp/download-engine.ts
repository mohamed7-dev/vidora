/* CREDIT
- inspired by the Andrew-me ytdlp-downloader app
*/

import type { Job } from '../../shared/ipc/download-jobs'
import { YtdlpEngine, type YtdlpEventEmitter } from './ytdlp-engine'
import { readConfig } from '../app-config/config-api'
import { readInternalConfig } from '../app-config/internal-config-api'
import { platform } from '@electron-toolkit/utils'
import { t } from '../../shared/i18n/i18n'

export type EngineHooks = {
  onProgress?: (jobId: string, progress: number) => void
  onDone?: (jobId: string, ok: boolean, error?: string) => void
  /**
   * Called once a job's final output file name has been computed.
   */
  onFilename?: (jobId: string, fileName: string) => void
}

/**
 * @description
 * This class manages the downloading life cycle.
 */
export class DownloadEngine {
  private procs = new Map<string, YtdlpEventEmitter>()
  private controllers = new Map<string, AbortController>()
  private hooks: EngineHooks = {}
  private binaryPath: string | null = null
  private canceledJobs = new Set<string>()

  setHooks(h: EngineHooks): void {
    this.hooks = h
  }

  isRunning(jobId: string): boolean {
    return this.procs.has(jobId)
  }

  start(job: Job, options?: { resume?: boolean }): void {
    if (this.isRunning(job.id)) return

    const { args, fileName } = this._buildArgs(job, options)
    const cwd =
      (job.payload?.ytdlpArgs?.downloadDir as string | null) || readConfig().downloads.downloadDir

    void this._getBinaryPath()
      .then((binaryPath) => {
        if (fileName) {
          this.hooks.onFilename?.(job.id, fileName)
        }
        const controller = new AbortController()
        this.controllers.set(job.id, controller)

        const proc = YtdlpEngine.exec(
          binaryPath,
          args,
          {
            shell: true,
            detached: false,
            cwd: cwd || undefined
          },
          controller.signal
        )
        this.procs.set(job.id, proc)

        let errBuf = ''
        let outBuf = ''
        let completed = false

        const spawned = proc.ytDlpProcess

        // Structured progress from wrapper
        proc.on('progress', (progress: unknown) => {
          // progress may be number or object with percent/_percent
          const v = progress as Record<string, unknown> | number
          const raw =
            typeof v === 'number' ? v : ((v?.percent as unknown) ?? (v?._percent as unknown))
          const num =
            typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0').replace('%', ''))
          const clamped = Math.max(0, Math.min(100, isFinite(num) ? num : 0))
          this.hooks.onProgress?.(job.id, clamped)
        })

        // First event after spawn (optional UI change)
        proc.once('ytDlpEvent', () => {
          // no-op here; renderer already shows state
        })

        // Collect stdio for error reporting
        spawned?.stdout?.setEncoding?.('utf8')
        spawned?.stdout?.on?.('data', (chunk: string) => {
          outBuf += chunk
        })
        spawned?.stderr?.setEncoding?.('utf8')
        spawned?.stderr?.on?.('data', (chunk: string) => {
          errBuf += chunk
        })

        // Close/completion: prefer child process event to get signal as well
        spawned?.once?.('close', (code: number | null, signal: NodeJS.Signals | null) => {
          if (completed) return
          if (this.canceledJobs.has(job.id)) {
            this.canceledJobs.delete(job.id)
            this.procs.delete(job.id)
            this.controllers.delete(job.id)
            return
          }
          completed = true
          this.procs.delete(job.id)
          this.controllers.delete(job.id)
          const ok = code === 0
          if (ok) {
            this.hooks.onDone?.(job.id, true, undefined)
          } else {
            const cleaned = errBuf
              .split('\n')
              .filter((l) => !l.trim().startsWith('WARNING:'))
              .join('\n')
              .trim()
            // fallback to raw stderr or stdout snippets if cleaned is empty
            const fallback = (errBuf || outBuf).trim()
            const base = cleaned || fallback
            const reason = code !== null ? `code ${code}` : signal ? `signal ${signal}` : 'unknown'
            const msg = base ? `${base}\n[exit ${reason}]` : `yt-dlp exited with ${reason}`
            this.hooks.onDone?.(job.id, false, msg)
          }
        })
        // Fallback: wrapper-level close (in case spawned is unavailable)
        proc.once('close', (code: number | null) => {
          if (completed) return
          if (this.canceledJobs.has(job.id)) {
            this.canceledJobs.delete(job.id)
            this.procs.delete(job.id)
            this.controllers.delete(job.id)
            return
          }
          completed = true
          this.procs.delete(job.id)
          this.controllers.delete(job.id)
          const ok = code === 0
          if (ok) {
            this.hooks.onDone?.(job.id, true, undefined)
          } else {
            const cleaned = errBuf
              .split('\n')
              .filter((l) => !l.trim().startsWith('WARNING:'))
              .join('\n')
              .trim()
            const fallback = (errBuf || outBuf).trim()
            const base = cleaned || fallback
            const reason = code !== null ? `code ${code}` : 'unknown'
            const msg = base ? `${base}\n[exit ${reason}]` : `yt-dlp exited with ${reason}`
            this.hooks.onDone?.(job.id, false, msg)
          }
        })

        proc.once('error', (err: unknown) => {
          if (this.canceledJobs.has(job.id)) {
            this.canceledJobs.delete(job.id)
            this.procs.delete(job.id)
            this.controllers.delete(job.id)
            return
          }
          this.procs.delete(job.id)
          this.controllers.delete(job.id)
          const msg =
            typeof err === 'object' && err && 'message' in err
              ? String((err as { message?: unknown }).message)
              : String(err)
          const cleaned = msg
            .split('\n')
            .filter((l) => !l.trim().startsWith('WARNING:'))
            .join('\n')
            .trim()
          const finalMsg = cleaned || msg
          this.hooks.onDone?.(job.id, false, finalMsg)
        })
      })
      .catch(() => {
        this.hooks.onDone?.(job.id, false, t`Failed to start the download process`)
      })
  }

  stop(jobId: string): void {
    const proc = this.procs.get(jobId)
    const controller = this.controllers.get(jobId)
    if (!proc && !controller) return
    try {
      console.log('Abort Job', jobId)
      this.canceledJobs.add(jobId)
      controller?.abort()
      proc?.ytDlpProcess?.kill?.()
    } catch {
      void 0
    }
    this.procs.delete(jobId)
    this.controllers.delete(jobId)
  }

  private async _getBinaryPath(): Promise<string> {
    if (this.binaryPath) return this.binaryPath
    const bp = readInternalConfig().ytDlpPath // when the app reaches this point, the internal config should be loaded, and the ytdlp path should be set
    this.binaryPath = bp as string
    return this.binaryPath
  }

  private _buildArgs(
    job: Job,
    options?: { resume?: boolean }
  ): { args: string[]; fileName: string } {
    const {
      payload: { type, url, title, ytdlpArgs, userOptionsSnapshot }
    } = job
    const { rangeOption, rangeCmd, subs, subLangs } = ytdlpArgs

    const {
      downloader: { proxyServerUrl, cookiesFromBrowser, configPath }
    } = readConfig()

    const { jsRuntimePath } = readInternalConfig()

    let formatId: string | undefined
    let ext: string | undefined
    let audioForVideoFormatId: string | undefined
    let audioFormatSuffix = ''

    if (type === 'Video') {
      const [videoFid, videoExt] = userOptionsSnapshot.videoFormat.split('|')
      const [audioFid, audioExt] = userOptionsSnapshot.audioForVideoFormat.split('|')
      formatId = videoFid
      audioForVideoFormatId = audioFid

      const finalAudioExt = audioExt === 'webm' ? 'opus' : audioExt
      ext =
        (videoExt === 'mp4' && finalAudioExt === 'opus') ||
        (videoExt === 'webm' && (finalAudioExt === 'm4a' || finalAudioExt === 'mp4'))
          ? 'mkv'
          : videoExt

      audioFormatSuffix =
        audioForVideoFormatId && audioForVideoFormatId !== 'none' ? `+${audioForVideoFormatId}` : ''
    } else if (type === 'Audio') {
      const [fid, aext] = userOptionsSnapshot.audioFormat.split('|')
      formatId = fid
      ext = aext === 'webm' ? 'opus' : aext
    }

    const invalidChars = platform.isWindows ? /[<>:"/\\|?*[\]`#]/g : /["/`#]/g
    let finalFilename = title.replace(invalidChars, '').trim().slice(0, 100)
    if (finalFilename.startsWith('.')) finalFilename = finalFilename.substring(1)
    if (rangeCmd) {
      let rangeTxt = rangeCmd.replace('*', '')
      if (platform.isWindows) rangeTxt = rangeTxt.replace(/:/g, '_')
      finalFilename += ` [${rangeTxt}]`
    }

    const needOutTemplate = Boolean(subs)
    const outputPath = needOutTemplate
      ? `${finalFilename}.%(ext)s`
      : `${finalFilename}.${ext ?? 'mp4'}`

    const outputPathQuoted = `"${outputPath}"`
    const useCookies = Boolean(cookiesFromBrowser && cookiesFromBrowser !== 'none')
    const ffmpegPath = readInternalConfig().ffmpegPath
    const ffmpegPathQuoted = `"${ffmpegPath}"`

    const subsArgs: string[] = []
    if (subs) subsArgs.push('--write-subs')
    if (subLangs) {
      // subLangs comes like "--sub-langs all"; split into two args
      const parts = subLangs.split(/\s+/).filter(Boolean)
      if (parts.length === 2 && parts[0] === '--sub-langs') subsArgs.push(parts[0], parts[1])
      else subsArgs.push(subLangs)
    }

    const resumeArgs = options?.resume ? ['--continue', '--no-overwrites'] : []
    const commonArgs = [
      '--no-playlist',
      '--no-mtime',
      ...(rangeOption && rangeCmd ? [rangeOption, rangeCmd] : []),
      useCookies ? '--cookies-from-browser' : '',
      useCookies ? `"${String(cookiesFromBrowser)}"` : '',
      proxyServerUrl ? '--proxy' : '',
      proxyServerUrl ? `"${proxyServerUrl}"` : '',
      configPath ? '--config-locations' : '',
      configPath ? `"${configPath}"` : '',
      '--ffmpeg-location',
      ffmpegPathQuoted,
      jsRuntimePath ? `--no-js-runtimes --js-runtimes ${jsRuntimePath}` : '',
      ...resumeArgs,
      `"${url}"`
    ].filter(Boolean) as string[]

    if (type === 'Video' || type === 'Audio') {
      const formatString = type === 'Video' ? `${formatId}${audioFormatSuffix}` : String(formatId)
      const args = ['-f', formatString, '-o', outputPathQuoted, ...subsArgs, ...commonArgs]
      return { args: args.filter(Boolean) as string[], fileName: outputPath }
    }

    return {
      args: ['-o', outputPathQuoted, ...subsArgs, ...commonArgs].filter(Boolean) as string[],
      fileName: outputPath
    }
  }
}

export const downloadEngine = new DownloadEngine()
