// Utilities for processing yt-dlp formats and building options for UI rendering

export type YtDlpFormat = {
  format_id?: string
  ext?: string
  height?: number
  fps?: number
  vcodec?: string
  acodec?: string
  video_ext?: string
  filesize?: number
  filesize_approx?: number
  format_note?: string
}

export type VideoOption = {
  id: string
  ext: string
  height?: number
  fps?: number
  vcodec?: string
  hasAudio: boolean
  sizeBytes?: number
  display: string
  selected: boolean
}

export type AudioOption = {
  id: string
  ext: string
  note: string
  sizeBytes?: number
  display: string
}

export type Preferences = {
  videoQuality: number
  videoCodec: string
  showMoreFormats: boolean
}

export type ProcessResult = {
  video: VideoOption[]
  audio: AudioOption[]
  bestHeight: number
  audioPresent: boolean
  isPlaylist: boolean
}

export class MediaInfoProcessor {
  constructor(private prefs: Preferences) {}

  process(info: unknown): ProcessResult {
    const formats = this._extractFormatsArray(info)
    const isPlaylist = this._detectPlaylist(info)

    const { videoQuality, videoCodec, showMoreFormats } = this.prefs

    // Fallback when no formats
    if (formats.length === 0) {
      return { video: [], audio: [], bestHeight: 0, audioPresent: false, isPlaylist }
    }

    // Select best height
    let bestMatchHeight = 0
    for (const f of formats) {
      if (
        f &&
        typeof f.height === 'number' &&
        f.height <= videoQuality &&
        f.height > bestMatchHeight &&
        f.video_ext !== 'none'
      ) {
        bestMatchHeight = f.height
      }
    }
    if (bestMatchHeight === 0) {
      const heights = formats
        .map((ff) => ff?.height)
        .filter((h): h is number => typeof h === 'number')
      if (heights.length) bestMatchHeight = Math.max(...heights)
    }

    // Choose codec for that height
    const availableCodecs = new Set(
      formats
        .filter((f) => f && f.height === bestMatchHeight && f.vcodec)
        .map((f) => String(f.vcodec).split('.')[0])
    )
    const finalCodec = availableCodecs.has(videoCodec)
      ? videoCodec
      : [...availableCodecs][availableCodecs.size - 1]

    const video: VideoOption[] = []
    const audio: AudioOption[] = []

    let isAVideoSelected = false
    const toSize = (fmt: YtDlpFormat): number | undefined => {
      const n = fmt.filesize ?? fmt.filesize_approx
      return typeof n === 'number' && isFinite(n) ? n : undefined
    }
    const fmtSize = (n?: number): string =>
      n ? `${(n / 1_000_000).toFixed(2)} MB` : 'Unknown size'

    for (const f of formats) {
      if (!f) continue
      const size = toSize(f)
      if (f.video_ext !== 'none' && f.vcodec !== 'none') {
        if (!showMoreFormats && (f.ext === 'webm' || String(f.vcodec || '').startsWith('vp')))
          continue
        let selected = false
        if (
          !isAVideoSelected &&
          f.height === bestMatchHeight &&
          String(f.vcodec || '').startsWith(String(finalCodec || ''))
        )
          selected = isAVideoSelected = true
        const quality = `${f.height ?? '???'}p${f.fps === 60 ? '60' : ''}`
        const vcodecStr = showMoreFormats ? ` | ${String(f.vcodec || '').split('.')[0]}` : ''
        const hasAudio = f.acodec !== 'none'
        const display = `${quality.padEnd(6, ' ')} | ${String(f.ext || '').padEnd(5, ' ')}${vcodecStr} | ${fmtSize(size)}${hasAudio ? ' 🔊' : ''}`
        video.push({
          id: String(f.format_id ?? ''),
          ext: String(f.ext ?? ''),
          height: f.height,
          fps: f.fps,
          vcodec: f.vcodec,
          hasAudio,
          sizeBytes: size,
          display,
          selected
        })
      } else if (f.acodec !== 'none' && f.video_ext === 'none') {
        if (!showMoreFormats && f.ext === 'webm') continue
        const audioExt = f.ext === 'webm' ? 'opus' : String(f.ext || '')
        const note = String(f.format_note || 'Unknown quality')
        const display = `${note.padEnd(15, ' ')} | ${audioExt.padEnd(5, ' ')} | ${fmtSize(size)}`
        audio.push({ id: String(f.format_id ?? ''), ext: audioExt, note, sizeBytes: size, display })
      }
    }

    const audioPresent = formats.some((ff) => ff?.acodec && ff.acodec !== 'none')
    return { video, audio, bestHeight: bestMatchHeight, audioPresent, isPlaylist }
  }

  private _extractFormatsArray(info: unknown): YtDlpFormat[] {
    const v = (info as { formats?: YtDlpFormat[] }) || {}
    return Array.isArray(v.formats) ? (v.formats as YtDlpFormat[]) : []
  }

  private _detectPlaylist(info: unknown): boolean {
    const anyInfo = info as Record<string, unknown>
    if (Array.isArray((anyInfo as { entries?: unknown[] }).entries)) return true
    if (typeof anyInfo.playlist === 'string' && anyInfo.playlist.length > 0) return true
    if (typeof anyInfo.playlist_count === 'number' && anyInfo.playlist_count > 0) return true
    if (
      typeof anyInfo.extractor === 'string' &&
      anyInfo.extractor.toLowerCase().includes('playlist')
    )
      return true
    return false
  }
}
