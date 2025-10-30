import { DownloadArgs, DownloadJobPayload } from '@root/shared/jobs'

type ConstructorOpts = {
  type: 'Video' | 'Audio'
  url: string
  info: import('@root/shared/downloads').YtdlpInfo
  duration: number
  startInput?: string | null
  endInput?: string | null
  subtitles: boolean
  downloadDir?: string | null
  videoFormat?: string
  audioFormat?: string
  audioForVideoFormat?: string
}

export class DownloadProcessor {
  private readonly url: string
  private readonly type: 'Video' | 'Audio'
  private readonly info: import('@root/shared/downloads').YtdlpInfo
  private readonly duration: number
  private readonly startInput: string
  private readonly endInput: string
  private readonly subtitles: boolean
  private readonly downloadDir: string | null | undefined
  private readonly videoFormat: string
  private readonly audioFormat: string
  private readonly audioForVideoFormat: string

  constructor(opts: ConstructorOpts) {
    this.url = opts.url
    this.type = opts.type
    this.info = opts.info
    this.duration = Math.max(0, Math.floor(opts.duration || 0))
    this.startInput = (opts.startInput || '').trim()
    this.endInput = (opts.endInput || '').trim()
    this.subtitles = !!opts.subtitles
    this.downloadDir = opts.downloadDir
    this.videoFormat = opts.videoFormat ?? ''
    this.audioFormat = opts.audioFormat ?? ''
    this.audioForVideoFormat = opts.audioForVideoFormat ?? ''
  }

  build(): DownloadJobPayload {
    // Normalize and clip times
    const durationStr = this._formatSecondsToHMS(this.duration)
    let startStr = this.startInput || '0:00:00'
    let endStr = this.endInput || durationStr
    let start = this._parseTime(startStr)
    let end = this._parseTime(endStr)
    // clip to [0, duration]
    start = Math.max(0, Math.min(start, this.duration))
    end = Math.max(0, Math.min(end, this.duration))
    if (start > end) start = end
    // format back
    startStr = this._formatSecondsToHMS(start)
    endStr = this._formatSecondsToHMS(end)

    // Build args
    const args: DownloadArgs = this._buildArgs(start, end)

    const job: DownloadJobPayload = {
      type: this.type,
      url: this.url,
      title: (this.info.title as string) ?? '',
      thumbnail: (this.info.thumbnail as string) ?? '',
      ytdlpArgs: {
        ...args,
        downloadDir: this.downloadDir ?? null,
        subtitles: this.subtitles,
        start: startStr,
        end: endStr
      },
      userOptionsSnapshot: {
        videoFormat: this.videoFormat,
        audioForVideoFormat: this.audioForVideoFormat,
        audioFormat: this.audioFormat,
        extractFormat: '',
        extractQuality: ''
      }
    }

    return job
  }

  private _buildArgs(start: number, end: number): DownloadArgs {
    const full = start === 0 && end === this.duration
    const rangeCmd = full
      ? ''
      : `*${this._formatSecondsToHMS(start)}-${this._formatSecondsToHMS(end)}`
    const rangeOption = full ? '' : '--download-sections'
    const subs = this.subtitles ? '--write-subs' : ''
    const subLangs = this.subtitles ? '--sub-langs all' : ''
    return { rangeCmd, rangeOption, subs, subLangs }
  }

  private _parseTime(v: string): number {
    const s = (v || '').trim()
    if (!s) return 0
    const parts = s
      .split(':')
      .map((p) => p.trim())
      .filter(Boolean)
    let sec = 0
    if (parts.length === 1) sec = Number(parts[0])
    else if (parts.length === 2) sec = Number(parts[0]) * 60 + Number(parts[1])
    else if (parts.length === 3)
      sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
    return Number.isFinite(sec) && sec >= 0 ? sec : 0
  }

  private _formatSecondsToHMS(total: number): string {
    const sec = Math.max(0, Math.floor(total))
    const hours = Math.floor(sec / 3600)
    const minutes = Math.floor((sec % 3600) / 60)
    const seconds = sec % 60
    const h = hours > 0 ? `${hours}:` : ''
    const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
    const ss = String(seconds).padStart(2, '0')
    return `${h}${mm}:${ss}`
  }
}
