import { DEFAULT_INTERNAL_CONFIG } from './app-config/default-config'
import type { Job } from '../shared/jobs'
import { ensureYtDlpPath, YTDlpWrap } from './ytdlp'
import YTDlpWrapImport, { YTDlpEventEmitter } from 'yt-dlp-wrap-plus'
import os from 'node:os'
import { readConfig } from './app-config/config-api'
import { readInternalConfig } from './app-config/internal-config-api'

export type EngineHooks = {
  onProgress?: (jobId: string, progress: number) => void
  onDone?: (jobId: string, ok: boolean, error?: string) => void
}

export class DownloadEngine {
  private procs = new Map<string, YTDlpEventEmitter>()
  private controllers = new Map<string, AbortController>()
  private hooks: EngineHooks = {}
  private ytdlp: YTDlpWrapImport | null = null

  setHooks(h: EngineHooks): void {
    this.hooks = h
  }

  isRunning(jobId: string): boolean {
    return this.procs.has(jobId)
  }

  start(job: Job): void {
    if (this.isRunning(job.id)) return

    const args = this._buildArgs(job)
    const cwd =
      (job.payload?.ytdlpArgs?.downloadDir as string | null) ||
      DEFAULT_INTERNAL_CONFIG.downloadFolderPath

    void this._getWrap().then((wrap) => {
      const controller = new AbortController()
      this.controllers.set(job.id, controller)

      const proc = wrap.exec(args, {
        shell: true,
        detached: false,
        signal: controller.signal,
        cwd: cwd || undefined
      })
      this.procs.set(job.id, proc)

      let errBuf = ''

      const spawned = proc.ytDlpProcess

      // Structured progress from wrapper
      proc.on('progress', (progress: unknown) => {
        // progress may be number or object with percent/_percent
        const v = progress as Record<string, unknown> | number
        const raw =
          typeof v === 'number' ? v : ((v?.percent as unknown) ?? (v?._percent as unknown))
        const num = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '0').replace('%', ''))
        const clamped = Math.max(0, Math.min(100, isFinite(num) ? num : 0))
        this.hooks.onProgress?.(job.id, clamped)
      })

      // First event after spawn (optional UI change)
      proc.once('ytDlpEvent', () => {
        // no-op here; renderer already shows state
      })

      // Collect stderr for error reporting
      spawned?.stderr?.setEncoding?.('utf8')
      spawned?.stderr?.on?.('data', (chunk: string) => {
        errBuf += chunk
      })

      // Close/completion
      proc.once('close', (code: number | null) => {
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
          const msg = cleaned || `yt-dlp exited with code ${code ?? 'unknown'}`
          this.hooks.onDone?.(job.id, false, msg)
        }
      })

      proc.once('error', (err: unknown) => {
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
        this.hooks.onDone?.(job.id, false, cleaned || msg)
      })
    })
  }

  stop(jobId: string): void {
    const proc = this.procs.get(jobId)
    const controller = this.controllers.get(jobId)
    if (!proc && !controller) return
    try {
      controller?.abort()
      proc?.ytDlpProcess?.kill?.('SIGTERM')
    } catch {
      void 0
    }
    this.procs.delete(jobId)
    this.controllers.delete(jobId)
  }

  private async _getWrap(): Promise<YTDlpWrapImport> {
    if (this.ytdlp) return this.ytdlp
    const bp = await ensureYtDlpPath()
    this.ytdlp = (bp ? new YTDlpWrap(bp) : new YTDlpWrap()) as YTDlpWrapImport
    return this.ytdlp
  }

  private _buildArgs(job: Job): string[] {
    const {
      payload: { type, url, title, ytdlpArgs, userOptionsSnapshot }
    } = job
    const { rangeOption, rangeCmd, subs, subLangs } = ytdlpArgs

    const {
      downloader: { proxyServerUrl, cookiesFromBrowser, configPath }
    } = readConfig()

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

      audioFormatSuffix = audioForVideoFormatId === 'none' ? '' : `+${audioForVideoFormatId}`
    } else if (type === 'Audio') {
      const [fid, aext] = userOptionsSnapshot.audioFormat.split('|')
      formatId = fid
      ext = aext === 'webm' ? 'opus' : aext
    }

    const invalidChars = os.platform() === 'win32' ? /[<>:"/\\|?*[\]`#]/g : /["/`#]/g
    let finalFilename = title.replace(invalidChars, '').trim().slice(0, 100)
    if (finalFilename.startsWith('.')) finalFilename = finalFilename.substring(1)
    if (rangeCmd) {
      let rangeTxt = rangeCmd.replace('*', '')
      if (os.platform() === 'win32') rangeTxt = rangeTxt.replace(/:/g, '_')
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
      `"${url}"`
    ].filter(Boolean) as string[]

    if (type === 'Video' || type === 'Audio') {
      const formatString = type === 'Video' ? `${formatId}${audioFormatSuffix}` : String(formatId)
      const args = ['-f', formatString, '-o', outputPathQuoted, ...subsArgs, ...commonArgs]
      return args.filter(Boolean) as string[]
    }

    return ['-o', outputPathQuoted, ...subsArgs, ...commonArgs].filter(Boolean) as string[]
  }
}

export const downloadEngine = new DownloadEngine()
