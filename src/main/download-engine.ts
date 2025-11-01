import { DEFAULT_INTERNAL_CONFIG } from './app-config/default-config'
import type { Job } from '../shared/jobs'
import { ensureYtDlpPath, YTDlpWrap } from './ytdlp'
import YTDlpWrapImport, { YTDlpEventEmitter } from 'yt-dlp-wrap-plus'

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

    const args = this._buildArgs(job) // TODO: build from payload.ytdlpArgs later
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
        this.hooks.onDone?.(job.id, ok, ok ? undefined : errBuf.trim())
      })

      proc.once('error', (err: unknown) => {
        this.procs.delete(job.id)
        this.controllers.delete(job.id)
        const msg =
          typeof err === 'object' && err && 'message' in err
            ? String((err as { message?: unknown }).message)
            : String(err)
        this.hooks.onDone?.(job.id, false, msg)
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

  private _buildArgs(_job: Job): string[] {
    void _job
    // TODO: build from job.payload.ytdlpArgs and other options
    return []
  }
}

export const downloadEngine = new DownloadEngine()
